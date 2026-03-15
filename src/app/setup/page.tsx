"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/game/ParticleBackground";
import AvatarSelect from "@/components/game/AvatarSelect";
import { Loader2, Rocket, Zap } from "lucide-react";

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "join";

  // Load previous player data if exists
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
       const saved = sessionStorage.getItem("player") || localStorage.getItem("player");
       return saved ? JSON.parse(saved).name : "";
    }
    return "";
  });
  const [avatar, setAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
       const saved = sessionStorage.getItem("player") || localStorage.getItem("player");
       return saved ? JSON.parse(saved).avatar : "🎮";
    }
    return "🎮";
  });
  const [roomCode, setRoomCode] = useState("");
  const [nameGlow, setNameGlow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    setError("");

    try {
      if (mode === "create") {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostName: name.trim(),
            hostAvatar: avatar,
          }),
        });
        
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        const playerInfo = JSON.stringify({
          id: data.player.id,
          sessionId: data.player.sessionId,
          name: data.player.name,
          avatar: data.player.avatar,
          roomCode: data.room.code,
          isHost: true,
        });

        sessionStorage.setItem("player", playerInfo);
        localStorage.setItem("player", playerInfo);

        router.push(`/lobby/${data.room.code}?host=true`);
      } else {
        if (!roomCode.trim()) {
          setError("Digite o código da sala");
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/rooms/${roomCode}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName: name.trim(),
            playerAvatar: avatar,
            sessionId: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("player") || "{}").sessionId : null
          }),
        });
        
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        const playerInfo = JSON.stringify({
          id: data.player.id,
          sessionId: data.player.sessionId,
          name: data.player.name,
          avatar: data.player.avatar,
          roomCode: roomCode.toUpperCase(),
          isHost: false,
        });

        sessionStorage.setItem("player", playerInfo);
        localStorage.setItem("player", playerInfo);

        router.push(`/lobby/${roomCode.toUpperCase()}`);
      }
    } catch (err) {
      setError("Erro ao conectar. Tente novamente.");
      setIsLoading(false);
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

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

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
              disabled={isLoading}
            />
          </motion.div>
        </div>

        <div>
          <label className="font-ui text-sm text-muted-foreground uppercase tracking-wider block mb-2">
            Escolha seu avatar
          </label>
          <AvatarSelect selected={avatar} onSelect={setAvatar} />
        </div>

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
              disabled={isLoading}
            />
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!name.trim() || isLoading}
          className="btn-neon w-full py-4 rounded-xl text-primary-foreground font-display text-sm tracking-widest disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : (
            mode === "create" ? <Rocket size={20} /> : <Zap size={20} />
          )}
          {isLoading ? "Conectando..." : mode === "create" ? "Criar Sala" : "Entrar"}
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
      <ParticleBackground />
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
