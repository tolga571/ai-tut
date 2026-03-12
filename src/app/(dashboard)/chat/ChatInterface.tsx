"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  translation?: string;
};

export default function ChatInterface({ user }: { user: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    // Fetch initial chat
    const fetchChat = async () => {
      try {
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = await fetch("/api/chat").then(r => r.json());
          if (data.id) {
            setConversationId(data.id);
            setMessages(data.messages || []);
          }
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    fetchChat();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, conversationId }),
      });

      if (!res.ok) {
        throw new Error("Chat failed");
      }

      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.slice(0, -1)); // revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 px-4 md:px-0 z-0">
      <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto pb-32 pt-6 px-4 custom-scrollbar">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
             <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-2xl">👋</span>
             </div>
             <p className="text-lg font-medium text-gray-300">Start your conversation</p>
             <p className="text-sm">Say anything to begin practicing</p>
          </div>
        )}
        
        <div className="space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                msg.role === "user" ? "self-end items-end ml-auto" : "self-start items-start mr-auto"
              }`}
            >
              {msg.role === "user" ? (
                <div className="bg-blue-600/90 hover:bg-blue-600 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md transition-all text-[15px] leading-relaxed break-words border border-blue-500/30">
                  {msg.content}
                </div>
              ) : (
                <div className="bg-gray-800/90 backdrop-blur border border-gray-700/50 px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-lg overflow-hidden group transition-all">
                  <p className="text-[16px] leading-relaxed text-blue-50">
                    {msg.content}
                  </p>
                  {msg.translation && (
                    <div className="mt-3 pt-3 border-t border-white/5 relative">
                      <p className="text-[14px] leading-relaxed text-gray-400 font-light group-hover:text-gray-300 transition-colors">
                        {msg.translation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex self-start max-w-[80%] items-start mr-auto">
              <div className="bg-gray-800/80 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm border border-gray-700/50">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="absolute bottom-6 w-full max-w-4xl left-1/2 -translate-x-1/2 px-4">
        <div className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden glass-panel backdrop-blur-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50">
          <form onSubmit={sendMessage} className="flex items-center w-full px-2 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Type a message in ${user?.targetLang?.toUpperCase() || 'your language'}...`}
              className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-gray-500 px-4 text-base h-12 outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 transition-all active:scale-95 mx-1"
            >
              <svg className="w-5 h-5 translate-x-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
