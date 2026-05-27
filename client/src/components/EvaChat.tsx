/**
 * EvaChat — Eva AI virtual sales assistant for Napoli Pizzeria
 *
 * - Real in-page chat powered by the built-in LLM (Eva persona)
 * - Draggable bubble: customer can drag it anywhere on screen
 * - Dismissal is session-only: widget reappears on page refresh
 * - Chat panel anchors near the bubble position
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { X, MessageCircle, Send, ChevronDown, Sparkles, Loader2, Phone, GripHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_KEY = "eva-chat-dismissed"; // cleared on page refresh automatically
const POS_KEY = "eva-bubble-pos";         // persists position across refreshes
const EVA_PHONE = "+17022912025";
const EVA_PHONE_DISPLAY = "+1 (702) 291-2025";
const BUBBLE_SIZE = 56;
const PANEL_W = 380;
const PANEL_H = 520;

const QUICK_QUESTIONS = [
  "What are today's specials?",
  "Do you deliver to my area?",
  "What are your hours?",
  "Can I customize my pizza?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "👋 Hi! I'm **Eva**, Napoli Pizzeria's virtual assistant. I can help with our menu, specials, delivery, hours, and more. How can I help you today?",
};

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

// ── Default position: bottom-center ──────────────────────────────────────────
function defaultPos() {
  const x = Math.round(window.innerWidth / 2 - BUBBLE_SIZE / 2);
  const y = Math.round(window.innerHeight - BUBBLE_SIZE - 16);
  return { x, y };
}

function loadPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch { /* ignore */ }
  return defaultPos();
}

