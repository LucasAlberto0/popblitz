"use client";

import { motion } from "framer-motion";

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
}

const TimerRing = ({ timeLeft, totalTime }: TimerRingProps) => {
  const progress = Math.max(0, Math.min(1, timeLeft / totalTime));
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = timeLeft <= 5 && timeLeft > 0;

  const getColor = () => {
    if (progress > 0.5) return "hsl(var(--neon-cyan))";
    if (progress > 0.25) return "hsl(var(--neon-yellow))";
    return "hsl(var(--destructive))";
  };

  return (
    <motion.div 
      animate={isUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isUrgent ? { repeat: Infinity, duration: 0.6, ease: "easeInOut" } : { duration: 0.2 }}
      className="relative w-20 h-20 flex items-center justify-center flex-shrink-0"
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="44"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="4"
          opacity="0.3"
        />
        <motion.circle
          cx="50" cy="50" r="44"
          fill="none"
          stroke={getColor()}
          strokeWidth={isUrgent ? 6 : 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.25, ease: "linear" }}
          style={{
            filter: isUrgent 
              ? `drop-shadow(0 0 10px hsl(var(--destructive)))` 
              : `drop-shadow(0 0 6px ${getColor()})`,
          }}
        />
      </svg>
      <motion.span
        key={timeLeft}
        initial={{ scale: 1.4, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={`absolute font-display text-xl font-black ${isUrgent ? "text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : ""}`}
        style={!isUrgent ? { color: getColor() } : undefined}
      >
        {timeLeft}
      </motion.span>
    </motion.div>
  );
};

export default TimerRing;
