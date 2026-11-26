import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Flower2,
  MapPin,
  Shirt,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useStore, type BookingInput } from "../lib/store";
import { addDays, naira, prettyDate, todayISO } from "../lib/format";
import { ROOM_TYPES } from "../lib/seed";
import { BOOKING_SOURCES } from "../lib/channels";
import { availableRoomsOfType, quoteBooking, venueCapacity, venueIsFree, venueQuote } from "../lib/booking";
import type {
  Reservation,
  RoomTypeName,
  ServiceBooking,
  ServiceType,
  VenueBooking,
  VenueBookingStatus,
  VenueSetup,
} from "../lib/types";
import {
  Button,
  Field,
  Input,
  PageHeader,
  SectionCard,
  Select,
  StatusPill,
  Tabs,
  Textarea,
  buttonClass,
  cn,
} from "../components/ui";

type DeskTab = "rooms" | "venues" | "services";

const SETUPS: VenueSetup[] = ["Banquet", "Theatre", "Classroom", "Cocktail", "Boardroom", "U-shape"];

const SERVICE_MENU: { service: ServiceType; price: number; blurb: string; icon: LucideIcon }[] = [
  { service: "Airport pickup", price: 25_000, blurb: "Private car · meet & greet at arrivals", icon: Car },
  { service: "City transfer", price: 18_000, blurb: "Point-to-point within Lagos", icon: Car },
  { service: "Laundry", price: 8_500, blurb: "Same-day express · up to 6 items", icon: Shirt },
  { service: "Spa treatment", price: 20_000, blurb: "60-minute treatment at the spa", icon: Flower2 },
  { service: "Restaurant table", price: 0, blurb: "Reserve a table in the restaurant", icon: UtensilsCrossed },
  { service: "Other", price: 0, blurb: "Any other guest request", icon: Sparkles },
];

const PAYMENT_METHODS = ["Cash", "POS", "Transfer", "Card"] as const;

export default function BookingDesk() {
  const {
    db,
    createBooking,
    createVenueBooking,
    setVenueBookingStatus,
    createServiceBooking,
    setServiceBookingStatus,
  } = useStore();
  const today = todayISO();
  const [tab, setTab] = useState<DeskTab>("rooms");
  const [notice, setNotice] = useState("");

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 7000);
  };

  const walkInsToday = db.reservations.filter(
    (r) => r.checkIn === today && r.source === "Walk-in" && r.status !== "cancelled",
  );
  const hallsThisWeek = db.venueBookings.filter(
    (b) => b.date >= today && b.date <= addDays(today, 7) && b.status !== "cancelled",
  );
  const servicesToday = db.serviceBookings.filter((b) => b.date === today && b.status !== "cancelled");
  const collectedToday =
    db.venueBookings.filter((b) => b.createdAt === today).reduce((s, b) => s + b.deposit, 0) +
    db.serviceBookings.filter((b) => b.createdAt === today).reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Front office"
        title="Booking desk"
        description="Create walk-in, phone and corporate bookings for rooms, halls and guest services — availability is checked live."
        actions={
          <>
            <Link to="/reservations" className={buttonClass("outline")}>
              <CalendarDays className="size-4" /> Reservations
            </Link>
            <Link to="/rooms" className={buttonClass("outline")}>
              <BedDouble className="size-4" /> Room rack
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DeskStat label="Walk-ins today" value={String(walkInsToday.length)} hint="Rooms sold at the desk" icon={BedDouble} />
        <DeskStat label="Halls this week" value={String(hallsThisWeek.length)} hint="Confirmed + pending events" icon={Building2} tone="gold" />
        <DeskStat label="Service requests" value={String(servicesToday.length)} hint="Due today" icon={Sparkles} tone="blue" />
        <DeskStat label="Deposits collected" value={naira(collectedToday)} hint="Venue + service payments today" icon={Wallet} tone="green" />
      </div>

      {notice && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="size-4" /> {notice}
        </div>
      )}

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "rooms", label: "Room booking", count: walkInsToday.length },
            { id: "venues", label: "Halls & venues", count: hallsThisWeek.length },
            { id: "services", label: "Guest services", count: servicesToday.length },
          ]}
        />
      </div>

      {tab === "rooms" && <RoomsTab onDone={flash} />}
      {tab === "venues" && (
        <VenuesTab
          onDone={flash}
          onCreate={createVenueBooking}
          onStatus={setVenueBookingStatus}
          bookings={db.venueBookings}
          venues={db.venues}
        />
      )}
      {tab === "services" && (
        <ServicesTab
          onDone={flash}
          onCreate={createServiceBooking}
          onStatus={setServiceBookingStatus}
          bookings={db.serviceBookings}
        />
      )}
    </div>
  );
}

