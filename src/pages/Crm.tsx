import { useState } from "react";
import {
  Cake,
  Crown,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Smartphone,
  Target,
  TrendingUp,
} from "lucide-react";
import { useStore } from "../lib/store";
import { naira } from "../lib/format";
import type { Campaign } from "../lib/types";
import {
  Avatar,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  VipPill,
  cn,
} from "../components/ui";

const channelIcon = {
  Email: Mail,
  WhatsApp: MessageCircle,
  SMS: Smartphone,
};

export default function Crm() {
  const { db, addCampaign } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    channel: "Email" as Campaign["channel"],
    audience: "Gold & Platinum guests",
  });

  const totalSent = db.campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalOpened = db.campaigns.reduce((sum, c) => sum + c.opened, 0);
  const revenue = db.campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const openRate = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0;

  const topGuests = [...db.guests].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 5);
  const vipCount = db.guests.filter((g) => g.vip === "Gold" || g.vip === "Platinum").length;
  const corporate = db.reservations.filter((r) => r.source === "Corporate").length;
  const lapsed = db.guests.filter((g) => g.stays <= 1).length;

  const segments = [
    { name: "Gold & Platinum", description: "Highest value, priority upgrades", count: vipCount, icon: Crown, tone: "gold" },
    { name: "Corporate accounts", description: "Negotiated rates & monthly stays", count: corporate, icon: Target, tone: "blue" },
    { name: "New & one-time guests", description: "Welcome series opportunity", count: lapsed, icon: Cake, tone: "amber" },
    { name: "All active profiles", description: "Full CRM reach", count: db.guests.length, icon: TrendingUp, tone: "green" },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addCampaign({ ...form, name: form.name.trim() });
    setOpen(false);
    setForm({ name: "", channel: "Email", audience: "Gold & Platinum guests" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="CRM & marketing"
        description="Segment your guest database, run campaigns and track attributed revenue."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New campaign</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CrmStat label="Campaigns" value={String(db.campaigns.length)} hint={`${db.campaigns.filter((c) => c.status === "sent").length} sent`} icon={Send} />
        <CrmStat label="Messages sent" value={totalSent.toLocaleString("en-NG")} hint="Across all channels" icon={Mail} />
        <CrmStat label="Open rate" value={`${openRate}%`} hint={`${totalOpened.toLocaleString("en-NG")} opened`} icon={TrendingUp} />
        <CrmStat label="Attributed revenue" value={naira(revenue)} hint="From CRM campaigns" icon={Crown} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="surface-card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Campaigns</h2>
              <p className="text-xs text-muted-foreground">Email, WhatsApp and SMS</p>
            </div>
            <StatusPill status={`${db.campaigns.filter((c) => c.status === "sent").length} sent`} className="hidden" />
          </div>
          <div className="divide-y divide-border">
            {db.campaigns.map((campaign) => {
              const Icon = channelIcon[campaign.channel];
              return (
                <div key={campaign.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{campaign.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {campaign.channel} · {campaign.audience}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-semibold">{campaign.sent.toLocaleString("en-NG")}</p>
                    <p className="text-[10px] text-muted-foreground">sent</p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-xs font-semibold">{campaign.sent ? Math.round((campaign.opened / campaign.sent) * 100) : 0}%</p>
                    <p className="text-[10px] text-muted-foreground">opened</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">{naira(campaign.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">revenue</p>
                  </div>
                  <StatusPill status={campaign.status} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Top guests by value</h2>
            <p className="text-xs text-muted-foreground">Lifetime value leaders</p>
          </div>
          <div className="divide-y divide-border">
            {topGuests.map((guest, i) => (
              <div key={guest.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-4 text-center font-display text-lg text-muted-foreground">{i + 1}</span>
                <Avatar name={guest.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{guest.name}</p>
                  <p className="text-[10px] text-muted-foreground">{guest.stays} stays</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">{naira(guest.lifetimeValue)}</p>
                  <VipPill tier={guest.vip} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.name} className="surface-card p-5">
            <span className={cn(
              "grid size-9 place-items-center rounded-lg",
              segment.tone === "gold" && "bg-primary/10 text-gold",
              segment.tone === "blue" && "bg-sky-100 text-sky-700",
              segment.tone === "amber" && "bg-amber-100 text-amber-700",
              segment.tone === "green" && "bg-emerald-100 text-emerald-700",
            )}>
              <segment.icon className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">{segment.name}</p>
            <p className="text-[11px] text-muted-foreground">{segment.description}</p>
            <p className="mt-3 font-display text-2xl font-semibold">{segment.count}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">guests</p>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New campaign"
        description="Create a draft campaign. You can review the audience before sending."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-campaign"><Plus className="size-4" /> Create draft</Button>
          </>
        }
      >
        <form id="new-campaign" onSubmit={submit} className="space-y-4">
          <Field label="Campaign name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Christmas suite offer" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Channel">
              <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Campaign["channel"] })}>
                {["Email", "WhatsApp", "SMS"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Audience">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {["Gold & Platinum guests", "Corporate accounts", "Past guests · 12 months", "All active profiles", "Guests with birthdays this month"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            Drafts are saved locally. Sending requires the messaging integration to be connected.
          </p>
        </form>
      </Modal>
    </div>
  );
}

function CrmStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Mail;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <Icon className="size-4 text-gold" />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
