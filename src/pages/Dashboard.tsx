import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  DoorOpen,
  LogIn,
  LogOut,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { canAccessPath } from "../lib/permissions";
import { useStore } from "../lib/store";
import { useTenant } from "../lib/tenants";
import { useEntitlements } from "../lib/subscription";
import { addDays, naira, todayISO, todayLabel } from "../lib/format";
import { occupancyWeek } from "../lib/seed";
import { channelPerformance } from "../lib/channels";
import {
  Button,
  Progress,
  SectionCard,
  StatCard,
  StatusPill,
  buttonClass,
  cn,
} from "../components/ui";
import { Donut, OccupancyChart, RevenueBars } from "../components/Charts";

export default function Dashboard() {
  const { db, checkIn, checkOut } = useStore();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { canModule } = useEntitlements();
  const today = todayISO();
  const canViewChannels = canAccessPath(user?.role, db.roles, "/channels");
  const canViewReports = canAccessPath(user?.role, db.roles, "/reports");
  const canViewHousekeeping = canAccessPath(user?.role, db.roles, "/housekeeping");

  const occupied = db.rooms.filter((r) => r.status === "occupied");
  const available = db.rooms.filter((r) => r.status === "available");
  const cleaning = db.rooms.filter((r) => r.status === "cleaning");
  const maintenance = db.rooms.filter((r) => r.status === "maintenance" || r.status === "out-of-service");
  const occupancy = Math.round((occupied.length / db.rooms.length) * 100);

  const revenueToday = db.payments
    .filter((p) => p.date === today && p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const adr = occupied.length
    ? Math.round(occupied.reduce((sum, r) => sum + r.rate, 0) / occupied.length)
    : 0;
  const revpar = Math.round((adr * occupancy) / 100);

  const arrivals = db.reservations.filter(
    (r) => r.checkIn === today && (r.status === "confirmed" || r.status === "pending"),
  );
  const departures = db.reservations.filter((r) => r.checkOut === today && r.status === "checked-in");
  const inHouse = db.reservations.filter((r) => r.status === "checked-in");
  const tomorrowArrivals = db.reservations.filter((r) => r.checkIn === addDays(today, 1) && r.status === "confirmed");

  const channelRows = channelPerformance(db.reservations, db.channels);
  const sources = channelRows
    .map((row) => ({ name: row.name, value: row.bookings }))
    .sort((a, b) => b.value - a.value);
  const otherSourceBookings = sources.slice(4).reduce((sum, row) => sum + row.value, 0);
  const donutSources = otherSourceBookings
    ? [...sources.slice(0, 4), { name: "Other", value: otherSourceBookings }]
    : sources.slice(0, 4);

  const taskCounts = [
    { label: "Pending", value: db.tasks.filter((t) => t.status === "pending").length, tone: "gold" as const },
    { label: "In progress", value: db.tasks.filter((t) => t.status === "in-progress").length, tone: "blue" as const },
    { label: "Done", value: db.tasks.filter((t) => t.status === "done").length, tone: "green" as const },
    { label: "Inspected", value: db.tasks.filter((t) => t.status === "inspected").length, tone: "green" as const },
  ];
  const totalTasks = db.tasks.length || 1;

  const lowStock = db.inventory.filter((i) => i.quantity <= i.reorderLevel);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name ?? "Front Desk").split(" ")[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {todayLabel()}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here's how {currentTenant.name} is performing today — live occupancy, arrivals and revenue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/reservations" className={buttonClass("outline")}>
            <CalendarDays className="size-4" /> New reservation
          </Link>
          {canModule("booking") && (
            <Link to="/book" target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              <ArrowUpRight className="size-4" /> Booking page
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Occupancy today"
          value={`${occupancy}%`}
          delta="+6.4%"
          up
          hint={`${occupied.length} of ${db.rooms.length} rooms`}
          icon={BedDouble}
          tone="noir"
        />
        <StatCard
          label="Revenue today"
          value={naira(revenueToday)}
          delta="+12.8%"
          up
          hint={`${db.payments.filter((p) => p.date === today).length} transactions`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Available rooms"
          value={String(available.length)}
          delta={`${cleaning.length} cleaning`}
          up={false}
          hint="Ready to sell"
          icon={DoorOpen}
        />
        <StatCard
          label="ADR"
          value={naira(adr)}
          delta="+4.8%"
          up
          hint={`RevPAR ${naira(revpar)}`}
          icon={TrendingUp}
          tone="gold"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12 xl:items-start">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <SectionCard
            title="Revenue mix"
            subtitle="Last 6 months · ₦ millions"
            action={<span className="text-xs text-muted-foreground">Feb — Jul</span>}
          >
            <RevenueBars />
          </SectionCard>

          <SectionCard
            title="Occupancy & ADR"
            subtitle="Current week"
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-primary" /> Occupancy</span>
                <span>ADR avg ₦{Math.round(occupancyWeek.reduce((s, d) => s + d.adr, 0) / occupancyWeek.length)}k</span>
              </div>
            }
          >
            <OccupancyChart />
          </SectionCard>

          <SectionCard
            title="Arrivals & departures"
            subtitle={`Today · ${arrivals.length} arriving · ${departures.length} departing`}
            action={<Link to="/reservations" className="text-xs font-semibold text-gold hover:underline">All reservations</Link>}
            bodyClassName="p-0"
          >
            <div className="divide-y divide-border">
              {arrivals.slice(0, 3).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <LogIn className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.guestName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.roomType} · Room {r.roomNumber} · {r.nights} night{r.nights === 1 ? "" : "s"} · {r.ref}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                  <Button size="sm" variant="outline" onClick={() => checkIn(r.id)}>
                    Check in
                  </Button>
                </div>
              ))}
              {departures.slice(0, 2).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700">
                    <LogOut className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.guestName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Departing Room {r.roomNumber} · {r.ref} · {r.paymentStatus === "paid" ? "folio settled" : "balance due"}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                  <Button size="sm" variant="outline" onClick={() => checkOut(r.id)}>
                    Check out
                  </Button>
                </div>
              ))}
              {arrivals.length === 0 && departures.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No arrivals or departures scheduled for today.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarCheck className="size-3.5 text-gold" /> {tomorrowArrivals.length} arrivals expected tomorrow
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-3.5 text-gold" /> {inHouse.length} guests in-house
              </span>
            </div>
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          <SectionCard
            title="Booking sources"
            subtitle="Live channel mix"
            action={canViewChannels ? <Link to="/channels" className="text-xs font-semibold text-gold hover:underline">Channels</Link> : undefined}
          >
            <Donut
              data={donutSources}
              centerLabel="bookings"
              centerValue={String(db.reservations.filter((r) => r.status !== "cancelled").length)}
            />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-xs">
              <span className="text-muted-foreground">Top source</span>
              <span className="font-semibold">
                {sources[0] ? `${sources[0].name} · ${sources[0].value} bookings` : "No bookings yet"}
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Housekeeping status"
            subtitle={`${db.tasks.length} tasks today`}
            action={canViewHousekeeping ? <Link to="/housekeeping" className="text-xs font-semibold text-gold hover:underline">Board</Link> : undefined}
          >
            <div className="space-y-4">
              {taskCounts.map((t) => (
                <div key={t.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-semibold">{t.value}</span>
                  </div>
                  <Progress value={(t.value / totalTasks) * 100} tone={t.tone} />
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4 text-center">
              <div className="rounded-lg bg-muted/60 px-2 py-2.5">
                <p className="font-display text-xl font-semibold">{cleaning.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cleaning</p>
              </div>
              <div className="rounded-lg bg-muted/60 px-2 py-2.5">
                <p className="font-display text-xl font-semibold">{maintenance.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Out of service</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent activity"
            subtitle="Across all departments"
            action={canViewReports ? <Link to="/reports" className="text-xs font-semibold text-gold hover:underline">Reports</Link> : undefined}
          >
            <ol className="relative space-y-4 border-l border-border pl-4">
              {db.activity.slice(0, 6).map((item, i) => (
                <li key={`${item.time}-${i}`} className="relative">
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary ring-4 ring-card" />
                  <p className="text-xs font-medium leading-snug">{item.text}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.time} · {item.who}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <AlertCard
          icon={Sparkles}
          tone="warning"
          title={`${maintenance.length} room${maintenance.length === 1 ? "" : "s"} out of service`}
          detail={maintenance.length ? `Rooms ${maintenance.map((r) => r.number).join(", ")} — engineering works` : "All rooms in service"}
        />
        <AlertCard
          icon={ClipboardCheck}
          tone="destructive"
          title={`Low stock: ${lowStock.length} item${lowStock.length === 1 ? "" : "s"}`}
          detail={lowStock.length ? `${lowStock[0].name} · ${lowStock[0].quantity} left · reorder at ${lowStock[0].reorderLevel}` : "Stock levels healthy"}
        />
        <AlertCard
          icon={Wallet}
          tone="info"
          title="AI forecast"
          detail={`${Math.min(98, occupancy + 14)}% occupancy expected this weekend — consider raising Deluxe rate by 12%`}
        />
      </div>
    </div>
  );
}

function AlertCard({
  icon: Icon,
  tone,
  title,
  detail,
}: {
  icon: typeof Clock;
  tone: "warning" | "destructive" | "info";
  title: string;
  detail: string;
}) {
  const tones = {
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    destructive: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  };
  const iconTone = {
    warning: "bg-amber-100 text-amber-700",
    destructive: "bg-rose-100 text-rose-700",
    info: "bg-sky-100 text-sky-700",
  };
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", tones[tone])}>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", iconTone[tone])}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs opacity-80">{detail}</p>
      </div>
    </div>
  );
}
