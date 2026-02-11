"use client";
import { motion } from "framer-motion";

export default function ServerBox({ logs, round }: any) {
  return (
    <motion.div
      className="p-4 bg-blue-100 rounded-2xl shadow-lg w-full text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="font-bold text-lg">Server</h2>
      <p className="text-sm mb-2">Round: {round}</p>
      <div className="bg-white p-2 rounded-xl h-40 overflow-y-scroll text-left text-xs">
        {logs.slice(-10).map((line: string, i: number) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </motion.div>
  );
}
