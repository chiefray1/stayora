import { useState } from "react";
import { CheckCircle2, Globe2, KeyRound, Link2, PlugZap, Plus, RefreshCw, Webhook } from "lucide-react";
import { useStore } from "../lib/store";
import { timeAgo } from "../lib/format";
import {
  Button,
  Field,
  Input,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
  cn,
} from "../components/ui";

export default function Integrations() {
  const { db, setIntegrationStatus, createApiKey, revokeApiKey, addWebhook, setWebhookStatus, logAudit } = useStore();
  const [keyLabel, setKeyLabel] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState("reservation.created");

  const connected = db.integrations.filter((integration) => integration.status === "connected").length;
  const errors = db.integrations.filter((integration) => integration.status === "error").length;
  const activeKeys = db.apiKeys.filter((key) => key.status === "active").length;
  const categories = Array.from(new Set(db.integrations.map((integration) => integration.category)));

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Integrations & API"
        description="Connect payments, OTAs, door locks, messaging and accounting to every workspace."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Connected apps" value={String(connected)} hint={`${db.integrations.length} available`} icon={PlugZap} tone="noir" />
        <StatCard label="Sync errors" value={String(errors)} hint="Needs attention" icon={RefreshCw} />
        <StatCard label="Active API keys" value={String(activeKeys)} hint={`${db.apiKeys.length} total`} icon={KeyRound} />
        <StatCard label="Webhooks" value={String(db.webhooks.length)} hint="Event subscriptions" icon={Webhook} />
      </div>

      <SectionCard className="mt-4" title="App marketplace" subtitle="One-click connections for the tools hotels already use">
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{category}</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {db.integrations.filter((integration) => integration.category === category).map((integration) => (
                  <div key={integration.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{integration.name}</p>
                        <p className="text-[10px] text-muted-foreground">{integration.provider}</p>
                      </div>
                      <StatusPill status={integration.status} />
                    </div>
                    <p className="mt-2 min-h-8 text-[11px] leading-snug text-muted-foreground">{integration.note}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {integration.status === "connected" ? `Synced ${timeAgo(integration.lastSync)}` : "Not syncing"}
                      </span>
                      <Button
                        size="sm"
                        variant={integration.status === "connected" ? "ghost" : "outline"}
                        onClick={() => {
                          const next = integration.status === "connected" ? "disconnected" : "connected";
                          setIntegrationStatus(integration.id, next);
                          logAudit(`${next === "connected" ? "Connected" : "Disconnected"} ${integration.name}`, "Integrations");
                        }}
                      >
                        {integration.status === "connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <SectionCard title="API keys" subtitle="Server-to-server access for the booking engine and partners">
          <div className="flex gap-2">
            <Input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="e.g. Booking engine · production" />
            <Button
              onClick={() => {
                if (!keyLabel.trim()) return;
                createApiKey(keyLabel);
                logAudit(`Created API key ${keyLabel.trim()}`, "Integrations");
                setKeyLabel("");
              }}
            >
              <Plus className="size-4" /> Create
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {db.apiKeys.map((key) => (
              <div key={key.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", key.status === "revoked" ? "border-border bg-muted/30 opacity-70" : "border-border")}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold"><KeyRound className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{key.label}</p>
                  <p className="text-[10px] text-muted-foreground">{key.prefix}•••••••• · created {timeAgo(key.createdAt)}</p>
                </div>
                {key.status === "active" ? (
                  <Button size="sm" variant="ghost" onClick={() => { revokeApiKey(key.id); logAudit(`Revoked API key ${key.label}`, "Integrations"); }}>Revoke</Button>
                ) : (
                  <StatusPill status="revoked" />
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Webhooks" subtitle="Push reservation, invoice and payment events to your systems">
          <div className="space-y-2">
            <Field label="Endpoint URL">
              <Input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://ops.example.com/hooks/stayora" />
            </Field>
            <Field label="Events" hint="Comma-separated event names.">
              <Input value={hookEvents} onChange={(e) => setHookEvents(e.target.value)} placeholder="reservation.created, invoice.paid" />
            </Field>
            <Button
              onClick={() => {
                if (!hookUrl.trim()) return;
                addWebhook(hookUrl, hookEvents.split(",").map((event) => event.trim()).filter(Boolean));
                logAudit("Added webhook endpoint", "Integrations");
                setHookUrl("");
              }}
            >
              <Plus className="size-4" /> Add webhook
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {db.webhooks.map((hook) => (
              <div key={hook.id} className="rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-xs font-semibold"><Globe2 className="size-3.5 shrink-0 text-gold" /> <span className="truncate">{hook.url}</span></p>
                  <StatusPill status={hook.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {hook.events.map((event) => (
                    <span key={event} className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">{event}</span>
                  ))}
                  <button
                    onClick={() => setWebhookStatus(hook.id, hook.status === "active" ? "paused" : "active")}
                    className="ml-auto text-[10px] font-semibold text-gold hover:underline"
                  >
                    {hook.status === "active" ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-accent px-4 py-3 text-[11px] text-accent-foreground">
        <CheckCircle2 className="size-4 text-gold" />
        <span>Every API key and webhook is scoped to this workspace. Keys never expose data from another tenant.</span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground"><Link2 className="size-3" /> REST + webhooks</span>
      </div>
    </div>
  );
}
