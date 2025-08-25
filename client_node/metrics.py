import time
import psutil


def get_system_metrics():
    """this function gets the system metrics
    Args:
        None
    Returns:
        {
            "cpu_percent": (float),
            "memory_used_mb": (float),
            "memory_percent": (float),
            "net_sent_bytes": (int),
            "net_recv_bytes": (int),
        }
    """
    cpu_usage = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory()
    mem_usage = mem.used / (1024 * 1024)
    mem_percent = mem.percent

    net = psutil.net_io_counters()
    net_sent = net.bytes_sent
    net_recv = net.bytes_recv

    return {
        "cpu_percent": cpu_usage,
        "memory_used_mb": round(mem_usage, 2),
        "memory_percent": mem_percent,
        "net_sent_bytes": net_sent,
        "net_recv_bytes": net_recv,
    }


if __name__ == "__main__":
    while True:
        metrics = get_system_metrics()
        print(metrics)
        time.sleep(2)
