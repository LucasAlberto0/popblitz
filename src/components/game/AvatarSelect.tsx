"use client";

import { motion } from "framer-motion";

const avatars = ["🎮", "🔥", "⚡", "🎯", "🎪", "🌟", "🎭", "🚀", "🎵", "🎬", "👑", "💎"];

interface AvatarSelectProps {
  selected: string;
  onSelect: (avatar: string) => void;
}

const AvatarSelect = ({ selected, onSelect }: AvatarSelectProps) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {avatars.map((av) => (
        <motion.button
          key={av}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(av)}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
            selected === av
              ? "glass-card neon-border-cyan"
              : "glass-card hover:border-primary/30"
          }`}
        >
          {av}
        </motion.button>
      ))}
    </div>
  );
};

export default AvatarSelect;
