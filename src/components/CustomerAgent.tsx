import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import { addDays, daysBetween, naira, prettyDate, todayISO } from "../lib/format";
import { availableRoomsOfType, quoteBooking } from "../lib/booking";
import { ADD_ONS, ROOM_TYPES } from "../lib/seed";
import type { Reservation, RoomTypeName } from "../lib/types";
import { Button, cn } from "./ui";

type Step = "dates" | "room" | "guest" | "review" | "done";
type ChatMessage = { id: string; from: "ada" | "guest"; text: string };

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    from: "ada",
    text: "Hello 👋 This is Ada from Stayora Hotel. I can check live availability and book your stay right here. When would you like to arrive?",
  },
];

export default function CustomerAgent({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { db, createBooking } = useStore();
  const today = todayISO();
  const [step, setStep] = useState<Step>("dates");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [checkIn, setCheckIn] = useState(addDays(today, 1));
  const [checkOut, setCheckOut] = useState(addDays(today, 3));
  const [roomType, setRoomType] = useState<RoomTypeName>("Deluxe");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [addOns, setAddOns] = useState<string[]>(["breakfast"]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Reservation | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const nights = Math.max(0, daysBetween(checkIn, checkOut));
  const quote = quoteBooking(roomType, checkIn, checkOut, addOns);
  const availability = ROOM_TYPES.map((type) => ({
    ...type,
    available: availableRoomsOfType(type.type, checkIn, checkOut, db.rooms, db.reservations).length,
  }));
  const selectedAvailable = availability.find((type) => type.type === roomType)?.available ?? 0;

  useEffect(() => {
    if (!open) return;
    const node = chatRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, open, step]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const push = (from: ChatMessage["from"], text: string) => {
    setMessages((current) => [
      ...current,
      { id: `${from}-${Date.now()}-${current.length}`, from, text },
    ]);
  };

  const reset = () => {
    setStep("dates");
    setMessages(initialMessages);
    setCheckIn(addDays(today, 1));
    setCheckOut(addDays(today, 3));
    setRoomType("Deluxe");
    setAdults(2);
    setChildren(0);
    setAddOns(["breakfast"]);
    setName("");
    setPhone("");
    setEmail("");
    setError("");
    setResult(null);
  };

  const continueDates = () => {
    setError("");
    if (checkIn < today) return setError("Please choose an arrival date from today onward.");
    if (checkOut <= checkIn) return setError("Departure must be after arrival.");
    if (!availability.some((type) => type.available > 0)) {
      setError("No rooms are available for those dates. Try different dates or fewer nights.");
      return;
    }
    push(
      "guest",
      `${prettyDate(checkIn)} → ${prettyDate(checkOut)} · ${adults} adult${adults === 1 ? "" : "s"}${children ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""}`,
    );
    push(
      "ada",
      `Great — I have live availability for those dates. Choose the room you like below and I'll hold it for you.`,
    );
    setStep("room");
  };

  const continueRoom = () => {
    setError("");
    if (selectedAvailable === 0) {
      setError(`The ${roomType} is sold out for those dates. Please choose another room type.`);
      return;
    }
    push(
      "guest",
      `${roomType} room${addOns.length ? ` with ${addOns.map((id) => ADD_ONS.find((addOn) => addOn.id === id)?.name).filter(Boolean).join(", ")}` : ""}.`,
    );
    push(
      "ada",
      `Perfect. ${roomType} for ${nights} night${nights === 1 ? "" : "s"} comes to ${naira(quote.total)} including taxes and service charge. May I have the guest name and phone number?`,
    );
    setStep("guest");
  };

  const continueGuest = () => {
    setError("");
    if (!name.trim() || !phone.trim()) return setError("Please add the guest name and phone number.");
    push("guest", `${name.trim()} · ${phone.trim()}`);
    push(
      "ada",
      `Thanks ${name.trim().split(" ")[0]}. Please review your booking below and confirm — I'll create the reservation instantly.`,
    );
    setStep("review");
  };

  const confirmBooking = () => {
    setError("");
    const booking = createBooking({
      guest: { name, email, phone, country: "Nigeria" },
      roomType,
      checkIn,
      checkOut,
      adults,
      children,
      addOns,
      source: "WhatsApp",
      paymentMethod: "pay-on-arrival",
      notes: "Booked through the customer WhatsApp agent on the Stayora homepage.",
    });
    if (!booking.ok || !booking.reservation) {
      setError(booking.error ?? "I couldn't complete that booking. Please try again.");
      return;
    }
    setResult(booking.reservation);
    push("guest", "Yes, please confirm my booking.");
    push(
      "ada",
      `You're booked! 🎉 Your reference is ${booking.reservation.ref}. ${booking.reservation.roomType} · ${prettyDate(booking.reservation.checkIn)} to ${prettyDate(booking.reservation.checkOut)}. Pay at the hotel when you arrive — I've sent your booking to the front desk.`,
    );
    setStep("done");
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px]"
          role="dialog"
          aria-label="Chat with Ada, Stayora booking agent"
        >
          <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
              <Sparkles className="size-5 text-[#DCF8C6]" />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#075E54] bg-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Ada · Stayora</p>
              <p className="text-[11px] text-white/75">Online now · replies instantly</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={chatRef} aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto bg-[#efeae2] px-3 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-snug shadow-sm",
                  message.from === "ada"
                    ? "rounded-tl-sm bg-white text-slate-800"
                    : "ml-auto rounded-tr-sm bg-[#DCF8C6] text-slate-800",
                )}
              >
                {message.text}
              </div>
            ))}
            {step !== "done" && (
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
                <span className="flex gap-1">
                  <i className="size-1 animate-pulse rounded-full bg-slate-400" />
                  <i className="size-1 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                  <i className="size-1 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
                </span>
                Ada is typing…
              </div>
            )}
          </div>

          <div className="max-h-[58%] overflow-y-auto border-t border-border bg-white p-3">
            {error && (
              <p className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-medium text-rose-700">
                {error}
              </p>
            )}

            {step === "dates" && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <CalendarDays className="size-3.5 text-gold" /> Choose your stay
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Arrival
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={(event) => setCheckIn(event.target.value)}
                      className="field mt-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Departure
                    <input
                      type="date"
                      min={addDays(checkIn, 1)}
                      value={checkOut}
                      onChange={(event) => setCheckOut(event.target.value)}
                      className="field mt-1 text-xs"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Adults
                    <select
                      value={adults}
                      onChange={(event) => setAdults(Number(event.target.value))}
                      className="field mt-1 text-xs"
                    >
                      {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Children
                    <select
                      value={children}
                      onChange={(event) => setChildren(Number(event.target.value))}
                      className="field mt-1 text-xs"
                    >
                      {[0, 1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </div>
                <Button className="w-full" size="sm" onClick={continueDates}>
                  Check availability <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}

            {step === "room" && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <BedDouble className="size-3.5 text-gold" /> {nights} night{nights === 1 ? "" : "s"} · live availability
                </p>
                <div className="grid gap-2">
                  {availability.map((type) => (
                    <button
                      key={type.type}
                      onClick={() => setRoomType(type.type)}
                      disabled={type.available === 0}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition",
                        roomType === type.type
                          ? "border-primary bg-accent"
                          : "border-border bg-white hover:border-primary/40",
                        type.available === 0 && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <span>
                        <span className="block text-xs font-semibold">{type.type}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {type.available > 0 ? `${type.available} room${type.available === 1 ? "" : "s"} left` : "Sold out"} · {type.bed}
                        </span>
                      </span>
                      <span className="text-xs font-semibold">{naira(type.rate)}<span className="font-normal text-muted-foreground">/night</span></span>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Extras</p>
                  <div className="grid gap-1.5">
                    {ADD_ONS.map((addOn) => (
                      <label key={addOn.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-2.5 py-1.5 text-[11px]">
                        <input
                          type="checkbox"
                          checked={addOns.includes(addOn.id)}
                          onChange={(event) =>
                            setAddOns((current) =>
                              event.target.checked
                                ? [...current, addOn.id]
                                : current.filter((id) => id !== addOn.id),
                            )
                          }
                          className="mt-0.5 accent-[oklch(62%_0.096_78)]"
                        />
                        <span className="flex-1">
                          <span className="font-semibold">{addOn.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{addOn.note}</span>
                        </span>
                        <span className="font-semibold">{naira(addOn.price)}{addOn.perNight ? "/night" : ""}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Estimated total</span>
                  <span className="font-semibold">{naira(quote.total)}</span>
                </div>
                <Button className="w-full" size="sm" onClick={continueRoom}>
                  Continue with {roomType} <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}

            {step === "guest" && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <Users className="size-3.5 text-gold" /> Guest details
                </p>
                <input
                  className="field text-xs"
                  placeholder="Full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
                <input
                  className="field text-xs"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                />
                <input
                  className="field text-xs"
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
                <Button className="w-full" size="sm" onClick={continueGuest}>
                  Review booking <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}

            {step === "review" && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <CheckCircle2 className="size-3.5 text-gold" /> Confirm your stay
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px]">
                  <p className="font-semibold">{roomType} · {nights} night{nights === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-muted-foreground">{prettyDate(checkIn)} → {prettyDate(checkOut)}</p>
                  <p className="mt-1 text-muted-foreground">{name} · {phone}</p>
                  {email && <p className="text-muted-foreground">{email}</p>}
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Total incl. taxes</span>
                    <span className="text-sm font-semibold">{naira(quote.total)}</span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Pay at the hotel on arrival. Free cancellation up to 48h before check-in.{" "}
                    <Link to="/refund" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">Refund policy</Link>{" "}
                    ·{" "}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold hover:underline">Privacy</Link>
                  </p>
                </div>
                <Button className="w-full" size="sm" onClick={confirmBooking}>
                  <Send className="size-3.5" /> Confirm booking
                </Button>
                <button
                  onClick={() => setStep("guest")}
                  className="w-full text-center text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Edit guest details
                </button>
              </div>
            )}

            {step === "done" && result && (
              <div className="space-y-2.5">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
                  <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="size-3.5" /> Booking confirmed</p>
                  <p className="mt-1">Reference <span className="font-mono font-bold">{result.ref}</span></p>
                  <p className="mt-1 text-emerald-800">{result.roomType} · Room {result.roomNumber}</p>
                  <p className="text-emerald-800">{prettyDate(result.checkIn)} → {prettyDate(result.checkOut)}</p>
                  <p className="mt-1 font-semibold">{naira(result.total)} · pay on arrival</p>
                  <p className="mt-1 text-[10px] text-emerald-800">
                    Cancellation and privacy terms apply.{" "}
                    <Link to="/refund" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Refund policy</Link>
                  </p>
                </div>
                <Button className="w-full" size="sm" variant="outline" onClick={reset}>
                  <MessageCircle className="size-3.5" /> Book another stay
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-white px-3 py-2 text-center text-[9px] text-muted-foreground">
            Ada is an automated booking assistant · Stayora Hotel, Lagos
          </div>
        </div>
      )}

      <button
        onClick={() => onOpenChange(!open)}
        className={cn(
          "fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-[#075E54] shadow-xl transition hover:brightness-105 sm:bottom-6 sm:right-6",
          open && "hidden",
        )}
        aria-label="Chat with Ada on WhatsApp"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Chat with Ada</span>
        <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-emerald-500" />
      </button>
    </>
  );
}