function RoomsTab({ onDone }: { onDone: (message: string) => void }) {
  const { db, createBooking } = useStore();
  const today = todayISO();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    country: "Nigeria",
    checkIn: today,
    checkOut: addDays(today, 1),
    roomType: "Deluxe" as RoomTypeName,
    roomId: "",
    adults: 2,
    children: 0,
    source: "Walk-in" as Reservation["source"],
    paymentMethod: "pay-on-arrival" as BookingInput["paymentMethod"],
    notes: "",
  });

  const availability = useMemo(
    () =>
      ROOM_TYPES.map((type) => ({
        ...type,
        rooms: availableRoomsOfType(type.type, form.checkIn, form.checkOut, db.rooms, db.reservations),
      })),
    [form.checkIn, form.checkOut, db.rooms, db.reservations],
  );

  const selected = availability.find((a) => a.type === form.roomType);
  const availableRooms = selected?.rooms ?? [];
  const nights =
    form.checkIn && form.checkOut
      ? Math.max(0, Math.round((Date.parse(form.checkOut) - Date.parse(form.checkIn)) / 86_400_000))
      : 0;
  const stayQuote = selected && nights > 0 ? quoteBooking(form.roomType, form.checkIn, form.checkOut, []) : null;
  const quote = stayQuote?.total ?? 0;

  useEffect(() => {
    if (form.roomId && !availableRooms.some((r) => r.id === form.roomId)) {
      setForm((prev) => ({ ...prev, roomId: "" }));
    }
  }, [availableRooms, form.roomId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = createBooking({
      guest: { name: form.name, email: form.email, phone: form.phone, country: form.country },
      roomType: form.roomType,
      roomId: form.roomId || undefined,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adults: form.adults,
      children: form.children,
      addOns: [],
      source: form.source,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not create the booking.");
      return;
    }
    onDone(
      `${result.reservation?.ref} created for ${result.reservation?.guestName} · ${result.reservation?.roomType} · Room ${result.reservation?.roomNumber}`,
    );
    setForm((prev) => ({ ...prev, name: "", phone: "", email: "", notes: "" }));
  };

  const todaysWalkIns = db.reservations.filter(
    (r) => r.checkIn === today && r.source === "Walk-in" && r.status !== "cancelled",
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="New room booking" subtitle="Walk-in, phone or corporate · live availability">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Guest name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" required />
              </Field>
              <Field label="Email" hint="Optional for walk-ins">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="guest@email.com" />
              </Field>
              <Field label="Country">
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Check-in">
                <Input type="date" value={form.checkIn} min={today} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
              </Field>
              <Field label="Check-out">
                <Input type="date" value={form.checkOut} min={addDays(form.checkIn, 1)} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
              </Field>
              <Field label="Adults">
                <Select value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Children">
                <Select value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}>
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Room type" hint={selected ? `${availableRooms.length} available for these dates` : undefined}>
                <Select
                  value={form.roomType}
                  onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomTypeName, roomId: "" })}
                >
                  {availability.map((type) => (
                    <option key={type.type} value={type.type} disabled={type.rooms.length === 0}>
                      {type.type} — {naira(type.rate)}/night + taxes · {type.rooms.length} free
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assign room">
                <Select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                  <option value="">Auto-assign best available</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>Room {room.number} · Floor {room.floor}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Booking source">
                <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Reservation["source"] })}>
                  {BOOKING_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Payment">
                <Select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as BookingInput["paymentMethod"] })}
                >
                  <option value="pay-on-arrival">Pay on arrival</option>
                  <option value="cash">Cash — paid now</option>
                  <option value="card">Card / Paystack — paid now</option>
                  <option value="transfer">Bank transfer — paid now</option>
                </Select>
              </Field>
            </div>

            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Arrival time, preferences, special requests…" />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stay total · incl. taxes</p>
                <p className="font-display text-xl font-semibold">{naira(quote)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {stayQuote
                  ? `${nights} night${nights === 1 ? "" : "s"} · ${naira(stayQuote.roomTotal)} room + ${naira(stayQuote.vat + stayQuote.serviceCharge)} taxes · ${form.roomId ? "room selected" : "auto-assign"}`
                  : "Choose valid dates"}
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={nights < 1 || availableRooms.length === 0}>
              Create room booking <ArrowRight className="size-4" />
            </Button>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Live availability" subtitle={`${prettyDate(form.checkIn)} → ${prettyDate(form.checkOut)}`}>
            <div className="space-y-2">
              {availability.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setForm({ ...form, roomType: type.type, roomId: "" })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition",
                    form.roomType === type.type ? "border-primary bg-accent/60" : "border-border hover:border-primary/40",
                  )}
                >
                  <span>
                    <span className="block text-xs font-semibold">{type.type}</span>
                    <span className="block text-[10px] text-muted-foreground">{naira(type.rate)} / night · excl. taxes</span>
                  </span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    type.rooms.length === 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                  )}>
                    {type.rooms.length === 0 ? "Sold out" : `${type.rooms.length} free`}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Today's walk-ins" subtitle="Booked at the desk" bodyClassName="p-0">
            <div className="divide-y divide-border">
              {todaysWalkIns.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{r.guestName}</p>
                    <p className="text-[10px] text-muted-foreground">{r.ref} · Room {r.roomNumber ?? "—"}</p>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
              {todaysWalkIns.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">No walk-in rooms booked yet today.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function VenuesTab({
  onDone,
  onCreate,
  onStatus,
  bookings,
  venues,
}: {
  onDone: (message: string) => void;
  onCreate: ReturnType<typeof useStore>["createVenueBooking"];
  onStatus: (id: string, status: VenueBookingStatus) => void;
  bookings: VenueBooking[];
  venues: ReturnType<typeof useStore>["db"]["venues"];
}) {
  const today = todayISO();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    venueId: venues[0]?.id ?? "",
    customerName: "",
    email: "",
    phone: "",
    date: today,
    startTime: "09:00",
    endTime: "17:00",
    guests: 20,
    setup: "Banquet" as VenueSetup,
    deposit: 0,
    paymentMethod: "Cash" as (typeof PAYMENT_METHODS)[number],
    notes: "",
  });

  const venue = venues.find((v) => v.id === form.venueId) ?? venues[0];
  const quote = venue ? venueQuote(venue, form.startTime, form.endTime) : null;
  const free = venue ? venueIsFree(venue.id, form.date, form.startTime, form.endTime, bookings) : false;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = onCreate({
      venueId: form.venueId,
      customerName: form.customerName,
      email: form.email,
      phone: form.phone,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      guests: form.guests,
      setup: form.setup,
      deposit: form.deposit,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not create the venue booking.");
      return;
    }
    onDone(
      `${result.booking?.ref} confirmed · ${result.booking?.venueName} · ${prettyDate(result.booking?.date)} ${result.booking?.startTime}–${result.booking?.endTime}`,
    );
    setForm((prev) => ({ ...prev, customerName: "", email: "", phone: "", deposit: 0, notes: "" }));
  };

  const upcoming = [...bookings]
    .filter((b) => b.date >= today)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Book a hall or venue" subtitle="Events, conferences, private dining and outdoor functions">
          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Venue"
              hint={venue ? `${venue.location} · Theatre ${venue.theatreCapacity.toLocaleString("en-NG")} · Banquet ${venue.banquetCapacity.toLocaleString("en-NG")}` : undefined}
            >
              <Select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {naira(v.rate)} before discount
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name">
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Full name or company" required />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" required />
              </Field>
              <Field label="Email" hint="Optional">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="events@company.com" />
              </Field>
              <Field label="Event date">
                <Input type="date" value={form.date} min={today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Start time">
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </Field>
              <Field label="End time">
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </Field>
              <Field label="Guests" hint={venue ? `${venueCapacity(venue, form.setup)} max for ${form.setup.toLowerCase()} setup` : undefined}>
                <Input
                  type="number"
                  min={1}
                  max={venue ? venueCapacity(venue, form.setup) : undefined}
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                />
              </Field>
              <Field label="Room setup">
                <Select value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value as VenueSetup })}>
                  {SETUPS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Deposit paid (₦)" hint={quote ? `Balance ${naira(quote.amount - Math.min(form.deposit, quote.amount))}` : undefined}>
                <Input type="number" min={0} value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} />
              </Field>
              <Field label="Deposit method">
                <Select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as (typeof PAYMENT_METHODS)[number] })}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
            </div>

            {quote && (
              <div className="flex flex-wrap gap-2">
                {[0, 25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setForm({ ...form, deposit: Math.round((quote.amount * pct) / 100) })}
                    className="rounded-full border border-border bg-white px-3 py-1 text-[10px] font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground"
                  >
                    {pct === 0 ? "No deposit" : `${pct}% deposit`}
                  </button>
                ))}
              </div>
            )}

            <Field label="Event notes">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Setup instructions, catering, AV, arrival notes…" />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{quote?.label ?? "Rate"}</p>
                <p className="font-display text-xl font-semibold">{quote ? naira(quote.amount) : "—"}</p>
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                free ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
              )}>
                {free ? "Slot free" : "Clashes with a booking"}
              </span>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!free || !venue || !form.startTime || !form.endTime || form.endTime <= form.startTime}
            >
              Confirm venue booking <ArrowRight className="size-4" />
            </Button>
          </form>
        </SectionCard>

        <div className="space-y-3">
          {venues.map((v) => {
            const dayBookings = bookings
              .filter((b) => b.venueId === v.id && b.date === form.date && b.status !== "cancelled")
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const isFree = venueIsFree(v.id, form.date, form.startTime, form.endTime, bookings);
            return (
              <div
                key={v.id}
                className={cn(
                  "surface-card p-4 transition",
                  form.venueId === v.id ? "ring-1 ring-primary/40" : "",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{v.name}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="size-3" /> {v.location}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    isFree ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                  )}>
                    {isFree ? "Slot free" : "Slot booked"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" /> Theatre {v.theatreCapacity.toLocaleString("en-NG")} · Banquet {v.banquetCapacity.toLocaleString("en-NG")}</span>
                  <span className="flex items-center gap-1"><Wallet className="size-3" /> {naira(v.rate)} before discount</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" /> {v.type}</span>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {dayBookings.length === 0
                    ? "No bookings on this date."
                    : dayBookings.map((b) => `${b.startTime}–${b.endTime} ${b.customerName}`).join(" · ")}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {v.amenities.slice(0, 2).map((a) => (
                      <span key={a} className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">{a}</span>
                    ))}
                  </div>
                  <Button size="sm" variant={form.venueId === v.id ? "soft" : "outline"} onClick={() => setForm({ ...form, venueId: v.id })}>
                    {form.venueId === v.id ? "Selected" : "Select"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <VenueTable bookings={upcoming} onStatus={onStatus} />
    </div>
  );
}

function VenueTable({ bookings, onStatus }: { bookings: VenueBooking[]; onStatus: (id: string, status: VenueBookingStatus) => void }) {
  return (
    <SectionCard title="Upcoming hall bookings" subtitle="Manage confirms, completions and cancellations" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="table-base min-w-[980px]">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Venue</th>
              <th>Customer</th>
              <th>Date & time</th>
              <th>Guests</th>
              <th>Setup</th>
              <th className="text-right">Deposit</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="font-mono text-xs font-semibold">{b.ref}</td>
                <td className="text-xs">{b.venueName}</td>
                <td className="text-xs">
                  <span className="block font-medium">{b.customerName}</span>
                  <span className="block text-[10px] text-muted-foreground">{b.phone}</span>
                </td>
                <td className="text-xs text-muted-foreground">{prettyDate(b.date)} · {b.startTime}–{b.endTime}</td>
                <td className="text-xs">{b.guests}</td>
                <td className="text-xs text-muted-foreground">{b.setup}</td>
                <td className="text-right text-xs font-semibold">{naira(b.deposit)}</td>
                <td><StatusPill status={b.status} /></td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    {b.status === "pending" && (
                      <Button size="sm" variant="soft" onClick={() => onStatus(b.id, "confirmed")}>Confirm</Button>
                    )}
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="soft" onClick={() => onStatus(b.id, "completed")}>Complete</Button>
                    )}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm(`Cancel ${b.ref} for ${b.customerName}?`)) onStatus(b.id, "cancelled");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No upcoming hall bookings.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function ServicesTab({
  onDone,
  onCreate,
  onStatus,
  bookings,
}: {
  onDone: (message: string) => void;
  onCreate: ReturnType<typeof useStore>["createServiceBooking"];
  onStatus: (id: string, status: ServiceBooking["status"]) => void;
  bookings: ServiceBooking[];
}) {
  const today = todayISO();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    service: "Airport pickup" as ServiceType,
    customerName: "",
    phone: "",
    roomNumber: "",
    date: today,
    time: "10:00",
    details: "",
    amount: 25_000,
    paymentMethod: "Cash" as (typeof PAYMENT_METHODS)[number],
  });

  const chooseService = (service: ServiceType, price: number) =>
    setForm((prev) => ({ ...prev, service, amount: price }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = onCreate({
      service: form.service,
      customerName: form.customerName,
      phone: form.phone,
      roomNumber: form.roomNumber,
      date: form.date,
      time: form.time,
      details: form.details,
      amount: form.amount,
      paymentMethod: form.paymentMethod,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not create the service booking.");
      return;
    }
    onDone(`${result.booking?.ref} confirmed · ${result.booking?.service} · ${result.booking?.customerName}`);
    setForm((prev) => ({ ...prev, customerName: "", phone: "", roomNumber: "", details: "" }));
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Book a guest service" subtitle="Airport transfers, laundry, spa, dining and bespoke requests">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Service">
                <Select
                  value={form.service}
                  onChange={(e) => {
                    const menu = SERVICE_MENU.find((m) => m.service === e.target.value);
                    chooseService(e.target.value as ServiceType, menu?.price ?? form.amount);
                  }}
                >
                  {SERVICE_MENU.map((m) => <option key={m.service} value={m.service}>{m.service}</option>)}
                </Select>
              </Field>
              <Field label="Amount (₦)" hint="Set to 0 for complimentary requests">
                <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </Field>
              <Field label="Customer name">
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Full name" required />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" required />
              </Field>
              <Field label="Room number" hint="Optional">
                <Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="e.g. 204" />
              </Field>
              <Field label="Payment method">
                <Select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as (typeof PAYMENT_METHODS)[number] })}
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={form.date} min={today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Time">
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </Field>
            </div>

            <Field label="Details">
              <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Flight number, pickup time, treatment, dietary notes…" />
            </Field>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full">
              Create service booking <ArrowRight className="size-4" />
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Service menu" subtitle="Tap a service to prefill the booking">
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_MENU.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.service}
                  onClick={() => chooseService(item.service, item.price)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    form.service === item.service ? "border-primary bg-accent/60" : "border-border bg-white hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-gold"><Icon className="size-4" /></span>
                    <span className="text-xs font-semibold">{item.price > 0 ? naira(item.price) : "Free"}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold">{item.service}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.blurb}</p>
                </button>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <ServiceTable bookings={bookings} onStatus={onStatus} />
    </div>
  );
}

