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
  const lastAnswersCountRef = useRef<number>(0);

  const [isJoining, setIsJoining] = useState(false);

  const playerData = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem("player") || "{}") : {};
  const currentPlayer = players.find(p => p.id === playerData.id);
  const spectatorMode = currentPlayer?.status === 'ready';

  useEffect(() => {
    if (showRoundResult && (resultCountdown === null || resultCountdown === 0)) {
      setResultCountdown(room?.interval_time || 8);
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

  // --- NEW: Sync answered/feedback state on mount or when answers change (Fixes re-entry bug) ---
  useEffect(() => {
    if (players.length > 0 && answers.length > 0 && currentRound && !showRoundResult) {
      const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
      const myAnswers = answers.filter(a => a.player_id === playerData.id);
      const hasCorrect = myAnswers.some(a => a.is_correct);
      
      setAnswered(hasCorrect || myAnswers.length > 0);
      if (hasCorrect && currentRound.type !== 'boolean') {
        setFeedback("correct");
      }
    }
  }, [answers, players, currentRound, showRoundResult]);

  // --- NEW: Play sound for EVERYONE when ANYONE gets it right ---
  useEffect(() => {
    if (answers.length > lastAnswersCountRef.current) {
      const newAnswers = answers.slice(lastAnswersCountRef.current);
      const hasNewCorrect = newAnswers.some(a => a.is_correct);
      
      if (hasNewCorrect && !showRoundResult && currentRound?.type !== 'boolean') {
        const audio = new Audio('/sounds/msn.mp3?v=2');
        audio.play().catch(() => {});
      }
    }
    lastAnswersCountRef.current = answers.length;
  }, [answers, showRoundResult]);

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

            // Special handle for boolean reveal
            if (currentRound.type === 'boolean') {
              const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
              const myAnswer = data.answers?.find((a: any) => a.player_id === playerData.id);
              if (myAnswer) {
                if (myAnswer.is_correct) {
                  setFeedback("correct");
                  // Play sound only for those who got it right in boolean rounds
                  const audio = new Audio('/sounds/msn.mp3?v=2');
                  audio.play().catch(() => {});
                } else {
                  setFeedback("wrong");
                }
              }
            }

            if (isHost) {
              setTimeout(async () => {
                const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
                await fetch(`/api/rounds/${currentRound.id}/next`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId: playerData.sessionId }),
                });
              }, (room?.interval_time || 8) * 1000);
            }
          } catch (err) {
            // Silently fail or handle gracefully in UI
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
  };  const submitAnswer = async (overriddenAnswer?: string) => {
    const currentAnswer = overriddenAnswer || answer.trim();
    if (!currentAnswer || answered || !currentRound || showRoundResult || feedback === "correct") return;

    setAnswered(true);
    setFeedback(null);

    const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");

    // Calculate time offset for first round
    let startTimeRound = new Date(currentRound.started_at!).getTime();
    if (currentRound.round_number === 1) {
      startTimeRound += 7000;
    }
    const timeMs = Math.max(0, Date.now() - startTimeRound);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`/api/rounds/${currentRound.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          playerId: playerData.id,
          playerSessionId: playerData.sessionId,
          answer: currentAnswer,
          timeMs,
        }),
      });

      const data = await res.json();

      if (data.isCorrect) {
        // Only show feedback and score popup for non-boolean rounds
        if (currentRound.type !== 'boolean') {
          setFeedback("correct");
          setScorePopup(data.pointsEarned);
          setTimeout(() => setScorePopup(null), 800);
        }
        setAnswer(""); 
      } else {
        // Only show feedback for non-boolean rounds
        if (currentRound.type !== 'boolean') {
          setFeedback("wrong");
          setAnswered(false);
          // Small delay to ensure React has updated the DOM before focusing
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
        setAnswer(""); // Always clear input
      }
    } catch (err) {
      setFeedback("wrong");
      setAnswer("");
      setAnswered(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Removed local correct audio effect in favor of the global one above

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
                  
                  {currentRound.type === 'audio' && currentRound.audio_url && (
                    <div className="relative overflow-hidden rounded-lg group bg-primary/5 p-8 flex flex-col items-center justify-center gap-6 min-h-[16rem]">
                       <div className="relative">
                          <motion.div 
                            animate={{ scale: [1, 1.1, 1] }} 
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/40 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]"
                          >
                            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </motion.div>
                          
                          {/* Visualizer bars animation */}
                          <div className="flex gap-1 mt-4 justify-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ height: [8, 24, 8] }}
                                transition={{ duration: 0.5 + i * 0.1, repeat: Infinity }}
                                className="w-1.5 bg-primary/60 rounded-full"
                              />
                            ))}
                          </div>
                       </div>

                       <p className="text-primary font-display text-lg tracking-wide animate-pulse">
                         Ouvindo a trilha...
                       </p>

                       <audio 
                         src={currentRound.audio_url} 
                         ref={(el) => {
                           if (el) {
                             el.volume = 0.5;
                             if (preGameCountdown === null && !showRoundResult) {
                               el.play().catch(() => {});
                             } else {
                               el.pause();
                               el.currentTime = 0;
                             }
                           }
                         }}
                       />

                       {preGameCountdown !== null && (
                         <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg backdrop-blur-sm">
                           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                         </div>
                       )}
                    </div>
                  )}

                  {(currentRound.type === 'image' || !currentRound.type) && currentRound.image_url && currentRound.image_url.trim() !== '' && (
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
              {scorePopup !== null && (
                <motion.div
                  initial={{ scale: 0, y: 0 }}
                  animate={{ scale: 1.3, y: -60 }}
                  exit={{ opacity: 0, y: -100 }}
                  className={`absolute top-1/3 font-display text-3xl font-black ${scorePopup > 0 ? "text-neon-green glow-cyan" : "text-destructive glow-magenta"} pointer-events-none`}
                >
                  {scorePopup > 0 ? `+${scorePopup}` : scorePopup}
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
          ) : !showRoundResult && currentRound.type === 'boolean' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 mt-6 justify-center w-full"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={answered}
                onClick={() => {
                  setAnswer("Verdadeiro");
                  submitAnswer("Verdadeiro");
                }}
                className={`flex-1 py-6 rounded-2xl font-display text-xl tracking-widest uppercase transition-all shadow-lg ${
                  answered && answer === "Verdadeiro" 
                  ? "bg-neon-green text-black scale-95 shadow-neon-green/40" 
                  : "bg-background/10 border-2 border-neon-green text-neon-green hover:bg-neon-green/10"
                } disabled:opacity-50`}
              >
                Verdadeiro
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={answered}
                onClick={() => {
                  setAnswer("Falso");
                  submitAnswer("Falso");
                }}
                className={`flex-1 py-6 rounded-2xl font-display text-xl tracking-widest uppercase transition-all shadow-lg ${
                  answered && answer === "Falso" 
                  ? "bg-destructive text-black scale-95 shadow-destructive/40" 
                  : "bg-background/10 border-2 border-destructive text-destructive hover:bg-destructive/10"
                } disabled:opacity-50`}
              >
                Falso
              </motion.button>
            </motion.div>
          ) : !showRoundResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 mt-4 ${feedback === "wrong" ? "animate-[shake_0.3s_ease]" : ""}`}
            >
              <input
                ref={inputRef}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (feedback === "wrong") setFeedback(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                placeholder="Sua resposta..."
                disabled={feedback === "correct" || showRoundResult}
                className={`flex-1 bg-input border rounded-xl px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${feedback === "correct"
                  ? "border-neon-green neon-border-cyan"
                  : feedback === "wrong"
                    ? "border-destructive shake-wrong"
                    : "border-border focus:neon-border-cyan"
                  } disabled:opacity-50`}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => submitAnswer()}
                disabled={answered || !answer.trim() || feedback === "correct"}
                className="btn-neon px-6 py-3 rounded-xl text-primary-foreground font-display text-xs tracking-widest disabled:opacity-40"
              >
                Enviar
              </motion.button>
            </motion.div>
          )}

          <AnimatePresence>
            {feedback && !showRoundResult && currentRound.type !== 'boolean' && (
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
            <RankingList 
              players={players} 
              answers={answers} 
              currentPlayerId={JSON.parse(sessionStorage.getItem("player") || "{}").id || ""} 
              maxScore={room?.max_score || 120} 
              roundStatus={currentRound?.status}
              roundType={currentRound?.type}
            />
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
