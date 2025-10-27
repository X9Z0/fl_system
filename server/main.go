package main

import (
	"context"
	"fmt"
	"log"
	"net"

	pb "github.com/fl-system1/fl_system/server/proto"
	"google.golang.org/grpc"
)

type server struct {
	pb.UnimplementedFederatedLoggerServer
	modelUpdates map[string]*pb.ModelUpdate
}

func newServer() *server {
	return &server{
		modelUpdates: make(map[string]*pb.ModelUpdate),
	}
}

func (s *server) SendClientUpdate(ctx context.Context, update *pb.ClientUpdate) (*pb.Ack, error) {
	log.Printf("Received update from client %s: CPU=%.2f, Mem=%.2f MB (%.2f%%), NetSent=%d, NetRecv=%d, Offloaded=%t",
		update.ClientId, update.CpuPercent, update.MemoryUsedMb,
		update.MemoryPercent, update.NetSentBytes, update.NetRecvBytes,
		update.Offloaded,
	)

	return &pb.Ack{Message: "Update received"}, nil
}

func (s *server) SendModelUpdate(ctx context.Context, update *pb.ModelUpdate) (*pb.Ack, error) {
	log.Printf("[SERVER] Received model update from client %s", update.ClientId)

	for name, w := range update.Weights {
		log.Printf("  Layer: %s -> %d weights", name, len(w.Values))
	}

	s.modelUpdates[update.ClientId] = update

	return &pb.Ack{Message: "Model update received"}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	s := newServer()
	pb.RegisterFederatedLoggerServer(grpcServer, s)

	fmt.Println("Server listening on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
