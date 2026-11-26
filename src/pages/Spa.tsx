import { useState } from "react";
import { CalendarHeart, Clock3, Dumbbell, Flower2, Plus, Sparkles, Waves } from "lucide-react";
import { useStore } from "../lib/store";
import type { SpaStatus } from "../lib/types";
import { naira, prettyDate, todayISO } from "../lib/format";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  SectionCard,
  StatCard,
  StatusPill,
  Textarea,
} from "../components/ui";

const therapists = ["Amaka Ibe", "Tara Bello", "Ify Nnamdi", "Coach Deji", "Zara Musa"];
const statusFlow: SpaStatus[] = ["booked", "confirmed", "in-progress", "completed"];

export default function Spa() {
  const { db, addSpaAppointment, setSpaAppointmentStatus, logAudit } = useStore();
  const [open, setOpen] = useState(false);
  const firstService = db.spaServices[0];
  const [form, setForm] = useState({
    guestName: "",
    roomNumber: "",
    serviceName: firstService?.name ?? "Deep tissue massage",
    therapist: therapists[0],
    date: todayISO(),
    time: "10:00",
    notes: "",
  });

  const today = todayISO();
  const todays = db.spaAppointments.filter((appointment) => appointment.date === today);
  const completed = db.spaAppointments.filter((appointment) => appointment.status === "completed");
  const revenue = completed.reduce((sum, appointment) => sum + appointment.price, 0);
  const upcoming = db.spaAppointments.filter((appointment) => appointment.date >= today && appointment.status !== "cancelled");
  const selected = db.spaServices.find((service) => service.name === form.serviceName) ?? firstService;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.guestName.trim() || !selected) return;
    addSpaAppointment({
      guestName: form.guestName.trim(),
      roomNumber: form.roomNumber.trim() || undefined,
      serviceName: selected.name,
      therapist: form.therapist,
      date: form.date,
      time: form.time,
      duration: selected.duration,
      price: selected.price,
      notes: form.notes.trim() || undefined,
    });
    logAudit(`Spa appointment booked for ${form.guestName.trim()}`, "Spa & leisure");
    setOpen(false);
    setForm({ ...form, guestName: "", roomNumber: "", notes: "" });
  };

  const nextStatus = (status: SpaStatus) => {
    const index = statusFlow.indexOf(status);
    return statusFlow[Math.min(index + 1, statusFlow.length - 1)];
  };

  return (
    <div>
      <PageHeader
        eyebrow="Wellness"
        title="Spa & gym"
        description="Manage treatments, therapists and fitness sessions for in-house and day guests."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New appointment</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Today's appointments" value={String(todays.length)} hint={`${upcoming.length} upcoming`} icon={CalendarHeart} tone="noir" />
        <StatCard label="Completed treatments" value={String(completed.length)} hint="This period" icon={Sparkles} />
        <StatCard label="Treatment revenue" value={naira(revenue)} hint="Completed only" icon={Waves} />
        <StatCard label="Gym sessions" value={String(db.spaAppointments.filter((a) => a.serviceName.toLowerCase().includes("training")).length)} hint="Personal training" icon={Dumbbell} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.65fr_1fr]">
        <SectionCard title="Appointment book" subtitle="Live schedule across treatment rooms and the gym" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Guest</th>
                  <th>Treatment</th>
                  <th>Therapist</th>
                  <th>When</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {db.spaAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="text-xs font-semibold">{appointment.ref}</td>
                    <td>
                      <p className="text-xs font-medium">{appointment.guestName}</p>
                      <p className="text-[10px] text-muted-foreground">{appointment.roomNumber ? `Room ${appointment.roomNumber}` : "Day guest"}</p>
                    </td>
                    <td className="text-xs">
                      {appointment.serviceName}
                      <span className="block text-[10px] text-muted-foreground">{appointment.duration} min</span>
                    </td>
                    <td className="text-xs">{appointment.therapist}</td>
                    <td className="text-xs">
                      {prettyDate(appointment.date)}
                      <span className="block text-[10px] text-muted-foreground">{appointment.time}</span>
                    </td>
                    <td className="text-xs font-semibold">{naira(appointment.price)}</td>
                    <td><StatusPill status={appointment.status} /></td>
                    <td className="text-right">
                      {appointment.status === "completed" || appointment.status === "cancelled" ? (
                        <span className="text-[11px] text-muted-foreground">Closed</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const next = nextStatus(appointment.status);
                              setSpaAppointmentStatus(appointment.id, next);
                              logAudit(`Spa ${appointment.ref} marked ${next}`, "Spa & leisure");
                            }}
                          >
                            {nextStatus(appointment.status) === "in-progress" ? "Start" : nextStatus(appointment.status) === "completed" ? "Complete" : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSpaAppointmentStatus(appointment.id, "cancelled");
                              logAudit(`Spa ${appointment.ref} cancelled`, "Spa & leisure");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {db.spaAppointments.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No appointments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Treatment menu" subtitle="Duration and price per service">
          <div className="space-y-2">
            {db.spaServices.map((service) => (
              <div key={service.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-gold">
                  {service.category === "Gym" ? <Dumbbell className="size-4" /> : service.category === "Facial" ? <Sparkles className="size-4" /> : <Flower2 className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{service.name}</p>
                  <p className="text-[10px] text-muted-foreground">{service.category} · {service.duration} min</p>
                </div>
                <span className="text-xs font-semibold">{naira(service.price)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
            <Clock3 className="size-3.5 shrink-0 text-gold" />
            Treatment rooms open 08:00–22:00 daily. Gym access is 24/7 for in-house guests.
          </div>
        </SectionCard>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Book a spa appointment"
        description="Reserve a treatment room or gym session."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="spa-form"><CalendarHeart className="size-4" /> Book appointment</Button>
          </>
        }
      >
        <form id="spa-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guest name">
              <Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="e.g. Sofia Marchetti" required />
            </Field>
            <Field label="Room number">
              <Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Treatment">
              <Select value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })}>
                {db.spaServices.map((service) => <option key={service.id} value={service.name}>{service.name} · {naira(service.price)}</option>)}
              </Select>
            </Field>
            <Field label="Therapist">
              <Select value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value })}>
                {therapists.map((therapist) => <option key={therapist} value={therapist}>{therapist}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
            <Field label="Time">
              <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            </Field>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="font-semibold">{selected?.duration ?? 0} minutes</span>
            <span className="text-muted-foreground"> · {naira(selected?.price ?? 0)} per session</span>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Pressure preferences, allergies, special occasion…" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
