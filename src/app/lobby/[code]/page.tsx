"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { Copy, Check, Crown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

function LobbyContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "true";
  const code = params.code as string;
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }

        setRoom(data.room);
        setPlayers(data.players || []);
      } catch (err) {
        setError("Erro ao carregar sala");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [code]);

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`lobby:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const res = await fetch(`/api/rooms/${code}`);
          const data = await res.json();
          setPlayers(data.players || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, code]);

  const copyCode = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
      
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playerData.sessionId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        router.push(`/game/${code}`);
      } else {
        setError(data.error || "Erro ao iniciar jogo");
      }
    } catch (err) {
      setError("Erro ao iniciar jogo");
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <ParticleBackground />
        <div className="relative z-10 flex items-center gap-2 text-primary font-display text-xl">
          <Loader2 className="animate-spin" />
          Carregando sala...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <ParticleBackground />
        <div className="relative z-10 text-center">
          <p className="text-red-500 font-display text-xl mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="btn-neon px-6 py-3 rounded-xl">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen gradient-bg-animated px-4 py-8 flex flex-col items-center">
      <ParticleBackground />

      <div className="relative z-10 max-w-2xl w-full space-y-6">
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
            {players.length}/{room?.max_players || 16} jogadores
          </p>
        </motion.div>

        <div className="glass-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {players.map((p: any, i: number) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", delay: i * 0.05 }}
                  className="glass-card p-4 text-center relative"
                >
                  {p.is_host && (
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
                  <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${p.status === 'ready' ? "bg-neon-green" : "bg-muted-foreground"}`} />
                </motion.div>
              ))}
            </AnimatePresence>

            {Array.from({ length: Math.max(0, (room?.max_players || 16) - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="border border-dashed border-border rounded-xl p-4 text-center opacity-30">
                <div className="text-3xl mb-2">❓</div>
                <p className="font-ui text-sm text-muted-foreground">Aguardando...</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartGame}
              disabled={players.length < 2 || isStarting}
              className="btn-neon flex-1 py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isStarting ? <Loader2 className="animate-spin" /> : "🎬"}
              {isStarting ? "Iniciando..." : "Iniciar Jogo"}
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
      <ParticleBackground />
      <div className="relative z-10 text-primary font-display text-xl">Carregando sala...</div>
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
