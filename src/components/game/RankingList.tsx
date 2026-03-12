"use client";

import { motion } from "framer-motion";
import PlayerCard from "./PlayerCard";
import { Player, RoundAnswer } from "@/types/database";

interface RankingListProps {
  players: Player[];
  currentPlayerId?: string;
  answers: RoundAnswer[];
  maxScore: number;
}

const RankingList = ({ players, currentPlayerId, answers, maxScore }: RankingListProps) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="glass-card p-4 space-y-2 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs tracking-widest text-primary uppercase">Ranking</h3>
        <span className="text-[10px] font-display font-medium text-muted-foreground/60">ALVO: {maxScore} PTS</span>
      </div>
      <motion.div className="space-y-2">
        {sorted.map((player, i) => {
          const playerAnswers = answers.filter(a => a.player_id === player.id);
          const correctAnswer = playerAnswers.find(a => a.is_correct);
          const lastGuess = playerAnswers[playerAnswers.length - 1]?.answer;
          const isSpectator = player.status === 'ready';

          return (
            <PlayerCard
              key={player.id}
              name={player.name}
              avatar={player.avatar}
              score={player.score}
              rank={i + 1}
              isCorrect={!!correctAnswer}
              responseTime={correctAnswer ? (correctAnswer.time_ms / 1000).toFixed(3) : undefined}
              lastGuess={!correctAnswer && lastGuess ? lastGuess : undefined}
              isCurrentPlayer={player.id === currentPlayerId}
              isSpectator={isSpectator}
            />
          );
        })}
      </motion.div>
    </div>
  );
};

export default RankingList;
