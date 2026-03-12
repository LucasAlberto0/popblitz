"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { Copy, Check, Crown, Loader2 } from "lucide-react";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";
import ChatPanel from "@/components/game/ChatPanel";

function LobbyContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const isHost = searchParams.get("host") === "true";
  
  const { room, players, isLoading: initialLoading } = useRealtimeRoom(code);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [maxScore, setMaxScore] = useState(120);
  const [difficulty, setDifficulty] = useState("all");
  const [timePerRound, setTimePerRound] = useState(20);

  // Redirect when game starts
  useEffect(() => {
    if (room?.status === 'playing') {
      router.push(`/game/${code}`);
    }
  }, [room?.status, code, router]);

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
        body: JSON.stringify({ 
          sessionId: playerData.sessionId,
          maxScore: maxScore,
          difficulty: difficulty,
          timePerRound: timePerRound
        }),
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

  if (initialLoading) {
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

      <div className="relative z-10 max-w-5xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                <AnimatePresence>
                  {players.map((p: any, i: number) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", delay: i * 0.05 }}
                      className="glass-card p-4 text-center relative min-h-[110px] flex flex-col justify-center items-center"
                    >
                      {p.is_host && (
                        <Crown size={14} className="absolute top-2 right-2 text-neon-yellow" />
                      )}
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        className="text-3xl mb-2 flex-grow flex items-center justify-center"
                      >
                        {p.avatar}
                      </motion.div>
                      <p className="font-ui font-semibold text-xs truncate w-full" title={p.name}>{p.name}</p>
                      <div className={`w-2 h-2 rounded-full mt-2 ${p.status === 'ready' ? "bg-neon-green" : "bg-muted-foreground"}`} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {Array.from({ length: Math.max(0, (room?.max_players || 16) - players.length) }).slice(0, 10).map((_, i) => (
                  <div key={`empty-${i}`} className="border border-dashed border-border rounded-xl p-4 text-center opacity-30 min-h-[110px] flex flex-col justify-center items-center">
                    <div className="text-3xl mb-2 flex-grow flex items-center justify-center">❓</div>
                    <p className="font-ui text-xs text-muted-foreground">Vazio</p>
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
          
          <div className="lg:col-span-1 space-y-6 flex flex-col h-auto min-h-[500px]">
            <div className="glass-card p-6 flex flex-col gap-6 flex-shrink-0">
              <div>
                <h3 className="font-display text-lg text-primary mb-4 flex items-center gap-2">
                  <Crown size={18} className="text-neon-yellow" />
                  Regras do Jogo
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-display text-muted-foreground tracking-widest uppercase">
                      Alvo de Pontos
                    </label>
                    {isHost ? (
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-primary focus:outline-none focus:border-neon-cyan"
                        value={maxScore}
                        onChange={(e) => setMaxScore(Number(e.target.value))}
                      >
                        <option value={80}>Curto (80 pts)</option>
                        <option value={100}>Médio (100 pts)</option>
                        <option value={120}>Padrão (120 pts)</option>
                        <option value={140}>Longo (140 pts)</option>
                        <option value={200}>Maratona (200 pts)</option>
                      </select>
                    ) : (
                      <div className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-body text-primary/70">
                        {room?.max_score || 120} pontos
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-display text-muted-foreground tracking-widest uppercase">
                      Dificuldade
                    </label>
                    {isHost ? (
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-primary focus:outline-none focus:border-neon-cyan"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option value="all">Todas</option>
                        <option value="very_easy">Muito Fácil</option>
                        <option value="easy">Fácil</option>
                        <option value="medium">Médio</option>
                        <option value="hard">Difícil</option>
                        <option value="impossible">Impossível</option>
                      </select>
                    ) : (
                      <div className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-body text-primary/70">
                        {(room as any)?.difficulty === 'very_easy' ? 'Muito Fácil' : 
                         (room as any)?.difficulty === 'easy' ? 'Fácil' : 
                         (room as any)?.difficulty === 'medium' ? 'Médio' : 
                         (room as any)?.difficulty === 'hard' ? 'Difícil' : 
                         (room as any)?.difficulty === 'impossible' ? 'Impossível' : 'Todas'}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-display text-muted-foreground tracking-widest uppercase">
                      Tempo por Rodada
                    </label>
                    {isHost ? (
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-primary focus:outline-none focus:border-neon-cyan"
                        value={timePerRound}
                        onChange={(e) => setTimePerRound(Number(e.target.value))}
                      >
                        <option value={10}>10 Segundos</option>
                        <option value={15}>15 Segundos</option>
                        <option value={20}>20 Segundos (Padrão)</option>
                        <option value={25}>25 Segundos</option>
                        <option value={30}>30 Segundos</option>
                      </select>
                    ) : (
                      <div className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-body text-primary/70">
                        {room?.time_per_round || 20} Segundos
                      </div>
                    )}
                  </div>
                  
                  {!isHost && (
                    <p className="text-xs text-muted-foreground italic mt-4">
                      * Apenas o anfitrião pode alterar as regras
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-[300px]">
              <ChatPanel roomCode={code} />
            </div>
          </div>
          
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
