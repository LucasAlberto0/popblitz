"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex items-center justify-center gradient-bg-animated px-4">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        <h1 className="font-display text-9xl gradient-text">404</h1>
        <p className="text-muted-foreground font-ui text-xl mb-8">Página não encontrada</p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="btn-neon px-8 py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest"
        >
          Voltar ao Início
        </motion.button>
      </motion.div>
    </div>
  );
}
