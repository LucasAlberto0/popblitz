"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import AvatarSelect from "@/components/game/AvatarSelect";
import { useState } from "react";

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "join";

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🎮");
  const [roomCode, setRoomCode] = useState("");
  const [nameGlow, setNameGlow] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("player", JSON.stringify({ name, avatar }));
    }
    if (mode === "create") {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      router.push(`/lobby/${code}?host=true`);
    } else {
      router.push(`/lobby/${roomCode || "DEMO"}`);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center gradient-bg-animated px-4">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 glass-card p-8 max-w-md w-full space-y-6"
      >
        <h2 className="font-display text-xl text-center gradient-text tracking-wider">
          {mode === "create" ? "Criar Sala" : "Entrar na Sala"}
        </h2>

        {/* Name */}
        <div>
          <label className="font-ui text-sm text-muted-foreground uppercase tracking-wider block mb-2">
            Seu nome
          </label>
          <motion.div animate={nameGlow ? { boxShadow: "0 0 15px hsl(190 100% 50% / 0.4)" } : {}}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameGlow(true);
                setTimeout(() => setNameGlow(false), 300);
              }}
              placeholder="Digite seu nome..."
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:neon-border-cyan transition-all font-body"
              maxLength={20}
            />
          </motion.div>
        </div>

        {/* Avatar */}
        <div>
          <label className="font-ui text-sm text-muted-foreground uppercase tracking-wider block mb-2">
            Escolha seu avatar
          </label>
          <AvatarSelect selected={avatar} onSelect={setAvatar} />
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center gap-3 py-4">
          <motion.div
            animate={{ rotateY: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-16 h-16 rounded-2xl glass-card neon-border-cyan flex items-center justify-center text-3xl"
          >
            {avatar}
          </motion.div>
          <div>
            <p className="font-display text-sm text-primary">{name || "???"}</p>
            <p className="text-xs text-muted-foreground font-ui">Pronto para jogar</p>
          </div>
        </div>

        {/* Room code for join mode */}
        {mode === "join" && (
          <div>
            <label className="font-ui text-sm text-muted-foreground uppercase tracking-wider block mb-2">
              Código da sala
            </label>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="EX: AB1C"
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:neon-border-cyan transition-all font-display text-center text-xl tracking-[0.3em]"
              maxLength={6}
            />
          </div>
        )}

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="btn-neon w-full py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {mode === "create" ? "🚀 Criar Sala" : "⚡ Entrar"}
        </motion.button>

        <button
          onClick={() => router.push("/")}
          className="w-full text-center text-sm text-muted-foreground font-ui hover:text-foreground transition-colors"
        >
          ← Voltar
        </button>
      </motion.div>
    </div>
  );
}

function SetupLoading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center gradient-bg-animated">
      <div className="text-primary font-display text-xl">Carregando...</div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <SetupContent />
    </Suspense>
  );
}
