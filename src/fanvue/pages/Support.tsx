import { useState, useRef, useEffect, useCallback, useMemo, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useTelegram } from "../hooks/useTelegram";
import { tgNotify } from "../utils/tgNotify";

const ease = [0.16, 1, 0.3, 1] as const;
const GREEN = "var(--fv-green, #39ff63)";
const GREEN_2 = "var(--fv-green-2, #22e84f)";
const BLACK = "var(--fv-black, #030303)";
const PANEL = "var(--fv-panel, #101111)";
const PANEL_2 = "var(--fv-panel-2, #171918)";
const TEXT = "var(--t-primary, #fff)";
const SOFT = "var(--t-secondary, rgba(255,255,255,0.72))";
const MUTED = "var(--t-muted, rgba(255,255,255,0.48))";
const MONO = "var(--font-mono, ui-sans-serif, system-ui, sans-serif)";

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
    hour12: lang !== "ru",
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
    t("Где заказ?", "Where is my order?"),
    t("Проблема с оплатой", "Payment issue"),
    t("Срок выдачи", "Delivery time"),
    t("Нужен оператор", "Need operator"),
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
        padding: "10px 10px 0",
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingBottom: kbHeight > 0 ? kbHeight : 0,
        transition: "padding-bottom 100ms ease",
        overflow: "hidden",
        background: BLACK,
        color: TEXT,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: [
            "radial-gradient(88% 34% at 50% -8%, rgba(57,255,99,0.13), transparent 66%)",
            "linear-gradient(180deg, rgba(57,255,99,0.028), transparent 32%)",
          ].join(","),
        }}
      />

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
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "12px 0 8px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
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

          {typing && <TypingIndicator key="typing" />}
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
      />
    </div>
  );
}

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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease }}
      style={{
        position: "relative",
        zIndex: 3,
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: 22,
        border: "1px solid rgba(57,255,99,0.18)",
        background: "linear-gradient(145deg, rgba(16,17,17,0.98), rgba(5,18,9,0.96))",
        boxShadow: "0 18px 44px -30px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px" }}>
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.92 }}
          aria-label={t("Назад", "Back")}
          style={{
            width: 40,
            height: 40,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.045)",
            color: TEXT,
            cursor: "pointer",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </motion.button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: GREEN,
                color: BLACK,
                display: "grid",
                placeItems: "center",
                fontWeight: 950,
                fontSize: 17,
                lineHeight: 1,
              }}
            >
              F
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display, Inter, system-ui)",
                  color: TEXT,
                  fontSize: 18,
                  fontWeight: 950,
                  lineHeight: 1,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t("Поддержка", "Support")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
                <motion.span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: GREEN,
                    boxShadow: "0 0 0 4px rgba(57,255,99,0.10), 0 0 16px rgba(57,255,99,0.72)",
                  }}
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <span style={{ color: typing ? GREEN : SOFT, fontSize: 11, fontWeight: 850 }}>
                  {typing
                    ? t("оператор печатает", "operator typing")
                    : t("7 онлайн · ответ до 30м", "7 online · reply < 30m")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            placeItems: "center",
            minWidth: 42,
            height: 40,
            borderRadius: 14,
            background: GREEN,
            color: BLACK,
            fontFamily: MONO,
            fontSize: 10.5,
            fontWeight: 950,
            boxShadow:
              "0 14px 30px -18px rgba(57,255,99,0.76), inset 0 1px 0 rgba(255,255,255,0.32)",
          }}
        >
          24/7
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <HeaderMetric value="FAST" label={t("Быстрая выдача", "Fast delivery")} />
        <HeaderMetric value="SAFE" label={t("Защита сделки", "Order protected")} />
      </div>
    </motion.header>
  );
}

