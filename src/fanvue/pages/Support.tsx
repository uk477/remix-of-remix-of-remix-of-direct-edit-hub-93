import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type RefObject,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
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

type VariantId = "ledger" | "signal" | "receipt" | "editorial" | "control";
type SupportMessage = {
  id: number | string;
  sender: "user" | "admin";
  text: string;
  created: string;
};

const VARIANTS: Array<{
  id: VariantId;
  index: string;
  titleRu: string;
  titleEn: string;
  noteRu: string;
  noteEn: string;
}> = [
  {
    id: "ledger",
    index: "01",
    titleRu: "Case Ledger",
    titleEn: "Case Ledger",
    noteRu: "заявка как премиум-досье",
    noteEn: "premium case dossier",
  },
  {
    id: "signal",
    index: "02",
    titleRu: "Signal Desk",
    titleEn: "Signal Desk",
    noteRu: "радио-канал поддержки",
    noteEn: "live signal desk",
  },
  {
    id: "receipt",
    index: "03",
    titleRu: "Market Receipt",
    titleEn: "Market Receipt",
    noteRu: "чат как чек сделки",
    noteEn: "conversation as a receipt",
  },
  {
    id: "editorial",
    index: "04",
    titleRu: "Concierge Note",
    titleEn: "Concierge Note",
    noteRu: "бутик-консьерж",
    noteEn: "boutique concierge",
  },
  {
    id: "control",
    index: "05",
    titleRu: "Ops Board",
    titleEn: "Ops Board",
    noteRu: "операционный центр",
    noteEn: "operations board",
  },
];

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
  const [variant, setVariant] = useState<VariantId>("ledger");
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);

  const current = VARIANTS.find((v) => v.id === variant) ?? VARIANTS[0];

  useEffect(() => {
    clearSupportUnread();
  }, [clearSupportUnread]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, variant]);

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
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].sender === "user") return messages[i].id;
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
      <Ambient variant={variant} />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease }}
        style={{ position: "relative", zIndex: 3, flexShrink: 0 }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: variant === "receipt" ? 8 : 22,
            border:
              variant === "ledger"
                ? "1px solid rgba(57,255,99,0.25)"
                : "1px solid rgba(255,255,255,0.12)",
            background: headerBackground(variant),
            boxShadow: "0 20px 48px -30px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              position: "relative",
              padding: "12px 12px 10px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <motion.button
              onClick={() => {
                haptic("light");
                navigate("/support");
              }}
              whileTap={{ scale: 0.92 }}
              style={{
                width: 39,
                height: 39,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: variant === "receipt" ? 7 : 14,
                background: "rgba(255,255,255,0.045)",
                color: TEXT,
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label={t("Назад", "Back")}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily:
                    variant === "receipt" ? MONO : "var(--font-display, Inter, system-ui)",
                  color: TEXT,
                  fontSize: variant === "editorial" ? 21 : 17,
                  fontWeight: variant === "editorial" ? 900 : 950,
                  lineHeight: 1,
                  letterSpacing: variant === "receipt" ? "0.02em" : "0.08em",
                  textTransform: variant === "editorial" ? "none" : "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span>{lang === "ru" ? current.titleRu : current.titleEn}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
                <motion.span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: GREEN,
                    boxShadow: "0 0 0 4px rgba(57,255,99,0.10), 0 0 18px rgba(57,255,99,0.85)",
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
                <span
                  style={{
                    color: typing ? GREEN : SOFT,
                    fontSize: 11,
                    fontWeight: 850,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {typing
                    ? t("оператор печатает", "operator typing")
                    : `${current.index} · ${lang === "ru" ? current.noteRu : current.noteEn}`}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                placeItems: "center",
                minWidth: 44,
                height: 39,
                borderRadius: variant === "receipt" ? 7 : 14,
                background: variant === "receipt" ? "transparent" : GREEN,
                color: variant === "receipt" ? GREEN : BLACK,
                border:
                  variant === "receipt"
                    ? "1px dashed rgba(57,255,99,0.45)"
                    : "1px solid rgba(57,255,99,0.55)",
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 950,
              }}
            >
              24/7
            </div>
          </div>

          <VariantPicker
            variant={variant}
            setVariant={(id) => {
              haptic("light");
              setVariant(id);
            }}
          />
        </div>
      </motion.header>

      <main
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: variant === "editorial" ? "16px 0 10px" : "13px 0 8px",
          display: "flex",
          flexDirection: "column",
          gap: variant === "receipt" ? 8 : 11,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {messages.length === 0 && (
          <EmptyChat
            variant={variant}
            t={t}
            quickReplies={quickReplies}
            onPick={(q) => {
              haptic("light");
              send(q);
            }}
          />
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {groups.map((g) => {
            if (g.type === "day")
              return <DaySeparator key={g.key} label={g.label} variant={variant} />;
            return (
              <MessageGroup
                key={`${variant}-${g.key}`}
                variant={variant}
                group={g}
                lang={lang}
                lastUserId={lastUserId}
              />
            );
          })}

          {typing && <TypingIndicator key={`typing-${variant}`} variant={variant} />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </main>

      <Composer
        variant={variant}
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

function Ambient({ variant }: { variant: VariantId }) {
  const pattern =
    variant === "receipt"
      ? "linear-gradient(rgba(57,255,99,0.05) 1px, transparent 1px)"
      : "radial-gradient(92% 42% at 50% -8%, rgba(57,255,99,0.17), transparent 62%), radial-gradient(70% 28% at 100% 32%, rgba(57,255,99,0.08), transparent 70%)";
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: pattern,
          backgroundSize: variant === "receipt" ? "100% 18px" : undefined,
          opacity: variant === "receipt" ? 0.55 : 1,
        }}
      />
      {variant !== "receipt" && (
        <div
          style={{
            position: "absolute",
            inset: "10% -18% auto",
            height: 220,
            background: "linear-gradient(90deg, transparent, rgba(57,255,99,0.10), transparent)",
            filter: "blur(36px)",
            transform: "rotate(-10deg)",
          }}
        />
      )}
      {variant === "control" && (
        <div
          style={{
            position: "absolute",
            right: -80,
            bottom: 90,
            width: 260,
            height: 260,
            border: "1px solid rgba(57,255,99,0.10)",
            borderRadius: 999,
          }}
        />
      )}
    </div>
  );
}

function headerBackground(variant: VariantId) {
  if (variant === "receipt") return "linear-gradient(180deg, rgba(8,8,8,0.98), rgba(4,4,4,0.96))";
  if (variant === "editorial")
    return "linear-gradient(145deg, rgba(22,23,21,0.98), rgba(5,13,7,0.98))";
  if (variant === "signal")
    return "linear-gradient(135deg, rgba(57,255,99,0.16), rgba(7,8,7,0.98) 42%, rgba(18,20,18,0.98))";
  if (variant === "control")
    return "linear-gradient(145deg, rgba(11,31,15,0.98), rgba(13,14,13,0.98))";
  return "linear-gradient(145deg, rgba(16,17,17,0.98), rgba(5,19,9,0.98))";
}

function VariantPicker({
  variant,
  setVariant,
}: {
  variant: VariantId;
  setVariant: (id: VariantId) => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 1,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: 3,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {VARIANTS.map((v) => {
        const active = v.id === variant;
        return (
          <motion.button
            key={v.id}
            type="button"
            onClick={() => setVariant(v.id)}
            whileTap={{ scale: 0.96 }}
            style={{
              flex: "1 0 54px",
              minHeight: 34,
              border: active ? "1px solid rgba(57,255,99,0.55)" : "1px solid transparent",
              borderRadius: 12,
              background: active ? "rgba(57,255,99,0.14)" : "rgba(255,255,255,0.035)",
              color: active ? GREEN : MUTED,
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 950,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            {v.index}
          </motion.button>
        );
      })}
    </div>
  );
}

function MessageGroup({
  variant,
  group,
  lang,
  lastUserId,
}: {
  variant: VariantId;
  group: { sender: "user" | "admin"; items: SupportMessage[] };
  lang: string;
  lastUserId: number | string | null;
}) {
  const isUser = group.sender === "user";
  if (variant === "ledger")
    return <LedgerGroup group={group} lang={lang} lastUserId={lastUserId} />;
  if (variant === "signal")
    return <SignalGroup group={group} lang={lang} lastUserId={lastUserId} />;
  if (variant === "receipt")
    return <ReceiptGroup group={group} lang={lang} lastUserId={lastUserId} />;
  if (variant === "editorial")
    return <EditorialGroup group={group} lang={lang} lastUserId={lastUserId} />;
  return <ControlGroup group={group} lang={lang} lastUserId={lastUserId} isUser={isUser} />;
}

function LedgerGroup({
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease }}
      style={{ display: "grid", justifyItems: isUser ? "end" : "start", padding: "0 1px" }}
    >
      <div
        style={{
          width: isUser ? "86%" : "90%",
          position: "relative",
          paddingLeft: isUser ? 0 : 11,
          paddingRight: isUser ? 11 : 0,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            [isUser ? "right" : "left"]: 0,
            width: 2,
            borderRadius: 999,
            background: isUser ? GREEN : "rgba(255,255,255,0.18)",
          }}
        />
        <div style={{ display: "grid", gap: 6 }}>
          {group.items.map((msg) => (
            <article
              key={msg.id}
              style={{
                position: "relative",
                padding: "12px 13px",
                borderRadius: isUser ? "18px 18px 6px 18px" : "6px 18px 18px 18px",
                background: isUser
                  ? "linear-gradient(135deg, rgba(57,255,99,0.18), rgba(57,255,99,0.08))"
                  : "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))",
                border: isUser
                  ? "1px solid rgba(57,255,99,0.34)"
                  : "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 14px 30px -24px rgba(0,0,0,0.95)",
              }}
            >
              <MessageMeta
                isUser={isUser}
                msg={msg}
                lang={lang}
                lastUserId={lastUserId}
                label={isUser ? "CLIENT" : "CONCIERGE"}
              />
              <div
                style={{
                  marginTop: 7,
                  color: isUser ? TEXT : "rgba(255,255,255,0.9)",
                  fontSize: 14.5,
                  lineHeight: 1.42,
                  fontWeight: isUser ? 850 : 650,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textAlign: isUser ? "right" : "left",
                }}
              >
                {msg.text}
              </div>
            </article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function SignalGroup({
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
      initial={{ opacity: 0, x: isUser ? 16 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.26, ease }}
      style={{ display: "grid", justifyItems: isUser ? "end" : "start" }}
    >
      <div
        style={{
          width: "88%",
          clipPath: isUser
            ? "polygon(0 0, 94% 0, 100% 18px, 100% 100%, 0 100%)"
            : "polygon(0 0, 100% 0, 100% 100%, 6% 100%, 0 calc(100% - 18px))",
          background: isUser ? "rgba(57,255,99,0.16)" : "rgba(255,255,255,0.055)",
          border: `1px solid ${isUser ? "rgba(57,255,99,0.36)" : "rgba(255,255,255,0.10)"}`,
          padding: 1,
        }}
      >
        <div
          style={{
            padding: "12px 13px",
            background: isUser
              ? "linear-gradient(135deg, rgba(57,255,99,0.19), rgba(7,8,7,0.88))"
              : "linear-gradient(145deg, rgba(16,18,16,0.96), rgba(5,5,5,0.96))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                color: isUser ? GREEN : MUTED,
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: "0.16em",
              }}
            >
              {isUser ? "OUTGOING" : "INCOMING"}
            </span>
            <span style={{ fontFamily: MONO, color: MUTED, fontSize: 9, fontWeight: 850 }}>
              {formatTime(group.items[group.items.length - 1].created, lang)}
            </span>
          </div>
          {group.items.map((msg) => (
            <div
              key={msg.id}
              style={{
                color: isUser ? TEXT : SOFT,
                fontSize: 14.5,
                lineHeight: 1.42,
                fontWeight: isUser ? 850 : 680,
                textAlign: isUser ? "right" : "left",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
            </div>
          ))}
          {isUser && group.items.some((m) => m.id === lastUserId) && (
            <div
              style={{
                marginTop: 7,
                color: GREEN,
                fontFamily: MONO,
                fontSize: 9,
                textAlign: "right",
              }}
            >
              DELIVERED ✓
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function ReceiptGroup({
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
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease }}
      style={{ padding: "0 1px" }}
    >
      <div
        style={{
          borderTop: "1px dashed rgba(255,255,255,0.13)",
          borderBottom: "1px dashed rgba(255,255,255,0.08)",
          background: isUser ? "rgba(57,255,99,0.085)" : "rgba(255,255,255,0.035)",
          padding: "10px 0",
        }}
      >
        {group.items.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "grid",
              gridTemplateColumns: "58px 1fr",
              gap: 10,
              padding: "2px 8px",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: isUser ? GREEN : MUTED,
                fontWeight: 900,
              }}
            >
              {formatTime(msg.created, lang)}
            </div>
            <div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: isUser ? GREEN : "rgba(255,255,255,0.34)",
                  letterSpacing: "0.14em",
                  fontWeight: 950,
                  marginBottom: 4,
                }}
              >
                {isUser ? "CUSTOMER_LINE" : "SUPPORT_LINE"}
              </div>
              <div
                style={{
                  color: isUser ? TEXT : SOFT,
                  fontSize: 14,
                  lineHeight: 1.42,
                  fontWeight: isUser ? 850 : 650,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
              {isUser && msg.id === lastUserId && (
                <div style={{ marginTop: 5, color: GREEN, fontFamily: MONO, fontSize: 9 }}>
                  PAID / SENT ✓
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function EditorialGroup({
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease }}
      style={{ display: "grid", justifyItems: isUser ? "end" : "start", padding: "0 2px" }}
    >
      <div
        style={{ width: isUser ? "82%" : "92%", padding: isUser ? "0 2px 0 16px" : "0 16px 0 2px" }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 950,
            letterSpacing: "0.18em",
            color: isUser ? GREEN : MUTED,
            marginBottom: 7,
            textAlign: isUser ? "right" : "left",
          }}
        >
          {isUser ? "YOUR NOTE" : "CONCIERGE"} ·{" "}
          {formatTime(group.items[group.items.length - 1].created, lang)}
        </div>
        <div
          style={{
            color: isUser ? GREEN : TEXT,
            fontSize: isUser ? 17 : 16,
            lineHeight: 1.32,
            fontWeight: isUser ? 900 : 730,
            textAlign: isUser ? "right" : "left",
            padding: isUser ? "0 0 0 18px" : "0 18px 0 0",
            borderRight: isUser ? "2px solid rgba(57,255,99,0.75)" : "none",
            borderLeft: isUser ? "none" : "2px solid rgba(255,255,255,0.16)",
            textShadow: isUser ? "0 0 18px rgba(57,255,99,0.16)" : "none",
            whiteSpace: "pre-wrap",
          }}
        >
          {group.items.map((msg) => msg.text).join("\n")}
        </div>
        {isUser && group.items.some((m) => m.id === lastUserId) && (
          <div
            style={{
              marginTop: 7,
              color: MUTED,
              fontFamily: MONO,
              fontSize: 9,
              textAlign: "right",
            }}
          >
            seen ✓
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ControlGroup({
  group,
  lang,
  lastUserId,
  isUser,
}: {
  group: { sender: "user" | "admin"; items: SupportMessage[] };
  lang: string;
  lastUserId: number | string | null;
  isUser: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease }}
      style={{ display: "grid", justifyItems: isUser ? "end" : "start", padding: "0 1px" }}
    >
      <div
        style={{
          width: isUser ? "84%" : "90%",
          borderRadius: 18,
          overflow: "hidden",
          border: isUser ? "1px solid rgba(57,255,99,0.32)" : "1px solid rgba(255,255,255,0.10)",
          background: isUser ? "rgba(57,255,99,0.10)" : "rgba(255,255,255,0.045)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 11px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              color: isUser ? GREEN : SOFT,
              fontSize: 9,
              fontWeight: 950,
              letterSpacing: "0.12em",
            }}
          >
            {isUser ? "CLIENT REQUEST" : "SUPPORT ACTION"}
          </span>
          <span style={{ fontFamily: MONO, color: MUTED, fontSize: 9 }}>
            {formatTime(group.items[group.items.length - 1].created, lang)}
          </span>
        </div>
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          {group.items.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "grid",
                gridTemplateColumns: "18px 1fr",
                gap: 8,
                alignItems: "start",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  background: isUser ? GREEN : "rgba(255,255,255,0.08)",
                  color: isUser ? BLACK : GREEN,
                  fontSize: 10,
                  fontWeight: 950,
                }}
              >
                {isUser ? "→" : "✓"}
              </span>
              <span
                style={{
                  color: isUser ? TEXT : SOFT,
                  fontSize: 14.5,
                  lineHeight: 1.38,
                  fontWeight: isUser ? 850 : 650,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </span>
            </div>
          ))}
          {isUser && group.items.some((m) => m.id === lastUserId) && (
            <div style={{ color: GREEN, fontFamily: MONO, fontSize: 9, textAlign: "right" }}>
              QUEUED · DELIVERED
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function MessageMeta({
  isUser,
  msg,
  lang,
  lastUserId,
  label,
}: {
  isUser: boolean;
  msg: SupportMessage;
  lang: string;
  lastUserId: number | string | null;
  label: string;
}) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 950,
          letterSpacing: "0.16em",
          color: isUser ? GREEN : MUTED,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 850, color: MUTED }}>
        {formatTime(msg.created, lang)} {isUser && msg.id === lastUserId ? "✓" : ""}
      </span>
    </div>
  );
}

function DaySeparator({ label, variant }: { label: string; variant: VariantId }) {
  if (variant === "receipt") {
    return (
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 950,
          color: MUTED,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          textAlign: "center",
          padding: "4px 0",
        }}
      >
        ── {label} ──
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 0" }}>
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
          color: variant === "editorial" ? "rgba(255,255,255,0.36)" : MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.13em",
          padding: variant === "editorial" ? "0 4px" : "4px 8px",
          borderRadius: 999,
          background: variant === "editorial" ? "transparent" : "rgba(255,255,255,0.035)",
          border: variant === "editorial" ? "none" : "1px solid rgba(255,255,255,0.06)",
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

function TypingIndicator({ variant }: { variant: VariantId }) {
  if (variant === "receipt")
    return (
      <div style={{ fontFamily: MONO, color: GREEN, fontSize: 10, padding: "8px 10px" }}>
        SUPPORT_LINE IS PRINTING <TypingDots size={4} />
      </div>
    );
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22 }}
      style={{
        padding: "0 1px",
        display: "flex",
        justifyContent: variant === "editorial" ? "center" : "flex-start",
      }}
    >
      <div
        style={{
          padding: variant === "editorial" ? "9px 0" : "11px 15px",
          borderRadius: variant === "signal" ? 4 : 18,
          background:
            variant === "editorial"
              ? "transparent"
              : "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.032))",
          border: variant === "editorial" ? "none" : "1px solid rgba(255,255,255,0.09)",
          color: GREEN,
          fontFamily: MONO,
          fontSize: 11,
        }}
      >
        <TypingDots size={5} />
      </div>
    </motion.div>
  );
}

function Composer({
  variant,
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
  variant: VariantId;
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
  const isReceipt = variant === "receipt";
  const panelStyle: CSSProperties = {
    borderRadius: isReceipt ? 10 : variant === "signal" ? 20 : 26,
    background: isReceipt ? "rgba(5,5,5,0.96)" : `linear-gradient(180deg, ${PANEL_2}, ${PANEL})`,
    border: isReceipt ? "1px dashed rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 -20px 54px -32px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
    padding: 8,
    overflow: "hidden",
  };

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
        style={panelStyle}
      >
        <div
          style={{
            display: "flex",
            gap: isReceipt ? 5 : 7,
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
                minHeight: isReceipt ? 31 : 34,
                maxWidth: i === 1 ? 154 : 132,
                padding: isReceipt ? "0 9px" : "0 12px",
                borderRadius: isReceipt ? 6 : variant === "signal" ? 11 : 999,
                border:
                  i === 0 ? "1px solid rgba(57,255,99,0.48)" : "1px solid rgba(255,255,255,0.10)",
                background: i === 0 ? "rgba(57,255,99,0.13)" : "rgba(255,255,255,0.045)",
                color: i === 0 ? GREEN : SOFT,
                fontFamily: isReceipt ? MONO : "inherit",
                fontSize: isReceipt ? 10 : 11.5,
                fontWeight: 850,
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isReceipt ? `# ${q}` : q}
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
              background: isReceipt ? "rgba(0,0,0,0.62)" : "rgba(0,0,0,0.34)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: isReceipt ? 7 : variant === "signal" ? 14 : 18,
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <textarea
              ref={taRef}
              placeholder={
                isReceipt
                  ? t("новая строка сделки…", "new deal line…")
                  : t("Напишите сообщение…", "Write a message…")
              }
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
                fontFamily: isReceipt ? MONO : "inherit",
                fontSize: isReceipt ? 12.5 : 14.5,
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
              borderRadius: isReceipt ? 7 : variant === "signal" ? 14 : 17,
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
  variant,
  t,
  quickReplies,
  onPick,
}: {
  variant: VariantId;
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
          borderRadius: variant === "receipt" ? 8 : 24,
          padding: 16,
          background:
            variant === "receipt"
              ? "rgba(255,255,255,0.035)"
              : `linear-gradient(145deg, ${PANEL_2}, rgba(5,19,9,0.98))`,
          border:
            variant === "receipt"
              ? "1px dashed rgba(255,255,255,0.16)"
              : "1px solid rgba(57,255,99,0.18)",
          boxShadow: "0 22px 48px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            color: TEXT,
            fontSize: variant === "editorial" ? 24 : 20,
            fontWeight: 950,
            lineHeight: 1.02,
          }}
        >
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
              borderRadius: variant === "receipt" ? 7 : 16,
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
