"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Gamepad2, 
  Users, 
  Sparkles, 
  Zap, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Play,
  Camera,
  Film
} from "lucide-react";
import AvatarDisplay from "@/components/game/AvatarDisplay";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPlaying?: () => void;
}

interface TutorialStep {
  id: number;
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  tips: string[];
  imageSrc: string;
  accentColor: string;
  icon: any;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Crie ou Entre na Sala",
    badge: "PASSO 1 DE 5",
    subtitle: "Reúna a galera em qualquer dispositivo",
    description: "Escolha seu apelido e selecione um avatar exclusivo. O anfitrião pode criar uma sala em 1 clique, ou você pode entrar diretamente digitando o código de 4 letras compartilhado pelos seus amigos.",
    tips: [
      "Funciona direto no navegador do celular ou PC — sem precisar baixar nada!",
      "Até 16 jogadores simultâneos por partida."
    ],
    imageSrc: "/images/tutorial/step1-create.png",
    accentColor: "text-neon-cyan",
    icon: Gamepad2,
  },
  {
    id: 2,
    title: "Sala de Espera & Regras",
    badge: "PASSO 2 DE 5",
    subtitle: "Personalize a disputa antes de começar",
    description: "No lobby, o anfitrião personaliza a partida: define a meta de pontuação (80 a 200 pontos), a dificuldade das perguntas e pode ativar rodadas musicais com áudio e rodadas surpresa de roubo.",
    tips: [
      "Mínimo de 2 jogadores para iniciar a diversão.",
      "O link ou código da sala pode ser copiado em um toque para o WhatsApp."
    ],
    imageSrc: "/images/tutorial/step2-lobby.png",
    accentColor: "text-neon-yellow",
    icon: Users,
  },
  {
    id: 3,
    title: "Adivinhe Rápido no Teclado",
    badge: "PASSO 3 DE 5",
    subtitle: "Velocidade é a chave da vitória",
    description: "A cada rodada surge uma imagem misteriosa, áudio ou pergunta de cinema, séries, música e cultura pop. O relógio corre rápido! Digite no campo de resposta e envie imediatamente.",
    tips: [
      "Quem responde primeiro ganha a pontuação máxima (+10 pontos).",
      "Errou? O teclado continua aberto no celular para você tentar de novo sem perder tempo!"
    ],
    imageSrc: "/images/tutorial/step3-game.png",
    accentColor: "text-neon-green",
    icon: Zap,
  },
  {
    id: 4,
    title: "Rodadas Especiais & Roubo",
    badge: "PASSO 4 DE 5",
    subtitle: "Reviravoltas que mudam o placar",
    description: "Fique atento às rodadas temáticas! Na Rodada de Roubo (🦹), um jogador sorteado pode confiscar pontos de qualquer rival. Nas rodadas de Verdadeiro ou Falso, atenção redobrada: errar custa pontos!",
    tips: [
      "No Verdadeiro ou Falso, erros tiram pontos da sua pontuação geral.",
      "Rodadas de áudio testam sua memória ouvindo trilhas sonoras icônicas."
    ],
    imageSrc: "/images/tutorial/step4-answering.png",
    accentColor: "text-neon-magenta",
    icon: Sparkles,
  },
  {
    id: 5,
    title: "Combo Streak & O Pódio Final",
    badge: "PASSO 5 DE 5",
    subtitle: "Conquiste a coroa de campeão",
    description: "Acerte perguntas consecutivas para acender o multiplicador de Streak (🔥 x2, 🔥 x3) e subir posições no ranking ao vivo. O primeiro jogador a alcançar a pontuação alvo sobe ao topo do pódio com chuva de confetes!",
    tips: [
      "O ranking ao vivo mostra quem está na liderança com a coroa dourada.",
      "Após a vitória, o anfitrião pode reiniciar a partida com a mesma turma!"
    ],
    imageSrc: "/images/tutorial/step2-lobby.png",
    accentColor: "text-neon-yellow",
    icon: Trophy,
  },
];

