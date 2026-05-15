import { useState, useRef, useEffect, useCallback, useMemo, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useTelegram } from "../hooks/useTelegram";
import { tgNotify } from "../utils/tgNotify";

/* ──────────────────────────────────────────────────────────────────────────
   Fanvue Concierge — premium minimal support
   Reference language: Linear support · Arc help · Apple Card concierge
   Rules of the system:
   • Pure black canvas, no panels-on-panels, no gradients, no glow.
   • One single accent — neon green — used surgically (status dot, send,
     user bubble border, primary CTA). Never on backgrounds.
   • All metadata, timestamps, labels, IDs in JetBrains Mono uppercase.
     All running text in Inter. One display line in Space Grotesk.
   • Hairline 1px borders only (rgba white 6–10%). No shadows.
   • Asymmetric bubble geometry: snipped corner toward sender.
   • Quick replies render as command-row items with arrow glyph,
     not as colored pills.
────────────────────────────────────────────────────────────────────────── */

const ease = [0.16, 1, 0.3, 1] as const;

const C = {
  bg: "#030303",
  surface: "rgba(255,255,255,0.025)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#ffffff",
  soft: "rgba(255,255,255,0.62)",
  muted: "rgba(255,255,255,0.36)",
  faint: "rgba(255,255,255,0.18)",
  green: "#39ff63",
  greenSoft: "rgba(57,255,99,0.10)",
  greenLine: "rgba(57,255,99,0.32)",
};

const FONT_DISPLAY = 'var(--font-display, "Space Grotesk", Inter, system-ui, sans-serif)';
const FONT_MONO = 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)';

type SupportMessage = {
  id: number | string;
  sender: "user" | "admin";
  text: string;
  created: string;
};

function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDay(iso: string, lang: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return lang === "ru" ? "Сегодня" : "Today";
  if (same(d, yest)) return lang === "ru" ? "Вчера" : "Yesterday";
  return d
    .toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "long" })
    .toLowerCase();
}

