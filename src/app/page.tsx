"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import ParticleBackground from "@/components/game/ParticleBackground";
import { Gamepad2, LogIn, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const [lastRoom, setLastRoom] = useState<{code: string, isHost: boolean} | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("player");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.roomCode) {
          setLastRoom({ code: data.roomCode, isHost: data.isHost });
        }
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-bg-animated">
      <ParticleBackground />
      
      {/* Hero BG */}
      <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: "url('/hero-bg.jpg')" }} />
      <div className="absolute inset-0 bg-background/60" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center px-4 max-w-lg w-full"
      >
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12 flex flex-col items-center"
        >
          {/* Animated Image Icon - Larger than title */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative w-64 h-64 md:w-80 md:h-80"
          >
            <Image
              src="/images/logoPopBlitzAt.png"
              alt="Pop Blitz Icon"
              fill
              className="object-contain drop-shadow-[0_0_30px_rgba(255,0,255,0.4)]"
              priority
            />
          </motion.div>

          {/* Text Logo - Proportional to Icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center -mt-12 md:-mt-16"
          >
            <h1 className="font-display text-5xl md:text-6xl font-black gradient-text leading-[0.85] tracking-tighter">
              POP BLITZ
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground font-ui text-sm md:text-base mt-2 tracking-[0.3em] uppercase opacity-80"
            >
              Adivinhe rápido. Vença todos.
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <AnimatePresence>
            {lastRoom && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(lastRoom.isHost ? `/lobby/${lastRoom.code}?host=true` : `/lobby/${lastRoom.code}`)}
                className="w-full py-4 rounded-xl bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan font-display text-sm tracking-widest flex items-center justify-center gap-2 mb-6"
              >
                <RefreshCw size={20} className="animate-[spin_3s_linear_infinite]" />
                Voltar ao Jogo ({lastRoom.code})
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/setup?mode=create")}
            className="btn-neon w-full py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest flex items-center justify-center gap-2"
          >
            <Gamepad2 size={20} />
            Criar Sala
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/setup?mode=join")}
            className="btn-neon-magenta w-full py-4 rounded-xl text-secondary-foreground font-display text-sm tracking-widest flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            Entrar em uma Sala
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10 text-xs text-muted-foreground font-ui tracking-wider"
        >
          2 – 16 jogadores • Filmes • Músicas • Séries • Cultura Pop
        </motion.p>
      </motion.div>
    </div>
  );
}
