"use client";

import { motion } from "framer-motion";
import AvatarDisplay, { avatarIconsMap } from "./AvatarDisplay";

export const avatarIcons = Object.keys(avatarIconsMap).map(id => ({
  id,
  ...avatarIconsMap[id]
}));

interface AvatarSelectProps {
  selected: string;
  onSelect: (avatarId: string) => void;
}

const AvatarSelect = ({ selected, onSelect }: AvatarSelectProps) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {avatarIcons.map((av) => {
        const Icon = av.icon;
        const isSelected = selected === av.id;
        
        return (
          <motion.button
            key={av.id}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(av.id)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isSelected
                ? `glass-card border-2 ${av.id.match(/^(game|flame|zap|target|tent|star)$/) ? 'border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)]' : 'border-[#ff2975] shadow-[0_0_15px_rgba(255,41,117,0.3)]'}`
                : "glass-card hover:bg-white/5"
            }`}
          >
            <AvatarDisplay avatarId={av.id} size={24} />
          </motion.button>
        );
      })}
    </div>
  );
};

export default AvatarSelect;
