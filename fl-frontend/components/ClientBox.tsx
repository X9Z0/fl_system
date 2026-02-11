"use client";

import { motion } from "framer-motion";
export default function ClientBox({ client, onSend, onReceive }: any) {
  const statusColor = client.offloaded
    ? "bg-yellow-300"
    : client.online
      ? "bg-green-300"
      : "bg-gray-400";

  return (
    <motion.div
      className={`p-4 rounded-2xl shadow-md text-center ${statusColor} relative`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-bold">{client.id}</h3>
      <p className="text-sm">CPU: {client.cpu.toFixed(1)}%</p>
      <p className="text-sm">Mem: {client.mem.toFixed(1)}%</p>
      <p className="text-xs italic">
        {client.offloaded ? "Offloaded" : "Local Training"}{" "}
      </p>
      {onSend && (
        <motion.div
          className="absolute -right-4 top-1/2 w-3 h-3 bg-blue-500 rounded-full"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
      {onReceive && (
        <motion.div
          className="absolute -left-4 top-1/2 w-3 h-3 bg-purple-500 rounded-full"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
    </motion.div>
  );
}
