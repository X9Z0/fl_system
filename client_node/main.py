# client_node/main.py
import os
import sys
import time
import uuid
import grpc
import random
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "proto"))
import fl_pb2
import fl_pb2_grpc

from metrics import get_system_metrics
from offload import OffloadDecider

# small synthetic training using numpy (avoid heavy dependencies if you want)
# but using torch is okay if installed; here we simulate simple linear weights

SERVER_HOST = os.getenv("SERVER_HOST", "fl_server")
SERVER_PORT = int(os.getenv("SERVER_PORT", 50051))
GRPC_TARGET = f"{SERVER_HOST}:{SERVER_PORT}"

# simulate offload flag override to showcase both behavior
SIMULATE_OFFLOAD = os.getenv("SIMULATE_OFFLOAD", "false").lower() == "true"


def make_stub(target: str):
    channel = grpc.insecure_channel(target)
    stub = fl_pb2_grpc.FederatedLoggerStub(channel)
    return channel, stub


def synthetic_train():
    # returns a dict of layer_name -> list of floats
    # tiny model: two layers "fc1" (4 weights), "fc2" (2 weights)
    # pretend we trained and updated weights slightly from random
    model = {
        "fc1.weight": (np.random.rand(4).astype(np.float32) * 0.1).tolist(),
        "fc2.weight": (np.random.rand(2).astype(np.float32) * 0.1).tolist(),
    }
    # simulate training noise
    for k in model:
        model[k] = [x + random.uniform(-0.01, 0.01) for x in model[k]]
    return model


def send_model_update(stub, client_id, weights):
    # convert to pb map[string]Weights
    weight_map = {}
    for name, vals in weights.items():
        w = fl_pb2.Weights()
        for v in vals:
            w.values.append(float(v))
        weight_map[name] = w
    req = fl_pb2.ModelUpdate(client_id=str(client_id), weights=weight_map)
    resp = stub.SendModelUpdate(req)
    print(f"[ModelUpdate ACK] {resp.message}")


def fetch_global_model(stub):
    req = fl_pb2.GlobalModelRequest(round=0)
    gm = stub.GetGlobalModel(req)
    print(f"[GetGlobalModel] round={gm.round} layers={len(gm.weights)}")
    return gm


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

            # Send client metrics
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