export default function HowToPlayModal({ isOpen, onClose, onStartPlaying }: HowToPlayModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<"interactive" | "screenshot">("interactive");
  const [simulatedAnswer, setSimulatedAnswer] = useState("Harry Potter");
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const IconComponent = step.icon;

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop com blur dramático */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-4xl bg-card/95 border border-primary/30 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,240,255,0.25)] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border/40 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                <HelpCircle size={22} className="animate-pulse" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-black gradient-text uppercase tracking-wider">
                  Como Jogar o PopBlitz
                </h2>
                <p className="text-xs text-muted-foreground font-ui">
                  Guia rápido interativo para você mandar bem e vencer todas!
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-muted/40 hover:bg-destructive/20 border border-border/50 hover:border-destructive/40 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-border/30 h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-yellow"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Left: Step Info */}
            <div className="lg:w-1/2 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-display font-black tracking-widest px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary uppercase">
                    {step.badge}
                  </span>
                  <span className="text-xs text-muted-foreground font-ui">
                    {currentStep + 1} de {tutorialSteps.length}
                  </span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-black text-foreground mb-1 flex items-center gap-2">
                  <IconComponent className={step.accentColor} size={28} />
                  <span>{step.title}</span>
                </h3>

                <p className="text-sm font-semibold text-primary/80 mb-3">
                  {step.subtitle}
                </p>

                <p className="text-sm text-muted-foreground leading-relaxed font-body mb-4">
                  {step.description}
                </p>

                {/* Dicas Pro */}
                <div className="space-y-2 bg-muted/20 border border-border/40 p-3.5 rounded-xl">
                  <div className="text-xs font-display font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
                    <Sparkles size={14} className="text-neon-yellow" />
                    Dicas de Especialista:
                  </div>
                  {step.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/80 font-ui">
                      <CheckCircle2 size={14} className="text-neon-green flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground font-ui">Visualizar:</span>
                <button
                  onClick={() => setViewMode("interactive")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-display uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    viewMode === "interactive"
                      ? "bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Film size={13} /> Simulação Viva
                </button>
                <button
                  onClick={() => setViewMode("screenshot")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-display uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    viewMode === "screenshot"
                      ? "bg-secondary text-white font-bold shadow-[0_0_15px_rgba(255,0,255,0.4)]"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Camera size={13} /> Captura Real
                </button>
              </div>
            </div>

            {/* Right: Visual Area (Interactive Simulation OR Real Captured Screenshot) */}
            <div className="lg:w-1/2 flex items-center justify-center bg-background/50 border border-border/40 rounded-2xl p-4 min-h-[300px] sm:min-h-[360px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                {viewMode === "screenshot" ? (
                  <motion.div
                    key={`shot-${currentStep}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full h-full min-h-[280px] sm:min-h-[340px] flex items-center justify-center"
                  >
                    <Image
                      src={step.imageSrc}
                      alt={step.title}
                      fill
                      className="object-contain rounded-xl drop-shadow-[0_0_20px_rgba(0,0,0,0.6)]"
                      priority
                    />
                    <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-display text-muted-foreground uppercase border border-white/10">
                      Captura Real da Partida
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`interactive-${currentStep}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="w-full h-full flex flex-col justify-center items-center p-2"
                  >
                    {/* Step 1 Interactive Preview: Room & Avatar */}
                    {currentStep === 0 && (
                      <div className="w-full max-w-xs space-y-4 text-center">
                        <div className="glass-card p-4 border border-neon-cyan/40 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">
                            Código da Sala
                          </span>
                          <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="font-display text-3xl font-black text-neon-cyan tracking-[0.3em]"
                          >
                            BLITZ7
                          </motion.div>
                        </div>

                        <div className="flex justify-center gap-3">
                          {["flame", "star", "game"].map((av, idx) => (
                            <motion.div
                              key={av}
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 2, delay: idx * 0.3, repeat: Infinity }}
                              className={`p-2.5 rounded-xl border ${idx === 0 ? "border-neon-cyan bg-neon-cyan/10 ring-2 ring-neon-cyan/30" : "border-border/40 bg-muted/20"}`}
                            >
                              <AvatarDisplay avatarId={av} size={36} />
                            </motion.div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground font-ui">
                          Toque no código para copiar e mandar no grupo! 📲
                        </p>
                      </div>
                    )}

                    {/* Step 2 Interactive Preview: Lobby */}
                    {currentStep === 1 && (
                      <div className="w-full max-w-sm space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: "Lucas (Host)", avatar: "flame", isHost: true },
                            { name: "Mariana", avatar: "star", isHost: false },
                            { name: "Gabriel", avatar: "game", isHost: false },
                          ].map((p, idx) => (
                            <motion.div
                              key={p.name}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: idx * 0.15, type: "spring" }}
                              className="glass-card p-2.5 text-center flex flex-col items-center justify-center relative border-border/40"
                            >
                              {p.isHost && <span className="absolute top-1 right-1 text-xs">👑</span>}
                              <AvatarDisplay avatarId={p.avatar} size={30} />
                              <span className="text-[11px] font-bold font-ui truncate w-full mt-1">{p.name}</span>
                              <div className="w-2 h-2 rounded-full bg-neon-green mt-1 animate-pulse" />
                            </motion.div>
                          ))}
                        </div>

                        <motion.div
                          animate={{
                            boxShadow: [
                              "0 0 10px rgba(0, 240, 255, 0.4)",
                              "0 0 25px rgba(0, 240, 255, 0.8)",
                              "0 0 10px rgba(0, 240, 255, 0.4)",
                            ],
                            scale: [1, 1.02, 1],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="btn-neon w-full py-3 rounded-xl text-primary-foreground font-display text-xs tracking-widest text-center flex items-center justify-center gap-2"
                        >
                          <Play size={16} /> Iniciar Jogo (3 Prontos)
                        </motion.div>
                      </div>
                    )}

                    {/* Step 3 Interactive Preview: Fast Answer Typing & Score Pop */}
                    {currentStep === 2 && (
                      <div className="w-full max-w-sm space-y-3 text-center relative">
                        {/* Fake Question */}
                        <div className="glass-card p-4 border border-primary/30">
                          <div className="flex items-center justify-between text-[11px] font-display text-muted-foreground mb-2">
                            <span>RODADA 3</span>
                            <span className="text-neon-cyan flex items-center gap-1">
                              <Clock size={12} className="animate-spin" /> 14s
                            </span>
                          </div>
                          <p className="font-display text-base font-bold text-foreground">
                            "Qual o bruxo com uma cicatriz em forma de raio na testa?"
                          </p>
                        </div>

                        {/* Interactive Simulated Typing */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={simulatedAnswer}
                            className="flex-1 bg-input border border-neon-cyan rounded-xl px-3 py-2 text-sm font-body text-foreground"
                          />
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSimulatedScore(10);
                              setTimeout(() => setSimulatedScore(null), 1500);
                            }}
                            className="btn-neon px-4 py-2 rounded-xl text-xs font-display tracking-widest text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.6)]"
                          >
                            Enviar
                          </motion.button>
                        </div>

                        <AnimatePresence>
                          {simulatedScore !== null && (
                            <motion.div
                              initial={{ scale: 0.3, y: 10, opacity: 0 }}
                              animate={{ scale: [0.3, 1.4, 1.2], y: -45, opacity: 1 }}
                              exit={{ opacity: 0, y: -65 }}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 font-display text-4xl font-black text-neon-green drop-shadow-[0_0_20px_rgba(57,255,20,0.9)] pointer-events-none"
                            >
                              +10 PTS!
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <p className="text-[11px] text-muted-foreground font-ui">
                          Clique em "Enviar" para testar o efeito de acerto! 👆
                        </p>
                      </div>
                    )}

                    {/* Step 4 Interactive Preview: Robbery & True/False */}
                    {currentStep === 3 && (
                      <div className="w-full max-w-sm space-y-4 text-center">
                        <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 relative">
                          <motion.div
                            animate={{ rotate: [-8, 8, -8], scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-14 h-14 mx-auto rounded-full bg-neon-magenta/20 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(255,0,255,0.5)] mb-2"
                          >
                            🦹
                          </motion.div>
                          <h4 className="font-display text-sm font-black text-neon-magenta uppercase tracking-wider">
                            Rodada de Roubo Ativa!
                          </h4>
                          <p className="text-[11px] text-muted-foreground font-ui mt-1">
                            Você confisca 10 pontos de quem você escolher!
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1 py-2.5 rounded-xl border-2 border-neon-green text-neon-green font-display text-xs uppercase font-bold tracking-wider">
                            Verdadeiro
                          </div>
                          <div className="flex-1 py-2.5 rounded-xl border-2 border-destructive text-destructive font-display text-xs uppercase font-bold tracking-wider">
                            Falso
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5 Interactive Preview: Podium & Champion */}
                    {currentStep === 4 && (
                      <div className="w-full max-w-xs text-center space-y-3">
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], rotate: [-4, 4, -4] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                          className="text-5xl drop-shadow-[0_0_25px_rgba(255,215,0,0.8)]"
                        >
                          🏆
                        </motion.div>

                        <div className="flex items-end justify-center gap-3 h-28">
                          {/* 2nd place */}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-ui text-muted-foreground">#2</span>
                            <div className="w-14 h-14 rounded-t-lg bg-muted/40 border border-border flex items-center justify-center font-display text-xs text-muted-foreground">
                              80 pts
                            </div>
                          </div>
                          {/* 1st place */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-display text-neon-yellow font-bold">👑 Campeão</span>
                            <div className="w-16 h-22 rounded-t-lg bg-gradient-to-t from-neon-yellow/20 to-neon-yellow/40 border-2 border-neon-yellow shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center justify-center font-display text-sm font-black text-neon-yellow">
                              100 pts
                            </div>
                          </div>
                          {/* 3rd place */}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-ui text-muted-foreground">#3</span>
                            <div className="w-14 h-10 rounded-t-lg bg-muted/30 border border-border flex items-center justify-center font-display text-xs text-muted-foreground">
                              60 pts
                            </div>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-yellow/10 border border-neon-yellow/30 text-[11px] font-bold text-neon-yellow">
                          <Flame size={14} /> Streak x4 Ativo!
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 sm:p-6 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Step Dots */}
            <div className="flex items-center gap-2">
              {tutorialSteps.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-8 bg-primary shadow-[0_0_10px_rgba(0,240,255,0.6)]"
                      : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                  aria-label={`Ir para passo ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentStep > 0 && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={prevStep}
                  className="px-4 py-2.5 rounded-xl border border-border bg-background/40 hover:bg-muted/40 text-foreground font-display text-xs uppercase tracking-wider flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                >
                  <ChevronLeft size={16} /> Anterior
                </motion.button>
              )}

              {currentStep < tutorialSteps.length - 1 ? (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={nextStep}
                  className="btn-neon px-6 py-2.5 rounded-xl text-primary-foreground font-display text-xs uppercase tracking-widest flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                >
                  Próximo <ChevronRight size={16} />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      "0 0 15px rgba(0, 240, 255, 0.4)",
                      "0 0 30px rgba(0, 240, 255, 0.8)",
                      "0 0 15px rgba(0, 240, 255, 0.4)",
                    ],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  onClick={() => {
                    onClose();
                    onStartPlaying?.();
                  }}
                  className="btn-neon px-6 py-2.5 rounded-xl text-primary-foreground font-display text-xs uppercase tracking-widest flex items-center gap-2 flex-1 sm:flex-initial justify-center"
                >
                  <Sparkles size={16} /> Entendi, Bora Jogar!
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

