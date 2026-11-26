import { useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Plus,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { addDays, naira, todayISO } from "../lib/format";
import type { TransportTrip } from "../lib/types";
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

const drivers = ["Femi Adebayo", "Musa Danjuma", "Kunle Bakare"];
const vehicles = ["Toyota Prado · LSD-441-KJA", "Toyota Camry · KJA-882-XY", "Mercedes E-Class · KJA-119-AB"];

export default function Transport() {
  const { db, addTrip, setTripStatus } = useStore();
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    guestName: "",
    pickup: "Murtala Muhammed Airport",
    dropoff: "Stayora Hotel",
    date: today,
    time: "14:00",
    driver: drivers[0],
    vehicle: vehicles[0],
    fare: "25000",
  });

  const todayTrips = db.trips.filter((t) => t.datetime.startsWith(today));
  const scheduled = db.trips.filter((t) => t.status === "scheduled");
  const completed = db.trips.filter((t) => t.status === "completed");
  const revenue = completed.reduce((s, t) => s + t.fare, 0);

  const driversOnDuty = useMemo(
    () => db.staff.filter((s) => s.department === "Transport").map((s) => s.name),
    [db.staff],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName.trim()) return;
    addTrip({
      guestName: form.guestName.trim(),
      pickup: form.pickup,
      dropoff: form.dropoff,
      datetime: `${form.date} ${form.time}`,
      driver: form.driver,
      vehicle: form.vehicle,
      status: "scheduled",
      fare: Number(form.fare) || 0,
    });
    setOpen(false);
    setForm({ ...form, guestName: "", fare: "25000" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Guest services"
        title="Transport"
        description="Airport pickups, city transfers and driver assignments."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Schedule trip</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TripStat label="Trips today" value={String(todayTrips.length)} hint="Scheduled & active" icon={Car} />
        <TripStat label="Scheduled" value={String(scheduled.length)} hint="Upcoming pickups" icon={Clock} tone="amber" />
        <TripStat label="Completed" value={String(completed.length)} hint="All time" icon={CheckCircle2} tone="green" />
        <TripStat label="Revenue" value={naira(revenue)} hint="Completed transfers" icon={Wallet} tone="blue" />
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Trip schedule</h2>
            <p className="text-xs text-muted-foreground">Today and upcoming transfers</p>
          </div>
          <Navigation className="size-5 text-gold" />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[980px]">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Guest</th>
                <th>Route</th>
                <th>Date & time</th>
                <th>Driver / vehicle</th>
                <th>Fare</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="font-mono text-xs font-semibold">{trip.ref}</td>
                  <td className="text-xs font-medium">{trip.guestName}</td>
                  <td>
                    <p className="text-xs">{trip.pickup}</p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="size-2.5" /> {trip.dropoff}</p>
                  </td>
                  <td className="text-xs text-muted-foreground">{trip.datetime}</td>
                  <td>
                    <p className="text-xs">{trip.driver}</p>
                    <p className="text-[10px] text-muted-foreground">{trip.vehicle}</p>
                  </td>
                  <td className="text-xs font-semibold">{naira(trip.fare)}</td>
                  <td><StatusPill status={trip.status} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {trip.status === "scheduled" && (
                        <Button size="sm" variant="soft" onClick={() => setTripStatus(trip.id, "en-route")}>Start</Button>
                      )}
                      {trip.status === "en-route" && (
                        <Button size="sm" variant="outline" onClick={() => setTripStatus(trip.id, "completed")}>Complete</Button>
                      )}
                      {trip.status === "scheduled" && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-rose-50" onClick={() => setTripStatus(trip.id, "cancelled")}>
                          Cancel
                        </Button>
                      )}
                      {(trip.status === "completed" || trip.status === "cancelled") && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{trip.status}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold">Drivers on duty</h3>
          <div className="mt-3 space-y-2">
            {(driversOnDuty.length ? driversOnDuty : drivers).map((driver) => (
              <div key={driver} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-gold">
                  {driver.split(" ").map((p) => p[0]).join("")}
                </span>
                <span className="text-xs font-medium">{driver}</span>
                <span className="ml-auto text-[10px] font-semibold text-emerald-600">Available</span>
              </div>
            ))}
          </div>
        </div>
        <div className="noir-panel p-5">
          <h3 className="text-sm font-semibold text-white">Airport transfer desk</h3>
          <p className="mt-1 text-xs text-noir-muted">
            Meet & greet at Murtala Muhammed International Airport. Flight tracking included for all
            scheduled pickups.
          </p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between border-b border-white/10 pb-2 text-noir-muted">
              <span>Next pickup</span>
              <span className="font-semibold text-white">{db.trips.find((t) => t.status === "scheduled")?.datetime ?? "—"}</span>
            </div>
            <div className="flex justify-between text-noir-muted">
              <span>Fleet size</span>
              <span className="font-semibold text-white">{vehicles.length} vehicles</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule a trip"
        description="Assign a driver and vehicle to a guest transfer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-trip">Schedule trip</Button>
          </>
        }
      >
        <form id="new-trip" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guest name" className="sm:col-span-2">
              <Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} required />
            </Field>
            <Field label="Pickup">
              <Input value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
            </Field>
            <Field label="Drop-off">
              <Input value={form.dropoff} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.date} min={today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Time">
              <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <Field label="Driver">
              <Select value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })}>
                {(driversOnDuty.length ? driversOnDuty : drivers).map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                {vehicles.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Fare (₦)" className="sm:col-span-2">
              <Input type="number" min="0" value={form.fare} onChange={(e) => setForm({ ...form, fare: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TripStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Car;
  tone?: "gold" | "amber" | "green" | "blue";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
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
