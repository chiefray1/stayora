import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTenant } from "../lib/tenants";
import { DEFAULT_PLANS, formatLimit, usd } from "../lib/plans";
import { Button, Field, Input, Select } from "../components/ui";

const freePlan = DEFAULT_PLANS.free;

const perks = [
  { icon: BedDouble, text: `${freePlan.limits.rooms} rooms and ${freePlan.limits.properties} property` },
  { icon: Users, text: `${freePlan.limits.staff} staff seats plus the owner account` },
  { icon: Sparkles, text: "Reservations, guests, housekeeping and billing" },
  { icon: ShieldCheck, text: "The first account is your workspace Superadmin" },
];

const countries = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "United Arab Emirates",
  "Other",
];

type Currency = "NGN" | "USD" | "GBP" | "EUR" | "KES" | "GHS";

export default function Signup() {
  const { provisionAccount, signIn } = useAuth();
  const { tenants, createTenant, switchTenant } = useTenant();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    hotelName: "",
    ownerName: "",
    email: "",
    phone: "",
    city: "",
    country: "Nigeria",
    currency: "NGN" as Currency,
    rooms: freePlan.limits.rooms,
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();
    if (!form.hotelName.trim() || !form.ownerName.trim() || !email || !form.city.trim()) {
      setError("Complete the hotel name, owner name, work email and city.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid work email address.");
      return;
    }
    if (tenants.some((tenant) => tenant.ownerEmail.toLowerCase() === email)) {
      setError("A workspace already exists for that email. Sign in instead, or use another address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const rooms = Math.max(1, Math.min(freePlan.limits.rooms, Number(form.rooms) || 1));
      const tenant = createTenant({
        name: form.hotelName,
        ownerName: form.ownerName,
        ownerEmail: email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        plan: "free",
        rooms,
        currency: form.currency,
      });

      const result = await provisionAccount({
        email,
        name: form.ownerName,
        password: form.password,
        role: "Superadmin",
        tenantId: tenant.id,
      });
      if (!result.ok) {
        setError(result.error ?? "The workspace was created but the owner account could not be provisioned.");
        return;
      }

      switchTenant(tenant.id);
      const signedIn = await signIn(email, form.password, tenant.id);
      if (!signedIn.ok) {
        setError(signedIn.error ?? "Account created. Please sign in to continue.");
        navigate("/auth");
        return;
      }

      navigate("/dashboard", { replace: true, state: { welcome: tenant.name } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden bg-noir lg:sticky lg:top-0 lg:block lg:h-dvh">
        <img
          src="/assets/stayora-slide-1.jpg"
          alt="Stayora hotel"
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(20,18,14,0.82),rgba(20,18,14,0.92))]" />
        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Link to="/" className="flex items-center gap-3">
            <img src="/assets/stayora-mark.png" alt="Stayora" className="h-11 w-auto" />
            <div>
              <p className="font-display text-xl text-white">Stayora</p>
              <p className="text-[10px] uppercase tracking-[0.26em] text-noir-muted">Hotel Suite</p>
            </div>
          </Link>

          <div className="my-auto max-w-md py-12">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-bright">Create your workspace</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-white xl:text-5xl">
              Your hotel, online in a few minutes.
            </h1>
            <p className="mt-4 text-sm text-noir-muted">
              Every new hotel starts on the Free plan. The owner account becomes the workspace
              Superadmin, and you can upgrade at any time to unlock bigger packages, more rooms and
              more staff seats.
            </p>
            <ul className="mt-8 space-y-4">
              {perks.map((perk) => (
                <li key={perk.text} className="flex items-center gap-3 text-sm text-noir-text">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-bright">
                    <perk.icon className="size-4" />
                  </span>
                  {perk.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-noir-muted">
            <p className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="size-4 text-brand-bright" /> Free forever, no card required
            </p>
            <p className="mt-1">
              Upgrade to Starter ({usd(DEFAULT_PLANS.starter.monthly)}/mo) or Professional (
              {usd(DEFAULT_PLANS.professional.monthly)}/mo) whenever you need more capacity.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden">
            <img src="/assets/stayora-mark-dark.png" alt="" className="h-8 w-auto" /> Stayora
          </Link>
          <div className="ml-auto flex items-center gap-3 text-[11px] sm:gap-4 sm:text-xs">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Compare plans</Link>
            <Link to="/auth" className="flex items-center gap-1.5 font-semibold text-gold hover:underline">
              Staff sign in <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-4 pb-12 pt-2 sm:px-6 sm:pb-16">
          <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-xl">
            <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-accent px-2.5 py-1 text-[10px] font-semibold text-gold">
                <Sparkles className="size-3" /> Free forever
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                <BedDouble className="size-3" /> {freePlan.limits.rooms} rooms
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                <Users className="size-3" /> {freePlan.limits.staff} staff seats
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Start free · upgrade when you grow
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Create your hotel account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The first account for this hotel becomes its Superadmin. You can then invite staff
              according to the seats included in your package.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Hotel / hostel name" className="sm:col-span-2">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.hotelName}
                      onChange={(e) => set({ hotelName: e.target.value })}
                      className="pl-9"
                      placeholder="e.g. Azura House Lagos"
                      autoComplete="organization"
                      required
                    />
                  </div>
                </Field>

                <Field label="Owner name" hint="This person becomes the Superadmin.">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.ownerName}
                      onChange={(e) => set({ ownerName: e.target.value })}
                      className="pl-9"
                      placeholder="e.g. Chioma Nwankwo"
                      autoComplete="name"
                      required
                    />
                  </div>
                </Field>

                <Field label="Work email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set({ email: e.target.value })}
                      className="pl-9"
                      placeholder="owner@hotel.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </Field>

                <Field label="Phone">
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(e) => set({ phone: e.target.value })}
                      className="pl-9"
                      placeholder="0803 000 0000"
                      autoComplete="tel"
                    />
                  </div>
                </Field>

                <Field label="City">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.city}
                      onChange={(e) => set({ city: e.target.value })}
                      className="pl-9"
                      placeholder="Lagos"
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                </Field>

                <Field label="Country">
                  <Select value={form.country} onChange={(e) => set({ country: e.target.value })}>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Currency">
                  <Select value={form.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
                    {(["NGN", "USD", "GBP", "EUR", "KES", "GHS"] as Currency[]).map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Rooms at launch"
                  hint={`Free includes ${formatLimit(freePlan.limits.rooms)} rooms — upgrade to add more.`}
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={freePlan.limits.rooms}
                    value={form.rooms}
                    onChange={(e) => set({ rooms: Number(e.target.value) })}
                  />
                </Field>

                <Field label="Password" hint="At least 6 characters.">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={show ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set({ password: e.target.value })}
                      className="pl-9 pr-10"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={show ? "text" : "password"}
                      value={form.confirm}
                      onChange={(e) => set({ confirm: e.target.value })}
                      className="pl-9"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </Field>
              </div>

              <div className="rounded-lg border border-primary/20 bg-accent px-3 py-3 text-[11px] text-accent-foreground sm:px-4 sm:text-xs">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="size-3.5 text-gold" /> You are creating a Free workspace
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Free covers {freePlan.limits.rooms} rooms, {freePlan.limits.staff} staff seats and{" "}
                  {freePlan.limits.reservationsPerMonth} reservations a month. Bigger packages unlock more
                  rooms, more staff and modules such as payroll, CRM and AI.
                </p>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Creating your workspace…" : "Create free account"} <ArrowRight className="size-4" />
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Check className="size-3 text-emerald-600" /> No card required</span>
                <span className="flex items-center gap-1"><Check className="size-3 text-emerald-600" /> Upgrade anytime</span>
                <span className="flex items-center gap-1"><Check className="size-3 text-emerald-600" /> Cancel anytime</span>
              </div>

              <p className="text-center text-[11px] leading-5 text-muted-foreground sm:text-xs">
                Already have a workspace?{" "}
                <Link to="/auth" className="font-semibold text-gold hover:underline">Staff sign in</Link>
                . By creating an account you agree to our{" "}
                <Link to="/privacy" className="font-semibold text-gold hover:underline">Privacy Policy</Link>{" "}
                and{" "}
                <Link to="/refund" className="font-semibold text-gold hover:underline">Refund Policy</Link>.
              </p>
            </form>

            <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
