import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  Sparkles,
  SprayCan,
  Timer,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { HousekeepingTask } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  cn,
} from "../components/ui";

const columns: { id: HousekeepingTask["status"]; label: string; hint: string }[] = [
  { id: "pending", label: "Pending", hint: "Waiting to start" },
  { id: "in-progress", label: "In progress", hint: "Being serviced" },
  { id: "done", label: "Done", hint: "Awaiting inspection" },
  { id: "inspected", label: "Inspected", hint: "Released to sale" },
];

const nextStatus: Record<HousekeepingTask["status"], HousekeepingTask["status"] | null> = {
  pending: "in-progress",
  "in-progress": "done",
  done: "inspected",
  inspected: null,
};

const nextLabel: Record<HousekeepingTask["status"], string> = {
  pending: "Start",
  "in-progress": "Mark done",
  done: "Inspect",
  inspected: "Released",
};

const priorityTone: Record<string, string> = {
  High: "bg-rose-100 text-rose-700",
  Normal: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

export default function Housekeeping() {
  const { db, addTask, setTaskStatus } = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    roomNumber: db.rooms[0]?.number ?? "101",
    type: "Departure clean" as HousekeepingTask["type"],
    assignee: "Blessing Eze",
    priority: "Normal" as HousekeepingTask["priority"],
  });

  const housekeepers = useMemo(
    () => db.staff.filter((s) => s.department === "Housekeeping").map((s) => s.name),
    [db.staff],
  );

  const counts = {
    pending: db.tasks.filter((t) => t.status === "pending").length,
    "in-progress": db.tasks.filter((t) => t.status === "in-progress").length,
    done: db.tasks.filter((t) => t.status === "done").length,
    inspected: db.tasks.filter((t) => t.status === "inspected").length,
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assignee.trim()) {
      setError("Assign a housekeeper to the task.");
      return;
    }
    addTask({ ...form, status: "pending" });
    setOpen(false);
    setError("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Housekeeping board"
        description="Assign, track and inspect every clean — from departure turnover to turndown service."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New task</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Timer} label="Pending" value={String(counts.pending)} hint="Waiting to start" tone="gold" />
        <Stat icon={SprayCan} label="In progress" value={String(counts["in-progress"])} hint="Being serviced" tone="blue" />
        <Stat icon={ClipboardList} label="Awaiting inspection" value={String(counts.done)} hint="Ready for supervisor" tone="amber" />
        <Stat icon={CheckCircle2} label="Released today" value={String(counts.inspected)} hint="Back on sale" tone="green" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {columns.map((column) => {
          const tasks = db.tasks.filter((t) => t.status === column.id);
          return (
            <div key={column.id} className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold">{column.label}</p>
                  <p className="text-[10px] text-muted-foreground">{column.hint}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {tasks.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div key={task.id} className="surface-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-semibold leading-none">Room {task.roomNumber}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{task.type}</p>
                      </div>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", priorityTone[task.priority])}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users className="size-3" /> {task.assignee}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <StatusPill status={task.status} />
                      {nextStatus[task.status] && (
                        <Button
                          size="sm"
                          variant={task.status === "done" ? "primary" : "soft"}
                          onClick={() => setTaskStatus(task.id, nextStatus[task.status]!)}
                        >
                          {nextLabel[task.status]}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border py-6 text-center text-[11px] text-muted-foreground">
                    Nothing here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Rooms being serviced</h2>
            <p className="text-xs text-muted-foreground">Marked cleaning on the room rack</p>
          </div>
          <Sparkles className="size-5 text-gold" />
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {db.rooms.filter((r) => r.status === "cleaning").map((room) => (
            <div key={room.id} className="rounded-lg border border-violet-200 bg-violet-50/60 p-3">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-semibold">Room {room.number}</p>
                <StatusPill status={room.status} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{room.type} · Floor {room.floor}</p>
            </div>
          ))}
          {db.rooms.filter((r) => r.status === "cleaning").length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-muted-foreground">No rooms are currently being cleaned.</p>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New housekeeping task"
        description="Assign a clean to a housekeeper and track it through to inspection."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-task">Create task</Button>
          </>
        }
      >
        <form id="new-task" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Room">
              <Select value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}>
                {db.rooms.map((r) => (
                  <option key={r.id} value={r.number}>{r.number} · {r.type} · {r.status}</option>
                ))}
              </Select>
            </Field>
            <Field label="Task type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as HousekeepingTask["type"] })}>
                {["Departure clean", "Stayover", "Deep clean", "Inspection", "Turndown", "Arrival prep"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Assign to">
              <Select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                {housekeepers.map((name) => <option key={name} value={name}>{name}</option>)}
                <option value="Housekeeping team">Housekeeping team</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as HousekeepingTask["priority"] })}>
                {["Low", "Normal", "High"].map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Custom assignee" hint="Optional — overrides the selection above.">
            <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
          </Field>
          {error && <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  hint: string;
  tone: "gold" | "blue" | "amber" | "green";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    blue: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className={cn("grid size-10 place-items-center rounded-lg", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
