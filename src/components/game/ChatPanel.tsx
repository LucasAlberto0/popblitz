"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { getGameSocket } from "@/lib/socket";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface ChatPanelProps {
  roomCode?: string;
}

const ChatPanel = ({ roomCode }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [player, setPlayer] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionData = sessionStorage.getItem("player");
    if (sessionData) {
      setPlayer(JSON.parse(sessionData));
    } else {
      const localData = localStorage.getItem("player");
      if (localData) {
        const parsed = JSON.parse(localData);
        setPlayer(parsed);
        sessionStorage.setItem("player", localData);
      }
    }
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    const socket = getGameSocket();
    const handleNewMessage = (newMessage: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    };

    const handleRoomState = (snapshot: any) => {
      if (snapshot?.chatHistory && Array.isArray(snapshot.chatHistory)) {
        setMessages((prev) => (prev.length === 0 ? snapshot.chatHistory : prev));
      }
    };

    socket.on("chat:message", handleNewMessage);
    socket.on("room:state", handleRoomState);

    return () => {
      socket.off("chat:message", handleNewMessage);
      socket.off("room:state", handleRoomState);
    };
  }, [roomCode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !roomCode || !player) return;

    const socket = getGameSocket();
    const textToSend = input.trim();
    setInput("");

    socket.emit("chat:send", {
      roomCode: roomCode.toUpperCase(),
      sender: player.name || "Jogador",
      text: textToSend,
    });
  };

  return (
    <div className="glass-card flex flex-col h-full min-h-0">
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
                <span className={`font-semibold mr-1 ${msg.sender === (player?.name || "Você") ? "text-primary" : "text-secondary"}`}>
                  {msg.sender}:
                </span>
              )}
              <span className={msg.isSystem ? "" : "text-muted-foreground"}>{msg.text}</span>
              {!msg.isSystem && (
                <span className="text-[10px] text-muted-foreground/50 ml-2">{msg.timestamp}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Diga algo..."
          className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:neon-border-cyan transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="btn-neon rounded-lg p-2 text-primary-foreground disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
