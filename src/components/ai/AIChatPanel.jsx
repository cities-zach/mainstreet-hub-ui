import React, { useMemo, useRef, useState, useEffect } from "react";
import { Bot, Minus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/api";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm your Friendly Resource for Exploring Downtown, but you can call me FRED! I can help you navigate MainSuite, answer questions or draft event content. Where should we begin?",
};

export default function AIChatPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState([DEFAULT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const container = messagesRef.current;
    if (container) {
      container.scrollTop = 0;
    }
    setIsNearBottom(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isNearBottom) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages, isNearBottom]);

  const handleScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    setIsNearBottom(distanceFromBottom < 80);
  };

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

  if (!isOpen) return null;

  return (
    <aside className="flex flex-col w-[92vw] sm:w-[360px] max-h-[75vh] sm:max-h-[70vh] bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Bot className="w-5 h-5 text-[#835879]" />
          <span className="font-semibold">FRED</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500"
            onClick={onClose}
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={messagesRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
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
        {isSending && (
          <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-1">
              <span className="sr-only">Fred is typing</span>
              <span className="h-2 w-2 rounded-full bg-slate-400/80 animate-pulse" />
              <span
                className="h-2 w-2 rounded-full bg-slate-400/80 animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-slate-400/80 animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
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
