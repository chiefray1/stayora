import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  Clock3,
  IdCard,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import type { Staff } from "../lib/types";
import {
  Avatar,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  StatusPill,
  cn,
} from "../components/ui";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { db, updateStaff } = useStore();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const staff = useMemo(() => {
    if (!user) return undefined;
    return (
      db.staff.find((member) => member.email.toLowerCase() === user.email.toLowerCase()) ??
      db.staff.find((member) => member.name.toLowerCase() === user.name.toLowerCase())
    );
  }, [db.staff, user]);

  const profile = {
    name: user?.name ?? staff?.name ?? "Staff member",
    email: user?.email ?? staff?.email ?? "",
    role: user?.role ?? staff?.role ?? "Front desk",
    jobTitle: staff?.role ?? user?.role ?? "Team member",
    department: staff?.department ?? user?.department ?? "Management",
    phone: staff?.phone ?? user?.phone ?? "Not provided",
    shift: staff?.shift ?? user?.shift ?? "Flexible",
    status: staff?.status ?? "active",
    staffId: staff?.id ?? user?.staffId ?? "Unassigned",
  };

  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: staff?.phone ?? user?.phone ?? "",
    department: profile.department,
    role: profile.jobTitle,
    shift: profile.shift as Staff["shift"],
  });

  const openEditor = () => {
    setFormError("");
    setForm({
      name: profile.name,
      email: profile.email,
      phone: staff?.phone ?? user?.phone ?? "",
      department: profile.department,
      role: profile.jobTitle,
      shift: profile.shift as Staff["shift"],
    });
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.email.trim()) return;
    const result = updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone,
      department: form.department,
      shift: form.shift,
      staffId: staff?.id,
    });
    if (!result.ok) {
      setFormError(result.error ?? "Unable to update your profile.");
      return;
    }
    if (staff) {
      updateStaff(staff.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        department: form.department,
        role: form.role,
        shift: form.shift,
      });
    }
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="My account"
        title="Staff profile"
        description="Your directory profile, role and contact details across the property."
        actions={
          <>
            <Link to="/settings">
              <Button variant="outline"><ShieldCheck className="size-4" /> Profile settings</Button>
            </Link>
            <Button onClick={openEditor}><Pencil className="size-4" /> Edit profile</Button>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <div className="surface-card overflow-hidden">
          <div className="relative bg-noir px-6 py-8 text-white">
            <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top_right,var(--color-primary),transparent_55%)]" />
            <div className="relative flex flex-wrap items-center gap-5">
              <Avatar name={profile.name} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold">{profile.name}</h2>
                  <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {profile.role}
                  </span>
                </div>
                <p className="mt-1 text-sm text-noir-muted">{profile.jobTitle} · {profile.department}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-noir-muted">
                  <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> {profile.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> {profile.phone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <ProfileField icon={IdCard} label="Employee ID" value={profile.staffId} />
            <ProfileField icon={Building2} label="Department" value={profile.department} />
            <ProfileField icon={Clock3} label="Shift" value={profile.shift} />
            <ProfileField icon={BadgeCheck} label="Account status" value={profile.status} />
          </div>
        </div>

        <SectionCard title="Account summary" subtitle="Access and responsibilities">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
              <div>
                <p className="text-xs font-semibold">Access level</p>
                <p className="text-[11px] text-muted-foreground">Role-based module access</p>
              </div>
              <StatusPill status={profile.role === "Superadmin" ? "active" : profile.role.toLowerCase()} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
              <div>
                <p className="text-xs font-semibold">Notifications</p>
                <p className="text-[11px] text-muted-foreground">Report and system alerts</p>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Enabled
              </span>
            </div>
            <div className="rounded-lg border border-primary/20 bg-accent px-3 py-3 text-xs text-accent-foreground">
              <p className="font-semibold">Keep your profile current</p>
              <p className="mt-1 text-muted-foreground">
                Update your phone, department or shift so colleagues can reach the right person.
              </p>
            </div>
            <Link to="/settings" className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-xs font-semibold transition hover:border-primary/40 hover:bg-accent/40">
              Change password and notification preferences
              <ShieldCheck className="size-4 text-gold" />
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Reports awaiting review" value={String(db.notifications.filter((n) => n.type === "report" && !n.read && (n.audience === "all" || user?.role === "Superadmin")).length)} note="Unread report notifications" />
        <SummaryCard label="Open maintenance tickets" value={String(db.maintenance.filter((t) => t.status !== "resolved").length)} note="Across the property" />
        <SummaryCard label="Pending housekeeping tasks" value={String(db.tasks.filter((t) => t.status === "pending" || t.status === "in-progress").length)} note="Rooms in the queue" />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit staff profile"
        description="These details appear in the staff directory."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="edit-profile"><UserRound className="size-4" /> Save profile</Button>
          </>
        }
      >
        <form id="edit-profile" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Job title">
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
            </Field>
            <Field label="Work email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {["Front Office", "Housekeeping", "F&B", "Kitchen", "Accounting", "Engineering", "Management", "Transport"].map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </Select>
            </Field>
            <Field label="Shift">
              <Select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as Staff["shift"] })}>
                {["Morning", "Afternoon", "Night", "Flexible"].map((shift) => <option key={shift} value={shift}>{shift}</option>)}
              </Select>
            </Field>
          </div>
          {formError && (
            <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">
              {formError}
            </p>
          )}
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            Changing your work email also updates your sign-in email. Use profile settings to change your password.
          </p>
        </form>
      </Modal>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IdCard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3">
      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-gold"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-semibold capitalize">{value}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-semibold", Number(value) > 0 ? "text-foreground" : "text-muted-foreground")}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
