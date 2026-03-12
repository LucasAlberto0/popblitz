"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TimerRing from "@/components/game/TimerRing";
import RankingList from "@/components/game/RankingList";
import ChatPanel from "@/components/game/ChatPanel";
import { Loader2 } from "lucide-react";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";

function GameContent() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { room, players, currentRound, answers, isLoading: initialLoading } = useRealtimeRoom(code);
  const [isHost, setIsHost] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [scorePopup, setScorePopup] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [preGameCountdown, setPreGameCountdown] = useState<number | null>(null);
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioPlayedRef = useRef<boolean>(false);

  const [isJoining, setIsJoining] = useState(false);

  const playerData = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem("player") || "{}") : {};
  const currentPlayer = players.find(p => p.id === playerData.id);
  const spectatorMode = currentPlayer?.status === 'ready';

  useEffect(() => {
    if (showRoundResult && (resultCountdown === null || resultCountdown === 0)) {
      setResultCountdown(10);
    } else if (!showRoundResult) {
      setResultCountdown(null);
    }
  }, [showRoundResult]);

  useEffect(() => {
    if (resultCountdown !== null && resultCountdown > 0 && showRoundResult) {
      const timer = setTimeout(() => setResultCountdown(resultCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resultCountdown, showRoundResult]);

  useEffect(() => {
    if (currentRound?.round_number === 1 && preGameCountdown === null && !showRoundResult && !answered) {
      setPreGameCountdown(6);
    }
  }, [currentRound?.round_number]);

  useEffect(() => {
    if (preGameCountdown !== null && preGameCountdown > 0) {
      const timer = setTimeout(() => setPreGameCountdown(preGameCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (preGameCountdown === 0) {
      const timer = setTimeout(() => setPreGameCountdown(null), 1000); // Hide after showing "JÁ!"
      return () => clearTimeout(timer);
    }
  }, [preGameCountdown]);

  useEffect(() => {
    if (currentRound?.status === 'active' && !showRoundResult && preGameCountdown === null) {
      // Focus input when a new round starts or round result is closed
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentRound?.id, currentRound?.status, showRoundResult, preGameCountdown]);

  useEffect(() => {
    if (room) {
      const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
      setIsHost(room.host_id === playerData.sessionId);
    }
  }, [room]);

  useEffect(() => {
    if (room?.status === 'finished') {
      router.push(`/results/${code}`);
    }
  }, [room?.status, code, router]);


  useEffect(() => {
    if (!currentRound || showRoundResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      if (currentRound && currentRound.started_at) {
        const serverStart = new Date(currentRound.started_at).getTime();
        const now = Date.now();
        let elapsedSeconds = Math.floor((now - serverStart) / 1000);
        
        // Offset 7 seconds for round 1 due to Pre-Game Countdown (6 to 0, plus 1s showing JÁ)
        if (currentRound.round_number === 1) {
          elapsedSeconds -= 7;
        }

        const limit = room?.time_per_round || 20;

        if (elapsedSeconds < 0) {
          setTimeLeft(limit);
          return;
        }

        const remaining = Math.max(0, limit - elapsedSeconds);

        setTimeLeft(remaining);

        if (remaining === 0 && !showRoundResult) {
          handleTimeUp();
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [currentRound, room?.time_per_round, showRoundResult]);

  useEffect(() => {
    if (currentRound) {
      if (currentRound.status === "finished") {
        const handleFinishedRound = async () => {
          try {
            const res = await fetch(`/api/rounds/${currentRound.id}/finish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: JSON.parse(sessionStorage.getItem("player") || "{}").sessionId }),
            });
            const data = await res.json();

            setRoundResult(data);
            setShowRoundResult(true);

            if (isHost) {
              setTimeout(async () => {
                const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
                await fetch(`/api/rounds/${currentRound.id}/next`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId: playerData.sessionId }),
                });
              }, 10000);
            }
          } catch (err) {
            console.error("Error handling round finish:", err);
          }
        };

        if (!showRoundResult) {
          handleFinishedRound();
        }

      } else if (currentRound.status === "active" && currentRound.id !== roundResult?.round?.id) {
        setTimeLeft(room?.time_per_round || 20);
        setAnswer("");
        setFeedback(null);
        setAnswered(false);
        setShowRoundResult(false);
        setRoundResult(null);
        startTimeRef.current = Date.now();
        audioPlayedRef.current = false;
      }
    }
  }, [currentRound, isHost, room?.time_per_round, showRoundResult, roundResult?.round?.id]);


  const handleTimeUp = async () => {
    if (isHost && currentRound && !showRoundResult) {
      const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
      await fetch(`/api/rounds/${currentRound.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playerData.sessionId }),
      });
    }
    // Non-hosts just wait for the Realtime 'finished' event
  };

  const submitAnswer = async () => {
    if (!answer.trim() || answered || !currentRound || showRoundResult) return;

    let startTimeRound = new Date(currentRound.started_at!).getTime();
    if (currentRound.round_number === 1) {
      startTimeRound += 7000;
    }
    const timeMs = Math.max(0, Date.now() - startTimeRound);
    
    setAnswered(true);

    const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");

    try {
      const res = await fetch(`/api/rounds/${currentRound.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: playerData.id,
          playerSessionId: playerData.sessionId,
          answer: answer.trim(),
          timeMs,
        }),
      });

      const data = await res.json();

      if (data.isCorrect) {
        setFeedback("correct");
        setScorePopup(data.pointsEarned);
        setTimeout(() => setScorePopup(null), 800);
      } else {
        setFeedback("wrong");
        setAnswered(false);
        setAnswer(""); // Clear for another try
        // Use a small timeout to ensure React has re-enabled the input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
      }
    } catch (err) {
      setFeedback("wrong");
      setAnswered(false);
      setAnswer("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  };

  useEffect(() => {
    if (feedback === "correct" && !showRoundResult && !audioPlayedRef.current) {
       audioPlayedRef.current = true;
       const audio = new Audio('/sounds/msn.mp3?v=2');
       audio.play().catch(e => console.log("Audio play prevented:", e));
    }
  }, [feedback, showRoundResult]);

  if (initialLoading) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <div className="flex items-center gap-2 text-primary font-display text-xl">
          <Loader2 className="animate-spin" />
          Carregando jogo...
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary font-display text-xl mb-4">Aguardando próxima rodada...</p>
          <Loader2 className="animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen gradient-bg-animated">
      <div className="relative z-10 h-screen flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col p-4 lg:p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="font-display text-[10px] text-primary/70 tracking-widest uppercase">
                Rodada {currentRound.round_number}
              </span>
              <span className="font-display text-sm font-black gradient-text">
                ALVO: {room?.max_score || 120} PTS
              </span>
            </div>
            <TimerRing timeLeft={timeLeft} totalTime={room?.time_per_round || 30} />
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {preGameCountdown !== null ? (
                <motion.div
                  key="countdown-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm rounded-2xl overflow-hidden"
                >
                  <div
                    className="flex flex-col items-center gap-4"
                  >
                    <motion.span
                      key={`count-${preGameCountdown}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200 }}
                      className="font-display text-[120px] font-black gradient-text drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      {preGameCountdown === 0 ? "JÁ!" : preGameCountdown}
                    </motion.span>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-primary font-display tracking-[0.5em] text-sm uppercase -mt-4 opacity-70"
                    >
                      Prepare-se
                    </motion.p>
                  </div>
                </motion.div>
              ) : null}

              {!showRoundResult ? (
                <motion.div
                  key={`q-${currentRound.round_number}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className={`glass-card p-2 max-w-lg w-full flex flex-col gap-4 transition-all duration-700 ${preGameCountdown !== null ? "blur-md brightness-50 grayscale select-none" : ""
                    }`}
                >
                  {(currentRound as any).question && (
                    <div className={`px-4 py-6 bg-primary/10 rounded-lg border border-primary/20 relative ${!currentRound.image_url ? "min-h-[16rem] flex items-center justify-center" : ""}`}>
                      <p className={`font-display text-primary text-center ${!currentRound.image_url ? "text-xl sm:text-3xl font-bold" : "text-sm sm:text-base"}`}>
                        {(currentRound as any).question}
                      </p>
                      
                      {!currentRound.image_url && preGameCountdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg backdrop-blur-sm">
                          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {currentRound.image_url && currentRound.image_url.trim() !== '' && (
                    <div className="relative overflow-hidden rounded-lg group bg-white p-2 sm:p-4">
                      <img
                        src={currentRound.image_url}
                        alt="Quiz"
                        className="w-full h-48 sm:h-64 lg:h-[28rem] object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="flex items-center justify-center w-full h-48 sm:h-64 lg:h-[28rem] text-gray-400 text-sm">🖼️ Imagem indisponível</div>';
                          }
                        }}
                      />
                      {preGameCountdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={`result-${currentRound.round_number}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-8 text-center max-w-md w-full"
                >
                  <h3 className="font-display text-lg text-primary mb-2">Resposta Correta</h3>
                  <p className="font-display text-3xl gradient-text mb-4">{currentRound.answer}</p>
                  {roundResult && roundResult.answers && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground font-ui mb-2">Acertos:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {roundResult.answers
                          .filter((a: any) => a.is_correct)
                          .map((a: any) => (
                            <span key={a.id} className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded">
                              {a.player?.name || "Jogador"}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground font-ui mb-6">
                    {roundResult?.gameFinished
                      ? <span className="text-lg font-bold text-primary block">🏆 {roundResult?.winner?.name || "Alguém"} venceu o jogo!</span>
                      : (
                        <div className="flex flex-col gap-1">
                          <span>Próxima rodada em</span>
                          <motion.span
                            key={resultCountdown}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-xl font-black text-primary"
                          >
                            {resultCountdown}s
                          </motion.span>
                        </div>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {scorePopup && (
                <motion.div
                  initial={{ scale: 0, y: 0 }}
                  animate={{ scale: 1.3, y: -60 }}
                  exit={{ opacity: 0, y: -100 }}
                  className="absolute top-1/3 font-display text-3xl font-black text-neon-green glow-cyan pointer-events-none"
                >
                  +{scorePopup}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!showRoundResult && spectatorMode ? (
            <div className="flex justify-center mt-4">
              <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 disabled={isJoining}
                 onClick={async () => {
                    setIsJoining(true);
                    try {
                      const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
                      await fetch(`/api/players/${currentPlayer.id}/participate`, {
                         method: 'POST',
                         headers: { "Content-Type": "application/json" },
                         body: JSON.stringify({ sessionId: playerData.sessionId })
                      });
                    } finally {
                      setIsJoining(false);
                    }
                 }}
                 className="btn-neon-magenta px-10 py-4 rounded-xl text-primary-foreground font-display tracking-widest uppercase shadow-lg shadow-magenta/20 flex items-center gap-3 disabled:opacity-50"
              >
                 {isJoining ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                 {isJoining ? "Entrando..." : "Entrar no Jogo"}
              </motion.button>
            </div>
          ) : !showRoundResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 mt-4 ${feedback === "wrong" ? "animate-[shake_0.3s_ease]" : ""}`}
            >
              <input
                ref={inputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                placeholder="Sua resposta..."
                disabled={answered}
                className={`flex-1 bg-input border rounded-xl px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${feedback === "correct"
                  ? "border-neon-green neon-border-cyan"
                  : feedback === "wrong"
                    ? "border-destructive"
                    : "border-border focus:neon-border-cyan"
                  } disabled:opacity-50`}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={submitAnswer}
                disabled={answered || !answer.trim()}
                className="btn-neon px-6 py-3 rounded-xl text-primary-foreground font-display text-xs tracking-widest disabled:opacity-40"
              >
                Enviar
              </motion.button>
            </motion.div>
          )}

          <AnimatePresence>
            {feedback && !showRoundResult && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center text-sm font-ui mt-2 ${feedback === "correct" ? "text-neon-green" : "text-destructive"
                  }`}
              >
                {feedback === "correct" ? "✅ Acertou!" : "❌ Errou!"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-3 p-4 lg:p-6 lg:border-l border-border overflow-y-auto">
          <div className="flex-1 min-h-0">
            <RankingList players={players} answers={answers} currentPlayerId={JSON.parse(sessionStorage.getItem("player") || "{}").id || ""} maxScore={room?.max_score || 120} />
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel roomCode={code} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense>
      <GameContent />
    </Suspense>
  );
}
