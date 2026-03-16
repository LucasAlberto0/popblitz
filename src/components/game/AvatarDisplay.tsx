"use client";

import { 
  Gamepad2, 
  Flame, 
  Zap, 
  Target, 
  Tent, 
  Star, 
  Theater, 
  Rocket, 
  Music, 
  Film, 
  Crown, 
  Gem 
} from "lucide-react";

export const avatarIconsMap: Record<string, {icon: any, color: string}> = {
  "game": { icon: Gamepad2, color: "text-[#00d2ff]" },
  "flame": { icon: Flame, color: "text-[#00d2ff]" },
  "zap": { icon: Zap, color: "text-[#00d2ff]" },
  "target": { icon: Target, color: "text-[#00d2ff]" },
  "tent": { icon: Tent, color: "text-[#00d2ff]" },
  "star": { icon: Star, color: "text-[#00d2ff]" },
  "theater": { icon: Theater, color: "text-[#ff2975]" },
  "rocket": { icon: Rocket, color: "text-[#ff2975]" },
  "music": { icon: Music, color: "text-[#ff2975]" },
  "film": { icon: Film, color: "text-[#ff2975]" },
  "crown": { icon: Crown, color: "text-[#ff2975]" },
  "gem": { icon: Gem, color: "text-[#ff2975]" },
};

interface AvatarDisplayProps {
  avatarId: string;
  size?: number;
  className?: string;
  fallbackText?: string;
}

const emojiToIdMap: Record<string, string> = {
  "🎮": "game",
  "🔥": "flame",
  "⚡": "zap",
  "🎯": "target",
  "🎪": "tent",
  "🌟": "star",
  "🎭": "theater",
  "🚀": "rocket",
  "🎵": "music",
  "🎬": "film",
  "👑": "crown",
  "💎": "gem",
};

export const AvatarDisplay = ({ avatarId, size = 24, className = "", fallbackText }: AvatarDisplayProps) => {
  // Migrate old emoji data to new IDs
  const effectiveId = emojiToIdMap[avatarId] || avatarId;
  const iconData = avatarIconsMap[effectiveId];
  
  if (iconData) {
    const Icon = iconData.icon;
    return <Icon size={size} className={`${iconData.color} ${className}`} />;
  }

  // Fallback for missing icons
  if (!avatarId && fallbackText) {
    return <span className={`font-bold uppercase ${className}`}>{fallbackText[0]}</span>;
  }

  return <span className={className}>{avatarId || "❓"}</span>;
};

export default AvatarDisplay;
