# client_node/main.py
import os
import sys
import time
import uuid
import grpc
import itertools
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "proto"))
import fl_pb2
import fl_pb2_grpc

from metrics import get_system_metrics
from offload import OffloadDecider

from train_local import train_local_model, get_model_weights  

SERVER_HOST = os.getenv("SERVER_HOST", "localhost")
SERVER_PORT = int(os.getenv("SERVER_PORT", 50051))
GRPC_TARGET = f"{SERVER_HOST}:{SERVER_PORT}"

# simulate offload flag override to showcase both behavior
SIMULATE_OFFLOAD = os.getenv("SIMULATE_OFFLOAD", "false").lower() == "true"


def make_stub(target: str):
    channel = grpc.insecure_channel(target)
    stub = fl_pb2_grpc.FederatedLoggerStub(channel)
    return channel, stub

def send_model_update(client_id, weights):
    client_id = int(client_id, 16)
    channel = grpc.insecure_channel("localhost:50051")
    stub = fl_pb2_grpc.FederatedLoggerStub(channel)

    print(f"[DEBUG] Preparing model update for client {client_id}")

    def flatten(lst):
        return list(itertools.chain.from_iterable(
            v if isinstance(v, (list, np.ndarray)) else [v] for v in lst
        ))

    weight_map = {}

    for name, values in weights.items():
       
        if isinstance(values, np.ndarray):
            values = values.tolist()

        
        if len(values) > 0 and isinstance(values[0], (list, np.ndarray)):
            flat_values = flatten(values)
        else:
            flat_values = values

        # Ensure all are floats (not strings)
        cleaned_values = []
        for v in flat_values:
            try:
                cleaned_values.append(float(v))
            except (TypeError, ValueError):
                print(f"[WARN] Skipping non-numeric in {name}: {v}")

        weight_map[name] = fl_pb2.Weights(values=cleaned_values)

    print(f"[DEBUG] Prepared {len(weight_map)} layers to send.")

    try:
        request = fl_pb2.ModelUpdate(client_id=int(client_id), weights=weight_map)
        response = stub.SendModelUpdate(request)
        print(f"[ACK] {response.message}")
    except Exception as e:
        print(f"[ERROR] Unexpected during send: {e}")

    
def run():
    client_id = os.getenv("CLIENT_ID", str(uuid.uuid4())[:8])
    decider = OffloadDecider(cpu_threshold=75.0, mem_threshold=80.0)
    channel, stub = make_stub(GRPC_TARGET)

    while True:
        try:
            metrics = get_system_metrics()

            cpu_percent = float(metrics.get("cpu_percent", 0.0))
            memory_used_mb = float(metrics.get("memory_used_mb", 0.0))
            memory_percent = float(metrics.get("memory_percent", 0.0))
            net_sent_bytes = int(metrics.get("net_sent_bytes", 0))
            net_recv_bytes = int(metrics.get("net_recv_bytes", 0))

            if SIMULATE_OFFLOAD:
                decision = "offload"
            else:
                decision = decider.decide(metrics)

            offloaded_bool = decision == "offload"


            if decision == "local":
             print("[INFO] Training model locally...")
             model = train_local_model(epochs=1)   # train small local model
             weights = get_model_weights(model)
             print("[INFO] Local training completed. Model ready to send to server.")
             send_model_update(client_id, weights)

            else:
             print("[INFO] Offloading training to server (no local training performed).")

            update = fl_pb2.ClientUpdate(
                client_id=str(client_id),
                cpu_percent=cpu_percent,
                memory_used_mb=memory_used_mb,
                memory_percent=memory_percent,
                net_sent_bytes=net_sent_bytes,
                net_recv_bytes=net_recv_bytes,
                offloaded=offloaded_bool,
            )
            resp = stub.SendClientUpdate(update)
            print(f"[ClientUpdate ACK] {resp.message}")

            if decision == "local":
                print("[INFO] Training locally (synthetic)...")
                weights = synthetic_train()
                send_model_update(stub, client_id, weights)
                # fetch global model (optional)
                fetch_global_model(stub)
            else:
                print("[INFO] Decided to offload - not training locally this round.")

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
