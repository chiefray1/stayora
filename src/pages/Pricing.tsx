import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Gauge,
  HardDrive,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  DEFAULT_PLANS,
  PLAN_ORDER,
  annualSaving,
  monthlyEquivalent,
  usd,
  type BillingCycle,
  type PlanId,
} from "../lib/plans";
import { cn } from "../components/ui";

const planCopy: Record<PlanId, { blurb: string; cta: string; features: string[] }> = {
  free: {
    blurb: "For small guest houses and new hospitality businesses finding their feet.",
    cta: "Start free",
    features: [
      "5 rooms · 2 staff accounts",
      "1 property · 50 reservations / month",
      "Reservations, guests & check-in",
      "Invoicing and daily sales reports",
      "1 GB document storage",
    ],
  },
  starter: {
    blurb: "For growing hotels ready to run food, stock and finance in one system.",
    cta: "Start with Starter",
    features: [
      "30 rooms · 10 staff accounts",
      "Unlimited reservations · 10 GB storage",
      "Restaurant POS, kitchen & laundry",
      "Inventory and procurement",
      "Basic accounting, attendance & exports",
    ],
  },
  professional: {
    blurb: "For established hotels and groups that need every department, every property.",
    cta: "Go Professional",
    features: [
      "100 rooms · 30 staff · 3 properties",
      "50 GB storage · unlimited bookings",
      "Full accounting & payroll",
      "CRM, loyalty, WhatsApp & OTA channels",
      "AI assistant, API access & audit logs",
    ],
  },
};

const comparison: { label: string; icon: typeof BedDouble; values: Record<PlanId, string> }[] = [
  { label: "Rooms", icon: BedDouble, values: { free: "5", starter: "30", professional: "100" } },
  { label: "Staff accounts", icon: Users, values: { free: "2", starter: "10", professional: "30" } },
  { label: "Properties", icon: Layers, values: { free: "1", starter: "1", professional: "3" } },
  { label: "Reservations / month", icon: Gauge, values: { free: "50", starter: "Unlimited", professional: "Unlimited" } },
  { label: "Document storage", icon: HardDrive, values: { free: "1 GB", starter: "10 GB", professional: "50 GB" } },
  { label: "Reservations & front desk", icon: BedDouble, values: { free: "Included", starter: "Included", professional: "Included" } },
  { label: "Restaurant & bar POS", icon: Zap, values: { free: "—", starter: "Included", professional: "Included" } },
  { label: "Kitchen, laundry & inventory", icon: Layers, values: { free: "—", starter: "Included", professional: "Included" } },
  { label: "Accounting & procurement", icon: Gauge, values: { free: "Basic", starter: "Included", professional: "Advanced" } },
  { label: "HR, payroll & attendance", icon: Users, values: { free: "—", starter: "Attendance", professional: "Full payroll" } },
  { label: "CRM, loyalty & WhatsApp", icon: Sparkles, values: { free: "—", starter: "—", professional: "Included" } },
  { label: "AI assistant & OTA channels", icon: Sparkles, values: { free: "—", starter: "—", professional: "Included" } },
  { label: "API access & audit logs", icon: ShieldCheck, values: { free: "—", starter: "—", professional: "Included" } },
  { label: "Support", icon: CircleHelp, values: { free: "Community", starter: "Email", professional: "Priority" } },
];

