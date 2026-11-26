import { useState } from "react";
import { Building2, CheckCircle2, Globe2, MapPin, Palette, Plus, RotateCcw, Save, Settings2, Trash2 } from "lucide-react";
import { useTenant, PLAN_LIMITS, totalFloors, totalRooms, type Branch, type BranchType } from "../lib/tenants";
import { TIER_LABEL, usd } from "../lib/plans";
import { BRAND_PRESETS, DEFAULT_BRAND_COLOR, normalizeBrandColor } from "../lib/theme";
import { useStore } from "../lib/store";
import { Button, Field, Input, Modal, PageHeader, SectionCard, Select, StatCard, StatusPill, cn } from "../components/ui";

const branchTypes: BranchType[] = ["Hotel", "Resort", "Suites", "Apartments", "Transit hotel"];
const currencies = ["NGN", "USD", "GBP", "EUR", "KES", "GHS"] as const;

export default function Properties() {
  const { currentTenant, updateTenant, addBranch, updateBranch, removeBranch } = useTenant();
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [branchError, setBranchError] = useState("");
  const [config, setConfig] = useState({
    name: currentTenant.name,
    legalName: currentTenant.legalName,
    phone: currentTenant.phone,
    city: currentTenant.city,
    country: currentTenant.country,
    currency: currentTenant.currency,
    timezone: currentTenant.timezone,
    taxRate: currentTenant.taxRate,
    serviceCharge: currentTenant.serviceCharge,
  });
  const [branch, setBranch] = useState({
    name: "",
    type: "Hotel" as BranchType,
    city: currentTenant.city,
    country: currentTenant.country,
    address: "",
    rooms: 24,
    floors: 3,
    status: "open" as Branch["status"],
  });

  const limits = PLAN_LIMITS[currentTenant.plan];
  const rooms = totalRooms(currentTenant);

  const saveConfig = (event: React.FormEvent) => {
    event.preventDefault();
    updateTenant(currentTenant.id, {
      name: config.name.trim(),
      legalName: config.legalName.trim(),
      phone: config.phone.trim(),
      city: config.city.trim(),
      country: config.country.trim(),
      currency: config.currency,
      timezone: config.timezone.trim(),
      taxRate: Number(config.taxRate),
      serviceCharge: Number(config.serviceCharge),
    });
    setNotice("Hotel configuration saved for this workspace.");
  };

  const submitBranch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!branch.name.trim()) return;
    const result = addBranch(currentTenant.id, {
      name: branch.name.trim(),
      type: branch.type,
      city: branch.city.trim(),
      country: branch.country.trim(),
      address: branch.address.trim(),
      rooms: Number(branch.rooms),
      floors: Number(branch.floors),
      status: branch.status,
    });
    if (!result.ok) {
      setBranchError(result.message);
      return;
    }
    setBranchError("");
    setOpen(false);
    setBranch({ ...branch, name: "", address: "" });
    setNotice("Property added. Rooms and floors are included in the workspace totals.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Properties & hotel configuration"
        description="Multi-property structure, currencies, taxes and the operating details that drive every module."
        actions={<Button onClick={() => { setBranchError(""); setOpen(true); }}><Plus className="size-4" /> Add property</Button>}
      />

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-4" /> {notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Properties" value={String(currentTenant.branches.length)} hint={`${TIER_LABEL[currentTenant.plan]} plan`} icon={Building2} tone="noir" />
        <StatCard label="Keys on rack" value={String(db.rooms.length)} hint={`Portfolio total ${rooms}`} icon={MapPin} />
        <StatCard label="Floors" value={String(totalFloors(currentTenant))} hint="Across all properties" icon={Globe2} />
        <StatCard label="Currency" value={currentTenant.currency} hint={currentTenant.timezone} icon={Settings2} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {currentTenant.branches.map((item) => (
          <article key={item.id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.type}</p>
                <h3 className="mt-0.5 text-base font-semibold">{item.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="size-3" /> {item.city}, {item.country}</p>
              </div>
              <StatusPill status={item.status} />
            </div>
            <p className="mt-2 min-h-8 text-[11px] text-muted-foreground">{item.address || "Address not set"}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Keys</p>
                <p className="text-xs font-semibold">{item.rooms}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Floors</p>
                <p className="text-xs font-semibold">{item.floors}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                onClick={() => updateBranch(currentTenant.id, item.id, { status: item.status === "open" ? "renovation" : "open" })}
                className="text-[10px] font-semibold text-gold hover:underline"
              >
                {item.status === "open" ? "Mark renovation" : "Reopen property"}
              </button>
              <button
                onClick={() => removeBranch(currentTenant.id, item.id)}
                className="flex items-center gap-1 text-[10px] font-semibold text-destructive hover:underline"
              >
                <Trash2 className="size-3" /> Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Hotel configuration" subtitle="Used by billing, invoices and the booking engine">
          <form onSubmit={saveConfig} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Trading name">
                <Input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} required />
              </Field>
              <Field label="Legal entity">
                <Input value={config.legalName} onChange={(e) => setConfig({ ...config, legalName: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={config.phone} onChange={(e) => setConfig({ ...config, phone: e.target.value })} />
              </Field>
              <Field label="City">
                <Input value={config.city} onChange={(e) => setConfig({ ...config, city: e.target.value })} />
              </Field>
              <Field label="Country">
                <Input value={config.country} onChange={(e) => setConfig({ ...config, country: e.target.value })} />
              </Field>
              <Field label="Timezone">
                <Input value={config.timezone} onChange={(e) => setConfig({ ...config, timezone: e.target.value })} />
              </Field>
              <Field label="Currency">
                <Select value={config.currency} onChange={(e) => setConfig({ ...config, currency: e.target.value as typeof config.currency })}>
                  {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="VAT %">
                  <Input type="number" step="0.1" value={config.taxRate} onChange={(e) => setConfig({ ...config, taxRate: Number(e.target.value) })} />
                </Field>
                <Field label="Service %">
                  <Input type="number" step="0.1" value={config.serviceCharge} onChange={(e) => setConfig({ ...config, serviceCharge: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit"><Save className="size-4" /> Save configuration</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Plan & limits" subtitle={`${TIER_LABEL[currentTenant.plan]} subscription`}>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly price</p>
              <p className="font-display text-2xl font-semibold">{usd(limits.price)}</p>
            </div>
            {[
              { label: "Keys on rack", used: db.rooms.length, limit: limits.rooms },
              { label: "Properties", used: currentTenant.branches.length, limit: limits.branches },
              { label: "Staff seats", used: db.staff.length, limit: limits.staff },
            ].map((row) => {
              const pct = Math.min(100, Math.round((row.used / Math.max(1, row.limit)) * 100));
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground">{row.used} / {row.limit}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", pct > 85 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
              Upgrade plans, add seats or change status from{" "}
              <a href="/subscription" className="font-semibold underline">Subscription & billing</a>.
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Workspace appearance"
          subtitle="Your hotels' colour flows through buttons, charts, badges and highlight panels"
        >
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Palette className="size-3.5" /> Brand presets
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BRAND_PRESETS.map((preset) => {
                  const selected =
                    (normalizeBrandColor(currentTenant.brandColor) ?? DEFAULT_BRAND_COLOR) === preset.hex;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateTenant(currentTenant.id, { brandColor: preset.hex })}
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition",
                        selected
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <span
                        className="size-4 rounded-full border border-black/10"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-muted-foreground">Custom colour</span>
                  <input
                    type="color"
                    aria-label="Custom brand colour"
                    value={normalizeBrandColor(currentTenant.brandColor) ?? DEFAULT_BRAND_COLOR}
                    onChange={(event) => updateTenant(currentTenant.id, { brandColor: event.target.value })}
                    className="h-8 w-12 cursor-pointer rounded-md border border-border bg-card p-0.5"
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateTenant(currentTenant.id, { brandColor: undefined })}
                >
                  <RotateCcw className="size-3.5" /> Reset to Stayora gold
                </Button>
              </div>
              <p className="mt-3 max-w-lg text-[11px] text-muted-foreground">
                Colours are contrast-adjusted so the interface stays readable. The choice is saved per
                workspace and also applies to the public booking page.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preview</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Primary action</span>
                <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">Accent panel</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" /> Live status
                <span className="ml-2 font-semibold text-gold">Highlight</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a property"
        description="Every property shares the workspace plan but keeps its own rooms and floors."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="branch-form"><Building2 className="size-4" /> Add property</Button>
          </>
        }
      >
        <form id="branch-form" onSubmit={submitBranch} className="space-y-4">
          {branchError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{branchError}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Property name">
              <Input value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} placeholder="e.g. Lekki Beach Resort" required />
            </Field>
            <Field label="Type">
              <Select value={branch.type} onChange={(e) => setBranch({ ...branch, type: e.target.value as BranchType })}>
                {branchTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
            <Field label="City">
              <Input value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} required />
            </Field>
            <Field label="Country">
              <Input value={branch.country} onChange={(e) => setBranch({ ...branch, country: e.target.value })} required />
            </Field>
            <Field label="Rooms">
              <Input type="number" min={1} value={branch.rooms} onChange={(e) => setBranch({ ...branch, rooms: Number(e.target.value) })} required />
            </Field>
            <Field label="Floors">
              <Input type="number" min={1} value={branch.floors} onChange={(e) => setBranch({ ...branch, floors: Number(e.target.value) })} required />
            </Field>
          </div>
          <Field label="Address">
            <Input value={branch.address} onChange={(e) => setBranch({ ...branch, address: e.target.value })} placeholder="Street, district" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
