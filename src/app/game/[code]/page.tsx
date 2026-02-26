"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TimerRing from "@/components/game/TimerRing";
import RankingList from "@/components/game/RankingList";
import ChatPanel from "@/components/game/ChatPanel";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

function GameContent() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [room, setRoom] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [scorePopup, setScorePopup] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<any>(null);
  const startTimeRef = useRef<number>(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }

        setRoom(data.room);
        setPlayers(data.players || []);
        
        if (data.currentRound) {
          setCurrentRound(data.currentRound);
          setTimeLeft(data.room.time_per_round || 30);
          startTimeRef.current = Date.now();
        }
      } catch (err) {
        setError("Erro ao carregar jogo");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
  }, [code]);

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`game:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        async (payload: any) => {
          if (payload.new?.status === "finished") {
            router.push(`/results/${code}`);
          }
        }
      )
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${room.id}`,
        },
        async (payload: any) => {
          if (payload.new?.status === "active" && !currentRound) {
            const res = await fetch(`/api/rooms/${code}`);
            const data = await res.json();
            setCurrentRound(data.currentRound);
            setTimeLeft(data.room.time_per_round || 30);
            startTimeRef.current = Date.now();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, code, router]);

  useEffect(() => {
    if (answered || showRoundResult || !currentRound || timeLeft <= 0) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, answered, showRoundResult, currentRound]);

  const handleTimeUp = async () => {
    if (!answered) {
      setAnswered(true);
      setFeedback("wrong");
      await finishRound();
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || answered || !currentRound) return;

    const timeMs = Date.now() - startTimeRef.current;
    setAnswered(true);

    const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");

    try {
      const res = await fetch(`/api/rounds/${currentRound.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: playerData.id,
          playerSessionId: playerData.sessionId,
          answer: answer,
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
      }

      await finishRound();
    } catch (err) {
      setFeedback("wrong");
      await finishRound();
    }
  };

  const finishRound = async () => {
    if (!currentRound) return;

    const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");

    try {
      const res = await fetch(`/api/rounds/${currentRound.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playerData.sessionId }),
      });

      const data = await res.json();
      
      setRoundResult(data);
      setShowRoundResult(true);

      if (data.gameFinished) {
        setTimeout(() => {
          router.push(`/results/${code}`);
        }, 3000);
      } else if (data.nextRound) {
        setTimeout(() => {
          setCurrentRound(data.nextRound);
          setTimeLeft(room?.time_per_round || 30);
          setAnswer("");
          setFeedback(null);
          setAnswered(false);
          setShowRoundResult(false);
          setRoundResult(null);
          startTimeRef.current = Date.now();
        }, 3000);
      }
    } catch (err) {
      console.error("Error finishing round:", err);
    }
  };

  const nextRound = async () => {
    if (!currentRound || !room) return;

    const playerData = JSON.parse(sessionStorage.getItem("player") || "{}");

    try {
      const res = await fetch(`/api/rounds/${currentRound.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: playerData.sessionId }),
      });

      const data = await res.json();
      
      if (data.nextRound) {
        setCurrentRound(data.nextRound);
        setTimeLeft(room.time_per_round || 30);
        setAnswer("");
        setFeedback(null);
        setAnswered(false);
        setShowRoundResult(false);
        setRoundResult(null);
        startTimeRef.current = Date.now();
      } else if (data.gameFinished) {
        router.push(`/results/${code}`);
      }
    } catch (err) {
      console.error("Error going to next round:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <div className="flex items-center gap-2 text-primary font-display text-xl">
          <Loader2 className="animate-spin" />
          Carregando jogo...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen gradient-bg-animated flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-display text-xl mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="btn-neon px-6 py-3 rounded-xl">
            Voltar
          </button>
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
            <div>
              <span className="font-display text-xs text-primary tracking-widest">
                RODADA {currentRound.round_number}/{room?.total_rounds || 10}
              </span>
            </div>
            <TimerRing timeLeft={timeLeft} totalTime={room?.time_per_round || 30} />
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {!showRoundResult ? (
                <motion.div
                  key={`q-${currentRound.round_number}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="glass-card p-2 max-w-lg w-full"
                >
                  <img
                    src={currentRound.image_url}
                    alt="Quiz"
                    className="w-full h-48 sm:h-64 lg:h-80 object-cover rounded-lg"
                  />
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
                  <p className="text-sm text-muted-foreground font-ui mb-6">
                    {roundResult?.gameFinished ? "Finalizando jogo..." : "Próxima rodada em breve..."}
                  </p>
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

          {!showRoundResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 mt-4 ${feedback === "wrong" ? "animate-[shake_0.3s_ease]" : ""}`}
            >
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                placeholder="Sua resposta..."
                disabled={answered}
                className={`flex-1 bg-input border rounded-xl px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                  feedback === "correct"
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
                className={`text-center text-sm font-ui mt-2 ${
                  feedback === "correct" ? "text-neon-green" : "text-destructive"
                }`}
              >
                {feedback === "correct" ? "✅ Acertou!" : "❌ Errou!"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-3 p-4 lg:p-6 lg:border-l border-border overflow-y-auto">
          <div className="flex-1 min-h-0">
            <RankingList players={players} currentPlayerId={JSON.parse(sessionStorage.getItem("player") || "{}").id || ""} />
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel />
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