const faqs = [
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrades apply immediately and we prorate the difference. Downgrades take effect at the end of your billing period. You can switch between monthly and annual billing at any time.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Nothing is deleted. Existing rooms, staff, bookings and invoices stay exactly where they are. If you are above the new plan's limit, those extra records become read-only until you free capacity or upgrade again.",
  },
  {
    q: "Do you charge per property or per room?",
    a: "Plans include a fixed number of properties and rooms. Professional covers three properties and 100 rooms. Need more? Add extra rooms, staff seats or properties from the add-on marketplace in your billing dashboard.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual plans are billed once for twelve months and save two months compared to paying monthly. Prices are in USD and can be paid by card through Stripe or Paystack.",
  },
  {
    q: "Is there a free trial?",
    a: "New workspaces start with a full trial of the features on your chosen plan. At the end of the trial you can pick Free or a paid plan — we never charge you automatically without a payment method on file.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "Stripe handles international cards, Apple Pay and Google Pay. Paystack and Flutterwave cover Nigerian and pan-African cards, bank transfer and mobile money. All card data is held by the provider, never by Stayora.",
  },
];

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-[#0b1f33]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#0b1f33] font-display text-sm font-semibold text-white">S</span>
            <span className="font-display text-lg font-semibold tracking-tight">Stayora</span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-500 md:flex">
            <a href="#plans" className="hover:text-[#0b1f33]">Plans</a>
            <a href="#compare" className="hover:text-[#0b1f33]">Compare</a>
            <a href="#faq" className="hover:text-[#0b1f33]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden text-xs font-semibold text-slate-600 hover:text-[#0b1f33] sm:block">Sign in</Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0d655e]"
            >
              Start free <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#0b1f33] pb-16 pt-14 text-white sm:pb-20 sm:pt-20">
          <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[#0f766e]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 size-[320px] rounded-full bg-[#38bdf8]/10 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7dd3c7]">
              <Sparkles className="size-3" /> Stayora pricing
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              The operating system for
              <span className="block text-[#5eead4]">modern hospitality.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              Reservations, restaurant, housekeeping, accounting, payroll and guest messaging in one
              platform. Start free, upgrade when the hotel grows.
            </p>
            <div className="mt-7 inline-flex rounded-xl border border-white/15 bg-white/5 p-1">
              {(["monthly", "yearly"] as BillingCycle[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setCycle(option)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition",
                    cycle === option ? "bg-white text-[#0b1f33]" : "text-white/70 hover:text-white",
                  )}
                >
                  {option}
                  {option === "yearly" && (
                    <span className={cn("ml-1.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase", cycle === "yearly" ? "bg-[#0f766e] text-white" : "bg-[#0f766e]/30 text-[#5eead4]")}>
                      2 months free
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-white/45">All prices in USD · cancel anytime</p>
          </div>
        </section>

        <section id="plans" className="relative mx-auto -mt-10 max-w-6xl px-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const plan = DEFAULT_PLANS[planId];
              const copy = planCopy[planId];
              const price = cycle === "yearly" ? plan.yearly : plan.monthly;
              const popular = planId === "professional";
              return (
                <div
                  key={planId}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-white p-6 shadow-[0_18px_50px_-30px_rgba(11,31,51,0.45)]",
                    popular ? "border-[#0f766e] ring-1 ring-[#0f766e]/25 lg:-mt-3 lg:mb-3" : "border-slate-200",
                  )}
                >
                  {popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-[#0f766e] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                      Most popular
                    </span>
                  )}
                  <div>
                    <h2 className="font-display text-xl font-semibold">{plan.name.replace("Stayora ", "")}</h2>
                    <p className="mt-1.5 min-h-10 text-[12px] leading-relaxed text-slate-500">{copy.blurb}</p>
                  </div>
                  <div className="mt-5 flex items-end gap-1.5">
                    <span className="font-display text-4xl font-semibold tracking-tight">{usd(price)}</span>
                    <span className="pb-1 text-xs text-slate-500">/{cycle === "yearly" ? "year" : "month"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {plan.monthly === 0
                      ? "Free forever · no card required"
                      : cycle === "yearly"
                        ? `${usd(monthlyEquivalent(planId, "yearly"))}/mo equivalent · save ${usd(annualSaving(planId))}`
                        : `${usd(plan.yearly)} billed annually`}
                  </p>
                  <Link
                    to="/auth"
                    className={cn(
                      "mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition",
                      popular
                        ? "bg-[#0f766e] text-white hover:bg-[#0d655e]"
                        : "border border-slate-300 text-[#0b1f33] hover:border-[#0b1f33] hover:bg-slate-50",
                    )}
                  >
                    {copy.cta} <ArrowRight className="size-3.5" />
                  </Link>
                  <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-[12px]">
                    {copy.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-slate-600">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-[#0f766e]" /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-center text-[11px] text-slate-400">
            Need more than 100 rooms? <Link to="/auth" className="font-semibold text-[#0f766e] hover:underline">Talk to us about a custom plan</Link> or add capacity from your billing dashboard.
          </p>
        </section>

        <section id="compare" className="mx-auto mt-16 max-w-6xl px-4 sm:px-5">
          <div className="mb-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f766e]">Feature comparison</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold sm:text-3xl">Everything, side by side</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-500">Capability</th>
                  {PLAN_ORDER.map((planId) => (
                    <th key={planId} className={cn("px-4 py-3 text-center font-semibold", planId === "professional" ? "text-[#0f766e]" : "text-[#0b1f33]")}>
                      {DEFAULT_PLANS[planId].name.replace("Stayora ", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, index) => (
                  <tr key={row.label} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="border-t border-slate-100 px-4 py-2.5">
                      <span className="flex items-center gap-2 font-medium text-slate-600">
                        <row.icon className="size-3.5 text-slate-400" /> {row.label}
                      </span>
                    </td>
                    {PLAN_ORDER.map((planId) => (
                      <td
                        key={planId}
                        className={cn(
                          "border-t border-slate-100 px-4 py-2.5 text-center",
                          row.values[planId] === "—" ? "text-slate-300" : "text-slate-600",
                          planId === "professional" && row.values[planId] !== "—" && "bg-[#0f766e]/[0.04] font-medium",
                        )}
                      >
                        {row.values[planId]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="faq" className="mx-auto mt-16 max-w-3xl px-5">
          <div className="mb-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f766e]">Questions</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold sm:text-3xl">Before you choose</h2>
          </div>
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.q}>
                  <button
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-[#0b1f33]">{faq.q}</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition", open && "rotate-180 text-[#0f766e]")} />
                  </button>
                  {open && <p className="px-5 pb-4 text-xs leading-relaxed text-slate-500">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-5">
          <div className="relative overflow-hidden rounded-3xl bg-[#0b1f33] px-6 py-12 text-center text-white sm:px-10">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#0f766e]/30 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">Run tonight's shift on Stayora</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
                Start on the free plan, bring your rooms online in minutes, and upgrade only when the hotel needs more.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0d655e]">
                  Create your workspace <ArrowRight className="size-4" />
                </Link>
                <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/5">
                  Explore the demo <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <p className="mt-4 text-[11px] text-white/40">No card required for Free · prices in USD · cancel anytime</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-8 text-[11px] text-slate-400">
        <span>© {new Date().getFullYear()} Stayora Hotel Suite</span>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-[#0b1f33]">Privacy</Link>
          <Link to="/refund" className="hover:text-[#0b1f33]">Refunds</Link>
          <Link to="/auth" className="inline-flex items-center gap-1 hover:text-[#0b1f33]">
            <ChevronLeft className="size-3" /> Back to sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
