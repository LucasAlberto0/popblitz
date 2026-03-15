"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TimerRing from "@/components/game/TimerRing";
import RankingList from "@/components/game/RankingList";
import ChatPanel from "@/components/game/ChatPanel";
import { Loader2, Settings, X, Crown, Info, Copy, Check, Volume2, VolumeX } from "lucide-react";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";

function GameContent() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { room, players, currentRound, upcomingRounds, answers, isLoading: initialLoading } = useRealtimeRoom(code);
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
  const [isRaffling, setIsRaffling] = useState(false);
  const [rafflePlayerIndex, setRafflePlayerIndex] = useState(0);
  const lastRaffledRoundRef = useRef<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Mobile Audio Reliability State
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const soundBankRef = useRef<{
    correct: HTMLAudioElement | null;
    wrong: HTMLAudioElement | null;
    tick: HTMLAudioElement | null;
  }>({
    correct: null,
    wrong: null,
    tick: null
  });

  // Use localStorage instead of sessionStorage for persistence
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

  const currentPlayer = useMemo(() => players.find(p => p.id === playerData?.id), [players, playerData]);
  const spectatorMode = currentPlayer?.status === 'ready';
  const isLuckyPlayer = currentRound?.lucky_player_id === playerData?.id;
  const isSurpriseRound = currentRound?.type === 'surprise';

  // --- NEW: Audio Unlock & Pooling Logic ---
  useEffect(() => {
    // Prevent multiple initializations
    if (soundBankRef.current.correct) return;

    // Pre-instantiate sounds
    const correct = new Audio('/sounds/msn.mp3?v=2');
    // const wrong = new Audio('/sounds/wrong.mp3'); // Add if you have a wrong sound
    
    soundBankRef.current = {
      correct,
      wrong: null,
      tick: null
    };

    // Attempt to auto-check if already unlocked (some browsers allow after interaction)
    const checkAudio = () => {
      if (correct.paused === false) {
        setIsAudioEnabled(true);
      }
    };
    
    window.addEventListener('click', checkAudio, { once: true });
    return () => window.removeEventListener('click', checkAudio);
  }, []);

  const unlockAudio = async () => {
    const { correct } = soundBankRef.current;
    if (!correct) return;

    try {
      // Play a tiny bit of the sound to "unlock" the audio context/interface
      correct.volume = 0.01;
      await correct.play();
      correct.pause();
      correct.currentTime = 0;
      correct.volume = 0.5;
      
      setIsAudioEnabled(true);
      // Small feedback
      const audio = new Audio('/sounds/msn.mp3?v=2');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (err) {
      console.warn("Audio unlock failed:", err);
    }
  };

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
    if (room && playerData) {
      setIsHost(room.host_id === playerData.sessionId);
    }
  }, [room, playerData]);

  // --- NEW: Sync answered/feedback state on mount or when answers change (Fixes re-entry bug) ---
  useEffect(() => {
    if (players.length > 0 && answers.length > 0 && currentRound && !showRoundResult) {
      const myAnswers = answers.filter(a => a.player_id === playerData?.id);
      const hasCorrect = myAnswers.some(a => a.is_correct);
      
      setAnswered(hasCorrect || (currentRound.type === 'boolean' && myAnswers.length > 0));
      if (hasCorrect && currentRound.type !== 'boolean') {
        setFeedback("correct");
      }
    }
  }, [answers, players, currentRound, showRoundResult, playerData]);

  // Preload Next Round assets 4 seconds before it begins
  useEffect(() => {
    if (showRoundResult && resultCountdown !== null && resultCountdown <= 4) {
      const nextRoundData = upcomingRounds.find(r => r.round_number === (currentRound?.round_number || 0) + 1);
      if (nextRoundData) {
        if (nextRoundData.image_url) {
          const img = new Image();
          img.src = nextRoundData.image_url;
        }
        if (nextRoundData.audio_url) {
          const audio = new Audio();
          audio.src = nextRoundData.audio_url;
          audio.load();
        }
      }
    }
  }, [showRoundResult, resultCountdown, upcomingRounds, currentRound?.round_number]);

  // Hidden Preloader Component to force DOM-level caching
  const Preloader = useMemo(() => {
    return (
      <div className="fixed -left-[9999px] -top-[9999px] w-1 h-1 overflow-hidden pointer-events-none" aria-hidden="true">
        {upcomingRounds.map((round) => (
          <React.Fragment key={`preload-${round.id}`}>
            {round.image_url && (
              <img 
                src={round.image_url} 
                alt="preload" 
                loading="eager"
                decoding="async"
              />
            )}
            {round.audio_url && (
              <audio src={round.audio_url} preload="auto" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }, [upcomingRounds]);

  // --- NEW: Raffle Animation Effect ---
  useEffect(() => {
    // If not a surprise round or not active, ensure we're not "raffling"
    if (!isSurpriseRound || currentRound?.status !== 'active' || showRoundResult) {
      setIsRaffling(false);
      return;
    }

    // If we already started raffling this round, don't start it again
    if (lastRaffledRoundRef.current === currentRound.id) {
      return;
    }

    // Start raffle
    setIsRaffling(true);
    lastRaffledRoundRef.current = currentRound.id;
    
    let count = 0;
    const totalSteps = 25; 
    
    // Capture players at start to avoid dependency issues
    const currentPlayers = [...players];
    const luckyId = currentRound.lucky_player_id;

    const interval = setInterval(() => {
      if (currentPlayers.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentPlayers.length);
        setRafflePlayerIndex(randomIndex);
      }
      count++;
      
      if (count >= totalSteps) {
        clearInterval(interval);
        
        // Land firmly on the actual lucky player
        const actualLuckyIndex = currentPlayers.findIndex(p => p.id === luckyId);
        if (actualLuckyIndex !== -1) {
          setRafflePlayerIndex(actualLuckyIndex);
        }

        setTimeout(() => {
          setIsRaffling(false);
        }, 1500);
      }
    }, 100); 

    return () => {
      clearInterval(interval);
    }
  }, [isSurpriseRound, currentRound?.id, currentRound?.status, showRoundResult]);

  // --- NEW: Play sound for EVERYONE when ANYONE gets it right ---
  useEffect(() => {
    if (answers.length > lastAnswersCountRef.current) {
      const newAnswers = answers.slice(lastAnswersCountRef.current);
      const hasNewCorrect = newAnswers.some(a => a.is_correct);
      
      if (hasNewCorrect && !showRoundResult && currentRound?.type !== 'boolean') {
        const sound = soundBankRef.current.correct;
        if (sound && isAudioEnabled) {
          sound.currentTime = 0;
          sound.play().catch(() => {
            // Fallback if pooling fails
            const audio = new Audio('/sounds/msn.mp3?v=2');
            audio.play().catch(() => {});
          });
        }
      }
    }
    lastAnswersCountRef.current = answers.length;
  }, [answers, showRoundResult, isAudioEnabled]);

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

        const limit = currentRound.type === 'surprise' ? 50 : (room?.time_per_round || 30);
        
        // --- NEW: Handle Raffle Pause ---
        if (isSurpriseRound && isRaffling) {
          setTimeLeft(limit);
          return;
        }

        // Subtract raffle duration (approx 4.5s: 2.5s steps + 1.5s delay + 0.5s safety) 
        // to prevent jump when raffle ends
        if (isSurpriseRound && !isRaffling) {
          elapsedSeconds -= 4; 
        }
        // -------------------------------
        
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
  }, [currentRound, room?.time_per_round, showRoundResult, isRaffling]);

  useEffect(() => {
    if (currentRound) {
      if (currentRound.status === "finished") {
        const handleFinishedRound = async () => {
          try {
            const res = await fetch(`/api/rounds/${currentRound.id}/finish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: playerData?.sessionId }),
            });
            const data = await res.json();

            setRoundResult(data);
            setShowRoundResult(true);

            // Special handle for boolean reveal
            if (currentRound.type === 'boolean') {
              const myAnswer = data.answers?.find((a: any) => a.player_id === playerData?.id);
              if (myAnswer) {
                // Show score popup for boolean rounds
                setScorePopup(myAnswer.points_earned);
                setTimeout(() => setScorePopup(null), 1500);

                if (myAnswer.is_correct) {
                  setFeedback("correct");
                  // Play sound only for those who got it right in boolean rounds
                  const sound = soundBankRef.current.correct;
                  if (sound && isAudioEnabled) {
                    sound.currentTime = 0;
                    sound.play().catch(() => {});
                  }
                } else {
                  setFeedback("wrong");
                }
              }
            }

            if (isHost) {
              setTimeout(async () => {
                await fetch(`/api/rounds/${currentRound.id}/next`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId: playerData?.sessionId }),
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
  }, [currentRound, isHost, room?.time_per_round, showRoundResult, roundResult?.round?.id, playerData]);


  const handleTimeUp = async () => {
    if (isHost && currentRound && !showRoundResult) {
      await fetch(`/api/rounds/${currentRound.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playerData?.sessionId }),
      });
    }
    // Non-hosts just wait for the Realtime 'finished' event
  };  const submitAnswer = async (overriddenAnswer?: string) => {
    const currentAnswer = overriddenAnswer || answer.trim();
    if (!currentAnswer || answered || !currentRound || showRoundResult || feedback === "correct") return;

    setAnswered(true);
    setFeedback(null);

    // const playerData = JSON.parse(sessionStorage.getItem("player") || "{}"); // Removed: Use playerData state directly

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
          playerId: playerData?.id,
          playerSessionId: playerData?.sessionId,
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

  const handleSteal = async (victimId: string) => {
    if (!currentRound || !isLuckyPlayer || isJoining) return;
    
    setIsJoining(true); // Reuse isJoining for steal loading state
    const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");
    
    try {
      await fetch(`/api/rounds/${currentRound.id}/steal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thiefId: playerData.id,
          victimId,
          sessionId: playerData.sessionId
        }),
      });

      // Show +10 popup
      setScorePopup(10);
      setTimeout(() => setScorePopup(null), 1000);

      // Correct sound for the thief
      const sound = soundBankRef.current.correct;
      if (sound && isAudioEnabled) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }
    } catch (err) {
      console.error('Theft failed:', err);
    } finally {
      setIsJoining(false);
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
    <div className="relative h-[100dvh] bg-background overflow-hidden flex flex-col">
      {/* Hidden Asset Preloader */}
      {Preloader}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 h-full overflow-hidden">
        {/* Main Game Area */}
        <div className="flex-[2] lg:flex-1 flex flex-col p-3 lg:p-6 min-w-0 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="font-display text-[10px] text-primary/70 tracking-widest uppercase">
                Rodada {currentRound.round_number}
              </span>
              <span className="font-display text-sm font-black gradient-text">
                ALVO: {room?.max_score || 120} PTS
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={unlockAudio}
                className={`p-2 rounded-full border shadow-lg transition-all ${
                  isAudioEnabled 
                  ? "bg-neon-green/10 border-neon-green/30 text-neon-green" 
                  : "bg-destructive/10 border-destructive/30 text-destructive animate-pulse"
                }`}
                title={isAudioEnabled ? "Áudio Ativado" : "Ativar Áudio"}
              >
                {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-primary transition-colors shadow-lg"
                title="Configurações da Sala"
              >
                <Settings size={18} />
              </motion.button>
              <TimerRing timeLeft={timeLeft} totalTime={room?.time_per_round || 30} />
            </div>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                onClick={() => setShowSettings(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="glass-card w-full max-w-sm overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/20 text-primary">
                        <Info size={18} />
                      </div>
                      <h3 className="font-display text-lg text-white">Informações da Sala</h3>
                    </div>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="p-2 rounded-full hover:bg-white/10 text-muted-foreground transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Room Code */}
                    <div className="space-y-2 text-center">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Código da Sala</span>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-black text-primary tracking-[0.2em]">{code}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} className="text-muted-foreground" />}
                        </button>
                      </div>
                    </div>

                    {/* Config Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-display text-muted-foreground">Alvo</span>
                        <p className="text-sm font-bold text-white">{room?.max_score || 120} PTS</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-display text-muted-foreground">Tempo</span>
                        <p className="text-sm font-bold text-white">{room?.time_per_round || 20}s / rodada</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-display text-muted-foreground">Dificuldade</span>
                        <p className="text-sm font-bold text-white">
                          {room?.difficulty === 'very_easy' ? 'M. Fácil' : 
                           room?.difficulty === 'easy' ? 'Fácil' : 
                           room?.difficulty === 'medium' ? 'Média' : 
                           room?.difficulty === 'hard' ? 'Difícil' : 
                           room?.difficulty === 'impossible' ? 'Impossível' : 'Todas'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-display text-muted-foreground">Modos</span>
                        <div className="flex gap-1">
                           {room?.include_audio && <span title="Áudio" className="text-xs">🎵</span>}
                           {room?.include_surprise && <span title="Roubo" className="text-xs">🦹</span>}
                        </div>
                      </div>
                    </div>

                    {/* Host Info */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-display text-muted-foreground">Anfitrião</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{players.find(p => p.is_host)?.avatar}</span>
                            <p className="text-sm font-bold text-neon-yellow">{players.find(p => p.is_host)?.name || "Desconhecido"}</p>
                          </div>
                        </div>
                        <Crown size={20} className="text-neon-yellow/40" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 flex justify-center">
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="text-xs font-display text-primary uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  className={`glass-card p-2 sm:p-4 max-w-lg w-full flex flex-col gap-3 transition-all duration-700 max-h-full overflow-y-auto custom-scrollbar ${preGameCountdown !== null ? "blur-md brightness-50 grayscale select-none" : ""
                    }`}
                >
                  {(currentRound as any).question && (
                    <div className={`px-4 ${isSurpriseRound ? "py-3 bg-secondary/10 border-secondary/20" : "py-6 bg-primary/10 border-primary/20"} rounded-lg border relative ${!currentRound.image_url && !isSurpriseRound ? "min-h-[16rem] flex items-center justify-center" : ""}`}>
                      <p className={`font-display ${isSurpriseRound ? "text-secondary text-base" : "text-primary"} text-center ${!currentRound.image_url && !isSurpriseRound ? "text-xl sm:text-3xl font-bold" : "text-sm sm:text-base"} font-bold`}>
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

                  {isSurpriseRound && (
                    <div className="flex flex-col items-center gap-4 py-4 relative overflow-hidden">
                       {/* Emoji rain removed as per user request */}

                       {isRaffling ? (
                          <div className="flex flex-col items-center gap-8 z-10 w-full">
                             <motion.div 
                                animate={{ 
                                  rotate: [0, 360],
                                  scale: [1, 1.1, 1]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-32 h-32 rounded-full border-4 border-dashed border-neon-magenta flex items-center justify-center bg-white/5 backdrop-blur-md"
                             >
                                <span className="text-5xl">🎯</span>
                             </motion.div>
                             
                             <div className="text-center space-y-4">
                                <h3 className="text-2xl font-black text-white uppercase tracking-[0.3em] animate-pulse">Sorteando...</h3>
                                
                                <div className="h-24 flex items-center justify-center">
                                   <AnimatePresence mode="wait">
                                      <motion.div
                                         key={players[rafflePlayerIndex]?.id}
                                         initial={{ y: 20, opacity: 0, scale: 0.5 }}
                                         animate={{ y: 0, opacity: 1, scale: 1.2 }}
                                         exit={{ y: -20, opacity: 0, scale: 0.5 }}
                                         className="flex flex-col items-center"
                                      >
                                         <span className="text-4xl mb-2">{players[rafflePlayerIndex]?.avatar}</span>
                                         <span className="font-display text-xl text-primary font-bold">{players[rafflePlayerIndex]?.name}</span>
                                      </motion.div>
                                   </AnimatePresence>
                                </div>
                             </div>
                          </div>
                       ) : (
                          <>
                             <motion.div 
                                animate={{ 
                                   scale: [1, 1.1, 1]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-24 h-24 bg-gradient-to-br from-neon-magenta to-neon-purple rounded-full flex items-center justify-center border-4 border-white/20 shadow-[0_0_50px_rgba(255,0,255,0.6)] z-10"
                             >
                                <span className="text-5xl drop-shadow-lg">🦹</span>
                             </motion.div>

                             <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-2 z-10"
                             >
                                <h2 className="text-3xl font-black gradient-text uppercase tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Rodada de Roubo!</h2>
                                <div className="bg-background/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-neon-magenta animate-pulse uppercase tracking-[0.2em]">
                                   Duração Especial: 50 Segundos
                                </div>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-4 px-6 italic font-medium">
                                   {isLuckyPlayer 
                                     ? "O destino te escolheu! Clique em alguém para confiscar 10 pontos (mesmo que ele fique devendo!)" 
                                     : `O sortudo(a) da vez é ${players.find(p => p.id === currentRound.lucky_player_id)?.name || "alguém"}! Fique de olho!`}
                                </p>
                             </motion.div>

                             {isLuckyPlayer && (
                                <motion.div 
                                   initial={{ y: 50, opacity: 0 }}
                                   animate={{ y: 0, opacity: 1 }}
                                   transition={{ delay: 0.5 }}
                                   className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2 z-10 px-3 py-6 max-h-[350px] overflow-y-auto custom-scrollbar"
                                >
                                   {players.filter(p => p.id !== playerData.id).map(p => (
                                      <motion.button
                                         key={p.id}
                                         whileHover={{ 
                                            scale: 1.05, 
                                            borderColor: "var(--neon-magenta)",
                                            boxShadow: "0 0 25px rgba(255, 0, 255, 0.5)",
                                            zIndex: 50
                                         }}
                                         whileTap={{ scale: 0.95 }}
                                         disabled={isJoining}
                                         onClick={() => handleSteal(p.id)}
                                         className="glass-card bg-background/20 backdrop-blur-xl border-white/10 p-4 flex flex-col items-center gap-2 transition-all group relative"
                                      >
                                         <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>🔪</motion.span>
                                         </div>
                                         <span className="text-3xl filter drop-shadow-md">{p.avatar}</span>
                                         <span className="text-sm font-black truncate w-full text-center tracking-tight">{p.name}</span>
                                         <div className="flex items-center gap-1">
                                            <span className={`text-[11px] font-bold ${p.score < 0 ? "text-destructive" : "text-neon-cyan"}`}>
                                               {p.score} pts
                                            </span>
                                         </div>
                                      </motion.button>
                                   ))}
                                </motion.div>
                             )}
                          </>
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
                  <h3 className="font-display text-lg text-primary mb-2">
                    {currentRound.type === 'surprise' ? 'Fim do Roubo!' : 'Resposta Correta'}
                  </h3>
                  <p className="font-display text-3xl gradient-text mb-4">
                    {currentRound.type === 'surprise' ? '💰💸' : currentRound.answer}
                  </p>
                  {roundResult && roundResult.answers && (
                    <div className="mb-4 max-h-[200px] overflow-y-auto custom-scrollbar px-2">
                      <p className="text-sm text-muted-foreground font-ui mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1">
                        {currentRound.type === 'surprise' ? 'Ação:' : 'Acertos:'}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {roundResult.answers
                          .filter((a: any) => a.is_correct)
                          .map((a: any) => (
                            <div key={a.id} className="flex flex-col items-center">
                              {currentRound.type === 'surprise' ? (
                                <span className="text-sm font-bold text-neon-magenta bg-neon-magenta/10 px-4 py-2 rounded-lg border border-neon-magenta/30 flex items-center gap-2">
                                  <span className="text-lg">🦹</span> {a.player?.name} {a.answer}
                                </span>
                              ) : (
                                <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded">
                                  {a.player?.name || "Jogador"}
                                </span>
                              )}
                            </div>
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
                    // Also unlock audio here as it's a user interaction
                    unlockAudio();
                    try {
                      await fetch(`/api/players/${currentPlayer.id}/participate`, {
                         method: 'POST',
                         headers: { "Content-Type": "application/json" },
                         body: JSON.stringify({ sessionId: playerData?.sessionId })
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
              className="flex gap-6 mt-6 justify-center w-full"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={answered || preGameCountdown !== null}
                onClick={() => {
                  setAnswer("Verdadeiro");
                  submitAnswer("Verdadeiro");
                }}
                className={`flex-1 py-6 rounded-2xl font-display text-xl tracking-widest uppercase transition-all shadow-lg ${
                  answered && answer === "Verdadeiro" 
                  ? "bg-neon-green text-black scale-95 shadow-neon-green/40" 
                  : "bg-background/10 border-2 border-neon-green text-neon-green hover:bg-neon-green/10"
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                Verdadeiro
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={answered || preGameCountdown !== null}
                onClick={() => {
                  setAnswer("Falso");
                  submitAnswer("Falso");
                }}
                className={`flex-1 py-6 rounded-2xl font-display text-xl tracking-widest uppercase transition-all shadow-lg ${
                  answered && answer === "Falso" 
                  ? "bg-destructive text-black scale-95 shadow-destructive/40" 
                  : "bg-background/10 border-2 border-destructive text-destructive hover:bg-destructive/10"
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                Falso
              </motion.button>
            </motion.div>
          ) : !showRoundResult && !isSurpriseRound && (
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
                disabled={feedback === "correct" || showRoundResult || preGameCountdown !== null}
                className={`flex-1 bg-input border rounded-xl px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${feedback === "correct"
                  ? "border-neon-green neon-border-cyan"
                  : feedback === "wrong"
                    ? "border-destructive shake-wrong"
                    : "border-border focus:neon-border-cyan"
                  } disabled:opacity-50 disabled:pointer-events-none`}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => submitAnswer()}
                disabled={answered || !answer.trim() || feedback === "correct" || preGameCountdown !== null}
                className="btn-neon px-6 py-3 rounded-xl text-primary-foreground font-display text-xs tracking-widest disabled:opacity-40 disabled:pointer-events-none"
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

        {/* Sidebar: Ranking and Chat */}
          <div className="flex-1 lg:flex-none lg:w-80 flex flex-col gap-3 p-3 lg:p-6 border-t lg:border-t-0 lg:border-l border-border bg-black/20 backdrop-blur-xl min-h-0 h-1/3 lg:h-full overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <RankingList 
                players={players} 
                answers={answers} 
                currentPlayerId={playerData?.id || ""} 
                maxScore={room?.max_score || 120} 
                roundStatus={currentRound?.status}
                roundType={currentRound?.type}
              />
            </div>
            <div className="flex-1 min-h-0 lg:block hidden">
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
