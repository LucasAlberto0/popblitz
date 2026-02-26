"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

const mockMessages: ChatMessage[] = [
  { id: "1", sender: "Sistema", text: "A rodada começou!", timestamp: "00:01", isSystem: true },
  { id: "2", sender: "Luna", text: "essa é fácil!", timestamp: "00:03" },
  { id: "3", sender: "Blaze", text: "hmm 🤔", timestamp: "00:05" },
  { id: "4", sender: "Sistema", text: "Luna acertou! +150 pontos", timestamp: "00:06", isSystem: true },
];

const ChatPanel = () => {
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "Você", text: input, timestamp: "agora" },
    ]);
    setInput("");
  };

  return (
    <div className="glass-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display text-xs tracking-widest text-primary uppercase">Chat</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-60 lg:max-h-none scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm ${msg.isSystem ? "text-neon-green font-ui italic" : ""}`}
            >
              {!msg.isSystem && (
                <span className="font-semibold text-secondary mr-1">{msg.sender}:</span>
              )}
              <span className={msg.isSystem ? "" : "text-muted-foreground"}>{msg.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Digite aqui..."
          className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:neon-border-cyan transition-all"
        />
        <button
          onClick={sendMessage}
          className="btn-neon rounded-lg p-2 text-primary-foreground"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
