"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import ParticleBackground from "@/components/game/ParticleBackground";

export default function HomePage() {
  const router = useRouter();

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
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
          className="mb-8"
        >
          <h1 className="font-display text-5xl md:text-7xl font-black gradient-text leading-tight">
            POP
            <br />
            BLITZ
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground font-ui text-lg mt-3 tracking-widest uppercase"
          >
            Adivinhe rápido. Vença todos.
          </motion.p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/setup?mode=create")}
            className="btn-neon w-full py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest"
          >
            🎮 Criar Sala
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/setup?mode=join")}
            className="btn-neon-magenta w-full py-4 rounded-xl text-secondary-foreground font-display text-sm tracking-widest"
          >
            🚪 Entrar em uma Sala
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
