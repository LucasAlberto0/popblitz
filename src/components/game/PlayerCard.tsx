"use client";

import { motion, AnimatePresence } from "framer-motion";
import AvatarDisplay from "./AvatarDisplay";

interface PlayerCardProps {
  name: string;
  avatar: string;
  score: number;
  rank: number;
  responseTime?: string;
  isCurrentPlayer?: boolean;
  highlight?: boolean;
  isCorrect?: boolean;
  lastGuess?: string;
  isSpectator?: boolean;
  isDisconnected?: boolean;
}

const rankColors = [
  "from-neon-yellow to-neon-orange",
  "from-muted-foreground to-foreground",
  "from-neon-orange to-destructive",
];

const PlayerCard = ({
  name,
  avatar,
  score,
  rank,
  responseTime,
  isCurrentPlayer,
  highlight,
  isCorrect,
  lastGuess,
  isSpectator,
  isDisconnected
}: PlayerCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isCurrentPlayer ? "bg-primary/10 border border-primary/30" : "glass-card bg-background/40"
        } ${highlight ? "neon-border-magenta" : ""} ${isCorrect ? "border-neon-green/40 shadow-[0_0_10px_rgba(57,255,20,0.1)]" : ""} ${isSpectator ? "opacity-60 saturate-50" : ""} ${isDisconnected ? "opacity-40 grayscale" : ""}`}
    >
      <div className="relative">
        <div className={`w-12 h-12 rounded-lg ${isCorrect ? "bg-neon-green/10" : "bg-muted/30"} flex items-center justify-center overflow-hidden border border-border/50`}>
          <AvatarDisplay avatarId={avatar} fallbackText={name} size={32} />
        </div>
        <span className={`absolute -bottom-1.5 -right-1.5 text-[10px] font-display font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-background shadow-lg bg-gradient-to-br ${rank <= 3 ? rankColors[rank - 1] : "from-muted-foreground to-muted"
          } text-background`}>
          {isSpectator ? "👁️" : rank}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-ui font-bold text-sm truncate text-foreground/90 flex items-center gap-1">
            {name}
            {rank === 1 && !isSpectator && (
              <motion.span 
                animate={{ rotate: [0, 10, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 2 }}
              >
                👑
              </motion.span>
            )}
            {isDisconnected && (
              <span className="text-[8px] bg-destructive/20 text-destructive border border-destructive/30 px-1 rounded font-display uppercase tracking-wider">
                DESCONECTADO
              </span>
            )}
          </p>
        </div>

        <div className="min-h-[16px] flex items-center mt-0.5">
          <AnimatePresence mode="wait">
            {isCorrect ? (
              <motion.div
                key="correct-feedback"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-start gap-0.5 mt-0.5"
              >
                <div className="flex items-center gap-2">
                  {responseTime && (
                    <span className="text-[10px] font-display font-medium text-neon-green/60 tracking-tight shrink-0">
                      {responseTime}s
                    </span>
                  )}
                  {isCorrect && !responseTime && <span className="text-[10px] font-display font-medium text-neon-green/60 tracking-tight">Acertou!</span>}
                </div>
                {lastGuess && (
                  <span className="text-[11px] font-ui font-black text-neon-green lowercase truncate max-w-[140px] leading-tight">
                    {lastGuess}
                  </span>
                )}
              </motion.div>
            ) : lastGuess ? (
              <motion.p
                key="guess"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] font-ui font-medium text-muted-foreground/80 uppercase truncate max-w-[120px]"
              >
                {lastGuess}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0">
        <span className={`font-display text-base font-black ${isCorrect ? "text-neon-green" : isSpectator ? "text-muted-foreground/40" : "text-primary"} drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>
          {isSpectator ? "OBS" : score}
        </span>
      </div>
    </motion.div>
  );
};

export default PlayerCard;
