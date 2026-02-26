"use client";

import { motion } from "framer-motion";
import PlayerCard from "./PlayerCard";

export interface PlayerData {
  id: string;
  name: string;
  avatar: string;
  score: number;
  responseTime?: string;
}

interface RankingListProps {
  players: PlayerData[];
  currentPlayerId?: string;
}

const RankingList = ({ players, currentPlayerId }: RankingListProps) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="glass-card p-4 space-y-2 h-full overflow-y-auto">
      <h3 className="font-display text-xs tracking-widest text-primary uppercase mb-3">Ranking</h3>
      <motion.div className="space-y-2">
        {sorted.map((player, i) => (
          <PlayerCard
            key={player.id}
            name={player.name}
            avatar={player.avatar}
            score={player.score}
            rank={i + 1}
            responseTime={player.responseTime}
            isCurrentPlayer={player.id === currentPlayerId}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default RankingList;
