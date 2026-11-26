import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ConciergeBell,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { buttonClass, cn } from "../components/ui";
import CustomerAgent from "../components/CustomerAgent";
import { useEntitlements } from "../lib/subscription";

const slides = [
  {
    src: "/assets/stayora-slide-1.jpg",
    alt: "Warmly lit Stayora front desk",
    kicker: "Front desk, elevated",
    title: "One suite for every property, brand and team",
  },
  {
    src: "/assets/stayora-slide-2.jpg",
    alt: "Stayora reservations, room status and revenue dashboards on laptop and tablet",
    kicker: "Live operations",
    title: "Every reservation, folio and rate in real time",
  },
  {
    src: "/assets/stayora-slide-3.jpg",
    alt: "Guests welcomed in a Stayora lobby with city views",
    kicker: "Guest experience",
    title: "Your guests, remembered at every stay",
  },
];

const features = [
  { icon: CalendarCheck, title: "Reservations", text: "Direct, OTA, corporate and walk-in bookings with live folios." },
  { icon: Building2, title: "Multi-property", text: "Run every branch, brand and room type from one tenant workspace." },
  { icon: Users, title: "Guest CRM & loyalty", text: "Profiles, VIP tiers, loyalty points and lifetime value." },
  { icon: Sparkles, title: "Operations", text: "Housekeeping, maintenance, laundry, kitchen and spa boards." },
  { icon: BarChart3, title: "Revenue intelligence", text: "Occupancy, ADR, RevPAR and departmental P&L at a glance." },
  { icon: ShieldCheck, title: "Tenant isolation", text: "Per-workspace data, roles, sessions and audit trails." },
];

