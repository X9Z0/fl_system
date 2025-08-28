import os
import sys
import time
import uuid
import grpc

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "proto"))

import fl_pb2
import fl_pb2_grpc

from metrics import get_system_metrics
from offload import OffloadDecider

SERVER_HOST = os.getenv("SERVER_HOST", "localhost")
SERVER_PORT = int(os.getenv("SERVER_PORT", 50051))
GRPC_TARGET = f"{SERVER_HOST}:{SERVER_PORT}"
target = os.getenv("SERVER_HOST", "fl_server:50051")


def make_stub(target: str):
    channel = grpc.insecure_channel(target)
    stub = fl_pb2_grpc.FederatedLoggerStub(channel)
    return channel, stub


def run():
    client_id = os.getenv("CLIENT_ID", str(uuid.uuid4())[:8])
    decider = OffloadDecider(cpu_threshold=75.0, mem_threshold=70.0)

    channel, stub = make_stub(target)

    while True:
        try:
            metrics = get_system_metrics()

            cpu_percent = float(metrics.get("cpu_percent", 0.0))
            memory_used_mb = float(metrics.get("memory_used_mb", 0.0))
            memory_percent = float(metrics.get("memory_percent", 0.0))
            net_sent_bytes = int(metrics.get("net_sent_bytes", 0))
            net_recv_bytes = int(metrics.get("net_recv_bytes", 0))

            decision = decider.decide(metrics)
            offloaded_bool = decision == "offload"

            update = fl_pb2.ClientUpdate(
                client_id=str(client_id),
                cpu_percent=cpu_percent,
                memory_used_mb=memory_used_mb,
                memory_percent=memory_percent,
                net_sent_bytes=net_sent_bytes,
                net_recv_bytes=net_recv_bytes,
                offloaded=offloaded_bool,
            )

            response = stub.SendClientUpdate(update)
            print(f"[ACK] {response.message}")

        except grpc.RpcError as e:
            print(f"[gRPC error] {e}; recreating channel in 2s")
            try:
                channel.close()
            except Exception:
                pass
            time.sleep(2)
            channel, stub = make_stub(GRPC_TARGET)
        except Exception as e:
            print(f"[ERROR] {e}")
        finally:
            time.sleep(5)


if __name__ == "__main__":
    run()