function clampPos(x: number, y: number) {
  const maxX = window.innerWidth - BUBBLE_SIZE;
  const maxY = window.innerHeight - BUBBLE_SIZE;
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EvaChat() {
  // Dismissed state uses sessionStorage → cleared on tab/refresh
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "true"; } catch { return false; }
  });

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");

  // Draggable position
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false); // distinguish click vs drag
  const bubbleRef = useRef<HTMLButtonElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── LLM mutation ────────────────────────────────────────────────────────────
  const chatMutation = trpc.eva.chat.useMutation({
    onSuccess: (data) => {
      const reply = typeof data.reply === "string" ? data.reply : String(data.reply);
      setMessages((prev) => [...prev, { role: "assistant" as const, content: reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: "Sorry, I'm having trouble right now. Please call us at 725-204-0379 for immediate help!" },
      ]);
    },
  });

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  // ── Focus input when panel opens ────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // ── Persist position ────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
  }, [pos]);

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag on the bubble itself (not child buttons inside the panel)
    dragging.current = true;
    didDrag.current = false;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    const clamped = clampPos(newX, newY);
    // Mark as drag if moved more than 4px
    if (Math.abs(newX - pos.x) > 4 || Math.abs(newY - pos.y) > 4) {
      didDrag.current = true;
    }
    setPos(clamped);
  }, [pos]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // ── Panel position: try to keep it on screen near the bubble ────────────────
  const panelStyle = (): React.CSSProperties => {
    const margin = 8;
    let left = pos.x + BUBBLE_SIZE / 2 - PANEL_W / 2;
    let top = pos.y - PANEL_H - margin;

    // If panel goes off top, show below
    if (top < 0) top = pos.y + BUBBLE_SIZE + margin;
    // Clamp horizontally
    left = Math.max(margin, Math.min(left, window.innerWidth - PANEL_W - margin));

    return { left, top, width: Math.min(PANEL_W, window.innerWidth - margin * 2) };
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleDismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, "true"); } catch { /* ignore */ }
    setDismissed(true);
    setOpen(false);
  };

  const handleBubbleClick = () => {
    if (didDrag.current) return; // was a drag, not a click
    setOpen((p) => !p);
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;
    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    chatMutation.mutate({ messages: updated.slice(-10) });
  };

  const handleSend = () => sendMessage(input);
  const handleQuick = (q: string) => sendMessage(q);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (dismissed) return null;

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            ...panelStyle(),
            height: Math.min(PANEL_H, window.innerHeight - 80),
            background: "white",
            border: "1px solid oklch(0.88 0.015 80)",
            animation: "eva-slide-up 220ms cubic-bezier(0.23, 1, 0.32, 1) both",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--napoli-dark, #1a0a00)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative" style={{ background: "oklch(0.28 0.06 30)" }}>
              <Sparkles size={16} style={{ color: "var(--napoli-gold, #d4a017)" }} />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: "oklch(0.65 0.22 145)", borderColor: "var(--napoli-dark, #1a0a00)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: "oklch(0.99 0.015 80)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em" }}>EVA AI</p>
              <p className="text-xs" style={{ color: "oklch(0.65 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
                {chatMutation.isPending ? "Typing…" : "Napoli Virtual Assistant · Online"}
              </p>
            </div>
            <a href={`tel:${EVA_PHONE}`} className="p-1.5 rounded-full transition-colors hover:bg-white/10" style={{ color: "oklch(0.75 0.015 80)" }} title={`Call ${EVA_PHONE_DISPLAY}`}>
              <Phone size={15} />
            </a>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full transition-colors hover:bg-white/10" style={{ color: "oklch(0.75 0.015 80)" }} title="Minimise">
              <ChevronDown size={16} />
            </button>
            <button onClick={handleDismiss} className="p-1.5 rounded-full transition-colors hover:bg-white/10" style={{ color: "oklch(0.75 0.015 80)" }} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "oklch(0.985 0.01 80)" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5" style={{ background: "var(--napoli-dark, #1a0a00)" }}>
                    <Sparkles size={10} style={{ color: "var(--napoli-gold, #d4a017)" }} />
                  </div>
                )}
                <div
                  className="rounded-2xl px-3 py-2 text-xs leading-relaxed max-w-[80%]"
                  style={
                    msg.role === "user"
                      ? { background: "var(--napoli-red, #c0392b)", color: "white", borderBottomRightRadius: "4px", fontFamily: "'Lato', sans-serif" }
                      : { background: "white", color: "oklch(0.28 0.04 30)", border: "1px solid oklch(0.90 0.012 80)", borderBottomLeftRadius: "4px", fontFamily: "'Lato', sans-serif" }
                  }
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--napoli-dark, #1a0a00)" }}>
                  <Sparkles size={10} style={{ color: "var(--napoli-gold, #d4a017)" }} />
                </div>
                <div className="rounded-2xl rounded-bl-[4px] px-3 py-2.5 flex items-center gap-1.5" style={{ background: "white", border: "1px solid oklch(0.90 0.012 80)" }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: "oklch(0.55 0.03 30)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>Eva is typing…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 shrink-0" style={{ background: "oklch(0.985 0.01 80)" }}>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => handleQuick(q)}
                    className="text-xs px-2.5 py-1.5 rounded-full border transition-all hover:border-red-300 hover:bg-red-50 active:scale-[0.97]"
                    style={{ borderColor: "oklch(0.85 0.015 80)", background: "white", color: "oklch(0.38 0.04 30)", fontFamily: "'Lato', sans-serif" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 shrink-0 border-t" style={{ borderColor: "oklch(0.88 0.015 80)", background: "white" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Eva anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatMutation.isPending}
              className="flex-1 text-xs px-3 py-2 rounded-full border outline-none focus:ring-1 disabled:opacity-60"
              style={{ borderColor: "oklch(0.82 0.015 80)", fontFamily: "'Lato', sans-serif", background: "oklch(0.985 0.01 80)" }}
            />
            <button onClick={handleSend} disabled={!input.trim() || chatMutation.isPending}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "var(--napoli-red, #c0392b)", color: "white" }}>
              {chatMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* ── Draggable bubble ────────────────────────────────────────────────── */}
      <div
        className="fixed z-50 flex flex-col items-center gap-1"
        style={{ left: pos.x, top: pos.y, width: BUBBLE_SIZE, touchAction: "none" }}
      >
        {/* Dismiss × */}
        {!open && (
          <button
            onClick={handleDismiss}
            className="w-5 h-5 rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95 mb-0.5"
            style={{ background: "oklch(0.35 0.04 30)", color: "white" }}
            title="Close Eva chat"
          >
            <X size={10} />
          </button>
        )}

        {/* Main bubble — draggable */}
        <button
          ref={bubbleRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleBubbleClick}
          className="relative flex items-center justify-center rounded-full shadow-xl select-none"
          style={{
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            background: open ? "var(--napoli-dark, #1a0a00)" : "var(--napoli-red, #c0392b)",
            color: "white",
            cursor: dragging.current ? "grabbing" : "grab",
            transition: "background 200ms ease-out",
            touchAction: "none",
          }}
          title={open ? "Close Eva AI" : "Chat with Eva AI — drag to move"}
        >
          {open ? (
            <ChevronDown size={22} />
          ) : (
            <>
              <MessageCircle size={24} />
              <span className="absolute inset-0 rounded-full" style={{ animation: "eva-pulse 2.5s ease-out infinite", background: "var(--napoli-red, #c0392b)", opacity: 0 }} />
            </>
          )}
        </button>

        {/* Drag hint icon + label */}
        {!open && (
          <div className="flex flex-col items-center gap-0.5">
            <GripHorizontal size={10} style={{ color: "oklch(0.55 0.03 30)", opacity: 0.7 }} />
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full shadow"
              style={{ background: "var(--napoli-dark, #1a0a00)", color: "var(--napoli-gold, #d4a017)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em", fontSize: "0.6rem" }}
            >
              EVA AI
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes eva-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes eva-pulse {
          0%   { transform: scale(1);    opacity: 0.55; }
          70%  { transform: scale(1.65); opacity: 0;    }
          100% { transform: scale(1.65); opacity: 0;    }
        }
      `}</style>
    </>
  );
}
