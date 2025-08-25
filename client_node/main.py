from offload import OffloadDecider
from metrics import get_system_metrics

decider = OffloadDecider(cpu_threshold=75.0, mem_threshold=70.0)

all_metrics = get_system_metrics()
decision = decider.decide(all_metrics)

if __name__ == "__main__":
    while True:
        print("System metrics:", all_metrics)
        print("Decision:", decision)
