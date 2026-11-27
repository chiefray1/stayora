import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Building2, CheckCircle2, Globe2, Plus, ShieldCheck, Users, Wallet } from "lucide-react";
import { useTenant, PLAN_LIMITS, totalRooms, type TenantPlan } from "../lib/tenants";
import { TIER_LABEL, usd } from "../lib/plans";
import { useAuth } from "../lib/auth";
import { Button, Field, Input, Modal, PageHeader, SectionCard, Select, StatCard, StatusPill } from "../components/ui";

const plans: TenantPlan[] = ["free", "starter", "professional"];

export default function Tenants() {
  const { tenants, currentTenant, createTenant, switchTenant, setTenantStatus, updateTenant } = useTenant();
  const { provisionAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    phone: "",
    city: "",
    country: "Nigeria",
    plan: "starter" as TenantPlan,
    rooms: 40,
    currency: "NGN" as "NGN" | "USD" | "GBP" | "EUR" | "KES" | "GHS",
  });

  const active = tenants.filter((tenant) => tenant.status === "active").length;
  const trial = tenants.filter((tenant) => tenant.status === "trial").length;
  const mrr = tenants
    .filter((tenant) => tenant.status !== "suspended")
    .reduce((sum, tenant) => sum + PLAN_LIMITS[tenant.plan].price, 0);
  const totalKeys = useMemo(() => tenants.reduce((sum, tenant) => sum + totalRooms(tenant), 0), [tenants]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.name.trim() || !form.ownerName.trim() || !form.ownerEmail.trim() || !form.city.trim()) {
      setError("Complete the workspace name, owner and city.");
      return;
    }
    setBusy(true);
    try {
      const tenant = createTenant({
        name: form.name,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        phone: form.phone,
        city: form.city,
        country: form.country,
        plan: form.plan,
        rooms: Number(form.rooms),
        currency: form.currency,
      });
      const result = await provisionAccount({
        email: form.ownerEmail,
        name: form.ownerName,
        password: "stayora",
        role: "Superadmin",
        tenantId: tenant.id,
      });
      if (!result.ok) {
        setError(result.error ?? "Workspace created, but the owner account could not be provisioned.");
        return;
      }
      setOpen(false);
      setNotice(`Workspace “${tenant.name}” is ready. Owner sign-in: ${form.ownerEmail.trim().toLowerCase()} / stayora`);
      setForm({ ...form, name: "", ownerName: "", ownerEmail: "", phone: "", city: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Platform administration"
        title="Tenant console"
        description="Onboard hotel groups, manage plans and switch between isolated workspaces."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <ShieldCheck className="size-4" /> Admin console
            </Link>
            <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New workspace</Button>
          </div>
        }
      />

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Workspaces" value={String(tenants.length)} hint={`${active} active · ${trial} trial`} icon={Building2} tone="noir" />
        <StatCard label="Monthly recurring" value={`₦${(mrr / 1_000_000).toFixed(1)}M`} hint="Excluding suspended" icon={Wallet} />
        <StatCard label="Keys under management" value={totalKeys.toLocaleString("en-NG")} hint="Across all tenants" icon={Globe2} />
        <StatCard label="Isolation" value="100%" hint="Per-tenant storage & sessions" icon={ShieldCheck} />
      </div>

      <SectionCard className="mt-4" title="Workspaces" subtitle="Every tenant has its own rooms, guests, staff, invoices and audit trail" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[980px]">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Branches</th>
                <th>Keys</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Trial ends</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className={tenant.id === currentTenant.id ? "bg-accent/30" : undefined}>
                  <td>
                    <p className="text-xs font-semibold">{tenant.name}</p>
                    <p className="text-[10px] text-muted-foreground">{tenant.slug} · {tenant.currency}</p>
                  </td>
                  <td>
                    <p className="text-xs font-medium">{tenant.ownerName}</p>
                    <p className="text-[10px] text-muted-foreground">{tenant.ownerEmail}</p>
                  </td>
                  <td className="text-xs">{tenant.city}, {tenant.country}</td>
                  <td className="text-xs">{tenant.branches.length}</td>
                  <td className="text-xs">{totalRooms(tenant)}</td>
                  <td>
                    <Select
                      value={tenant.plan}
                      onChange={(event) => updateTenant(tenant.id, { plan: event.target.value as TenantPlan })}
                      className="h-7 w-28 py-0.5 text-[11px]"
                    >
                      {plans.map((plan) => <option key={plan} value={plan}>{TIER_LABEL[plan]}</option>)}
                    </Select>
                  </td>
                  <td><StatusPill status={tenant.status} /></td>
                  <td className="text-xs text-muted-foreground">{new Date(tenant.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={tenant.id === currentTenant.id}
                        onClick={() => switchTenant(tenant.id)}
                      >
                        <ArrowRightLeft className="size-3.5" /> {tenant.id === currentTenant.id ? "Current" : "Switch"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTenantStatus(tenant.id, tenant.status === "suspended" ? "active" : "suspended")}
                      >
                        {tenant.status === "suspended" ? "Activate" : "Suspend"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          return (
            <div key={plan} className="surface-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{TIER_LABEL[plan]}</h3>
                <span className="text-xs font-semibold text-gold">{usd(limits.price)}/mo</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-1.5"><Users className="size-3" /> {limits.staff} staff seats</li>
                <li className="flex items-center gap-1.5"><Building2 className="size-3" /> {limits.branches} branch{limits.branches === 1 ? "" : "es"}</li>
                <li className="flex items-center gap-1.5"><Globe2 className="size-3" /> {limits.rooms} keys</li>
              </ul>
            </div>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a workspace"
        description="Provision an isolated tenant with its own demo data, owner account and trial."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="tenant-form" disabled={busy}>
              <Building2 className="size-4" /> {busy ? "Provisioning…" : "Create workspace"}
            </Button>
          </>
        }
      >
        <form id="tenant-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Workspace / hotel group">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Azura Collection" required />
            </Field>
            <Field label="Owner name">
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="e.g. Chioma Nwankwo" required />
            </Field>
            <Field label="Owner email" hint="This becomes the Superadmin sign-in.">
              <Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} placeholder="owner@hotel.com" required />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lagos" required />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label="Plan">
              <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as TenantPlan })}>
                {plans.map((plan) => <option key={plan} value={plan}>{TIER_LABEL[plan]} · {usd(PLAN_LIMITS[plan].price)}/mo</option>)}
              </Select>
            </Field>
            <Field label="Keys at launch">
              <Input type="number" min={12} value={form.rooms} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} />
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as typeof form.currency })}>
                {["NGN", "USD", "GBP", "EUR", "KES", "GHS"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </Select>
            </Field>
          </div>
          {error && <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
          <div className="rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
            The owner signs in with the email above and the temporary password <span className="font-semibold">stayora</span>. All data is isolated to this workspace.
          </div>
        </form>
      </Modal>
    </div>
  );
}
