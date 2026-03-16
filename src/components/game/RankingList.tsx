"use client";

import { motion, AnimatePresence } from "framer-motion";
import PlayerCard from "./PlayerCard";
import { Player, RoundAnswer } from "@/types/database";

interface RankingListProps {
  players: Player[];
  currentPlayerId?: string;
  answers: RoundAnswer[];
  maxScore: number;
  roundStatus?: string;
  roundType?: string;
}

const RankingList = ({ players, currentPlayerId, answers, maxScore, roundStatus, roundType }: RankingListProps) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="glass-card p-2 sm:p-4 space-y-2 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-[10px] tracking-widest text-primary uppercase opacity-60">Ranking</h3>
        <span className="text-[10px] font-display font-medium text-muted-foreground/40">ALVO: {maxScore} PTS</span>
      </div>
      <motion.div className="space-y-2" layout>
        <AnimatePresence mode="popLayout">
          {sorted.map((player, i) => {
            const playerAnswers = answers.filter(a => a.player_id === player.id);
            const correctAnswer = playerAnswers.find(a => a.is_correct);
            const lastGuess = playerAnswers[playerAnswers.length - 1]?.answer;
            const isSpectator = player.status === 'ready';
            const isCurrent = player.id === currentPlayerId;

            // Special logic for boolean rounds: hide feedback until finished
            const hideFeedback = roundType === 'boolean' && roundStatus !== 'finished';
            const showCorrect = !hideFeedback && !!correctAnswer;
            const showResponseTime = !hideFeedback && correctAnswer ? (correctAnswer.time_ms / 1000).toFixed(3) : undefined;
            // Only show the typed answer text if the round is finished (or if it's a wrong guess)
            const showLastGuess = !hideFeedback && (roundStatus === 'finished' || !correctAnswer) ? lastGuess : undefined;

            return (
              <PlayerCard
                key={player.id}
                name={player.name}
                avatar={player.avatar}
                score={player.score}
                rank={i + 1}
                isCorrect={showCorrect}
                responseTime={showResponseTime}
                lastGuess={showLastGuess}
                isCurrentPlayer={player.id === currentPlayerId}
                isSpectator={isSpectator}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default RankingList;
