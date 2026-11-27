import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { demoAccountsFor, useAuth } from "../lib/auth";
import { totalRooms, useTenant } from "../lib/tenants";
import { TIER_LABEL } from "../lib/plans";
import { Button, Field, Input, Modal, Select } from "../components/ui";

const points = [
  { icon: BedDouble, text: "Reservations, room rack and live folios" },
  { icon: Users, text: "Guest CRM, loyalty and housekeeping boards" },
  { icon: Sparkles, text: "Revenue intelligence and WhatsApp AI agent" },
  { icon: ShieldCheck, text: "Role-based access for every department" },
];

export default function Auth() {
  const { user, signIn, requestPasswordReset, resetPassword } = useAuth();
  const { tenants, currentTenant, switchTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [email, setEmail] = useState("ada.obi@stayora.ng");
  const [password, setPassword] = useState("stayora");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNew, setResetNew] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const showDemo = ["tnt-stayora-lagos", "tnt-stayora-abuja", "tnt-zuri-nairobi"].includes(currentTenant.id);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await signIn(email, password);
      if (!result.ok) setError(result.error ?? "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  const openForgot = () => {
    setResetStep("request");
    setResetEmail(email);
    setResetCode("");
    setResetNew("");
    setResetConfirm("");
    setResetError("");
    setResetNotice("");
    setForgotOpen(true);
  };

  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetNotice("");
    setResetBusy(true);
    try {
      const result = await requestPasswordReset(resetEmail);
      if (!result.ok) {
        setResetError(result.error ?? "Unable to send a reset code.");
        return;
      }
      setResetStep("verify");
      setResetNotice(`Demo reset code: ${result.code}. It expires in 15 minutes.`);
    } finally {
      setResetBusy(false);
    }
  };

  const completeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (resetNew !== resetConfirm) {
      setResetError("The new passwords do not match.");
      return;
    }
    setResetBusy(true);
    try {
      const result = await resetPassword(resetEmail, resetCode, resetNew);
      if (!result.ok) {
        setResetError(result.error ?? "Unable to reset your password.");
        return;
      }
      setForgotOpen(false);
      setEmail(resetEmail);
      setPassword(resetNew);
      setError("");
      setNotice("Password updated. Sign in with your new password.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-noir lg:block">
        <img
          src="/assets/stayora-slide-3.jpg"
          alt="Stayora lobby and front desk"
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(20,18,14,0.78),rgba(20,18,14,0.9))]" />
        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Link to="/" className="flex items-center gap-3">
            <img src="/assets/stayora-mark.png" alt="Stayora" className="h-11 w-auto" />
            <div>
              <p className="font-display text-xl text-white">Stayora</p>
              <p className="text-[10px] uppercase tracking-[0.26em] text-noir-muted">Hotel Suite</p>
            </div>
          </Link>

          <div className="my-auto max-w-md py-12">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-bright">Staff access</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-white xl:text-5xl">
              One suite for every corner of the hotel.
            </h1>
            <p className="mt-4 text-sm text-noir-muted">
              Reservations, room rack, guest CRM, housekeeping and analytics — secured with role-based
              access for every department.
            </p>
            <ul className="mt-8 space-y-4">
              {points.map((point) => (
                <li key={point.text} className="flex items-center gap-3 text-sm text-noir-text">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-bright">
                    <point.icon className="size-4" />
                  </span>
                  {point.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-noir-muted">
            <ShieldCheck className="size-3.5 text-brand-bright" />
            {currentTenant.city} · {currentTenant.name} · {totalRooms(currentTenant)} keys
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground lg:hidden">
            <img src="/assets/stayora-mark-dark.png" alt="" className="h-8 w-auto" /> Stayora
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {currentTenant.city} · {TIER_LABEL[currentTenant.plan]} workspace
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold">Staff sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your work email to access the operations suite.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <Field label="Workspace">
                <Select value={currentTenant.id} onChange={(e) => switchTenant(e.target.value)}>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name} · {TIER_LABEL[tenant.plan]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Work email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="pl-9"
                    placeholder="you@stayora.ng"
                    autoComplete="email"
                  />
                </div>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              {error && (
                <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </p>
              )}
              {notice && (
                <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> {notice}
                </p>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Secure session · 12 hours
                </span>
                <button type="button" onClick={openForgot} className="font-semibold text-gold hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"} <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              New hotel or hostel?{" "}
              <Link to="/signup" className="font-semibold text-gold hover:underline">
                Create a free workspace
              </Link>
            </p>

            <div className="mt-6 rounded-lg border border-primary/20 bg-accent px-4 py-3 text-xs text-accent-foreground">
              <p className="font-semibold">{showDemo ? "Demo access" : "Workspace access"}</p>
              <p className="mt-0.5 text-muted-foreground">
                {showDemo
                  ? "Use one of the seeded demo accounts below. Staff accounts in real workspaces are invited by the Superadmin."
                  : "Sign in with the owner email and password used when this workspace was created. Staff sign-ins are invited from Team & access."}
              </p>
              {showDemo && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    { label: "Superadmin", email: demoAccountsFor(currentTenant.ownerEmail)[0].email },
                    { label: "Manager", email: demoAccountsFor(currentTenant.ownerEmail)[1].email },
                    { label: "Front desk", email: demoAccountsFor(currentTenant.ownerEmail)[2].email },
                  ].map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword("stayora");
                        setError("");
                        setNotice("");
                      }}
                      className="rounded-full border border-primary/25 bg-white px-2.5 py-1 text-[10px] font-semibold text-foreground transition hover:border-primary/50"
                    >
                      {account.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
              Staff access is provisioned by an administrator. By signing in you agree to our{" "}
              <Link to="/privacy" className="font-semibold text-gold hover:underline">Privacy Policy</Link>{" "}
              and{" "}
              <Link to="/refund" className="font-semibold text-gold hover:underline">Refund Policy</Link>.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        description="We will verify your work email with a six-digit code."
        width="sm"
        footer={
          resetStep === "request" ? (
            <>
              <Button variant="ghost" onClick={() => setForgotOpen(false)}>Cancel</Button>
              <Button type="submit" form="request-reset" disabled={resetBusy}>
                <Mail className="size-4" /> {resetBusy ? "Sending…" : "Send code"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResetStep("request")}>Back</Button>
              <Button type="submit" form="complete-reset" disabled={resetBusy}>
                <KeyRound className="size-4" /> {resetBusy ? "Updating…" : "Update password"}
              </Button>
            </>
          )
        }
      >
        {resetStep === "request" ? (
          <form id="request-reset" onSubmit={sendResetCode} className="space-y-4">
            <Field label="Work email" hint="Use the email linked to your staff profile.">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setResetError(""); }}
                  className="pl-9"
                  placeholder="you@stayora.ng"
                  autoComplete="email"
                  required
                />
              </div>
            </Field>
            {resetError && (
              <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">
                {resetError}
              </p>
            )}
          </form>
        ) : (
          <form id="complete-reset" onSubmit={completeReset} className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-accent px-3 py-2 text-xs text-accent-foreground">
              <p className="font-semibold">Reset code for {resetEmail}</p>
              <p className="mt-0.5 text-muted-foreground">{resetNotice}</p>
            </div>
            <Field label="Six-digit code">
              <Input
                value={resetCode}
                onChange={(e) => { setResetCode(e.target.value); setResetError(""); }}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </Field>
            <Field label="New password" hint="At least 6 characters.">
              <Input
                type="password"
                value={resetNew}
                onChange={(e) => { setResetNew(e.target.value); setResetError(""); }}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={resetConfirm}
                onChange={(e) => { setResetConfirm(e.target.value); setResetError(""); }}
                autoComplete="new-password"
                required
              />
            </Field>
            {resetError && (
              <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">
                {resetError}
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
