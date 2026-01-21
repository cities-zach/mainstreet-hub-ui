import React, { useMemo, useRef, useState, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/api";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm Fred. I can help you navigate MainSuite, answer questions, or draft event content. How can I help?",
};

export default function AIChatPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState([DEFAULT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
          page_context: window.location.pathname,
        }),
      });

      setSessionId(response.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.message || "Sorry, I didn't catch that. Try again?",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into a problem sending that. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-white/90 dark:bg-slate-950/80 border-l border-slate-200 dark:border-slate-800 transition-all duration-300",
        isOpen ? "w-[360px] opacity-100" : "w-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Bot className="w-5 h-5 text-[#835879]" />
          <span className="font-semibold">Fred</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasMessages && (
          <p className="text-sm text-slate-500">
            Ask me anything about MainSuite.
          </p>
        )}
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
              msg.role === "user"
                ? "ml-auto bg-[#835879] text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or draft event text..."
          className="resize-none"
          rows={3}
        />
        <Button
          className="mt-3 w-full bg-[#835879] text-white"
          onClick={sendMessage}
          disabled={isSending || !input.trim()}
        >
          {isSending ? "Sending..." : "Send"}
          <Send className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </aside>
  );
}
