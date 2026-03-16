"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import ConfettiEffect from "@/components/game/ConfettiEffect";
import { Trophy, Medal, Award, RotateCcw, Home, Loader2 } from "lucide-react";
import AvatarDisplay from "@/components/game/AvatarDisplay";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";

function ResultsContent() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [showConfetti, setShowConfetti] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionData = sessionStorage.getItem("player") || localStorage.getItem("player");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        setCurrentPlayerId(parsed.id);
      }
    }
  }, []);

  const { room, players: realtimePlayers, isLoading: isRealtimeLoading } = useRealtimeRoom(code);

  const isHost = realtimePlayers.find(p => p.id === currentPlayerId)?.is_host || room?.host_id === currentPlayerId;

  useEffect(() => {
    if (room?.status === 'waiting') {
      router.push(`/lobby/${code}`);
    }
  }, [room?.status, code, router]);

  const handleRestart = async () => {
    if (!currentPlayerId) return;
    try {
      await fetch(`/api/rooms/${code}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentPlayerId })
      });
    } catch (err) {
      console.error("Error restarting:", err);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const podiumIcons = [
    <Trophy className="text-neon-yellow" size={32} key="trophy" />,
    <Medal className="text-muted-foreground" size={28} key="medal" />,
    <Award className="text-neon-orange" size={24} key="award" />,
  ];

  const podiumOrder = [1, 0, 2];
  const podiumHeights = ["h-44", "h-32", "h-24"];

  if (isRealtimeLoading) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <ParticleBackground />
        <div className="flex items-center gap-2 text-primary font-display text-xl">
          <Loader2 className="animate-spin" />
          Carregando resultados...
        </div>
      </div>
    );
  }

   const sorted = [...realtimePlayers].sort((a: any, b: any) => b.score - a.score);
   const top3 = sorted.slice(0, 3);

  return (
    <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center px-4 py-8">
      <ParticleBackground />
      {showConfetti && <ConfettiEffect />}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-xl w-full space-y-8"
      >
        <div className="text-center">
          <motion.h1
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="font-display text-4xl gradient-text mb-2"
          >
            🏆 FIM DE JOGO
          </motion.h1>
          <p className="text-muted-foreground font-ui">Sala {code}</p>
        </div>

        <div className="flex items-end justify-center gap-4">
          {podiumOrder.map((pos, visualIdx) => {
            const player = top3[pos];
            if (!player) return null;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + visualIdx * 0.2, type: "spring" }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: visualIdx * 0.3 }}
                  className="mb-2"
                >
                  {podiumIcons[pos]}
                </motion.div>
                <div className="mb-1">
                  <AvatarDisplay avatarId={player.avatar} size={48} fallbackText={player.name} />
                </div>
                 <p className={`font-ui font-bold text-sm ${player.id === currentPlayerId ? "text-primary anim-pulse" : "text-foreground"}`}>
                  {player.name} {player.id === currentPlayerId && "(Você)"}
                </p>
                <p className="font-display text-xs text-primary">{player.score} pts</p>
                <div className={`w-20 ${podiumHeights[pos]} mt-2 rounded-t-xl bg-gradient-to-t from-muted to-card border border-border flex items-start justify-center pt-3`}>
                  <span className="font-display text-lg text-muted-foreground">#{pos + 1}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="glass-card p-4 space-y-2">
          {sorted.map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
               className={`flex items-center gap-3 p-3 rounded-lg ${p.id === currentPlayerId ? "bg-primary/10 border border-primary/20" : "bg-muted/20"}`}
            >
              <span className="font-display text-sm text-muted-foreground w-6 text-center">#{i + 1}</span>
              <AvatarDisplay avatarId={p.avatar} size={28} fallbackText={p.name} />
               <span className={`font-ui font-semibold text-sm flex-1 ${p.id === currentPlayerId ? "text-primary" : ""}`}>
                {p.name} {p.id === currentPlayerId && <span className="text-[10px] text-primary/60 ml-1">(Você)</span>}
              </span>
              <span className="font-display text-sm text-primary">{p.score}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-3">
           {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRestart}
              className="btn-neon flex-1 py-4 rounded-xl text-primary-foreground font-display text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Jogar Novamente
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/")}
            className="btn-neon-magenta flex-1 py-4 rounded-xl text-secondary-foreground font-display text-xs tracking-widest flex items-center justify-center gap-2"
          >
            <Home size={16} /> Nova Sala
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
