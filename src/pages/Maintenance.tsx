import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import type { MaintenanceTicket } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
  cn,
} from "../components/ui";

const categories: MaintenanceTicket["category"][] = ["Electrical", "Plumbing", "HVAC", "Furniture", "IT", "Other"];
const priorities: MaintenanceTicket["priority"][] = ["Low", "Normal", "High", "Urgent"];

export default function Maintenance() {
  const { user } = useAuth();
  const { db, addMaintenanceTicket, setMaintenanceStatus } = useStore();
  const [status, setStatus] = useState<"all" | MaintenanceTicket["status"]>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    roomNumber: "117",
    issue: "",
    category: "HVAC" as MaintenanceTicket["category"],
    priority: "Normal" as MaintenanceTicket["priority"],
    assignee: "Emeka Obi",
    reportedBy: user?.name ?? "Front desk",
  });

  const filtered = useMemo(() => {
    let list = db.maintenance;
    if (status !== "all") list = list.filter((ticket) => ticket.status === status);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (ticket) =>
          ticket.ref.toLowerCase().includes(query) ||
          ticket.roomNumber.toLowerCase().includes(query) ||
          ticket.issue.toLowerCase().includes(query) ||
          ticket.assignee.toLowerCase().includes(query),
      );
    }
    return list;
  }, [db.maintenance, search, status]);

  const openCount = db.maintenance.filter((ticket) => ticket.status === "open").length;
  const progressCount = db.maintenance.filter((ticket) => ticket.status === "in-progress").length;
  const urgentCount = db.maintenance.filter((ticket) => ticket.priority === "Urgent" && ticket.status !== "resolved").length;
  const resolvedCount = db.maintenance.filter((ticket) => ticket.status === "resolved").length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.issue.trim()) return;
    addMaintenanceTicket({
      roomNumber: form.roomNumber,
      issue: form.issue.trim(),
      category: form.category,
      priority: form.priority,
      assignee: form.assignee,
      reportedBy: form.reportedBy,
    });
    setOpen(false);
    setForm({ ...form, issue: "" });
  };

  const advance = (ticket: MaintenanceTicket) => {
    if (ticket.status === "open") setMaintenanceStatus(ticket.id, "in-progress");
    else if (ticket.status === "in-progress") setMaintenanceStatus(ticket.id, "resolved");
    else setMaintenanceStatus(ticket.id, "open");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Maintenance"
        description="Log faults, assign engineers and track repairs across guest rooms and public areas."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New ticket</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MaintenanceStat label="Open tickets" value={String(openCount)} hint="Awaiting assignment" icon={Wrench} tone="amber" />
        <MaintenanceStat label="In progress" value={String(progressCount)} hint="Engineer on the job" icon={Clock3} tone="blue" />
        <MaintenanceStat label="Urgent" value={String(urgentCount)} hint="Needs immediate action" icon={AlertTriangle} tone="red" />
        <MaintenanceStat label="Resolved" value={String(resolvedCount)} hint="Closed this period" icon={CheckCircle2} tone="green" />
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "open", "in-progress", "resolved"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatus(filter)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition",
                  status === filter ? "border-primary bg-accent text-accent-foreground" : "border-border bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {filter === "all" ? "All tickets" : filter.replace("-", " ")}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets…" className="w-full pl-8 sm:w-52" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base min-w-[900px]">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Location</th>
                <th>Issue</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="text-xs font-semibold">{ticket.ref}</td>
                  <td className="text-xs text-muted-foreground">{ticket.roomNumber}</td>
                  <td className="max-w-[220px] text-xs">{ticket.issue}</td>
                  <td className="text-xs text-muted-foreground">{ticket.category}</td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        ticket.priority === "Urgent"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : ticket.priority === "High"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="text-xs text-muted-foreground">{ticket.assignee}</td>
                  <td><StatusPill status={ticket.status} /></td>
                  <td>
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => advance(ticket)}>
                        {ticket.status === "open" ? "Start" : ticket.status === "in-progress" ? "Resolve" : "Reopen"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No maintenance tickets match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log maintenance ticket"
        description="Report a fault and assign it to an engineer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-ticket"><Wrench className="size-4" /> Create ticket</Button>
          </>
        }
      >
        <form id="new-ticket" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Location">
              <Select value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}>
                <option value="Lobby">Lobby</option>
                <option value="Pool area">Pool area</option>
                <option value="Restaurant">Restaurant</option>
                {db.rooms.map((room) => <option key={room.id} value={room.number}>Room {room.number}</option>)}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MaintenanceTicket["category"] })}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as MaintenanceTicket["priority"] })}>
                {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </Select>
            </Field>
            <Field label="Assignee">
              <Select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                {db.staff.filter((member) => member.department === "Engineering" || member.role.toLowerCase().includes("maintenance")).map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Issue description">
            <Textarea value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="Describe the fault and any access notes…" required />
          </Field>
          <Field label="Reported by">
            <Input value={form.reportedBy} onChange={(e) => setForm({ ...form, reportedBy: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function MaintenanceStat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wrench;
  tone: "amber" | "blue" | "red" | "green";
}) {
  const tones = {
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
    red: "bg-rose-100 text-rose-700",
    green: "bg-emerald-100 text-emerald-700",
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
