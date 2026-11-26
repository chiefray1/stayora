import { useMemo, useState } from "react";
import { CalendarCheck, Clock3, Fingerprint, LogOut, Plus, UserCheck, UserX } from "lucide-react";
import { useStore } from "../lib/store";
import type { AttendanceEntry } from "../lib/types";
import { prettyDate, todayISO } from "../lib/format";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
  StatusPill,
} from "../components/ui";

const methods: AttendanceEntry["method"][] = ["Face", "Fingerprint", "PIN", "GPS", "Manual"];
const statuses: AttendanceEntry["status"][] = ["present", "late", "on-leave", "absent"];

export default function Attendance() {
  const { db, addAttendance, clockOut, logAudit } = useStore();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [form, setForm] = useState({
    staffId: db.staff[0]?.id ?? "",
    clockIn: "08:00",
    method: "Face" as AttendanceEntry["method"],
    status: "present" as AttendanceEntry["status"],
  });

  const selectedStaff = db.staff.find((staff) => staff.id === form.staffId) ?? db.staff[0];
  const entries = db.attendance.filter((entry) => entry.date === date);
  const present = entries.filter((entry) => entry.status === "present").length;
  const late = entries.filter((entry) => entry.status === "late").length;
  const absent = entries.filter((entry) => entry.status === "absent").length;
  const onLeave = entries.filter((entry) => entry.status === "on-leave").length;

  const byDepartment = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    db.staff.forEach((staff) => {
      const current = map.get(staff.department) ?? { present: 0, total: 0 };
      current.total += 1;
      if (entries.some((entry) => entry.staffId === staff.id && entry.status === "present")) current.present += 1;
      map.set(staff.department, current);
    });
    return Array.from(map.entries());
  }, [db.staff, entries]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStaff) return;
    addAttendance({
      staffId: selectedStaff.id,
      name: selectedStaff.name,
      department: selectedStaff.department,
      clockIn: form.clockIn,
      method: form.method,
      status: form.status,
      date,
    });
    logAudit(`Attendance recorded for ${selectedStaff.name}`, "Attendance");
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="People operations"
        title="Attendance & time clock"
        description="Biometric, PIN and GPS clock-ins with late tracking and department coverage."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40 py-1 text-xs" />
            <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Clock in</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Present" value={String(present)} hint={`${entries.length} clocked records`} icon={UserCheck} tone="noir" />
        <StatCard label="Late arrivals" value={String(late)} hint="After shift start" icon={Clock3} />
        <StatCard label="On leave" value={String(onLeave)} hint="Approved absence" icon={CalendarCheck} />
        <StatCard label="Absent" value={String(absent)} hint="No clock-in" icon={UserX} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Attendance register" subtitle={prettyDate(date)} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[720px]">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Department</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-xs font-semibold">{entry.name}</td>
                    <td className="text-xs">{entry.department}</td>
                    <td className="text-xs font-medium">{entry.clockIn}</td>
                    <td className="text-xs">{entry.clockOut ?? "—"}</td>
                    <td className="text-xs">
                      <span className="inline-flex items-center gap-1"><Fingerprint className="size-3 text-muted-foreground" /> {entry.method}</span>
                    </td>
                    <td><StatusPill status={entry.status} /></td>
                    <td className="text-right">
                      {entry.clockOut ? (
                        <span className="text-[11px] text-muted-foreground">Complete</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            clockOut(entry.id);
                            logAudit(`Clock-out recorded for ${entry.name}`, "Attendance");
                          }}
                        >
                          <LogOut className="size-3.5" /> Clock out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">No attendance recorded for this date.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Department coverage" subtitle="Present staff against headcount">
          <div className="space-y-3">
            {byDepartment.map(([department, stats]) => (
              <div key={department}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{department}</span>
                  <span className="text-muted-foreground">{stats.present}/{stats.total}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${stats.total ? Math.round((stats.present / stats.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Face, fingerprint and PIN clock-ins are available on the staff mobile app. GPS is used for off-site teams.
          </div>
        </SectionCard>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record attendance"
        description="Clock a staff member in manually or from a biometric terminal."
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="attendance-form"><UserCheck className="size-4" /> Record clock-in</Button>
          </>
        }
      >
        <form id="attendance-form" onSubmit={submit} className="space-y-4">
          <Field label="Staff member">
            <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              {db.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} · {staff.department}</option>)}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Clock in">
              <Input type="time" value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} required />
            </Field>
            <Field label="Method">
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as AttendanceEntry["method"] })}>
                {methods.map((method) => <option key={method} value={method}>{method}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceEntry["status"] })}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          </div>
          {selectedStaff && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <span className="font-semibold">{selectedStaff.name}</span>
              <span className="text-muted-foreground"> · {selectedStaff.role} · {selectedStaff.shift} shift</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
