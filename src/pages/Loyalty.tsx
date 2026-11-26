import { useMemo, useState } from "react";
import { Crown, Gift, Medal, Sparkles, Star, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { naira } from "../lib/format";
import type { VipTier } from "../lib/types";
import {
  Button,
  PageHeader,
  Progress,
  SectionCard,
  StatCard,
  StatusPill,
  VipPill,
  buttonClass,
  cn,
} from "../components/ui";

const tiers: { tier: VipTier; threshold: number; next?: VipTier; color: string }[] = [
  { tier: "Silver", threshold: 2_000, next: "Gold", color: "from-slate-200 to-slate-100" },
  { tier: "Gold", threshold: 6_000, next: "Platinum", color: "from-amber-200 to-amber-100" },
  { tier: "Platinum", threshold: 12_000, color: "from-stone-800 to-stone-700" },
];

export default function Loyalty() {
  const { db, updateGuest, logAudit } = useStore();
  const [filter, setFilter] = useState<"all" | VipTier>("all");

  const members = db.guests.filter((guest) => guest.loyaltyPoints > 0);
  const totalPoints = members.reduce((sum, guest) => sum + guest.loyaltyPoints, 0);
  const lifetimeValue = members.reduce((sum, guest) => sum + guest.lifetimeValue, 0);
  const platinum = members.filter((guest) => guest.vip === "Platinum").length;
  const visible = filter === "all" ? members : members.filter((guest) => guest.vip === filter);

  const tierCounts = useMemo(
    () => ({
      Platinum: members.filter((guest) => guest.vip === "Platinum").length,
      Gold: members.filter((guest) => guest.vip === "Gold").length,
      Silver: members.filter((guest) => guest.vip === "Silver").length,
      None: members.filter((guest) => guest.vip === "None").length,
    }),
    [members],
  );

  const redeem = (id: string, name: string) => {
    updateGuest(id, { loyaltyPoints: Math.max(0, (db.guests.find((g) => g.id === id)?.loyaltyPoints ?? 0) - 1_000) });
    logAudit(`Redeemed 1,000 loyalty points for ${name}`, "Loyalty");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Guest growth"
        title="Loyalty programme"
        description="Reward repeat guests, track tier progression and turn points into direct bookings."
        actions={
          <Link to="/crm" className={buttonClass("primary")}>
            <Sparkles className="size-4" /> Create campaign
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Loyalty members" value={String(members.length)} hint={`${platinum} Platinum guests`} icon={Users} tone="noir" />
        <StatCard label="Points in circulation" value={totalPoints.toLocaleString("en-NG")} hint="Across all tiers" icon={Star} />
        <StatCard label="Member lifetime value" value={naira(lifetimeValue)} hint="Cumulative revenue" icon={TrendingUp} />
        <StatCard label="Tier upgrades" value="14" delta="+3 this month" up hint="Silver → Gold" icon={Crown} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {tiers.map((tier) => {
          const count = tierCounts[tier.tier];
          const points = members.filter((guest) => guest.vip === tier.tier).reduce((sum, guest) => sum + guest.loyaltyPoints, 0);
          return (
            <div key={tier.tier} className={cn("overflow-hidden rounded-xl border border-border bg-gradient-to-br p-5", tier.color, tier.tier === "Platinum" && "text-white")}>
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-white/60 text-foreground">
                  {tier.tier === "Platinum" ? <Crown className="size-4" /> : <Medal className="size-4" />}
                </span>
                <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-foreground">{count} guests</span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold">{tier.tier}</h2>
              <p className={cn("text-xs", tier.tier === "Platinum" ? "text-white/70" : "text-foreground/60")}>
                From {tier.threshold.toLocaleString("en-NG")} points{tier.next ? ` · next tier ${tier.next}` : " · highest tier"}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className={tier.tier === "Platinum" ? "text-white/80" : "text-foreground/70"}>{points.toLocaleString("en-NG")} points</span>
                <Gift className="size-3.5 opacity-60" />
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard
        className="mt-4"
        title="Member directory"
        subtitle={`${visible.length} guest${visible.length === 1 ? "" : "s"} in this view`}
        action={
          <div className="flex flex-wrap gap-1">
            {(["all", "Platinum", "Gold", "Silver", "None"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilter(tier)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                  filter === tier ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {tier === "all" ? "All tiers" : tier}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Tier</th>
                <th>Points</th>
                <th>Progress</th>
                <th>Stays</th>
                <th>Lifetime value</th>
                <th className="text-right">Reward</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((guest) => {
                const nextTier = tiers.find((tier) => tier.tier === guest.vip)?.next;
                const nextThreshold = nextTier ? tiers.find((tier) => tier.tier === nextTier)?.threshold ?? 1 : 1;
                const progress = nextTier ? Math.min(100, Math.round((guest.loyaltyPoints / nextThreshold) * 100)) : 100;
                return (
                  <tr key={guest.id}>
                    <td>
                      <p className="text-xs font-semibold">{guest.name}</p>
                      <p className="text-[10px] text-muted-foreground">{guest.email}</p>
                    </td>
                    <td><VipPill tier={guest.vip} /></td>
                    <td className="text-xs font-semibold">{guest.loyaltyPoints.toLocaleString("en-NG")}</td>
                    <td className="w-40">
                      <Progress value={progress} tone={guest.vip === "Platinum" ? "green" : "gold"} />
                      <p className="mt-1 text-[10px] text-muted-foreground">{nextTier ? `${progress}% to ${nextTier}` : "Top tier"}</p>
                    </td>
                    <td className="text-xs">{guest.stays}</td>
                    <td className="text-xs font-semibold">{naira(guest.lifetimeValue)}</td>
                    <td className="text-right">
                      <Button size="sm" variant="outline" disabled={guest.loyaltyPoints < 1_000} onClick={() => redeem(guest.id, guest.name)}>
                        Redeem 1,000
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">No members in this tier yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { title: "Points earn rate", value: "1 point per ₦1,000", hint: "Applied to room, F&B and spa spend." },
          { title: "Tier review", value: "Every 12 months", hint: "Rolling 12-month qualifying points." },
          { title: "Redemption value", value: "1,000 points = ₦5,000", hint: "Redeemable against folio charges." },
        ].map((card) => (
          <div key={card.title} className="surface-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{card.title}</p>
            <p className="mt-1 text-lg font-semibold">{card.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <StatusPill status="active" /> Loyalty points are tenant-scoped and never shared between workspaces.
      </div>
    </div>
  );
}
