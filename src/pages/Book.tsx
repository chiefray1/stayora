import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Landmark,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { ADD_ONS, ROOM_TYPES, roomTypeByName } from "../lib/seed";
import { availableRoomsOfType, quoteBooking } from "../lib/booking";
import { addDays, naira, nightsLabel, prettyDate, todayISO } from "../lib/format";
import { useStore } from "../lib/store";
import { useTenant } from "../lib/tenants";
import type { Reservation, RoomTypeName } from "../lib/types";
import { Button, Field, Input, Select, Textarea, buttonClass, cn } from "../components/ui";

const steps = [
  { id: 1, label: "Stay", hint: "Dates & guests" },
  { id: 2, label: "Room", hint: "Choose your room" },
  { id: 3, label: "Details", hint: "Guest information" },
  { id: 4, label: "Payment", hint: "Confirm & pay" },
];

const today = todayISO();

export default function Book() {
  const { db, createBooking } = useStore();
  const { currentTenant } = useTenant();
  const [step, setStep] = useState(1);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDays(today, 2));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomType, setRoomType] = useState<RoomTypeName>("Deluxe");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "", country: "Nigeria" });
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"pay-on-arrival" | "card" | "transfer">("pay-on-arrival");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Reservation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (checkIn < today) setCheckIn(today);
    if (checkOut <= checkIn) setCheckOut(addDays(checkIn, 1));
  }, [checkIn, checkOut]);

  const validDates = checkOut > checkIn && checkIn >= today;
  const quote = useMemo(
    () => quoteBooking(roomType, checkIn, checkOut, addOns),
    [roomType, checkIn, checkOut, addOns],
  );

  const availability = useMemo(
    () =>
      ROOM_TYPES.map((type) => ({
        ...type,
        count: validDates
          ? availableRoomsOfType(type.type, checkIn, checkOut, db.rooms, db.reservations).length
          : 0,
      })),
    [validDates, checkIn, checkOut, db.rooms, db.reservations],
  );

  const selectedAvailability = availability.find((a) => a.type === roomType)?.count ?? 0;
  const selectedType = roomTypeByName(roomType);

  const toggleAddOn = (id: string) =>
    setAddOns((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const next = () => {
    setError("");
    if (step === 1) {
      if (!validDates) {
        setError("Please choose a departure date after your arrival date.");
        return;
      }
      if (checkIn < today) {
        setError("Arrival date cannot be in the past.");
        return;
      }
      if (adults + children > 8) {
        setError("For groups larger than 8, please contact our reservations team.");
        return;
      }
    }
    if (step === 2 && selectedAvailability === 0) {
      setError("That room type is sold out for your dates. Please choose another room.");
      return;
    }
    if (step === 3) {
      if (!guest.name.trim() || !guest.email.trim() || !guest.phone.trim()) {
        setError("Please complete your name, email and phone number.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (guest.phone.replace(/\D/g, "").length < 7) {
        setError("Please enter a valid phone number.");
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const confirm = () => {
    setError("");
    if (!terms) {
      setError("Please accept the booking and cancellation policy to continue.");
      return;
    }
    setSubmitting(true);
    const result = createBooking({
      guest,
      roomType,
      checkIn,
      checkOut,
      adults,
      children,
      addOns,
      source: "Direct",
      paymentMethod: payment,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setConfirmed(result.reservation ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setConfirmed(null);
    setStep(1);
    setGuest({ name: "", email: "", phone: "", country: "Nigeria" });
    setAddOns([]);
    setNotes("");
    setPayment("pay-on-arrival");
    setTerms(false);
    setError("");
  };

  const whatsappHref = confirmed
    ? `https://wa.me/2348055350960?text=${encodeURIComponent(
        `Hello Ada, I have just booked a ${confirmed.roomType} (${confirmed.ref}) from ${prettyDate(
          confirmed.checkIn,
        )} to ${prettyDate(confirmed.checkOut)}. I'd like to confirm my stay.`,
      )}`
    : "https://wa.me/2348055350960?text=Hello%20Ada%2C%20I%20would%20like%20to%20book%20a%20room%20at%20Stayora%20Hotel.";

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="print-area animate-fade-up surface-card overflow-hidden">
            <div className="noir-panel rounded-none border-0 px-6 py-8 text-center sm:px-10">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-7" />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                Booking confirmed
              </p>
              <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
                We look forward to welcoming you
              </h1>
              <p className="mt-2 text-sm text-noir-muted">
                A confirmation email has been sent to {confirmed.email}
              </p>
              <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-bold tracking-wide text-primary">
                {confirmed.ref}
              </div>
            </div>

            <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Guest</p>
                <p className="mt-1.5 font-semibold">{confirmed.guestName}</p>
                <p className="text-sm text-muted-foreground">{confirmed.email}</p>
                <p className="text-sm text-muted-foreground">{confirmed.phone}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Room</p>
                <p className="mt-1.5 font-semibold">{confirmed.roomType} · Room {confirmed.roomNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedType.bed} · {selectedType.size}</p>
                <p className="text-sm text-muted-foreground">{confirmed.adults} adult{confirmed.adults === 1 ? "" : "s"}{confirmed.children ? ` · ${confirmed.children} child${confirmed.children === 1 ? "" : "ren"}` : ""}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Check-in</p>
                <p className="mt-1 font-semibold">{prettyDate(confirmed.checkIn)}</p>
                <p className="text-xs text-muted-foreground">From 14:00</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Check-out</p>
                <p className="mt-1 font-semibold">{prettyDate(confirmed.checkOut)}</p>
                <p className="text-xs text-muted-foreground">By 12:00 · {nightsLabel(confirmed.nights)}</p>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold">Total for your stay</p>
                    <p className="text-xs text-muted-foreground">
                      {confirmed.paymentStatus === "paid"
                        ? `Paid by ${payment === "card" ? "card" : "bank transfer"}`
                        : "Pay at the hotel on arrival"}
                    </p>
                  </div>
                  <p className="font-display text-3xl font-semibold">{naira(confirmed.total)}</p>
                </div>
                {confirmed.addOns.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {confirmed.addOns.map((id) => {
                      const addOn = ADD_ONS.find((a) => a.id === id);
                      return addOn ? <li key={id}>· {addOn.name}</li> : null;
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="size-4" /> Print confirmation
                </Button>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonClass("outline")}>
                  <MessageCircle className="size-4" /> WhatsApp us
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={reset}>Book another stay</Button>
                <Link to="/" className={buttonClass("dark")}>
                  Back to home <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="no-print mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" /> Free cancellation up to 48 hours before arrival.</p>
            <p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-gold" /> Front desk: {currentTenant.phone || "0805 535 0960"}, 24 hours.</p>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" /> {currentTenant.name}, {currentTenant.city} · {currentTenant.branches[0]?.name ?? "Main Branch"}.</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print"><PublicHeader /></div>

      <section className="no-print relative isolate overflow-hidden">
        <img src="/assets/stayora-slide-1.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.45),rgba(0,0,0,0.68))]" />
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">Reservations</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-5xl">Book your stay at {currentTenant.name}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">
            Live availability, instant confirmation and the best available rate — guaranteed.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/80">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> No booking fees</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Free cancellation up to 48h</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Pay online or at the hotel</span>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-10">
        <div>
          <div className="mb-5 flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5">
            {steps.map((s, i) => (
              <div key={s.id} className="flex flex-1 items-center">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition sm:px-3",
                    s.id === step && "bg-accent",
                    s.id < step && "hover:bg-muted",
                    s.id > step && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      s.id < step
                        ? "bg-success text-white"
                        : s.id === step
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.id < step ? <Check className="size-3.5" /> : s.id}
                  </span>
                  <span className="hidden sm:block">
                    <span className={cn("block text-xs font-semibold", s.id === step ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{s.hint}</span>
                  </span>
                </button>
                {i < steps.length - 1 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />}
              </div>
            ))}
          </div>

          <div className="surface-card p-5 sm:p-7">
            {step === 1 && (
              <div className="animate-fade-up">
                <h2 className="font-display text-2xl font-semibold">When are you arriving?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rates are per room, per night, in Nigerian Naira, excluding 7.5% VAT and 10% service charge.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Check-in">
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={checkIn}
                        min={today}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </Field>
                  <Field label="Check-out">
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={checkOut}
                        min={addDays(checkIn, 1)}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "Tonight", in: 0, out: 1 },
                    { label: "This weekend", in: 3, out: 5 },
                    { label: "Next week", in: 7, out: 9 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setCheckIn(addDays(today, preset.in));
                        setCheckOut(addDays(today, preset.out));
                      }}
                      className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Adults">
                    <Select value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n} adult{n === 1 ? "" : "s"}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Children">
                    <Select value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                      {[0, 1, 2, 3].map((n) => (
                        <option key={n} value={n}>{n} child{n === 1 ? "" : "ren"}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Check-in from 14:00</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Check-out by 12:00</span>
                  <span className="flex items-center gap-1.5"><Users className="size-3.5 text-success" /> Children under 5 stay free</span>
                </div>

                {error && <ErrorNote message={error} />}

                <div className="mt-6 flex justify-end">
                  <Button size="lg" onClick={next} disabled={!validDates}>
                    Choose a room <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-up">
                <h2 className="font-display text-2xl font-semibold">Choose your room</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {prettyDate(checkIn)} → {prettyDate(checkOut)} · {nightsLabel(quote.nights)} ·{" "}
                  {adults + children} guest{adults + children === 1 ? "" : "s"}
                </p>

                <div className="mt-6 space-y-3">
                  {availability.map((type) => {
                    const selected = roomType === type.type;
                    const soldOut = type.count === 0;
                    return (
                      <button
                        key={type.type}
                        onClick={() => !soldOut && setRoomType(type.type)}
                        disabled={soldOut}
                        className={cn(
                          "group w-full rounded-xl border p-4 text-left transition sm:p-5",
                          selected
                            ? "border-primary bg-accent/60 ring-1 ring-primary/30"
                            : soldOut
                              ? "cursor-not-allowed border-border bg-muted/40 opacity-70"
                              : "border-border bg-white hover:border-primary/50 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <span className={cn(
                            "grid size-11 shrink-0 place-items-center rounded-lg",
                            selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-gold",
                          )}>
                            <BedDouble className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold">{type.type}</h3>
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                soldOut
                                  ? "bg-rose-100 text-rose-700"
                                  : type.count <= 3
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700",
                              )}>
                                {soldOut ? "Sold out" : `${type.count} room${type.count === 1 ? "" : "s"} left`}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {type.size} · {type.bed} · Sleeps {type.capacity} · {type.view}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{type.blurb}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {type.amenities.slice(0, 4).map((amenity) => (
                                <span key={amenity} className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="font-display text-2xl font-semibold">{naira(type.rate)}</p>
                            <p className="text-[11px] text-muted-foreground">per night · excl. taxes</p>
                            <p className="mt-1 text-xs font-semibold text-gold">
                              {naira(type.rate * quote.nights)} total
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {error && <ErrorNote message={error} />}

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" onClick={back}><ArrowLeft className="size-4" /> Back</Button>
                  <Button size="lg" onClick={next} disabled={selectedAvailability === 0}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-up">
                <h2 className="font-display text-2xl font-semibold">Who is staying with us?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll use these details to prepare your room and send your confirmation.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" className="sm:col-span-2">
                    <Input
                      value={guest.name}
                      onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                      placeholder="e.g. Adaeze Okonkwo"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email address">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={guest.email}
                        onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                        placeholder="you@email.com"
                        className="pl-9"
                        autoComplete="email"
                      />
                    </div>
                  </Field>
                  <Field label="Phone number">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={guest.phone}
                        onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                        placeholder="0803 000 0000"
                        className="pl-9"
                        autoComplete="tel"
                      />
                    </div>
                  </Field>
                  <Field label="Country" className="sm:col-span-2">
                    <Input
                      value={guest.country}
                      onChange={(e) => setGuest({ ...guest, country: e.target.value })}
                      placeholder="Nigeria"
                      autoComplete="country-name"
                    />
                  </Field>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold text-foreground/80">Make it special (optional)</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {ADD_ONS.map((addOn) => {
                      const checked = addOns.includes(addOn.id);
                      const amount = addOn.perNight ? addOn.price * quote.nights : addOn.price;
                      return (
                        <label
                          key={addOn.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
                            checked ? "border-primary bg-accent/60" : "border-border bg-white hover:border-primary/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddOn(addOn.id)}
                            className="mt-0.5 size-4 accent-[oklch(62%_0.096_78)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-semibold">{addOn.name}</span>
                              <span className="text-xs font-semibold text-gold">{naira(amount)}</span>
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{addOn.note}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Field label="Special requests" className="mt-5" hint="Subject to availability — we'll do our best.">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="High floor, airport pickup time, dietary requirements…"
                  />
                </Field>

                {error && <ErrorNote message={error} />}

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" onClick={back}><ArrowLeft className="size-4" /> Back</Button>
                  <Button size="lg" onClick={next}>
                    Continue to payment <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-up">
                <h2 className="font-display text-2xl font-semibold">Confirm & pay</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose how you'd like to settle your stay. No payment is taken until you confirm.
                </p>

                <div className="mt-6 space-y-2.5">
                  {[
                    { id: "pay-on-arrival" as const, icon: Wallet, title: "Pay at the hotel", note: "Reserve now, settle at the front desk on arrival. Card or cash accepted." },
                    { id: "card" as const, icon: CreditCard, title: "Pay now by card", note: "Secure payment via Paystack. Instant confirmation and paid invoice." },
                    { id: "transfer" as const, icon: Landmark, title: "Bank transfer", note: "Receive account details after booking. Your room is held for 24 hours." },
                  ].map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                        payment === option.id ? "border-primary bg-accent/60 ring-1 ring-primary/25" : "border-border bg-white hover:border-primary/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === option.id}
                        onChange={() => setPayment(option.id)}
                        className="mt-1 size-4 accent-[oklch(62%_0.096_78)]"
                      />
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
                        <option.icon className="size-4" />
                      </span>
                      <span>
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {option.title}
                          {option.id === "card" && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <Lock className="size-2.5" /> Secure
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{option.note}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Guest</p>
                      <p className="mt-1 font-semibold">{guest.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{guest.email}</p>
                      <p className="text-xs text-muted-foreground">{guest.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stay</p>
                      <p className="mt-1 font-semibold">{roomType} · {nightsLabel(quote.nights)}</p>
                      <p className="text-xs text-muted-foreground">{prettyDate(checkIn)} → {prettyDate(checkOut)}</p>
                      <p className="text-xs text-muted-foreground">{adults} adult{adults === 1 ? "" : "s"}{children ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""}</p>
                    </div>
                  </div>
                  {notes && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Requests: {notes}</p>}
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 size-4 accent-[oklch(62%_0.096_78)]"
                  />
                  <span>
                    I accept the{" "}
                    <Link to="/refund" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="font-semibold text-gold hover:underline">
                      booking and cancellation policy
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="font-semibold text-gold hover:underline">
                      privacy policy
                    </Link>. Free cancellation until 48 hours before arrival; after that the first
                    night is charged. Check-in 14:00, check-out 12:00.
                  </span>
                </label>

                {error && <ErrorNote message={error} />}

                <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="ghost" onClick={back} disabled={submitting}>
                    <ArrowLeft className="size-4" /> Back
                  </Button>
                  <Button size="lg" onClick={confirm} disabled={submitting || !terms}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                    Confirm booking · {naira(quote.total)}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold" /> Your details are encrypted and never shared.</span>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-semibold text-gold hover:underline">
              <MessageCircle className="size-3.5" /> Prefer WhatsApp? Chat with Ada
            </a>
          </div>
        </div>

        <aside className="no-print">
          <div className="surface-card sticky top-24 overflow-hidden">
            <div className="relative h-28">
              <img src="/assets/stayora-slide-3.jpg" alt="Stayora Hotel" className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
                <img src="/assets/stayora-mark.png" alt="" className="h-6 w-auto" />
                <div>
                  <p className="font-display text-base leading-none">Stayora</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/80">{currentTenant.city} · {currentTenant.branches[0]?.name ?? "Main Branch"}</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your stay</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Check-in</p>
                  <p className="mt-0.5 font-semibold">{prettyDate(checkIn)}</p>
                  <p className="text-[10px] text-muted-foreground">from 14:00</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Check-out</p>
                  <p className="mt-0.5 font-semibold">{prettyDate(checkOut)}</p>
                  <p className="text-[10px] text-muted-foreground">by 12:00</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {nightsLabel(quote.nights)} · {adults + children} guest{adults + children === 1 ? "" : "s"}
              </p>

              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BedDouble className="size-4 text-gold" />
                    <div>
                      <p className="text-sm font-semibold">{roomType}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedType.bed} · {selectedType.view}</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold">{naira(quote.rate)}<span className="font-normal text-muted-foreground">/nt</span></p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
                {quote.lines.map((line) => (
                  <div key={line.label} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.label}</p>
                      {line.detail && <p className="text-[10px] text-muted-foreground">{line.detail}</p>}
                    </div>
                    <p className="font-semibold">{naira(line.amount)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-sm font-semibold">Total</p>
                  <p className="text-[10px] text-muted-foreground">Inclusive of 7.5% VAT & 10% service charge</p>
                </div>
                <p className="font-display text-2xl font-semibold">{naira(quote.total)}</p>
              </div>

              <div className="mt-4 space-y-1.5 rounded-lg bg-accent/60 px-3 py-2.5 text-[11px] text-accent-foreground">
                <p className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-success" /> Best rate guarantee</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-success" /> Free cancellation up to 48h</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-success" /> No booking fees</p>
              </div>

              <a
                href={`tel:${(currentTenant.phone || "0805 535 0960").replace(/\s/g, "")}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold transition hover:bg-muted"
              >
                <Phone className="size-3.5" /> Need help? {currentTenant.phone || "0805 535 0960"}
              </a>
            </div>
          </div>
        </aside>
      </main>

      <div className="no-print"><PublicFooter /></div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2.5 text-xs font-medium text-destructive">
      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-destructive text-[9px] font-bold text-white">!</span>
      {message}
    </p>
  );
}

function PublicHeader() {
  const { currentTenant } = useTenant();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/stayora-mark-dark.png" alt="Stayora Hotel" className="h-9 w-auto" />
          <div>
            <p className="font-display text-lg leading-none">Stayora</p>
            <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Hotel · {currentTenant.city}</p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link to="/" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">
            Home
          </Link>
          <Link to="/book" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground">
            Book a room
          </Link>
          <a href={`tel:${(currentTenant.phone || "0805 535 0960").replace(/\s/g, "")}`} className={buttonClass("outline", "sm", "hidden sm:inline-flex")}>
            <Phone className="size-3.5" /> {currentTenant.phone || "0805 535 0960"}
          </a>
          <Link to="/auth" className={buttonClass("dark", "sm")}>
            Staff
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  const { currentTenant } = useTenant();
  return (
    <footer className="no-print border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/assets/stayora-mark-dark.png" alt="" className="h-6 w-auto" />
          <span>© {new Date().getFullYear()} {currentTenant.name} · Stayora</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><MapPin className="size-3" /> {currentTenant.city}, {currentTenant.country}</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/refund" className="hover:text-foreground">Refund policy</Link>
          <a href={whatsappFallback} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
            <MessageCircle className="size-3" /> WhatsApp
          </a>
          <span className="flex items-center gap-1"><Download className="size-3" /> Instant confirmation</span>
        </div>
      </div>
    </footer>
  );
}

const whatsappFallback =
  "https://wa.me/2348055350960?text=Hello%20Ada%2C%20I%20would%20like%20to%20book%20a%20room%20at%20Stayora%20Hotel.";
