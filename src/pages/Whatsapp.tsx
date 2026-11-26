import { useState } from "react";
import {
  Bot,
  CheckCheck,
  MessageCircle,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useStore } from "../lib/store";
import { naira, prettyDate } from "../lib/format";
import {
  Button,
  Field,
  Input,
  PageHeader,
  SectionCard,
  StatusPill,
  Textarea,
  cn,
} from "../components/ui";

interface ChatMessage {
  from: "guest" | "agent";
  text: string;
  time: string;
}

const initialMessages: ChatMessage[] = [
  { from: "agent", text: "Hello 👋 This is Ada from Stayora Hotel. I can check availability and book your stay right here. When would you like to arrive?", time: "10:42" },
  { from: "guest", text: "Hi Ada, Friday for two nights — a suite if you have one.", time: "10:43" },
  { from: "agent", text: "We have a Suite available at ₦200,000 per night. That's ₦400,000 for two nights. Shall I hold it for you?", time: "10:43" },
];

const quickReplies = [
  "Do you have a Deluxe room this weekend?",
  "What time is check-in?",
  "Can I add airport pickup?",
  "I'd like to book the Suite.",
];

export default function Whatsapp() {
  const { db } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [autoBook, setAutoBook] = useState(true);
  const [handoff, setHandoff] = useState(false);
  const [greeting, setGreeting] = useState("Hello 👋 This is Ada from Stayora Hotel. I can check availability and book your stay right here. When would you like to arrive?");

  const waBookings = db.reservations.filter((r) => r.source === "WhatsApp");
  const waRevenue = waBookings.reduce((s, r) => s + r.total, 0);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const lower = trimmed.toLowerCase();
    let reply = "Happy to help. Could you share your arrival date and how many nights you'd like to stay?";
    if (lower.includes("deluxe") || lower.includes("room") || lower.includes("weekend"))
      reply = "We have Deluxe rooms at ₦110,000 per night and Suites at ₦200,000. Which dates are you considering?";
    if (lower.includes("check-in") || lower.includes("check in"))
      reply = "Check-in is from 14:00 and check-out is by 12:00. Early check-in can be arranged subject to availability.";
    if (lower.includes("airport") || lower.includes("pickup") || lower.includes("transfer"))
      reply = "Yes — airport pickup is ₦25,000 and includes meet & greet at arrivals. I can add it to your booking.";
    if (lower.includes("book") || lower.includes("suite"))
      reply = "Wonderful. I can hold the room now. Please share your full name, email and phone number and I'll create the reservation instantly.";
    setMessages((prev) => [
      ...prev,
      { from: "guest", text: trimmed, time },
      { from: "agent", text: reply, time },
    ]);
    setInput("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="WhatsApp agent"
        description="Ada checks live availability, quotes in Naira and creates reservations 24/7."
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={online ? "active" : "inactive"} />
            <Button variant="outline" onClick={() => setOnline((o) => !o)}>
              {online ? "Pause agent" : "Activate agent"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WaStat label="Conversations today" value="38" hint="+12 vs yesterday" icon={MessageCircle} />
        <WaStat label="Bookings via WhatsApp" value={String(waBookings.length)} hint={naira(waRevenue)} icon={Sparkles} tone="gold" />
        <WaStat label="Conversion" value="24%" hint="Chat to confirmed booking" icon={TrendingUp} tone="green" />
        <WaStat label="Avg. response" value="4s" hint="AI first response" icon={Zap} tone="blue" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.15fr]">
        <SectionCard
          title="Agent configuration"
          subtitle="WhatsApp Business · 0805 535 0960"
          action={<Settings2 className="size-4 text-muted-foreground" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-gold" />
                <div>
                  <p className="text-xs font-semibold">WhatsApp Business line</p>
                  <p className="text-[10px] text-muted-foreground">+234 805 535 0960 · connected</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Live</span>
            </div>

            <Field label="Greeting message">
              <Textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} />
            </Field>

            <div className="space-y-2">
              <Toggle label="Check live availability" description="Reads the room rack and reservation calendar" checked={availability} onChange={setAvailability} />
              <Toggle label="Create reservations automatically" description="Assigns a room and sends the booking reference" checked={autoBook} onChange={setAutoBook} />
              <Toggle label="Hand off to front desk" description="Escalate complex requests to a human agent" checked={handoff} onChange={setHandoff} />
            </div>

            <div className="rounded-lg bg-accent/60 px-3 py-2.5 text-[11px] text-accent-foreground">
              <p className="flex items-center gap-1.5 font-semibold"><Bot className="size-3.5" /> Agent guardrails</p>
              <p className="mt-1 text-muted-foreground">
                Ada only quotes published rates, never discounts below the rate plan floor, and always
                confirms dates before creating a folio.
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-noir px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="relative grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
                <Bot className="size-5" />
                <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-noir", online ? "bg-emerald-400" : "bg-slate-500")} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Ada · Stayora booking agent</p>
                <p className="text-[11px] text-noir-muted">{online ? "online" : "paused"} · WhatsApp 0805 535 0960</p>
              </div>
            </div>
            <MessageCircle className="size-5 text-primary" />
          </div>

          <div className="h-[360px] space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_oklch(96%_0.02_85),_oklch(94%_0.01_85))] p-4">
            {messages.map((message, i) => (
              <div key={i} className={cn("flex", message.from === "guest" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm",
                    message.from === "guest"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-white text-foreground",
                  )}
                >
                  <p>{message.text}</p>
                  <p className={cn("mt-1 flex items-center justify-end gap-1 text-[9px]", message.from === "guest" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {message.time} {message.from === "guest" && <CheckCheck className="size-3" />}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => send(reply)}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {reply}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type as the guest…" />
              <Button type="submit" size="sm" disabled={!input.trim()}><Send className="size-4" /></Button>
            </form>
          </div>
        </div>
      </div>

      <SectionCard title="Recent WhatsApp bookings" subtitle="Created by the agent" className="mt-4" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[700px]">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {waBookings.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-semibold">{r.ref}</td>
                  <td className="text-xs">{r.guestName}</td>
                  <td className="text-xs text-muted-foreground">{r.roomType} · {r.roomNumber ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{prettyDate(r.checkIn)} → {prettyDate(r.checkOut)}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td className="text-right text-xs font-semibold">{naira(r.total)}</td>
                </tr>
              ))}
              {waBookings.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No WhatsApp bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <span>
        <span className="block text-xs font-semibold">{label}</span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">{description}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-primary" : "bg-border",
        )}
        aria-pressed={checked}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", checked ? "left-4.5" : "left-0.5")} />
      </button>
    </label>
  );
}

function WaStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof MessageCircle;
  tone?: "gold" | "green" | "blue";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