export default function Support() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const messages = useStore((s) => s.supportMessages) as SupportMessage[];
  const addSupportMessage = useStore((s) => s.addSupportMessage);
  const clearSupportUnread = useStore((s) => s.clearSupportUnread);
  const lang = useStore((s) => s.lang);
  const user = useStore((s) => s.user);

  const t = (ru: string, en: string) => (lang === "ru" ? ru : en);

  const [text, setText] = useState("");
  const [kbHeight, setKbHeight] = useState(0);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    clearSupportUnread();
  }, [clearSupportUnread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender !== "user") return;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    setTyping(true);
    typingTimer.current = window.setTimeout(() => setTyping(false), 2200);
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, [messages]);

  const onResize = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const diff = window.innerHeight - vv.height;
    setKbHeight(diff > 50 ? diff : 0);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, [onResize]);

  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    haptic("light");
    addSupportMessage({
      id: Date.now(),
      sender: "user",
      text: trimmed,
      created: new Date().toISOString(),
    });
    tgNotify(
      `💬 Сообщение в поддержку\n👤 ${user?.username ? "@" + user.username : (user?.full_name ?? "—")} (ID: ${user?.uid})\n\n${trimmed}`,
    );
  };

  const handleSend = () => {
    send(text);
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const quickReplies = [
    t("Где мой заказ", "Where is my order"),
    t("Проблема с оплатой", "Payment issue"),
    t("Срок выдачи", "Delivery time"),
    t("Связать с оператором", "Talk to operator"),
  ];

  // Stable ticket id for the session (premium "real product" detail)
  const ticketId = useMemo(() => {
    const seed = (user?.uid ?? Date.now()) + "";
    const num = Math.abs(
      Array.from(seed).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7),
    ) % 9000 + 1000;
    return `FV-${num}`;
  }, [user?.uid]);

  const groups = useMemo(() => {
    const out: Array<
      | { type: "day"; key: string; label: string }
      | { type: "group"; key: string; sender: "user" | "admin"; items: SupportMessage[] }
    > = [];
    let lastDay = "";
    let cur: {
      type: "group";
      key: string;
      sender: "user" | "admin";
      items: SupportMessage[];
    } | null = null;

    messages.forEach((m) => {
      const day = new Date(m.created).toDateString();
      if (day !== lastDay) {
        out.push({ type: "day", key: "d-" + day, label: formatDay(m.created, lang) });
        lastDay = day;
        cur = null;
      }
      if (!cur || cur.sender !== m.sender) {
        cur = { type: "group", key: "g-" + m.id, sender: m.sender, items: [] };
        out.push(cur);
      }
      cur.items.push(m);
    });

    return out;
  }, [messages, lang]);

  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "user") return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        paddingTop: "max(0px, env(safe-area-inset-top))",
        paddingBottom: kbHeight > 0 ? kbHeight : 0,
        transition: "padding-bottom 100ms ease",
        overflow: "hidden",
        background: C.bg,
        color: C.text,
      }}
    >
      <Header
        typing={typing}
        ticketId={ticketId}
        t={t}
        onBack={() => {
          haptic("light");
          navigate("/support");
        }}
      />

      <main
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "20px 18px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {messages.length === 0 && (
          <EmptyChat
            t={t}
            quickReplies={quickReplies}
            onPick={(q) => {
              haptic("light");
              send(q);
            }}
          />
        )}

        <AnimatePresence initial={false}>
          {groups.map((g) => {
            if (g.type === "day") return <DaySeparator key={g.key} label={g.label} />;
            return <MessageGroup key={g.key} group={g} lang={lang} t={t} lastUserId={lastUserId} />;
          })}

          {typing && <TypingIndicator key="typing" t={t} />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </main>

      <Composer
        focused={focused}
        text={text}
        setText={setText}
        setFocused={setFocused}
        handleSend={handleSend}
        quickReplies={quickReplies}
        send={send}
        haptic={haptic}
        taRef={taRef}
        t={t}
        hasMessages={messages.length > 0}
      />
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────── */

function Header({
  typing,
  ticketId,
  t,
  onBack,
}: {
  typing: boolean;
  ticketId: string;
  t: (ru: string, en: string) => string;
  onBack: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease }}
      style={{ flexShrink: 0, background: C.bg, borderBottom: `1px solid ${C.border}` }}
    >
      {/* Row 1: back · monogram · name+status · ticket id */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 12px" }}>
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
          aria-label={t("Назад", "Back")}
          style={{
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: 999,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.text,
            cursor: "pointer",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            border: `1px solid ${C.borderStrong}`,
            display: "grid",
            placeItems: "center",
            color: C.text,
            fontFamily: FONT_DISPLAY,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          F
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              color: C.text,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("Fanvue Консьерж", "Fanvue Concierge")}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: C.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <motion.span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: C.green,
                boxShadow: `0 0 8px ${C.greenLine}`,
                flexShrink: 0,
              }}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <span style={{ color: typing ? C.green : C.muted }}>
              {typing ? t("печатает…", "typing…") : t("онлайн · ответ ~2 мин", "online · reply ~2m")}
            </span>
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9.5,
            color: C.muted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textAlign: "right",
            lineHeight: 1.3,
          }}
        >
          <div style={{ color: C.soft, fontWeight: 600 }}>{ticketId}</div>
          <div style={{ marginTop: 2 }}>{t("открыт", "open")}</div>
        </div>
      </div>
    </motion.header>
  );
}

/* ── Day separator ──────────────────────────────────────────────────── */

function DaySeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9.5,
          fontWeight: 500,
          color: C.muted,
          textTransform: "lowercase",
          letterSpacing: "0.16em",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

/* ── Message group ──────────────────────────────────────────────────── */

