package main

import (
	"context"
	"fmt"
	pb "github.com/fl-system1/fl_system/server/proto"
	"google.golang.org/grpc"
	"log"
	"net"
)

type server struct {
	pb.UnimplementedFederatedLoggerServer
}

func (s *server) SendClientUpdate(ctx context.Context, update *pb.ClientUpdate) (*pb.Ack, error) {
	log.Printf("Received update from client %s: CPU=%.2f, Mem=%.2f MB (%.2f%%), NetSent=%d, NetRecv=%d, Offloaded=%t",
		update.ClientId, update.CpuPercent, update.MemoryUsedMb,
		update.MemoryPercent, update.NetSentBytes, update.NetRecvBytes,
		update.Offloaded,
	)

	return &pb.Ack{Message: "Update received"}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterFederatedLoggerServer(grpcServer, &server{})

	fmt.Println("Server listening on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
