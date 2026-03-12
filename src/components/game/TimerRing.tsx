"use client";

import { motion } from "framer-motion";

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
}

const TimerRing = ({ timeLeft, totalTime }: TimerRingProps) => {
  const progress = timeLeft / totalTime;
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (progress > 0.5) return "hsl(var(--neon-cyan))";
    if (progress > 0.25) return "hsl(var(--neon-yellow))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="44"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="4"
        />
        <motion.circle
          cx="50" cy="50" r="44"
          fill="none"
          stroke={getColor()}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: `drop-shadow(0 0 6px ${getColor()})`,
          }}
        />
      </svg>
      <motion.span
        key={timeLeft}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className="absolute font-display text-xl font-bold"
        style={{ color: getColor() }}
      >
        {timeLeft}
      </motion.span>
    </div>
  );
};

export default TimerRing;