function HeaderMetric({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        minHeight: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: SOFT,
        borderRight: value === "FAST" ? "1px solid rgba(255,255,255,0.07)" : "none",
        background: "rgba(0,0,0,0.16)",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 950,
          color: GREEN,
          letterSpacing: "0.08em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 850,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(57,255,99,0.18))",
        }}
      />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 900,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.13em",
          padding: "4px 8px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(90deg, rgba(57,255,99,0.18), transparent)",
        }}
      />
    </div>
  );
}

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease }}
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        padding: "0 1px",
      }}
    >
      <div
        style={{
          width: isUser ? "84%" : "88%",
          borderRadius: isUser ? "18px 18px 6px 18px" : "6px 18px 18px 18px",
          overflow: "hidden",
          border: isUser ? "1px solid rgba(57,255,99,0.38)" : "1px solid rgba(255,255,255,0.09)",
          background: isUser
            ? "linear-gradient(135deg, rgba(57,255,99,0.18), rgba(57,255,99,0.08))"
            : "linear-gradient(145deg, rgba(255,255,255,0.078), rgba(255,255,255,0.032))",
          boxShadow: "0 14px 30px -24px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.16)",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: 950,
              color: isUser ? GREEN : MUTED,
              letterSpacing: "0.14em",
            }}
          >
            {isUser ? "ВЫ" : "ОПЕРАТОР"}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 850, color: MUTED }}>
            {formatTime(group.items[group.items.length - 1].created, lang)}
            {isUser && group.items.some((m) => m.id === lastUserId) ? " ✓" : ""}
          </span>
        </div>

        <div style={{ display: "grid", gap: 7, padding: "11px 12px 12px" }}>
          {group.items.map((msg) => (
            <div
              key={msg.id}
              style={{
                color: isUser ? TEXT : "rgba(255,255,255,0.9)",
                fontSize: 14.5,
                lineHeight: 1.42,
                fontWeight: isUser ? 850 : 650,
                letterSpacing: 0,
                textAlign: isUser ? "right" : "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22 }}
      style={{ display: "flex", justifyContent: "flex-start", padding: "0 1px" }}
    >
      <div
        style={{
          padding: "11px 15px",
          borderRadius: "6px 18px 18px 18px",
          background: "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))",
          border: "1px solid rgba(255,255,255,0.09)",
          color: GREEN,
        }}
      >
        <TypingDots size={5} />
      </div>
    </motion.div>
  );
}

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
}: {
  focused: boolean;
  text: string;
  setText: (value: string) => void;
  setFocused: (value: boolean) => void;
  handleSend: () => void;
  quickReplies: string[];
  send: (value: string) => void;
  haptic: (type?: "light" | "medium" | "heavy" | "success" | "error" | "warning") => void;
  taRef: RefObject<HTMLTextAreaElement>;
  t: (ru: string, en: string) => string;
}) {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 3,
        flexShrink: 0,
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease }}
        style={{
          borderRadius: 26,
          background: `linear-gradient(180deg, ${PANEL_2}, ${PANEL})`,
          border: "1px solid rgba(255,255,255,0.11)",
          boxShadow: "0 -20px 54px -32px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
          padding: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 7,
            overflowX: "auto",
            padding: "2px 2px 8px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {quickReplies.map((q, i) => (
            <motion.button
              key={q}
              type="button"
              onClick={() => {
                haptic("light");
                send(q);
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease, delay: i * 0.025 }}
              whileTap={{ scale: 0.96 }}
              style={{
                flex: "0 0 auto",
                minHeight: 34,
                maxWidth: i === 1 ? 154 : 132,
                padding: "0 12px",
                borderRadius: 999,
                border:
                  i === 0 ? "1px solid rgba(57,255,99,0.48)" : "1px solid rgba(255,255,255,0.10)",
                background: i === 0 ? "rgba(57,255,99,0.13)" : "rgba(255,255,255,0.045)",
                color: i === 0 ? GREEN : SOFT,
                fontSize: 11.5,
                fontWeight: 850,
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {q}
            </motion.button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <motion.div
            animate={{
              borderColor: focused ? "rgba(57,255,99,0.52)" : "rgba(255,255,255,0.10)",
              boxShadow: focused ? "0 0 0 4px rgba(57,255,99,0.07)" : "0 0 0 0 rgba(57,255,99,0)",
            }}
            transition={{ duration: 0.16 }}
            style={{
              flex: 1,
              minHeight: 48,
              background: "rgba(0,0,0,0.34)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 18,
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <textarea
              ref={taRef}
              placeholder={t("Напишите сообщение…", "Write a message…")}
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
                color: TEXT,
                fontFamily: "inherit",
                fontSize: 14.5,
                lineHeight: 1.4,
                padding: "13px 0",
                maxHeight: 108,
              }}
            />
          </motion.div>

          <motion.button
            onClick={handleSend}
            disabled={!text.trim()}
            whileTap={{ scale: 0.88 }}
            animate={{ scale: text.trim() ? 1 : 0.94, opacity: text.trim() ? 1 : 0.66 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 17,
              flexShrink: 0,
              background: text.trim()
                ? `linear-gradient(135deg, ${GREEN}, ${GREEN_2})`
                : "rgba(255,255,255,0.055)",
              border: text.trim()
                ? "1px solid rgba(57,255,99,0.55)"
                : "1px solid rgba(255,255,255,0.10)",
              color: text.trim() ? BLACK : MUTED,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: text.trim() ? "pointer" : "default",
              boxShadow: text.trim()
                ? "0 14px 32px -14px rgba(57,255,99,0.78), inset 0 1px 0 rgba(255,255,255,0.35)"
                : "none",
            }}
            aria-label="Send"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.55"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </footer>
  );
}

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
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease }}
      style={{ margin: "auto 0", display: "grid", gap: 12, padding: "0 2px" }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          padding: 16,
          background: `linear-gradient(145deg, ${PANEL_2}, rgba(5,19,9,0.98))`,
          border: "1px solid rgba(57,255,99,0.18)",
          boxShadow: "0 22px 48px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ color: TEXT, fontSize: 20, fontWeight: 950, lineHeight: 1.02 }}>
          {t("Чем помочь?", "How can we help?")}
        </div>
        <div style={{ color: SOFT, fontSize: 13, lineHeight: 1.35, marginTop: 8, fontWeight: 650 }}>
          {t(
            "Выберите быстрый вопрос или напишите вручную.",
            "Pick a quick question or write manually.",
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {quickReplies.slice(0, 4).map((q, i) => (
          <motion.button
            key={q}
            onClick={() => onPick(q)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease, delay: 0.1 + i * 0.035 }}
            whileTap={{ scale: 0.97 }}
            style={{
              minHeight: 48,
              padding: "10px 11px",
              borderRadius: 16,
              border:
                i === 0 ? "1px solid rgba(57,255,99,0.42)" : "1px solid rgba(255,255,255,0.09)",
              background: i === 0 ? "rgba(57,255,99,0.12)" : "rgba(255,255,255,0.045)",
              color: i === 0 ? GREEN : TEXT,
              fontSize: 12.5,
              fontWeight: 850,
              cursor: "pointer",
              textAlign: "left",
              lineHeight: 1.15,
            }}
          >
            {q}
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

function TypingDots({ size = 4 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.max(2, size - 2) }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
          }}
          animate={{ opacity: [0.32, 1, 0.32], y: [0, -2, 0] }}
          transition={{ duration: 1.05, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
