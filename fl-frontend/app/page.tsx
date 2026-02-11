"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Activity,
  Database,
  Cpu,
  Wifi,
  WifiOff,
  TrendingUp,
  Network,
  Shield,
  Zap,
  Users,
  RefreshCw,
} from "lucide-react";

// Enhanced ClientBox Component
function ClientBox({ client, onSend, onReceive }: any) {
  const getStatusStyles = () => {
    if (client.offloaded) {
      return {
        bg: "bg-gradient-to-br from-amber-400 to-orange-500",
        border: "border-amber-300",
        glow: "shadow-amber-500/50",
        icon: <Server className="w-4 h-4" />,
        label: "Offloaded",
      };
    }
    if (client.online) {
      return {
        bg: "bg-gradient-to-br from-emerald-400 to-green-500",
        border: "border-emerald-300",
        glow: "shadow-emerald-500/50",
        icon: <Wifi className="w-4 h-4" />,
        label: "Training",
      };
    }
    return {
      bg: "bg-gradient-to-br from-gray-400 to-gray-500",
      border: "border-gray-300",
      glow: "shadow-gray-500/50",
      icon: <WifiOff className="w-4 h-4" />,
      label: "Offline",
    };
  };

  const styles = getStatusStyles();

  return (
    <motion.div
      className={`relative p-5 rounded-2xl ${styles.bg} ${styles.border} border-2 shadow-xl ${styles.glow} text-white overflow-visible`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="absolute top-3 right-3"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {styles.icon}
      </motion.div>

      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Database className="w-5 h-5" />
        {client.id}
      </h3>

      <div className="space-y-2 bg-black/20 rounded-xl p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3" />
            <span className="text-xs font-medium">CPU</span>
          </div>
          <span className="font-bold text-sm">{client.cpu.toFixed(1)}%</span>
        </div>

        <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-white h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${client.cpu}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span className="text-xs font-medium">Memory</span>
          </div>
          <span className="font-bold text-sm">{client.mem.toFixed(1)}%</span>
        </div>

        <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-white h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${client.mem}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="mt-3 text-center">
        <span className="inline-block px-3 py-1 bg-black/30 rounded-full text-xs font-semibold backdrop-blur-sm">
          {client.offloaded ? "🔄 " + styles.label : "💻 " + styles.label}
        </span>
      </div>

      {onSend && (
        <>
          <motion.div
            className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 flex items-center justify-center text-white text-xs font-bold z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            →
          </motion.div>
          <motion.div
            className="absolute -right-6 top-1/2 w-4 h-0.5 bg-blue-400"
            animate={{
              scaleX: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ transformOrigin: "left" }}
          />
        </>
      )}

      {onReceive && (
        <>
          <motion.div
            className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50 flex items-center justify-center text-white text-xs font-bold z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            ←
          </motion.div>
          <motion.div
            className="absolute -left-6 top-1/2 w-4 h-0.5 bg-purple-400"
            animate={{
              scaleX: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ transformOrigin: "right" }}
          />
        </>
      )}

      {!client.offloaded && client.online && (
        <motion.div
          className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </motion.div>
  );
}

// Enhanced ServerBox Component
function ServerBox({ logs, round, stats }: any) {
  return (
    <motion.div
      className="relative p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl w-full text-white overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          >
            <Server className="w-8 h-8" />
          </motion.div>
          <h2 className="font-bold text-2xl">Aggregation Server</h2>
        </div>

        <motion.div
          className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-semibold">Active</span>
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 mb-4 shadow-lg"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            <span className="text-lg font-medium">Training Round</span>
          </div>
          <motion.span
            className="text-4xl font-bold"
            key={round}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {round}
          </motion.span>
        </div>
      </motion.div>

      {stats && (
        <div className="relative z-10 grid grid-cols-3 gap-2 mb-4">
          <div className="bg-emerald-500/20 rounded-lg p-2 text-center backdrop-blur-sm border border-emerald-400/30">
            <p className="text-xs opacity-80">Active</p>
            <p className="text-xl font-bold">{stats.active}</p>
          </div>
          <div className="bg-amber-500/20 rounded-lg p-2 text-center backdrop-blur-sm border border-amber-400/30">
            <p className="text-xs opacity-80">Offloaded</p>
            <p className="text-xl font-bold">{stats.offloaded}</p>
          </div>
          <div className="bg-gray-500/20 rounded-lg p-2 text-center backdrop-blur-sm border border-gray-400/30">
            <p className="text-xs opacity-80">Offline</p>
            <p className="text-xl font-bold">{stats.offline}</p>
          </div>
        </div>
      )}

      <div className="relative z-10">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 opacity-90">
          <Activity className="w-4 h-4" />
          Activity Log
        </h3>
        <motion.div
          className="bg-black/30 backdrop-blur-md p-3 rounded-2xl h-48 overflow-y-auto text-left text-xs font-mono border border-white/10 custom-scrollbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {logs.length === 0 ? (
            <p className="text-white/50 text-center py-4">
              Waiting for activity...
            </p>
          ) : (
            logs.slice(-15).map((line: string, i: number) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="mb-1 text-white/90 leading-relaxed border-l-2 border-emerald-400/50 pl-2"
              >
                <span className="text-emerald-400 mr-2">▸</span>
                {line}
              </motion.p>
            ))
          )}
        </motion.div>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
    </motion.div>
  );
}

