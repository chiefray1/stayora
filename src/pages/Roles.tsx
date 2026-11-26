import { useState } from "react";
import {
  Check,
  Lock,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { Role } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  cn,
} from "../components/ui";

const modules: { id: string; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "reservations", label: "Reservations" },
  { id: "rooms", label: "Rooms & halls" },
  { id: "guests", label: "Guests" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "maintenance", label: "Maintenance" },
  { id: "crm", label: "CRM & marketing" },
  { id: "reports", label: "Reports" },
  { id: "payments", label: "Payments" },
  { id: "accounting", label: "Accounting" },
  { id: "pos", label: "Restaurant & bar" },
  { id: "inventory", label: "Inventory" },
  { id: "procurement", label: "Procurement" },
  { id: "hr", label: "HR & attendance" },
  { id: "payroll", label: "Payroll" },
  { id: "transport", label: "Transport" },
  { id: "whatsapp", label: "WhatsApp agent" },
  { id: "roles", label: "Roles & permissions" },
  { id: "kitchen", label: "Kitchen display" },
  { id: "laundry", label: "Laundry" },
  { id: "loyalty", label: "Loyalty" },
  { id: "spa", label: "Spa & gym" },
  { id: "events", label: "Events & venues" },
  { id: "billing", label: "Billing & invoices" },
  { id: "documents", label: "Documents" },
  { id: "attendance", label: "Attendance" },
  { id: "integrations", label: "Integrations & API" },
  { id: "security", label: "Security & audit" },
  { id: "ai", label: "AI studio" },
  { id: "properties", label: "Properties & config" },
  { id: "tenants", label: "Tenant console" },
];

export default function Roles() {
  const { db, addRole } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: ["dashboard"] as string[],
  });

  const togglePermission = (id: string) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter((p) => p !== id)
        : [...prev.permissions, id],
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addRole({ name: form.name.trim(), description: form.description || "Custom role", permissions: form.permissions });
    setOpen(false);
    setForm({ name: "", description: "", permissions: ["dashboard"] });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Roles & permissions"
        description="Control who can see and do what across every department."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New role</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {db.roles.map((role) => (
          <div key={role.id} className="surface-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-gold">
                <ShieldCheck className="size-5" />
              </span>
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Users className="size-3" /> {role.users}
              </span>
            </div>
            <h3 className="mt-3 text-base font-semibold">{role.name}</h3>
            <p className="mt-1 min-h-9 text-xs text-muted-foreground">{role.description}</p>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span>{role.permissions.length} of {modules.length} modules</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={cn("size-1.5 rounded-full", i < Math.ceil(role.permissions.length / 4) ? "bg-primary" : "bg-border")} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Permission matrix</h2>
            <p className="text-xs text-muted-foreground">Module access by role</p>
          </div>
          <Lock className="size-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th>Module</th>
                {db.roles.map((role) => (
                  <th key={role.id} className="text-center">{role.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id}>
                  <td className="text-xs font-medium">{module.label}</td>
                  {db.roles.map((role) => (
                    <td key={role.id} className="text-center">
                      {role.permissions.includes(module.id) ? (
                        <span className="mx-auto grid size-5 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a role"
        description="Pick the modules this role can access."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-role"><UserCog className="size-4" /> Create role</Button>
          </>
        }
      >
        <form id="new-role" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Night manager" required />
            </Field>
            <Field label="Base on existing role">
              <Select defaultValue="" onChange={(e) => {
                const role = db.roles.find((r) => r.id === e.target.value);
                if (role) setForm((prev) => ({ ...prev, permissions: role.permissions }));
              }}>
                <option value="">Start from scratch</option>
                {db.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this role is responsible for…" />
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold text-foreground/80">Module access</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {modules.map((module) => (
                <label
                  key={module.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                    form.permissions.includes(module.id) ? "border-primary/40 bg-accent/60" : "border-border bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(module.id)}
                    onChange={() => togglePermission(module.id)}
                    className="size-3.5 accent-[oklch(62%_0.096_78)]"
                  />
                  {module.label}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
