import { useState, useRef, useEffect, useCallback, useMemo, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useTelegram } from "../hooks/useTelegram";
import { tgNotify } from "../utils/tgNotify";

/* Fanvue Support — premium messenger feel.
   Reference: iMessage / Telegram / Intercom Chat.
   Philosophy: zero pretension. No ticket IDs, no mono-decoration,
   no "concierge"/"e2e" labels. Quality of bubble, avatar, motion. */

const ease = [0.22, 1, 0.36, 1] as const;

const C = {
  bg: "#0a0a0b",
  surface: "#161618",
  surfaceHi: "#1d1d20",
  border: "rgba(255,255,255,0.07)",
  text: "#f5f5f7",
  soft: "rgba(245,245,247,0.66)",
  muted: "rgba(245,245,247,0.42)",
  faint: "rgba(245,245,247,0.22)",
  green: "#39ff63",
  greenInk: "#062a10",
  greenBubble: "linear-gradient(180deg, #3dff66 0%, #28e052 100%)",
};

type SupportMessage = {
  id: number | string;
  sender: "user" | "admin";
  text: string;
  created: string;
};

function fmtTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtDay(iso: string, lang: string) {
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
  return d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "long" });
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
    t("Где мой заказ?", "Where is my order?"),
    t("Проблема с оплатой", "Payment issue"),
    t("Срок выдачи", "Delivery time"),
    t("Связать с оператором", "Talk to operator"),
  ];

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
        out.push({ type: "day", key: "d-" + day, label: fmtDay(m.created, lang) });
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
          padding: "16px 14px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
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
            return <MessageGroup key={g.key} group={g} lang={lang} lastUserId={lastUserId} />;
          })}
          {typing && <TypingBubble key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </main>

      <Composer
        focused={focused}
        text={text}
        setText={setText}
        setFocused={setFocused}
        handleSend={handleSend}
        haptic={haptic}
        taRef={taRef}
        t={t}
      />
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────── */

function Header({
  typing,
  t,
  onBack,
}: {
  typing: boolean;
  t: (ru: string, en: string) => string;
  onBack: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease }}
      style={{
        flexShrink: 0,
        background: "rgba(10,10,11,0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px 10px 8px",
      }}
    >
      <motion.button
        onClick={onBack}
        whileTap={{ scale: 0.88 }}
        aria-label={t("Назад", "Back")}
        style={{
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: 999,
          border: "none",
          background: "transparent",
          color: C.text,
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </motion.button>

      {/* Avatar with online ring */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 25%, #2a2a2e 0%, #131316 100%)`,
            border: `1px solid ${C.border}`,
            display: "grid",
            placeItems: "center",
            color: C.text,
            fontFamily: 'var(--font-display, "Space Grotesk", Inter, sans-serif)',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          F
        </div>
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: C.green,
            border: `2px solid ${C.bg}`,
            boxShadow: "0 0 8px rgba(57,255,99,0.6)",
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: C.text,
            fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
            fontSize: 15.5,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t("Поддержка Fanvue", "Fanvue Support")}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={typing ? "t" : "o"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{
              marginTop: 2,
              fontSize: 12,
              fontWeight: 450,
              color: typing ? C.green : C.soft,
              lineHeight: 1.2,
              letterSpacing: "-0.005em",
            }}
          >
            {typing ? t("печатает…", "typing…") : t("в сети", "online")}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.92 }}
        aria-label={t("Информация", "Info")}
        style={{
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: 999,
          border: "none",
          background: "transparent",
          color: C.soft,
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </motion.button>
    </motion.header>
  );
}

/* ── Day pill ───────────────────────────────────────────────────── */

function DaySeparator({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "12px 0 8px",
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: C.muted,
          padding: "5px 12px",
          borderRadius: 999,
          background: C.surface,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── Message group ──────────────────────────────────────────────── */

function MessageGroup({
  group,
  lang,
  lastUserId,
}: {
  group: { sender: "user" | "admin"; items: SupportMessage[] };
  lang: string;
  lastUserId: number | string | null;
}) {
  const isUser = group.sender === "user";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 2,
        marginTop: 8,
        marginBottom: 2,
      }}
    >
      {group.items.map((msg, idx) => {
        const isLast = idx === group.items.length - 1;
        const time = fmtTime(msg.created, lang);
        const showTail = isLast;
        const showCheck = isUser && msg.id === lastUserId;

        // iMessage-style tight stacking with tail only on last bubble
        const radiusUser = showTail ? "22px 22px 6px 22px" : "22px 22px 22px 22px";
        const radiusAdmin = showTail ? "22px 22px 22px 6px" : "22px 22px 22px 22px";

        return (
          <div
            key={msg.id}
            style={{
              maxWidth: "78%",
              position: "relative",
              padding: "9px 14px 9px 14px",
              borderRadius: isUser ? radiusUser : radiusAdmin,
              background: isUser ? C.greenBubble : C.surface,
              color: isUser ? C.greenInk : C.text,
              fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
              fontSize: 15,
              lineHeight: 1.35,
              fontWeight: isUser ? 550 : 450,
              letterSpacing: "-0.005em",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              boxShadow: isUser
                ? "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -16px rgba(57,255,99,0.5)"
                : "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            <span>{msg.text}</span>
            {/* Inline timestamp + check, hugging bottom-right inside the bubble */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginLeft: 8,
                fontSize: 10,
                fontWeight: 500,
                color: isUser ? "rgba(6,42,16,0.62)" : C.muted,
                verticalAlign: "baseline",
                whiteSpace: "nowrap",
                position: "relative",
                top: 2,
                letterSpacing: 0,
              }}
            >
              {time}
              {showCheck && (
                <svg
                  width="13"
                  height="9"
                  viewBox="0 0 13 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginLeft: 1 }}
                >
                  <path d="M1 4.5l3 3L8 2" />
                  <path d="M5 7.5L8.5 4 12 0.5" />
                </svg>
              )}
            </span>
          </div>
        );
      })}
    </motion.section>
  );
}

/* ── Typing bubble ──────────────────────────────────────────────── */

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      style={{
        alignSelf: "flex-start",
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: "22px 22px 22px 6px",
        background: C.surface,
        color: C.soft,
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      <TypingDots />
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
          }}
          animate={{ opacity: [0.32, 1, 0.32], y: [0, -3, 0] }}
          transition={{ duration: 1.05, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/* ── Composer ───────────────────────────────────────────────────── */

function Composer({
  focused,
  text,
  setText,
  setFocused,
  handleSend,
  haptic,
  taRef,
  t,
}: {
  focused: boolean;
  text: string;
  setText: (value: string) => void;
  setFocused: (value: boolean) => void;
  handleSend: () => void;
  haptic: (type?: "light" | "medium" | "heavy" | "success" | "error" | "warning") => void;
  taRef: RefObject<HTMLTextAreaElement | null>;
  t: (ru: string, en: string) => string;
}) {
  const canSend = text.trim().length > 0;

  return (
    <footer
      style={{
        flexShrink: 0,
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: `1px solid ${C.border}`,
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: "10px 12px",
        }}
      >
        {/* Plus / attach — placeholder for premium feel */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => haptic("light")}
          aria-label={t("Добавить", "Attach")}
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "none",
            background: "transparent",
            color: C.soft,
            cursor: "pointer",
            padding: 0,
            marginBottom: 2,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </motion.button>

        <motion.div
          animate={{
            borderColor: focused ? "rgba(57,255,99,0.45)" : C.border,
          }}
          transition={{ duration: 0.16 }}
          style={{
            flex: 1,
            minHeight: 38,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 22,
            padding: "0 6px 0 14px",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={taRef}
            placeholder={t("Сообщение", "Message")}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
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
              fontSize: 15,
              fontWeight: 450,
              lineHeight: 1.4,
              padding: "9px 0",
              maxHeight: 120,
              letterSpacing: "-0.005em",
            }}
          />
          <AnimatePresence initial={false}>
            {canSend && (
              <motion.button
                key="send"
                onClick={handleSend}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                whileTap={{ scale: 0.88 }}
                style={{
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  margin: "0 0 4px 4px",
                  borderRadius: "50%",
                  border: "none",
                  background: C.green,
                  color: C.greenInk,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: "0 4px 14px -4px rgba(57,255,99,0.6)",
                }}
                aria-label="Send"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </footer>
  );
}

/* ── Empty state ────────────────────────────────────────────────── */

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      style={{
        margin: "auto 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: "20px 8px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 25%, #2a2a2e 0%, #131316 100%)`,
          border: `1px solid ${C.border}`,
          display: "grid",
          placeItems: "center",
          color: C.text,
          fontFamily: 'var(--font-display, "Space Grotesk", Inter, sans-serif)',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          position: "relative",
        }}
      >
        F
        <span
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: C.green,
            border: `3px solid ${C.bg}`,
            boxShadow: "0 0 12px rgba(57,255,99,0.6)",
          }}
        />
      </div>

      <div style={{ textAlign: "center", maxWidth: 300 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display, "Space Grotesk", Inter, sans-serif)',
            fontSize: 22,
            lineHeight: 1.2,
            letterSpacing: "-0.025em",
            fontWeight: 600,
            color: C.text,
          }}
        >
          {t("Поддержка Fanvue", "Fanvue Support")}
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: C.soft,
            fontSize: 14,
            lineHeight: 1.45,
            fontWeight: 450,
            letterSpacing: "-0.005em",
          }}
        >
          {t(
            "Мы здесь и готовы помочь. Обычно отвечаем за пару минут.",
            "We're here and ready to help. Usually reply within a few minutes.",
          )}
        </p>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 340,
        }}
      >
        {quickReplies.map((q, i) => (
          <motion.button
            key={q}
            onClick={() => onPick(q)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease, delay: 0.12 + i * 0.05 }}
            whileTap={{ scale: 0.985 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "13px 16px",
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.text,
              fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
              fontSize: 14.5,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {q}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