function MessageGroup({
  group,
  lang,
  t,
  lastUserId,
}: {
  group: { sender: "user" | "admin"; items: SupportMessage[] };
  lang: string;
  t: (ru: string, en: string) => string;
  lastUserId: number | string | null;
}) {
  const isUser = group.sender === "user";
  const last = group.items[group.items.length - 1];
  const time = formatTime(last.created, lang);
  const showCheck = isUser && group.items.some((m) => m.id === lastUserId);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.26, ease }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 6,
      }}
    >
      {/* Tiny meta row above bubble — name on operator side, time on user */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: FONT_MONO,
          fontSize: 9.5,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          padding: "0 4px",
        }}
      >
        {isUser ? (
          <>
            <span>{time}</span>
            {showCheck && <span style={{ color: C.green }}>delivered</span>}
          </>
        ) : (
          <>
            <span style={{ color: C.soft }}>{t("Оператор", "Operator")}</span>
            <span>·</span>
            <span>{time}</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "86%" }}>
        {group.items.map((msg, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === group.items.length - 1;
          // Asymmetric snip toward the sender side
          const radius = isUser
            ? `18px ${isFirst ? "6px" : "18px"} ${isLast ? "18px" : "6px"} 18px`
            : `${isFirst ? "6px" : "18px"} 18px 18px ${isLast ? "18px" : "6px"}`;

          return (
            <div
              key={msg.id}
              style={{
                padding: "12px 14px",
                borderRadius: radius,
                background: isUser ? "transparent" : C.surface,
                border: `1px solid ${isUser ? C.greenLine : C.border}`,
                color: isUser ? C.text : "rgba(255,255,255,0.92)",
                fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
                fontSize: 14.5,
                lineHeight: 1.5,
                fontWeight: 450,
                letterSpacing: "-0.005em",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ── Typing indicator ───────────────────────────────────────────────── */

function TypingIndicator({ t }: { t: (ru: string, en: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9.5,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          padding: "0 4px",
        }}
      >
        {t("Оператор печатает", "Operator typing")}
      </div>
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "6px 18px 18px 18px",
          background: C.surface,
          border: `1px solid ${C.border}`,
          color: C.green,
        }}
      >
        <TypingDots />
      </div>
    </motion.div>
  );
}

/* ── Composer ───────────────────────────────────────────────────────── */

function Composer({
  focused,
  text,
  setText,
  setFocused,
  handleSend,
  quickReplies,
  send,
  haptic,
  taRef,
  t,
  hasMessages,
}: {
  focused: boolean;
  text: string;
  setText: (value: string) => void;
  setFocused: (value: boolean) => void;
  handleSend: () => void;
  quickReplies: string[];
  send: (value: string) => void;
  haptic: (type?: "light" | "medium" | "heavy" | "success" | "error" | "warning") => void;
  taRef: RefObject<HTMLTextAreaElement | null>;
  t: (ru: string, en: string) => string;
  hasMessages: boolean;
}) {
  const canSend = text.trim().length > 0;

  return (
    <footer
      style={{
        flexShrink: 0,
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Quick replies — only when chat already has messages, mono "→" style */}
      {hasMessages && (
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "10px 14px 4px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                haptic("light");
                send(q);
              }}
              style={{
                flex: "0 0 auto",
                height: 28,
                padding: "0 10px",
                borderRadius: 999,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.soft,
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: "0.02em",
                textTransform: "lowercase",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: C.green }}>→</span>
              {q.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* Input row — flat, hairline only */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          padding: "10px 14px 6px",
        }}
      >
        <motion.div
          animate={{
            borderColor: focused ? C.greenLine : C.border,
          }}
          transition={{ duration: 0.16 }}
          style={{
            flex: 1,
            minHeight: 44,
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <textarea
            ref={taRef}
            placeholder={t("Сообщение для консьержа…", "Message the concierge…")}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 108) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: C.text,
              fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
              fontSize: 14.5,
              fontWeight: 450,
              lineHeight: 1.45,
              padding: "12px 0",
              maxHeight: 108,
              letterSpacing: "-0.005em",
            }}
          />
        </motion.div>

        <motion.button
          onClick={handleSend}
          disabled={!canSend}
          whileTap={{ scale: 0.92 }}
          animate={{
            backgroundColor: canSend ? C.green : "transparent",
            borderColor: canSend ? C.green : C.border,
            color: canSend ? C.bg : C.muted,
          }}
          transition={{ duration: 0.14 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            flexShrink: 0,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canSend ? "pointer" : "default",
          }}
          aria-label="Send"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </motion.button>
      </div>

      {/* Footer hint — premium "real product" detail */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 18px 4px",
          fontFamily: FONT_MONO,
          fontSize: 9,
          color: C.faint,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        <span>↵ {t("отправить", "send")}</span>
        <span>{t("шифрование e2e", "end-to-end encrypted")}</span>
      </div>
    </footer>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */

function EmptyChat({
  t,
  quickReplies,
  onPick,
}: {
  t: (ru: string, en: string) => string;
  quickReplies: string[];
  onPick: (reply: string) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      style={{
        margin: "auto 0",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {/* Editorial heading block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: C.green,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontWeight: 600,
          }}
        >
          {t("Поддержка · 24/7", "Support · 24/7")}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 34,
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
            fontWeight: 600,
            color: C.text,
          }}
        >
          {t("Чем мы можем\nпомочь сегодня?", "How can we\nhelp today?")}
        </h1>
        <p
          style={{
            margin: 0,
            color: C.soft,
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: 450,
            maxWidth: 320,
            letterSpacing: "-0.005em",
          }}
        >
          {t(
            "Реальный человек ответит обычно за 2 минуты. Опишите вопрос или выберите ниже.",
            "A real human usually replies within 2 minutes. Describe your issue or pick a topic below.",
          )}
        </p>
      </div>

      {/* Command-row quick replies — Linear/Arc style */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        {quickReplies.map((q, i) => (
          <motion.button
            key={q}
            onClick={() => onPick(q)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease, delay: 0.08 + i * 0.05 }}
            whileTap={{ scale: 0.995, backgroundColor: "rgba(57,255,99,0.04)" }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 2px",
              borderBottom: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: C.muted,
                  letterSpacing: "0.12em",
                  width: 22,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: C.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {q}
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

/* ── Typing dots ────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
          }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.05, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
