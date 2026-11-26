import { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock,
  Plus,
  Search,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { Staff } from "../lib/types";
import {
  Avatar,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  cn,
} from "../components/ui";

export default function Hr() {
  const { db, addStaff, setStaffStatus } = useStore();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    role: "",
    department: "Front Office",
    email: "",
    phone: "",
    shift: "Morning" as Staff["shift"],
  });

  const departments = useMemo(() => Array.from(new Set(db.staff.map((s) => s.department))), [db.staff]);

  const filtered = useMemo(() => {
    let list = db.staff;
    if (dept !== "all") list = list.filter((s) => s.department === dept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [db.staff, dept, search]);

  const active = db.staff.filter((s) => s.status === "active").length;
  const onLeave = db.staff.filter((s) => s.status === "on-leave").length;
  const morning = db.staff.filter((s) => s.shift === "Morning").length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) return;
    const result = addStaff({
      ...form,
      email: form.email || `${form.name.toLowerCase().replace(/\s+/g, ".")}@stayora.ng`,
      status: "active",
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    setOpen(false);
    setForm({ name: "", role: "", department: "Front Office", email: "", phone: "", shift: "Morning" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="HR & attendance"
        description="Staff directory, departments, shifts and attendance at a glance."
        actions={<Button onClick={() => { setError(""); setOpen(true); }}><Plus className="size-4" /> Add staff</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HrStat label="Team size" value={String(db.staff.length)} hint={`${departments.length} departments`} icon={Users} />
        <HrStat label="Active" value={String(active)} hint="On duty roster" icon={UserCheck} tone="green" />
        <HrStat label="On leave" value={String(onLeave)} hint="Approved leave" icon={CalendarClock} tone="amber" />
        <HrStat label="Morning shift" value={String(morning)} hint="Starts 07:00" icon={Clock} tone="blue" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_2fr]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Attendance today</h2>
            <p className="text-xs text-muted-foreground">Clocked in by department</p>
          </div>
          <div className="space-y-3 p-5">
            {departments.map((department) => {
              const total = db.staff.filter((s) => s.department === department).length;
              const present = db.staff.filter((s) => s.department === department && s.status === "active").length;
              return (
                <div key={department}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{department}</span>
                    <span className="font-semibold">{present}/{total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (present / total) * 100 : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {["all", ...departments].map((d) => (
                <button
                  key={d}
                  onClick={() => setDept(d)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    dept === d ? "border-primary bg-accent text-accent-foreground" : "border-border bg-white text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d === "all" ? "All departments" : d}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" className="w-full pl-8 sm:w-48" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[700px]">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Department</th>
                  <th>Shift</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size="sm" />
                        <div>
                          <p className="text-xs font-semibold">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">{s.department}</td>
                    <td className="text-xs text-muted-foreground">{s.shift}</td>
                    <td>
                      <p className="text-[11px]">{s.email}</p>
                      <p className="text-[10px] text-muted-foreground">{s.phone}</p>
                    </td>
                    <td><StatusPill status={s.status} /></td>
                    <td>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStaffStatus(s.id, s.status === "on-leave" ? "active" : "on-leave")}
                        >
                          {s.status === "on-leave" ? "Mark active" : "Set leave"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No staff match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add staff member"
        description="Create a profile for a new team member."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-staff"><UserCog className="size-4" /> Add staff</Button>
          </>
        }
      >
        <form id="new-staff" onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Role">
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Front Desk Agent" required />
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {["Front Office", "Housekeeping", "F&B", "Kitchen", "Accounting", "Engineering", "Management", "Transport"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Shift">
              <Select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as Staff["shift"] })}>
                {["Morning", "Afternoon", "Night", "Flexible"].map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Auto-generated if blank" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function HrStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone?: "gold" | "green" | "amber" | "blue";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
