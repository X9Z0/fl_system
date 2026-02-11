package main

import (
	"context"
	"encoding/json"
	"fmt"
	pb "github.com/fl-system1/fl_system/server/proto"
	"google.golang.org/grpc"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

type server struct {
	pb.UnimplementedFederatedLoggerServer

	mu sync.Mutex

	// clients store last ClientUpdate + timestamp
	clients map[string]*ClientStatus

	// store model updates for the current aggregation round: client_id -> weights
	receivedModels map[string]map[string][]float32

	// global model
	globalModel map[string][]float32
	round       int64

	// expected client count to trigger aggregation
	expectedClients int
}

type ClientStatus struct {
	LastUpdate   *pb.ClientUpdate `json:"last_update"`
	LastSeenUnix int64            `json:"last_seen_unix"`
	HasSentModel bool             `json:"has_sent_model"`
}

func NewServer(expected int) *server {
	return &server{
		clients:         make(map[string]*ClientStatus),
		receivedModels:  make(map[string]map[string][]float32),
		globalModel:     make(map[string][]float32),
		round:           0,
		expectedClients: expected,
	}
}

// SendClientUpdate logs metrics and updates client status
func (s *server) SendClientUpdate(ctx context.Context, update *pb.ClientUpdate) (*pb.Ack, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cs, ok := s.clients[update.ClientId]
	if !ok {
		cs = &ClientStatus{}
	}
	cs.LastUpdate = update
	cs.LastSeenUnix = time.Now().Unix()
	s.clients[update.ClientId] = cs

	log.Printf("[ClientUpdate] %s cpu=%.2f mem=%.2f%% offloaded=%t\n",
		update.ClientId, update.CpuPercent, update.MemoryPercent, update.Offloaded)

	return &pb.Ack{Message: "Client update received"}, nil
}

// SendModelUpdate receives serialized weights
func (s *server) SendModelUpdate(ctx context.Context, mu *pb.ModelUpdate) (*pb.Ack, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Printf("[ModelUpdate] recv from %s\n", mu.ClientId)

	// convert pb weights map to native map[string][]float32
	m := make(map[string][]float32)
	for k, w := range mu.Weights {
		// copy to avoid aliasing
		arr := make([]float32, len(w.Values))
		for i, v := range w.Values {
			arr[i] = v
		}
		m[k] = arr
	}

	s.receivedModels[mu.ClientId] = m
	// mark client status
	cs, ok := s.clients[mu.ClientId]
	if !ok {
		cs = &ClientStatus{}
	}
	cs.HasSentModel = true
	cs.LastSeenUnix = time.Now().Unix()
	s.clients[mu.ClientId] = cs

	// check if we have enough updates to aggregate
	if len(s.receivedModels) >= s.expectedClients {
		log.Println("[Aggregator] Expected clients reached — performing FedAvg")
		go s.performFedAvg()
	}

	return &pb.Ack{Message: "Model update received"}, nil
}

func (s *server) GetGlobalModel(ctx context.Context, req *pb.GlobalModelRequest) (*pb.GlobalModel, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	weights := make(map[string]*pb.Weights)
	for k, arr := range s.globalModel {
		w := &pb.Weights{}
		for _, v := range arr {
			w.Values = append(w.Values, v)
		}
		weights[k] = w
	}

	return &pb.GlobalModel{
		Round:   s.round,
		Weights: weights,
	}, nil
}

func (s *server) performFedAvg() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.receivedModels) == 0 {
		return
	}

	// pick any client to get the layer keys and sizes
	var first map[string][]float32
	for _, v := range s.receivedModels {
		first = v
		break
	}

	avg := make(map[string][]float32)
	// initialize avg map with zeros
	for k, arr := range first {
		avg[k] = make([]float32, len(arr))
	}

	// sum
	numClients := float32(len(s.receivedModels))
	for _, clientModel := range s.receivedModels {
		for k, arr := range clientModel {
			if _, ok := avg[k]; !ok {
				// mismatch keys -> skip
				continue
			}
			for i := range arr {
				avg[k][i] += arr[i]
			}
		}
	}

	// divide to get average
	for k := range avg {
		for i := range avg[k] {
			avg[k][i] = avg[k][i] / numClients
		}
	}

	// set global model and increment round
	s.globalModel = avg
	s.round += 1

	// clear receivedModels for next round (but keep clients map)
	s.receivedModels = make(map[string]map[string][]float32)

	log.Printf("[Aggregator] FedAvg complete. New round: %d\n", s.round)
}

// REST handlers for frontend
func (s *server) restClientsHandler(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make(map[string]*ClientStatus)
	for k, v := range s.clients {
		out[k] = v
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func (s *server) restModelHandler(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	modelInfo := map[string]interface{}{
		"round":     len(s.globalModel) == 0 && s.round == 0 && s.expectedClients != 0, // legacy
		"round_int": s.round,
		"layers":    len(s.globalModel),
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(modelInfo)
}

func main() {
	expectedStr := os.Getenv("EXPECTED_CLIENTS")
	expected := 3
	if expectedStr != "" {
		if v, err := strconv.Atoi(expectedStr); err == nil {
			expected = v
		}
	}
	s := NewServer(expected)

	// start REST server for status polling
	http.HandleFunc("/status", s.restClientsHandler)
	http.HandleFunc("/model", s.restModelHandler)
	go func() {
		log.Println("REST server listening on :8080")
		if err := http.ListenAndServe(":8080", nil); err != nil {
			log.Fatalf("rest server err: %v", err)
		}
	}()

	// start gRPC
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	grpcServer := grpc.NewServer()
	pb.RegisterFederatedLoggerServer(grpcServer, s)

	fmt.Println("gRPC Server listening on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
