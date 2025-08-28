class OffloadDecider:
    def __init__(
        self,
        cpu_threshold: float = 80.0,
        mem_threshold: float = 80.0,
        net_threshold: int = 5 * 1024 * 1024,
    ):
        self.cpu_threshold = cpu_threshold
        self.mem_threshold = mem_threshold
        self.net_threshold = net_threshold

    def decide(self, metrics: dict) -> str:
        cpu = metrics.get("cpu_percent", 0.0)
        mem = metrics.get("memory_percent", 0.0)
        net_sent = metrics.get("net_sent_bytes", 0)
        net_recv = metrics.get("net_recv_bytes", 0)

        if cpu > self.cpu_threshold or mem > self.mem_threshold:
            return "offload"

        if (net_sent + net_recv) < self.net_threshold:
            return "local"

        return "local"
