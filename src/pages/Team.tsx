import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth, type AccountSummary } from "../lib/auth";
import { useStore } from "../lib/store";
import { useTenant } from "../lib/tenants";
import { useEntitlements } from "../lib/subscription";
import { PLAN_ORDER, formatLimit, planFor, usd } from "../lib/plans";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  SectionCard,
  Select,
  StatusPill,
  buttonClass,
  cn,
} from "../components/ui";

const TEMP_PASSWORD = "stayora";

export default function Team() {
  const { user, accounts, staffSeats, provisionAccount, removeAccount } = useAuth();
  const { currentTenant } = useTenant();
  const { db } = useStore();
  const { plan, limits, canModule } = useEntitlements();

  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Front desk",
    password: TEMP_PASSWORD,
  });

  const assignableRoles = useMemo(
    () => db.roles.filter((role) => role.name !== "Superadmin"),
    [db.roles],
  );

  const seatLimit = limits.staff;
  const seatsUsed = staffSeats;
  const seatsLeft = Math.max(0, seatLimit - seatsUsed);
  const seatsFull = seatsLeft === 0;
  const seatPct = Math.min(100, Math.round((seatsUsed / Math.max(1, seatLimit)) * 100));

  const openInvite = () => {
    if (seatsFull) {
      setUpgradeOpen(true);
      return;
    }
    setError("");
    setNotice("");
    setForm({ name: "", email: "", role: assignableRoles[0]?.name ?? "Front desk", password: TEMP_PASSWORD });
    setOpen(true);
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email) {
      setError("Enter the staff member's name and work email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid work email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("The temporary password must be at least 6 characters.");
      return;
    }
    if (seatsLeft <= 0) {
      setOpen(false);
      setUpgradeOpen(true);
      return;
    }

    setBusy(true);
    try {
      const result = await provisionAccount({
        email,
        name: form.name,
        password: form.password,
        role: form.role,
        tenantId: currentTenant.id,
      });
      if (!result.ok) {
        setError(result.error ?? "The staff account could not be created.");
        return;
      }
      setOpen(false);
      setNotice(
        `${form.name.trim()} can now sign in with ${email} and the temporary password ${form.password}. Ask them to change it from Profile settings.`,
      );
      setForm({ name: "", email: "", role: assignableRoles[0]?.name ?? "Front desk", password: TEMP_PASSWORD });
    } finally {
      setBusy(false);
    }
  };

  const remove = (email: string, name: string) => {
    if (!window.confirm(`Remove ${name}'s access to ${currentTenant.name}? Their sign-in will stop working immediately.`)) {
      return;
    }
    const result = removeAccount(email);
    if (!result.ok) {
      setNotice("");
      setError(result.error ?? "That account could not be removed.");
      return;
    }
    setError("");
    setNotice(`${name}'s sign-in access was removed. That seat is free again.`);
  };

  const nextPlan = PLAN_ORDER.map((planId) => planFor(planId)).find(
    (candidate) => candidate.limits.staff > seatLimit,
  );
  const targetPlan = nextPlan ?? planFor("professional");

  const describeAccount = (account: AccountSummary) => {
    const isOwner = account.role === "Superadmin";
    const isSelf = account.email.toLowerCase() === user?.email?.toLowerCase();
    const roleRecord = db.roles.find((role) => role.name.toLowerCase() === account.role.toLowerCase());
    const roleModules = isOwner ? plan.modules.length : roleRecord?.permissions.length ?? 0;
    const added = account.createdAt
      ? new Date(account.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";
    return { isOwner, isSelf, roleModules, added };
  };

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Team & access"
        description="Invite staff to this workspace. The number of sign-in seats and the modules they can open follow your package."
        actions={
          <Button onClick={openInvite} className="w-full sm:w-auto">
            <UserPlus className="size-4" /> Invite staff
          </Button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="surface-card p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current package</p>
              <p className="mt-1 font-display text-2xl font-semibold">{plan.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatLimit(seatLimit)} staff seats · {formatLimit(limits.rooms)} rooms · {formatLimit(limits.properties)} propert
                {limits.properties === 1 ? "y" : "ies"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
                {plan.monthly === 0 ? "Free plan" : `${usd(plan.monthly)}/mo`}
              </span>
              {plan.id !== "professional" && (
                <Link to="/subscription" className={buttonClass("primary", "sm")}>
                  <Sparkles className="size-3.5" /> Upgrade plan
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="size-3.5 text-muted-foreground" /> Staff sign-in seats
              </span>
              <span className={cn("tabular-nums", seatsFull ? "font-semibold text-amber-600" : "text-muted-foreground")}>
                {seatsUsed} / {formatLimit(seatLimit)} used · {seatsLeft} available
              </span>
            </div>
            <Progress value={seatPct} tone={seatsFull ? "gold" : "green"} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              The Superadmin owner is included separately. Each invited staff member uses one seat on{" "}
              {plan.name}.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: "Owner", value: "Superadmin", hint: "Full workspace control" },
              { label: "Staff seats", value: `${seatsUsed}/${formatLimit(seatLimit)}`, hint: "Logins in use" },
              { label: "Modules", value: String(plan.modules.length), hint: "Included in this package" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
              <Crown className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{currentTenant.ownerName}</p>
              <p className="text-[10px] text-muted-foreground">Workspace Superadmin</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            The first account created for {currentTenant.name} owns this workspace. Only the Superadmin can
            invite staff, change the package and manage sign-in access.
          </p>
          <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5"><Mail className="size-3 shrink-0" /> <span className="truncate">{currentTenant.ownerEmail}</span></p>
            <p className="flex items-center gap-1.5"><ShieldCheck className="size-3 shrink-0" /> Tenant-isolated accounts</p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> <span className="min-w-0 break-words">{notice}</span>
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <SectionCard
        className="mt-4"
        title="Staff sign-in accounts"
        subtitle="Everyone listed here can open this workspace with their own email and password."
        bodyClassName="p-0"
      >
        <div className="hidden overflow-x-auto md:block">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Access</th>
                <th>Added</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const { isOwner, isSelf, roleModules, added } = describeAccount(account);
                return (
                  <tr key={account.email}>
                    <td>
                      <p className="text-xs font-semibold">{account.name}</p>
                      <p className="text-[10px] text-muted-foreground">{account.email}</p>
                    </td>
                    <td>
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        isOwner ? "bg-primary/10 text-gold" : "bg-muted text-muted-foreground",
                      )}>
                        {account.role}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {isOwner ? "All modules in the package" : `${roleModules} module${roleModules === 1 ? "" : "s"} in this role`}
                    </td>
                    <td className="text-xs text-muted-foreground">{added}</td>
                    <td>
                      <StatusPill status="active" />
                    </td>
                    <td className="text-right">
                      {isOwner || isSelf ? (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {isOwner ? "Owner" : "You"}
                        </span>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => remove(account.email, account.name)}>
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No sign-in accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {accounts.map((account) => {
            const { isOwner, isSelf, roleModules, added } = describeAccount(account);
            return (
              <li key={account.email} className="px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{account.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{account.email}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isOwner ? "bg-primary/10 text-gold" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {account.role}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <p className="uppercase tracking-wide text-muted-foreground">Access</p>
                    <p className="mt-0.5 text-foreground/80">
                      {isOwner
                        ? "All modules in the package"
                        : `${roleModules} module${roleModules === 1 ? "" : "s"} in this role`}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-muted-foreground">Added</p>
                    <p className="mt-0.5 text-foreground/80">{added}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusPill status="active" />
                  {isOwner || isSelf ? (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {isOwner ? "Owner" : "You"}
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => remove(account.email, account.name)}>
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
          {accounts.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">No sign-in accounts yet.</li>
          )}
        </ul>
      </SectionCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="surface-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheck className="size-3.5 text-gold" /> Access follows the package</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Staff can only open modules included in {plan.name}. A role may list payroll or CRM, but those
            pages stay locked until the workspace upgrades to the plan that includes them.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Payroll", "CRM", "AI studio", "WhatsApp"].map((module) => (
              <span
                key={module}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  canModule(module.toLowerCase().replace(" studio", ""))
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {canModule(module.toLowerCase().replace(" studio", "")) ? <Check className="size-2.5" /> : <LockKeyhole className="size-2.5" />}
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><KeyRound className="size-3.5 text-gold" /> Temporary passwords</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            New staff receive the temporary password you set here. Ask them to change it from Profile
            settings after their first sign-in. Staff cannot change the package or invite other staff.
          </p>
          <Link to="/roles" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gold hover:underline">
            Review roles & permissions <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a staff member"
        description={`${seatsLeft} of ${formatLimit(seatLimit)} staff seats available on ${plan.name}.`}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="invite-staff" disabled={busy}>
              <UserPlus className="size-4" /> {busy ? "Creating…" : "Create sign-in"}
            </Button>
          </>
        }
      >
        <form id="invite-staff" onSubmit={invite} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tunde Bello" required />
            </Field>
            <Field label="Work email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tunde@hotel.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Role" hint="Controls which modules this staff member can open.">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Temporary password" hint="At least 6 characters.">
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
            This creates a separate login for {currentTenant.name}. It does not add an HR directory
            profile — use HR & attendance for shifts and payroll records.
          </div>
        </form>
      </Modal>

      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="No staff seats left"
        description={`${plan.name} includes ${formatLimit(seatLimit)} staff seats.`}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUpgradeOpen(false)}>Not now</Button>
            <Link to="/subscription" className={buttonClass("primary")} onClick={() => setUpgradeOpen(false)}>
              <Sparkles className="size-4" /> See upgrade options
            </Link>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
            <span className="font-semibold">{seatsUsed} of {formatLimit(seatLimit)} staff seats</span> are in use.
            Existing staff keep access — remove a login or upgrade to invite more.
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="font-semibold">{targetPlan.name} includes {formatLimit(targetPlan.limits.staff)} staff seats.</p>
            <p className="mt-0.5 text-muted-foreground">
              {usd(targetPlan.monthly)}/month · {usd(targetPlan.yearly)}/year. It also raises rooms to{" "}
              {formatLimit(targetPlan.limits.rooms)} and unlocks {targetPlan.modules.length} modules.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