function ServiceTable({ bookings, onStatus }: { bookings: ServiceBooking[]; onStatus: (id: string, status: ServiceBooking["status"]) => void }) {
  return (
    <SectionCard title="Recent service bookings" subtitle="All guest service requests" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="table-base min-w-[920px]">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Service</th>
              <th>Customer</th>
              <th>Room</th>
              <th>Date & time</th>
              <th>Details</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="font-mono text-xs font-semibold">{b.ref}</td>
                <td className="text-xs font-medium">{b.service}</td>
                <td className="text-xs">
                  <span className="block">{b.customerName}</span>
                  <span className="block text-[10px] text-muted-foreground">{b.phone}</span>
                </td>
                <td className="text-xs text-muted-foreground">{b.roomNumber ?? "—"}</td>
                <td className="text-xs text-muted-foreground">{prettyDate(b.date)} · {b.time}</td>
                <td className="max-w-[220px] truncate text-xs text-muted-foreground">{b.details ?? "—"}</td>
                <td className="text-right text-xs font-semibold">{naira(b.amount)}</td>
                <td><StatusPill status={b.status} /></td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    {b.status === "pending" && (
                      <Button size="sm" variant="soft" onClick={() => onStatus(b.id, "confirmed")}>Confirm</Button>
                    )}
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="soft" onClick={() => onStatus(b.id, "completed")}>Complete</Button>
                    )}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm(`Cancel ${b.ref}?`)) onStatus(b.id, "cancelled");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No service bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function DeskStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "default" | "gold" | "green" | "blue";
}) {
  const tones = {
    default: "bg-muted text-foreground",
    gold: "bg-primary/10 text-gold",
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
