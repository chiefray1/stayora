import { useMemo, useState } from "react";
import { BrainCircuit, Check, Lightbulb, Send, Sparkles, TrendingUp, Wand2, X } from "lucide-react";
import { useStore } from "../lib/store";
import { Button, Input, PageHeader, Progress, SectionCard, StatCard, cn } from "../components/ui";

const kindTone: Record<string, string> = {
  Pricing: "bg-amber-50 text-amber-700 border-amber-200",
  Forecast: "bg-sky-50 text-sky-700 border-sky-200",
  Upsell: "bg-violet-50 text-violet-700 border-violet-200",
  Sentiment: "bg-rose-50 text-rose-700 border-rose-200",
  Maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  Fraud: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Ai() {
  const { db, addNotification, logAudit } = useStore();
  const [applied, setApplied] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState(
    "I can forecast occupancy, recommend rates, flag review sentiment and draft staff briefings. Ask me anything about this workspace.",
  );

  const appliedSignals = db.aiSignals.filter((signal) => applied.includes(signal.id));
  const revenueImpact = appliedSignals.reduce((sum, signal) => {
    const match = signal.impact.match(/([\d,.]+)M/);
    return sum + (match ? Number(match[1].replace(/,/g, "")) : 0);
  }, 0);
  const averageConfidence = Math.round(db.aiSignals.reduce((sum, signal) => sum + signal.confidence, 0) / Math.max(1, db.aiSignals.length));
  const byKind = useMemo(() => {
    const counts = new Map<string, number>();
    db.aiSignals.forEach((signal) => counts.set(signal.kind, (counts.get(signal.kind) ?? 0) + 1));
    return Array.from(counts.entries());
  }, [db.aiSignals]);

  const apply = (id: string, title: string) => {
    setApplied((prev) => (prev.includes(id) ? prev : [...prev, id]));
    addNotification({
      type: "system",
      title: "AI recommendation accepted",
      message: `${title} was added to the operations plan.`,
      audience: "all",
      link: "/ai",
      actor: "Stayora AI",
    });
    logAudit(`Accepted AI recommendation · ${title}`, "AI Studio");
  };

  const ask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    const lower = prompt.toLowerCase();
    const response = lower.includes("rate") || lower.includes("price")
      ? "Deluxe and Suite rates can rise 10–12% for Friday and Saturday. Forecast occupancy is 94% with 11 Deluxe rooms left, and the competitor set averages ₦126,000."
      : lower.includes("occupancy") || lower.includes("forecast")
        ? "Occupancy is pacing 18% above last month on weekends. Expect 78% average occupancy over the next 14 days, with midweek softening from Tuesday."
        : lower.includes("guest") || lower.includes("review")
          ? "Sentiment is positive overall. Three recent reviews mention breakfast wait times around 09:00–09:30. Extending the buffet to 11:00 should protect the review score."
          : `Here is my read on “${prompt.trim()}”: focus on weekend rate capture, protect the breakfast experience and follow up on the AHU maintenance signal on floor 3.`;
    setAnswer(response);
    logAudit(`Asked AI Studio · ${prompt.trim()}`, "AI Studio");
    setPrompt("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="AI studio"
        description="Revenue, demand, sentiment and maintenance signals generated from this workspace's live data."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Live signals" value={String(db.aiSignals.length)} hint={`${byKind.length} signal types`} icon={BrainCircuit} tone="noir" />
        <StatCard label="Average confidence" value={`${averageConfidence}%`} delta="+4 pts" up hint="Across all models" icon={Sparkles} />
        <StatCard label="Recommendations applied" value={String(applied.length)} hint="Accepted this session" icon={Check} />
        <StatCard label="Projected uplift" value={revenueImpact ? `₦${revenueImpact.toFixed(1)}M` : "—"} hint="From applied actions" icon={TrendingUp} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {db.aiSignals.map((signal) => {
            const isApplied = applied.includes(signal.id);
            return (
              <article key={signal.id} className={cn("surface-card p-4", isApplied && "border-emerald-200 bg-emerald-50/40")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold"><Lightbulb className="size-4" /></span>
                    <div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide", kindTone[signal.kind])}>{signal.kind}</span>
                      <h3 className="mt-1.5 text-sm font-semibold">{signal.title}</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{signal.confidence}% confidence</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{signal.detail}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground">{signal.impact}</span>
                  {isApplied ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><Check className="size-3.5" /> Applied</span>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setApplied((prev) => [...prev, `${signal.id}:dismissed`])}>
                        <X className="size-3.5" /> Dismiss
                      </Button>
                      <Button size="sm" onClick={() => apply(signal.id, signal.title)}><Wand2 className="size-3.5" /> Apply</Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="space-y-3">
          <SectionCard title="Ask Stayora AI" subtitle="Grounded in this workspace's live data">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-xs leading-relaxed text-foreground/80">{answer}</div>
            <form onSubmit={ask} className="mt-3 flex gap-2">
              <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="How should I price this weekend?" />
              <Button type="submit" aria-label="Ask AI"><Send className="size-4" /></Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Price this weekend", "Forecast occupancy", "Review sentiment"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Signal mix" subtitle="Where the models are finding opportunity">
            <div className="space-y-3">
              {byKind.map(([kind, count]) => (
                <div key={kind}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{kind}</span>
                    <span className="text-muted-foreground">{count} signal{count === 1 ? "" : "s"}</span>
                  </div>
                  <Progress value={(count / Math.max(1, db.aiSignals.length)) * 100} />
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="rounded-lg border border-primary/20 bg-accent px-4 py-3 text-[11px] text-accent-foreground">
            <p className="flex items-center gap-2 font-semibold"><BrainCircuit className="size-4 text-gold" /> Private by design</p>
            <p className="mt-1 text-muted-foreground">AI prompts and signals are scoped to {db.rooms.length} rooms in this workspace. No guest data leaves the tenant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
