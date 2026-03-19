"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import { Copy, Check, Crown, Loader2, Play, RefreshCw } from "lucide-react";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";
import ChatPanel from "@/components/game/ChatPanel";
import AvatarDisplay from "@/components/game/AvatarDisplay";

function LobbyContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  // Determine if user is host based on room data AND local storage
  const [playerData, setPlayerData] = useState<any>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionData = sessionStorage.getItem("player");
      if (sessionData) {
        setPlayerData(JSON.parse(sessionData));
      } else {
        const localData = localStorage.getItem("player");
        if (localData) {
          const parsed = JSON.parse(localData);
          setPlayerData(parsed);
          sessionStorage.setItem("player", localData);
        }
      }
    }
  }, []);

  const { room, players, isLoading: initialLoading } = useRealtimeRoom(code);
  
  const isHost = useMemo(() => {
    if (!room || !playerData) return searchParams.get("host") === "true";
    return room.host_id === playerData.sessionId;
  }, [room, playerData, searchParams]);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [maxScore, setMaxScore] = useState(120);
  const [difficulty, setDifficulty] = useState("all");
  const [timePerRound, setTimePerRound] = useState(20);
  const [intervalTime, setIntervalTime] = useState(8);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeSurprise, setIncludeSurprise] = useState(false);
  const [includeCustom, setIncludeCustom] = useState(false);
  const [onlyAudio, setOnlyAudio] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(interval);
  }, []);

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

  // 1. Sync local states with room data when it changes (for non-hosts or initial load)
  useEffect(() => {
    if (room) {
      // If we're not the host, we MUST follow the room rules from DB
      if (!isHost) {
        setMaxScore(room.max_score || 120);
        setDifficulty((room as any).difficulty || "all");
        setTimePerRound(room.time_per_round || 20);
        setIntervalTime((room as any).interval_time || 8);
        setIncludeAudio((room as any).include_audio ?? true);
        setIncludeSurprise((room as any).include_surprise ?? false);
        setIncludeCustom((room as any).include_custom ?? false);
        setOnlyAudio((room as any).only_audio ?? false);
      }
    }
  }, [room, isHost]);

  // 2. Host: Push rule changes to DB with debounce
  useEffect(() => {
    if (!isHost || !playerData || !room) return;

    const timeoutId = setTimeout(async () => {
      try {
        await fetch(`/api/rooms/${code}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: playerData.sessionId,
            maxScore,
            difficulty,
            includeAudio,
            includeSurprise,
            includeCustom,
            onlyAudio,
            timePerRound,
            intervalTime
          }),
        });
      } catch (err) {
        console.error("Failed to sync rules:", err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isHost, maxScore, difficulty, includeAudio, includeSurprise, includeCustom, onlyAudio, timePerRound, intervalTime, code, playerData]);

  // 3. Heartbeat Logic (Web Worker to avoid background throttling)
  useEffect(() => {
    if (!playerData?.id || !code) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/players/${playerData.id}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: playerData.sessionId }),
        });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    const workerCode = `
      let timer = null;
      self.onmessage = (e) => {
        if (e.data === 'start') {
          timer = setInterval(() => self.postMessage('tick'), 12000);
        } else if (e.data === 'stop') {
          clearInterval(timer);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = () => sendHeartbeat();
    worker.postMessage('start');
    sendHeartbeat();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsSyncing(true);
        sendHeartbeat();
        setTimeout(() => setIsSyncing(false), 800);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playerData?.id, playerData?.sessionId, code]);

  // 4. Auto-kick Logic (Host only)
  useEffect(() => {
    if (!isHost || !playerData?.id || !code) return;

    const checkKicks = async () => {
      const now = Date.now();
      for (const player of players) {
        if (player.id !== playerData.id && player.last_seen_at) {
          const lastSeen = new Date(player.last_seen_at).getTime();
          const inactiveSecs = (now - lastSeen) / 1000;
          
          if (inactiveSecs > 65) { // Threshold for 12s heartbeats (5x margin + buffer)
            console.log(`Lobby: Host kicking inactive player: ${player.name}`);
            fetch(`/api/players/${player.id}/kick`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: playerData.sessionId }),
            }).catch(() => {});
          }
        }
      }
    };

    const kickInterval = setInterval(checkKicks, 30000);
    return () => clearInterval(kickInterval);
  }, [isHost, players, playerData?.id, playerData?.sessionId, code]);

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      if (!playerData) throw new Error("Dados do jogador não encontrados");
      
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: playerData.sessionId,
          maxScore: maxScore,
          difficulty: difficulty,
          timePerRound: timePerRound,
          intervalTime: intervalTime,
          includeAudio: includeAudio,
          includeSurprise: includeSurprise,
          includeCustom: includeCustom,
          onlyAudio: onlyAudio
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

      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 bg-black/20 p-8 rounded-2xl border border-primary/20 shadow-2xl transition-all"
            >
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              <span className="font-display text-primary tracking-widest uppercase text-sm">
                Sincronizando...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {players.map((p: any, i: number) => {
                    const lastSeen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
                    const isDisconnected = p.last_seen_at ? (now - lastSeen > 40000) : false;
                    
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", delay: i * 0.05 }}
                        className={`glass-card p-4 text-center relative min-h-[110px] flex flex-col justify-center items-center transition-opacity ${isDisconnected ? "opacity-50 grayscale" : ""}`}
                      >
                        {p.is_host && (
                          <Crown size={14} className="absolute top-2 right-2 text-neon-yellow" />
                        )}
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          className="mb-2 flex-grow flex items-center justify-center"
                        >
                          <AvatarDisplay avatarId={p.avatar} size={36} fallbackText={p.name} />
                        </motion.div>
                        <p className="font-ui font-semibold text-xs truncate w-full" title={p.name}>{p.name}</p>
                        
                        {isDisconnected ? (
                          <span className="text-[8px] bg-destructive/20 text-destructive border border-destructive/30 px-1 rounded font-display uppercase tracking-wider mt-2">
                            DESCONECTADO
                          </span>
                        ) : (
                          <div className={`w-2 h-2 rounded-full mt-2 ${p.status === 'ready' ? "bg-neon-green" : "bg-muted-foreground"}`} />
                        )}
                      </motion.div>
                    );
                  })}
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
                  {isStarting ? <Loader2 className="animate-spin" /> : <Play size={20} />}
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
                
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
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
                        {maxScore} pontos
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
                        {difficulty === 'very_easy' ? 'Muito Fácil' : 
                         difficulty === 'easy' ? 'Fácil' : 
                         difficulty === 'medium' ? 'Médio' : 
                         difficulty === 'hard' ? 'Difícil' : 
                         difficulty === 'impossible' ? 'Impossível' : 'Todas'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-display text-muted-foreground tracking-widest uppercase cursor-pointer" htmlFor="audio-toggle">
                        Incluir Rodadas de Áudio
                      </label>
                      {isHost ? (
                        <input 
                          id="audio-toggle"
                          type="checkbox"
                          className="w-5 h-5 accent-neon-cyan bg-background border-border rounded cursor-pointer"
                          checked={includeAudio}
                          onChange={(e) => {
                            setIncludeAudio(e.target.checked);
                            if (e.target.checked) setTimePerRound(20);
                          }}
                        />
                      ) : (
                        <div className={`w-3 h-3 rounded-full ${includeAudio ? "bg-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.5)]" : "bg-muted-foreground/30"}`} />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-xs font-display text-muted-foreground tracking-widest uppercase cursor-pointer" htmlFor="surprise-toggle">
                        Rodada Surpresa (Roubo)
                      </label>
                      {isHost ? (
                        <input 
                          id="surprise-toggle"
                          type="checkbox"
                          className="w-5 h-5 accent-neon-magenta bg-background border-border rounded cursor-pointer"
                          checked={includeSurprise}
                          onChange={(e) => setIncludeSurprise(e.target.checked)}
                        />
                      ) : (
                        <div className={`w-3 h-3 rounded-full ${includeSurprise ? "bg-neon-magenta shadow-[0_0_8px_rgba(255,0,255,0.5)]" : "bg-muted-foreground/30"}`} />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-xs font-display text-muted-foreground tracking-widest uppercase cursor-pointer" htmlFor="custom-toggle">
                        Perguntas Personalizadas
                      </label>
                      {isHost ? (
                        <input 
                          id="custom-toggle"
                          type="checkbox"
                          className="w-5 h-5 accent-neon-yellow bg-background border-border rounded cursor-pointer"
                          checked={includeCustom}
                          onChange={(e) => setIncludeCustom(e.target.checked)}
                        />
                      ) : (
                        <div className={`w-3 h-3 rounded-full ${includeCustom ? "bg-neon-yellow shadow-[0_0_8px_rgba(255,190,0,0.5)]" : "bg-muted-foreground/30"}`} />
                      )}
                    </div>

                    {!isHost && (
                      <p className="text-[10px] text-muted-foreground/60 italic">
                        {includeAudio ? "Desafio musical ativado!" : "Apenas imagens e texto"}
                        {includeSurprise && " • Rodada surpresa habilitada!"}
                        {includeCustom && " • Perguntas personalizadas incluídas!"}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-display text-muted-foreground tracking-widest uppercase">
                      Tempo por Rodada
                    </label>
                    {isHost ? (
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-primary focus:outline-none focus:border-neon-cyan disabled:opacity-50"
                        value={timePerRound}
                        onChange={(e) => setTimePerRound(Number(e.target.value))}
                        disabled={includeAudio}
                      >
                        <option value={10}>10 Segundos</option>
                        <option value={15}>15 Segundos</option>
                        <option value={20}>20 Segundos (Padrão)</option>
                        <option value={25}>25 Segundos</option>
                        <option value={30}>30 Segundos</option>
                      </select>
                    ) : (
                      <div className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-body text-primary/70">
                        {timePerRound} Segundos
                      </div>
                    )}
                    {isHost && includeAudio && (
                      <p className="text-[10px] text-neon-cyan/70 mt-1 uppercase font-display letter-spacing-widest">
                        * Áudio trava tempo em 20s
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-display text-muted-foreground tracking-widest uppercase">
                      Intervalo entre Rodadas
                    </label>
                    {isHost ? (
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-primary focus:outline-none focus:border-neon-cyan"
                        value={intervalTime}
                        onChange={(e) => setIntervalTime(Number(e.target.value))}
                      >
                        <option value={5}>Curto (5s)</option>
                        <option value={8}>Padrão (8s)</option>
                        <option value={10}>Médio (10s)</option>
                        <option value={14}>Longo (14s)</option>
                      </select>
                    ) : (
                      <div className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-body text-primary/70">
                        {intervalTime} Segundos
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
