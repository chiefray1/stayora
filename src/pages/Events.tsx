import { useState } from "react";
import { CalendarDays, MapPin, PartyPopper, Plus, Users, Wallet } from "lucide-react";
import { useStore } from "../lib/store";
import type { VenueSetup } from "../lib/types";
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
  cn,
} from "../components/ui";

const setups: VenueSetup[] = ["Banquet", "Theatre", "Classroom", "Cocktail", "Boardroom", "U-shape"];

export default function Events() {
  const { db, createVenueBooking, setVenueBookingStatus, logAudit } = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    venueId: db.venues[0]?.id ?? "",
    customerName: "",
    email: "",
    phone: "",
    date: todayISO(),
    startTime: "09:00",
    endTime: "17:00",
    guests: 80,
    setup: "Banquet" as VenueSetup,
    deposit: 250_000,
    paymentMethod: "Transfer" as "Cash" | "POS" | "Transfer" | "Card",
    notes: "",
  });

  const upcoming = db.venueBookings.filter((booking) => booking.date >= todayISO() && booking.status !== "cancelled");
  const confirmed = db.venueBookings.filter((booking) => booking.status === "confirmed");
  const pipeline = upcoming.reduce((sum, booking) => sum + booking.total, 0);
  const deposits = db.venueBookings.reduce((sum, booking) => sum + booking.deposit, 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = createVenueBooking({
      venueId: form.venueId,
      customerName: form.customerName,
      email: form.email,
      phone: form.phone,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      guests: Number(form.guests),
      setup: form.setup,
      deposit: Number(form.deposit),
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    });
    if (!result.ok) {
      setError(result.error ?? "Unable to create this booking.");
      return;
    }
    logAudit(`Venue booking ${result.booking?.ref} created for ${form.customerName}`, "Events");
    setOpen(false);
    setForm({ ...form, customerName: "", email: "", phone: "", notes: "" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Meetings & events"
        title="Conference & events"
        description="Sell halls, ballrooms and meeting rooms with live availability, setups and deposits."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New event booking</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Upcoming events" value={String(upcoming.length)} hint={`${confirmed.length} confirmed`} icon={CalendarDays} tone="noir" />
        <StatCard label="Event pipeline" value={naira(pipeline)} hint="Confirmed and pending" icon={Wallet} />
        <StatCard label="Deposits collected" value={naira(deposits)} hint="All bookings" icon={PartyPopper} />
        <StatCard label="Venues" value={String(db.venues.length)} hint="Halls, rooms & outdoor" icon={MapPin} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {db.venues.map((venue) => (
          <article key={venue.id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{venue.type}</p>
                <h3 className="mt-0.5 text-base font-semibold">{venue.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="size-3" /> {venue.location}</p>
              </div>
              <StatusPill status={venue.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Theatre</p>
                <p className="text-xs font-semibold">{venue.theatreCapacity}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Banquet</p>
                <p className="text-xs font-semibold">{venue.banquetCapacity}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Day rate</p>
                <p className="text-xs font-semibold">{naira(venue.rate)}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {venue.amenities.slice(0, 4).map((amenity) => (
                <span key={amenity} className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium text-accent-foreground">{amenity}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <SectionCard className="mt-4" title="Event bookings" subtitle="Deposits, setups and fulfilment status" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[900px]">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Customer</th>
                <th>Venue</th>
                <th>Date & time</th>
                <th>Guests</th>
                <th>Setup</th>
                <th>Value</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {db.venueBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="text-xs font-semibold">{booking.ref}</td>
                  <td>
                    <p className="text-xs font-medium">{booking.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{booking.phone}</p>
                  </td>
                  <td className="text-xs">{booking.venueName}</td>
                  <td className="text-xs">
                    {prettyDate(booking.date)}
                    <span className="block text-[10px] text-muted-foreground">{booking.startTime}–{booking.endTime}</span>
                  </td>
                  <td className="text-xs">{booking.guests}</td>
                  <td className="text-xs">{booking.setup}</td>
                  <td className="text-xs font-semibold">
                    {naira(booking.total)}
                    <span className="block text-[10px] font-normal text-muted-foreground">{naira(booking.deposit)} deposit</span>
                  </td>
                  <td><StatusPill status={booking.status} /></td>
                  <td className="text-right">
                    {booking.status === "confirmed" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVenueBookingStatus(booking.id, "completed");
                            logAudit(`Event ${booking.ref} completed`, "Events");
                          }}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setVenueBookingStatus(booking.id, "cancelled");
                            logAudit(`Event ${booking.ref} cancelled`, "Events");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
              {db.venueBookings.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">No event bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New event booking"
        description="Check availability and take a deposit."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="event-form"><PartyPopper className="size-4" /> Confirm booking</Button>
          </>
        }
      >
        <form id="event-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Venue">
              <Select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} required>
                {db.venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.type}</option>)}
              </Select>
            </Field>
            <Field label="Customer / company">
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="e.g. Oracle Energy" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="events@company.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" required />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
            <Field label="Guests">
              <Input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} required />
            </Field>
            <Field label="Start time">
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </Field>
            <Field label="End time">
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </Field>
            <Field label="Setup">
              <Select value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value as VenueSetup })}>
                {setups.map((setup) => <option key={setup} value={setup}>{setup}</option>)}
              </Select>
            </Field>
            <Field label="Deposit (₦)">
              <Input type="number" min={0} value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} />
            </Field>
            <Field label="Payment method">
              <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}>
                {["Transfer", "POS", "Card", "Cash"].map((method) => <option key={method} value={method}>{method}</option>)}
              </Select>
            </Field>
          </div>
          {error && <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="AV requirements, catering, room block…" />
          </Field>
          <p className={cn("text-[11px]", "text-muted-foreground")}>
            <Users className="mr-1 inline size-3" /> Capacity is validated against the selected setup before the booking is confirmed.
          </p>
        </form>
      </Modal>
    </div>
  );
}
