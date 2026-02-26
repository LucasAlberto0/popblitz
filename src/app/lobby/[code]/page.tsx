"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { Copy, Check, Crown } from "lucide-react";

const mockPlayers = [
  { id: "1", name: "Você", avatar: "🎮", ready: true },
  { id: "2", name: "Luna", avatar: "🌟", ready: true },
  { id: "3", name: "Blaze", avatar: "🔥", ready: false },
  { id: "4", name: "Nyx", avatar: "🎭", ready: true },
  { id: "5", name: "Spark", avatar: "⚡", ready: false },
];

function LobbyContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "true";
  const code = params.code as string;
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState(mockPlayers.slice(0, 1));

  useEffect(() => {
    const timers = mockPlayers.slice(1).map((p, i) =>
      setTimeout(() => setPlayers((prev) => [...prev, p]), (i + 1) * 1200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen gradient-bg-animated px-4 py-8 flex flex-col items-center">
      <ParticleBackground />

      <div className="relative z-10 max-w-2xl w-full space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="font-display text-2xl gradient-text mb-2">Sala de Espera</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="font-display text-3xl text-primary tracking-[0.4em]">{code}</span>
            <button onClick={copyCode} className="text-muted-foreground hover:text-primary transition-colors">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground font-ui mt-1">
            {players.length}/16 jogadores
          </p>
        </motion.div>

        {/* Players grid */}
        <div className="glass-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", delay: 0.05 }}
                  className="glass-card p-4 text-center relative"
                >
                  {i === 0 && isHost && (
                    <Crown size={14} className="absolute top-2 right-2 text-neon-yellow" />
                  )}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="text-3xl mb-2"
                  >
                    {p.avatar}
                  </motion.div>
                  <p className="font-ui font-semibold text-sm truncate">{p.name}</p>
                  <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${p.ready ? "bg-neon-green" : "bg-muted-foreground"}`} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="border border-dashed border-border rounded-xl p-4 text-center opacity-30">
                <div className="text-3xl mb-2">❓</div>
                <p className="font-ui text-sm text-muted-foreground">Aguardando...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/game/${code}`)}
              disabled={players.length < 2}
              className="btn-neon flex-1 py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest disabled:opacity-40"
            >
              🎬 Iniciar Jogo
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/")}
            className="btn-neon-magenta flex-1 py-4 rounded-xl text-secondary-foreground font-display text-sm tracking-widest"
          >
            Sair da Sala
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function LobbyLoading() {
  return (
    <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
      <div className="text-primary font-display text-xl">Carregando sala...</div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<LobbyLoading />}>
      <LobbyContent />
    </Suspense>
  );
}
