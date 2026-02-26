"use client";

import { motion } from "framer-motion";

interface PlayerCardProps {
  name: string;
  avatar: string;
  score: number;
  rank: number;
  responseTime?: string;
  isCurrentPlayer?: boolean;
  highlight?: boolean;
}

const rankColors = [
  "from-neon-yellow to-neon-orange",
  "from-muted-foreground to-foreground",
  "from-neon-orange to-destructive",
];

const PlayerCard = ({ name, avatar, score, rank, responseTime, isCurrentPlayer, highlight }: PlayerCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        isCurrentPlayer ? "glass-card neon-border-cyan" : "glass-card"
      } ${highlight ? "neon-border-magenta" : ""}`}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg overflow-hidden border border-border">
          {avatar ? (
            <span className="text-xl">{avatar}</span>
          ) : (
            <span className="text-muted-foreground text-sm font-ui">{name[0]}</span>
          )}
        </div>
        <span className={`absolute -bottom-1 -left-1 text-xs font-display font-bold w-5 h-5 flex items-center justify-center rounded-full bg-gradient-to-br ${
          rank <= 3 ? rankColors[rank - 1] : "from-muted to-muted"
        } text-background`}>
          {rank}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-ui font-semibold text-sm truncate">{name}</p>
        {responseTime && (
          <p className="text-xs text-muted-foreground">{responseTime}s</p>
        )}
      </div>

      <span className="font-display text-sm font-bold text-primary">{score}</span>
    </motion.div>
  );
};

export default PlayerCard;
