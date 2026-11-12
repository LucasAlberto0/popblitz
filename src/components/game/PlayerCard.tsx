"use client";

import { motion, AnimatePresence } from "framer-motion";
import AvatarDisplay from "./AvatarDisplay";

interface PlayerCardProps {
  name: string;
  avatar: string;
  score: number;
  rank: number;
  streak?: number;
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
  streak,
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
      animate={isCorrect ? { opacity: 1, x: 0, scale: [1, 1.02, 1] } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isCurrentPlayer ? "bg-primary/10 border border-primary/30" : "glass-card bg-background/40"
        } ${highlight ? "neon-border-magenta" : ""} ${isCorrect ? "border-neon-green/60 shadow-[0_0_15px_rgba(57,255,20,0.25)] ring-1 ring-neon-green/40" : ""} ${isSpectator ? "opacity-60 saturate-50" : ""} ${isDisconnected ? "opacity-40 grayscale" : ""}`}
    >
      <div className="relative">
        <div className={`w-12 h-12 rounded-lg ${isCorrect ? "bg-neon-green/20" : "bg-muted/30"} flex items-center justify-center overflow-hidden border border-border/50 transition-colors`}>
          <AvatarDisplay avatarId={avatar} fallbackText={name} size={32} />
        </div>
        <span className={`absolute -bottom-1.5 -right-1.5 text-[10px] font-display font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-background shadow-lg bg-gradient-to-br ${rank <= 3 ? rankColors[rank - 1] : "from-muted-foreground to-muted"
          } text-background`}>
          {isSpectator ? "👁️" : rank}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-ui font-bold text-sm truncate text-foreground/90 flex items-center gap-1.5">
            {name}
            {rank === 1 && !isSpectator && (
              <motion.span 
                animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.15, 1] }} 
                transition={{ repeat: Infinity, duration: 2.2 }}
                className="inline-block"
              >
                👑
              </motion.span>
            )}
            {streak !== undefined && streak >= 2 && !isSpectator && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="px-1.5 py-0.2 rounded-full text-[9px] font-black font-display bg-gradient-to-r from-neon-orange to-neon-yellow text-black flex items-center gap-0.5 shadow-[0_0_8px_rgba(255,140,0,0.5)] shrink-0"
                title={`${streak} acertos seguidos!`}
              >
                🔥 {streak}x
              </motion.span>
            )}
            {isDisconnected && (
              <span className="text-[8px] bg-destructive/20 text-destructive border border-destructive/30 px-1 rounded font-display uppercase tracking-wider shrink-0">
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
                initial={{ opacity: 0, scale: 0.8, x: -5 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex flex-col items-start gap-0.5 mt-0.5"
              >
                <div className="flex items-center gap-2">
                  {responseTime && (
                    <span className="text-[10px] font-display font-medium text-neon-green/80 tracking-tight shrink-0">
                      ⚡ {responseTime}s
                    </span>
                  )}
                  {isCorrect && !responseTime && <span className="text-[10px] font-display font-bold text-neon-green tracking-tight">Acertou!</span>}
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
        <motion.span 
          key={score}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 15 }}
          className={`font-display text-base font-black ${isCorrect ? "text-neon-green" : isSpectator ? "text-muted-foreground/40" : "text-primary"} drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
        >
          {isSpectator ? "OBS" : score}
        </motion.span>
      </div>
    </motion.div>
  );
};

export default PlayerCard;
