"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TimerRing from "@/components/game/TimerRing";
import RankingList from "@/components/game/RankingList";
import ChatPanel from "@/components/game/ChatPanel";
import type { PlayerData } from "@/components/game/RankingList";

const TOTAL_TIME = 15;
const TOTAL_ROUNDS = 5;

const mockQuestions = [
  { image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80", answer: "Cinema", category: "Filme" },
  { image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80", answer: "Guitarra", category: "Música" },
  { image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80", answer: "Teatro", category: "Cultura Pop" },
  { image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=600&q=80", answer: "Microfone", category: "Música" },
  { image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80", answer: "Projetor", category: "Filme" },
];

const initialPlayers: PlayerData[] = [
  { id: "1", name: "Você", avatar: "🎮", score: 0 },
  { id: "2", name: "Luna", avatar: "🌟", score: 0 },
  { id: "3", name: "Blaze", avatar: "🔥", score: 0 },
  { id: "4", name: "Nyx", avatar: "🎭", score: 0 },
  { id: "5", name: "Spark", avatar: "⚡", score: 0 },
];

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [answer, setAnswer] = useState("");
  const [players, setPlayers] = useState(initialPlayers);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [scorePopup, setScorePopup] = useState<number | null>(null);

  const question = mockQuestions[round % mockQuestions.length];

  useEffect(() => {
    if (answered || showRoundResult) return;
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered, showRoundResult]);

  const handleTimeUp = useCallback(() => {
    setAnswered(true);
    setFeedback("wrong");
    simulateOtherPlayers();
    setTimeout(() => {
      setShowRoundResult(true);
    }, 1500);
  }, []);

  const simulateOtherPlayers = () => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id !== "1"
          ? { ...p, score: p.score + Math.floor(Math.random() * 120), responseTime: (Math.random() * 8 + 2).toFixed(1) }
          : p
      )
    );
  };

  const submitAnswer = () => {
    if (!answer.trim() || answered) return;
    const isCorrect = answer.toLowerCase().includes(question.answer.toLowerCase());
    setAnswered(true);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      const points = Math.max(50, Math.round(timeLeft * 10));
      setScorePopup(points);
      setPlayers((prev) =>
        prev.map((p) => (p.id === "1" ? { ...p, score: p.score + points, responseTime: `${TOTAL_TIME - timeLeft}` } : p))
      );
      setTimeout(() => setScorePopup(null), 800);
    }

    simulateOtherPlayers();
    setTimeout(() => setShowRoundResult(true), 2000);
  };

  const nextRound = () => {
    if (round + 1 >= TOTAL_ROUNDS) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("finalPlayers", JSON.stringify(players));
      }
      router.push(`/results/${code}`);
      return;
    }
    setRound((r) => r + 1);
    setTimeLeft(TOTAL_TIME);
    setAnswer("");
    setFeedback(null);
    setAnswered(false);
    setShowRoundResult(false);
  };

  return (
    <div className="relative min-h-screen gradient-bg-animated">
      <div className="relative z-10 h-screen flex flex-col lg:flex-row">
        {/* Main area */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="font-display text-xs text-primary tracking-widest">RODADA {round + 1}/{TOTAL_ROUNDS}</span>
              <span className="ml-3 text-xs font-ui text-muted-foreground px-2 py-1 rounded-full border border-border">
                {question.category}
              </span>
            </div>
            <TimerRing timeLeft={timeLeft} totalTime={TOTAL_TIME} />
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {!showRoundResult ? (
                <motion.div
                  key={`q-${round}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="glass-card p-2 max-w-lg w-full"
                >
                  <img
                    src={question.image}
                    alt="Quiz"
                    className="w-full h-48 sm:h-64 lg:h-80 object-cover rounded-lg"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`result-${round}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-8 text-center max-w-md w-full"
                >
                  <h3 className="font-display text-lg text-primary mb-2">Resposta Correta</h3>
                  <p className="font-display text-3xl gradient-text mb-4">{question.answer}</p>
                  <p className="text-sm text-muted-foreground font-ui mb-6">{question.category}</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={nextRound}
                    className="btn-neon px-8 py-3 rounded-xl text-primary-foreground font-display text-sm tracking-widest"
                  >
                    {round + 1 >= TOTAL_ROUNDS ? "🏆 Ver Resultado" : "Próxima Rodada →"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Score popup */}
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

          {/* Answer input */}
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

          {/* Feedback */}
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

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-3 p-4 lg:p-6 lg:border-l border-border overflow-y-auto">
          <div className="flex-1 min-h-0">
            <RankingList players={players} currentPlayerId="1" />
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