export default function Landing() {
  const [agentOpen, setAgentOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides[slide];
  const { canModule, usable } = useEntitlements();
  const bookingEnabled = usable && canModule("booking");

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  const step = (direction: number) =>
    setSlide((current) => (current + direction + slides.length) % slides.length);

  return (
    <div className="min-h-screen bg-background">
      <div
        className="relative isolate overflow-hidden bg-[#0b1220]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 -z-20">
          {slides.map((item, index) => (
            <img
              key={item.src}
              src={item.src}
              alt={item.alt}
              aria-hidden={index === slide ? undefined : true}
              className={cn(
                "absolute inset-0 size-full object-cover transition-all duration-[1400ms] ease-out",
                index === slide ? "scale-100 opacity-100" : "scale-105 opacity-0",
              )}
            />
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,12,22,0.78),rgba(6,12,22,0.32)_42%,rgba(6,12,22,0.82))]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(180deg,rgba(6,12,22,0.75),rgba(6,12,22,0))]" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img src="/assets/stayora-mark.png" alt="Stayora Hotel" className="h-9 w-auto shrink-0 drop-shadow sm:h-11" />
            <span className="truncate font-display text-lg text-white drop-shadow sm:text-xl">Stayora</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/pricing" className={buttonClass("white", "md")}>
                Pricing
              </Link>
              {bookingEnabled && (
                <Link to="/book" className={buttonClass("white", "md")}>
                  Book a room
                </Link>
              )}
            </div>
            <Link to="/auth" className={buttonClass("primary", "md", "whitespace-nowrap")}>
              Staff sign in
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto flex min-h-[30rem] max-w-6xl flex-col justify-center px-6 pb-16 pt-8 text-center sm:min-h-[34rem] sm:pb-20 sm:pt-12">
          <p key={`kicker-${slide}`} className="animate-fade-up text-xs uppercase tracking-[0.3em] text-white/80 drop-shadow">
            Stayora · {active.kicker}
          </p>
          <h1
            key={`title-${slide}`}
            className="animate-fade-up mx-auto mt-4 max-w-3xl font-display text-4xl leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-6xl"
          >
            {active.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
            Reservations, rooms, guests, housekeeping, finance and revenue intelligence — with isolated
            workspaces for each hotel group
            {bookingEnabled ? " and a direct booking experience for every guest." : "."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {bookingEnabled ? (
              <Link to="/book" className={buttonClass("primary", "lg")}>
                <CalendarCheck className="size-4" /> Book your stay
              </Link>
            ) : (
              <Link to="/pricing" className={buttonClass("primary", "lg")}>
                <Sparkles className="size-4" /> See plans & pricing
              </Link>
            )}
            <Link to="/auth" className={buttonClass("white", "lg")}>
              Enter the suite <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/85">
            {bookingEnabled ? (
              <>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Best rate guarantee</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Free cancellation up to 48h</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Instant confirmation</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Multi-property operations</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Role-based access</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-brand-bright" /> Isolated workspaces</span>
              </>
            )}
          </div>

          <div className="mt-10 flex items-center justify-center gap-4 text-white/80">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous slide"
              className="grid size-9 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur transition hover:border-white/50 hover:bg-white/20"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.src}
                  type="button"
                  onClick={() => setSlide(index)}
                  aria-label={`Show slide ${index + 1}: ${item.kicker}`}
                  aria-current={index === slide}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === slide ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next slide"
              className="grid size-9 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur transition hover:border-white/50 hover:bg-white/20"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="surface-card p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-gold">
                <feature.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </section>

        {bookingEnabled && (
          <section className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Direct booking</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Book in a minute — no phone call, no waiting
            </h2>
            <p className="mt-4 text-muted-foreground">
              Choose your dates, compare all four room types, add breakfast or an airport pickup, and
              receive an instant booking reference. Your reservation appears on the front desk board
              the moment you confirm.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>· Live availability across all room types</li>
              <li>· Transparent pricing with no hidden fees</li>
              <li>· Instant booking reference and folio</li>
              <li>· Pay online or at the hotel — your choice</li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/book" className={buttonClass("primary", "lg")}>
                Check availability <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={() => setAgentOpen(true)}
                className={buttonClass("outline", "lg")}
              >
                <MessageCircle className="size-4" /> Chat with Ada
              </button>
            </div>
          </div>

          <div className="noir-panel p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-brand-bright">
                  <ConciergeBell className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Ada · Stayora booking agent</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-noir-muted">
                    <span className="size-1.5 rounded-full bg-emerald-400" /> online · WhatsApp 0805 535 0960
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-noir-text">
                Hello 👋 This is Ada from Stayora Hotel. I can check room availability and book your
                stay right here. When would you like to arrive?
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                Friday for two nights — a suite if you have one.
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-noir-text">
                We have a Suite available at ₦200,000 per night. That's ₦400,000 for two nights. Shall I
                hold it for you?
              </div>
            </div>
            <button
              onClick={() => setAgentOpen(true)}
              className={buttonClass("white", "sm", "mt-4 w-full")}
            >
              <MessageCircle className="size-3.5" /> Continue in chat
            </button>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-noir-muted">
              <MessageCircle className="size-3.5" /> Ada replies instantly, 24/7
            </div>
          </div>
        </section>
        )}

        <section className="mt-20 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">For the team</p>
              <h2 className="mt-2 font-display text-3xl">One suite for every corner of the hotel.</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Front desk, housekeeping, finance, F&B, spa and management work from a single source of
                truth — with role-based access for every department and strict tenant isolation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/auth" className={buttonClass("dark", "lg")}>
                Staff sign in <ArrowRight className="size-4" />
              </Link>
              {bookingEnabled && (
                <Link to="/book" className={buttonClass("outline", "lg")}>
                  Guest booking
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/assets/stayora-mark-dark.png" alt="Stayora" className="h-8 w-auto" />
            <span>© {new Date().getFullYear()} Stayora Hotel · Lagos, Nigeria</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a href="tel:+2348055350960" className="hover:text-foreground">0805 535 0960</a>
            {bookingEnabled && <Link to="/book" className="hover:text-foreground">Book a room</Link>}
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/refund" className="hover:text-foreground">Refund policy</Link>
            <Link to="/auth" className="hover:text-foreground">Staff</Link>
          </div>
        </div>
      </footer>

      {bookingEnabled && <CustomerAgent open={agentOpen} onOpenChange={setAgentOpen} />}
    </div>
  );
}
