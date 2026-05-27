/**
 * EvaChat — Floating Eva AI virtual sales assistant widget
 *
 * A dismissible chat bubble in the bottom-right corner that lets customers
 * start a conversation with Eva AI via SMS (+17022912025).
 * The user can minimise the panel back to the bubble or close it entirely
 * for the session (stored in sessionStorage so it doesn't reappear on refresh).
 */
import { useState, useEffect } from "react";
import { X, MessageCircle, Send, ChevronDown, Sparkles } from "lucide-react";

const EVA_PHONE = "+17022912025";
const EVA_PHONE_DISPLAY = "+1 (702) 291-2025";
const SESSION_KEY = "eva-chat-dismissed";

// Pre-set quick questions customers can tap
const QUICK_QUESTIONS = [
  "What are today's specials?",
  "Do you deliver to my area?",
  "How long is the wait time?",
  "Can I customize my pizza?",
];

export default function EvaChat() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Persist dismissal in sessionStorage
  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
    setOpen(false);
  };

  const handleToggle = () => setOpen((prev) => !prev);

  // Build the SMS link with an optional pre-filled body
  const buildSmsLink = (body?: string) => {
    const encoded = body ? encodeURIComponent(body) : "";
    return `sms:${EVA_PHONE}${encoded ? `?body=${encoded}` : ""}`;
  };

  const handleSend = () => {
    const body = message.trim() || undefined;
    window.open(buildSmsLink(body), "_self");
    setMessage("");
  };

  const handleQuick = (q: string) => {
    window.open(buildSmsLink(q), "_self");
  };

  if (dismissed) return null;

  return (
    <>
      {/* ── Expanded panel ── */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: "min(340px, calc(100vw - 2rem))",
            background: "white",
            border: "1px solid oklch(0.88 0.015 80)",
            animation: "eva-slide-up 220ms cubic-bezier(0.23, 1, 0.32, 1) both",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "var(--napoli-dark, #1a0a00)" }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
              style={{ background: "oklch(0.28 0.06 30)" }}
            >
              <Sparkles size={18} style={{ color: "var(--napoli-gold, #d4a017)" }} />
              {/* Online dot */}
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                style={{ background: "oklch(0.65 0.22 145)", borderColor: "var(--napoli-dark, #1a0a00)" }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: "oklch(0.99 0.015 80)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em" }}
              >
                EVA AI
              </p>
              <p className="text-xs" style={{ color: "oklch(0.65 0.015 80)", fontFamily: "'Lato', sans-serif" }}>
                Virtual Sales Assistant · Online
              </p>
            </div>

            {/* Minimise */}
            <button
              onClick={handleToggle}
              className="p-1.5 rounded-full transition-colors hover:bg-white/10"
              style={{ color: "oklch(0.75 0.015 80)" }}
              title="Minimise"
            >
              <ChevronDown size={16} />
            </button>

            {/* Close / dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full transition-colors hover:bg-white/10"
              style={{ color: "oklch(0.75 0.015 80)" }}
              title="Close and don't show again"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4 space-y-3" style={{ background: "oklch(0.985 0.01 80)" }}>
            {/* Eva greeting bubble */}
            <div className="flex items-start gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--napoli-dark, #1a0a00)" }}
              >
                <Sparkles size={12} style={{ color: "var(--napoli-gold, #d4a017)" }} />
              </div>
              <div
                className="rounded-2xl rounded-tl-none px-3 py-2.5 text-xs leading-relaxed max-w-[85%]"
                style={{
                  background: "white",
                  color: "oklch(0.28 0.04 30)",
                  border: "1px solid oklch(0.90 0.012 80)",
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                👋 Hi! I'm <strong>Eva</strong>, Napoli Pizzeria's virtual assistant.
                I can help with orders, specials, delivery, and more — via SMS!
              </div>
            </div>

            {/* Quick questions */}
            <div>
              <p className="text-xs mb-2" style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
                Quick questions:
              </p>
              <div className="flex flex-col gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuick(q)}
                    className="text-left text-xs px-3 py-2 rounded-xl border transition-all hover:border-red-300 hover:bg-red-50 active:scale-[0.98]"
                    style={{
                      borderColor: "oklch(0.88 0.015 80)",
                      background: "white",
                      color: "oklch(0.35 0.04 30)",
                      fontFamily: "'Lato', sans-serif",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom message input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Type a message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 text-xs px-3 py-2.5 rounded-xl border outline-none focus:ring-1"
                style={{
                  borderColor: "oklch(0.82 0.015 80)",
                  fontFamily: "'Lato', sans-serif",
                  background: "white",
                }}
              />
              <button
                onClick={handleSend}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:opacity-90"
                style={{ background: "var(--napoli-red, #c0392b)", color: "white" }}
                title="Send via SMS"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Phone note */}
            <p className="text-center text-xs" style={{ color: "oklch(0.60 0.03 30)", fontFamily: "'Lato', sans-serif" }}>
              Opens your SMS app · Eva at{" "}
              <a
                href={`tel:${EVA_PHONE}`}
                className="font-semibold underline"
                style={{ color: "var(--napoli-red, #c0392b)" }}
              >
                {EVA_PHONE_DISPLAY}
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ── Floating bubble button ── */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Dismiss × when collapsed */}
        {!open && (
          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95"
            style={{ background: "oklch(0.35 0.04 30)", color: "white" }}
            title="Close Eva chat"
          >
            <X size={12} />
          </button>
        )}

        <button
          onClick={handleToggle}
          className="relative flex items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{
            width: 56,
            height: 56,
            background: open ? "var(--napoli-dark, #1a0a00)" : "var(--napoli-red, #c0392b)",
            color: "white",
            transition: "background 200ms ease-out, transform 160ms ease-out",
          }}
          title={open ? "Close Eva AI" : "Chat with Eva AI"}
        >
          {open ? (
            <ChevronDown size={22} />
          ) : (
            <>
              <MessageCircle size={24} />
              {/* Pulse ring */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  animation: "eva-pulse 2.5s ease-out infinite",
                  background: "var(--napoli-red, #c0392b)",
                  opacity: 0,
                }}
              />
            </>
          )}
        </button>

        {/* Label badge (shown when collapsed) */}
        {!open && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full shadow"
            style={{
              background: "var(--napoli-dark, #1a0a00)",
              color: "var(--napoli-gold, #d4a017)",
              fontFamily: "'Oswald', sans-serif",
              letterSpacing: "0.06em",
              fontSize: "0.6rem",
            }}
          >
            EVA AI
          </span>
        )}
      </div>

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes eva-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
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