// Main HomePage Component - Copy this into your page.tsx
export default function HomePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "System initializing...",
    "Waiting for client connections...",
  ]);
  const [round, setRound] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [communicationPhase, setCommunicationPhase] = useState<
    "idle" | "sending" | "receiving"
  >("idle");

  const fetchData = async () => {
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

      // Use fetch instead of axios
      const statusRes = await fetch(`${API_BASE}/status`);
      const modelRes = await fetch(`${API_BASE}/model`);

      const statusData = await statusRes.json();
      const modelData = await modelRes.json();

      const list = Object.entries(statusData).map(([id, data]: any) => ({
        id,
        cpu: data.last_update?.cpu_percent || 0,
        mem: data.last_update?.memory_percent || 0,
        offloaded: data.last_update?.offloaded || false,
        online: Date.now() / 1000 - data.last_seen_unix < 10,
      }));

      setClients(list);
      const newRound = modelData.round_int;

      // Detect round change and trigger communication animation
      if (newRound !== round && round > 0) {
        setCommunicationPhase("sending");
        setLogs((l) => [
          ...l,
          `[Round ${newRound}] Collecting local weights from clients...`,
        ]);

        setTimeout(() => {
          setCommunicationPhase("receiving");
          setLogs((l) => [
            ...l,
            `[Round ${newRound}] Aggregating and broadcasting global model...`,
          ]);

          setTimeout(() => {
            setCommunicationPhase("idle");
            setLogs((l) => [...l, `[Round ${newRound}] Round complete ✓`]);
          }, 3000);
        }, 3000);
      }

      setRound(newRound);
      setIsLoading(false);

      const activeCount = list.filter((c) => c.online).length;
      if (logs.length < 3 || !logs[logs.length - 1].includes("Connected")) {
        setLogs((l) => [
          ...l,
          `[Update] Connected clients: ${activeCount}/${list.length}`,
        ]);
      }
    } catch (err) {
      console.error(err);
      setLogs((l) => [...l, "[Error] Could not fetch data from server"]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [round]);

  const stats = {
    active: clients.filter((c) => c.online && !c.offloaded).length,
    offloaded: clients.filter((c) => c.offloaded).length,
    offline: clients.filter((c) => !c.online).length,
    total: clients.length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-4">
          <Network className="w-12 h-12 text-blue-400" />
          Federated Learning System
        </h1>
        <p className="text-white/70 text-lg">
          Real-time gRPC Communication Dashboard
        </p>
      </motion.div>

      <motion.div
        className="max-w-6xl mx-auto mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-4 gap-6 text-white">
          <motion.div
            className="flex items-center gap-3 bg-white/5 rounded-xl p-4"
            whileHover={{ scale: 1.05 }}
          >
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm opacity-70">Total Clients</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <Shield className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-3xl font-bold">{stats.active}</p>
              <p className="text-sm opacity-70">Active Training</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 bg-amber-500/10 rounded-xl p-4 border border-amber-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <Zap className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-3xl font-bold">{stats.offloaded}</p>
              <p className="text-sm opacity-70">Offloaded</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 bg-gray-500/10 rounded-xl p-4 border border-gray-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <WifiOff className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-3xl font-bold">{stats.offline}</p>
              <p className="text-sm opacity-70">Offline</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-6 h-6" />
                Client Nodes
                {isLoading && (
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                )}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {clients.map((c) => (
                    <ClientBox
                      key={c.id}
                      client={c}
                      onSend={communicationPhase === "sending" && c.online}
                      onReceive={communicationPhase === "receiving" && c.online}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {clients.length === 0 && !isLoading && (
                <motion.div
                  className="text-center text-white/50 py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <WifiOff className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No clients connected</p>
                  <p className="text-sm">Waiting for devices to join...</p>
                </motion.div>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Server className="w-6 h-6" />
                Aggregation Server
              </h2>
              <ServerBox logs={logs} round={round} stats={stats} />
            </motion.div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </main>
  );
}
