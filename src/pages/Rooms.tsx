import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BedDouble,
  Building2,
  CalendarPlus,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useEntitlements } from "../lib/subscription";
import { PROMO_DISCOUNTS, PROMO_TERMS, ROOM_TYPES } from "../lib/seed";
import { naira, prettyDate, todayISO } from "../lib/format";
import type { Room, RoomStatus, RoomTypeName } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  SectionCard,
  Select,
  StatusPill,
  Tabs,
  buttonClass,
  cn,
} from "../components/ui";

const statusStyles: Record<RoomStatus, string> = {
  available: "border-emerald-200 bg-emerald-50/70 hover:border-emerald-400",
  occupied: "border-sky-200 bg-sky-50/70 hover:border-sky-400",
  cleaning: "border-violet-200 bg-violet-50/70 hover:border-violet-400",
  reserved: "border-amber-200 bg-amber-50/70 hover:border-amber-400",
  maintenance: "border-orange-200 bg-orange-50/70 hover:border-orange-400",
  "out-of-service": "border-rose-200 bg-rose-50/70 hover:border-rose-400",
};

const statusDot: Record<RoomStatus, string> = {
  available: "bg-emerald-500",
  occupied: "bg-sky-500",
  cleaning: "bg-violet-500",
  reserved: "bg-amber-500",
  maintenance: "bg-orange-500",
  "out-of-service": "bg-rose-500",
};

const statusOptions: { id: RoomStatus; label: string }[] = [
  { id: "available", label: "Available" },
  { id: "cleaning", label: "Cleaning" },
  { id: "maintenance", label: "Maintenance" },
  { id: "out-of-service", label: "Out of service" },
  { id: "occupied", label: "Occupied" },
];

export default function Rooms() {
  const { db, setRoomStatus, addRoom } = useStore();
  const { checks, plan, usage } = useEntitlements();
  const [floor, setFloor] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Room | null>(null);
  const [status, setStatus] = useState<RoomStatus>("available");
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState("");
  const [roomForm, setRoomForm] = useState({
    number: "",
    floor: 1,
    type: "Deluxe" as RoomTypeName,
    capacity: 2,
    bed: "1 Queen",
  });

  const rooms = useMemo(() => {
    let list = db.rooms;
    if (floor !== "all") list = list.filter((r) => r.floor === Number(floor));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.number.includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.guest ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [db.rooms, floor, search]);

  const counts = (status: RoomStatus) => db.rooms.filter((r) => r.status === status).length;
  const floors = Array.from(new Set(db.rooms.map((room) => room.floor))).sort((a, b) => a - b);
  const grouped = floors
    .map((f) => ({ floor: f, rooms: rooms.filter((r) => r.floor === f) }))
    .filter((g) => g.rooms.length > 0);

  const openRoom = (room: Room) => {
    setSelected(room);
    setStatus(room.status);
  };

  const applyStatus = () => {
    if (!selected) return;
    setRoomStatus(selected.id, status);
    setSelected(null);
  };

  const submitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const number = roomForm.number.trim();
    if (!number) {
      setAddError("Enter a room number.");
      return;
    }
    if (db.rooms.some((room) => room.number.toLowerCase() === number.toLowerCase())) {
      setAddError(`Room ${number} already exists.`);
      return;
    }
    const rateCard = ROOM_TYPES.find((entry) => entry.type === roomForm.type);
    const result = addRoom({
      number,
      floor: roomForm.floor,
      type: roomForm.type,
      status: "available",
      rate: rateCard?.rate ?? 0,
      capacity: roomForm.capacity,
      bed: roomForm.bed,
      smoking: false,
      amenities: rateCard ? ["Air conditioning", "Wi-Fi", "Smart TV", "Room service"] : ["Wi-Fi"],
    });
    if (!result.ok) {
      setAddError(result.message);
      return;
    }
    setAddError("");
    setAddOpen(false);
    setRoomForm({ number: "", floor: roomForm.floor, type: roomForm.type, capacity: roomForm.capacity, bed: roomForm.bed });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Rooms & halls"
        description={`${db.rooms.length} keys across ${floors.length} floors — live status, rate plans and guest allocation.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className={cn("size-2 rounded-full", statusDot.available)} /> {counts("available")} available</span>
              <span className="flex items-center gap-1.5"><i className={cn("size-2 rounded-full", statusDot.occupied)} /> {counts("occupied")} occupied</span>
            </div>
            <Button onClick={() => { setAddError(""); setAddOpen(true); }}>
              <Plus className="size-4" /> Add room
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat icon={BedDouble} label="Total keys" value={String(db.rooms.length)} hint={`${floors.length} floors · ${Math.ceil(db.rooms.length / Math.max(1, floors.length))} per floor`} />
        <MiniStat icon={Sparkles} label="Cleaning" value={String(counts("cleaning"))} hint="Turnover in progress" />
        <MiniStat icon={Wrench} label="Maintenance" value={String(counts("maintenance") + counts("out-of-service"))} hint="Rooms out of service" />
        <MiniStat icon={Users} label="Guests in-house" value={String(db.reservations.filter((r) => r.status === "checked-in").length)} hint="Occupied rooms" />
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={floor}
          onChange={setFloor}
          tabs={[{ id: "all", label: "All floors" }, ...floors.map((f) => ({ id: String(f), label: `Floor ${f}` }))]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room, type or guest…"
            className="w-full pl-8 sm:w-64"
          />
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {grouped.map((group) => (
          <section key={group.floor}>
            <div className="mb-2.5 flex items-center gap-2">
              <Building2 className="size-4 text-gold" />
              <h2 className="text-sm font-semibold">Floor {group.floor}</h2>
              <span className="text-xs text-muted-foreground">
                {group.rooms.filter((r) => r.status === "available").length} of {group.rooms.length} available
              </span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {group.floor === 4 ? "Suites" : "Superior · Deluxe · Executive"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {group.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => openRoom(room)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition hover:shadow-md",
                    statusStyles[room.status],
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-xl font-semibold leading-none">{room.number}</p>
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{room.type}</p>
                    </div>
                    <span className={cn("mt-1 size-2.5 rounded-full", statusDot[room.status])} title={room.status} />
                  </div>
                  <p className="mt-2 truncate text-xs font-medium">
                    {room.guest ?? (room.status === "available" ? "Ready to sell" : room.status === "cleaning" ? "Being serviced" : "No guest")}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="capitalize">{room.status.replace("-", " ")}</span>
                    <span>{naira(room.rate)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Users className="size-3" /> {room.capacity}
                    <span>·</span>
                    <span className="truncate">{room.bed}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No rooms match your search.
          </p>
        )}
      </div>

      <section className="mt-8">
        <SectionCard
          title="End-of-year 2026 rate guide"
          subtitle="Promotional room rates for corporate discussions and direct bookings"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Room category</th>
                  <th className="text-right">Standard rate</th>
                  <th className="text-right">Normal ({PROMO_DISCOUNTS.normal}%)</th>
                  <th className="text-right">Weekend ({PROMO_DISCOUNTS.weekend}%)</th>
                  <th className="text-right">Long-stay ({PROMO_DISCOUNTS.longStay}%)</th>
                </tr>
              </thead>
              <tbody>
                {ROOM_TYPES.map((type) => (
                  <tr key={type.type}>
                    <td className="text-xs font-semibold">{type.type === "Suite" ? "Suites" : type.type}</td>
                    <td className="text-right text-xs font-semibold">{naira(type.rate)}</td>
                    <td className="text-right text-xs text-muted-foreground">{naira(type.promo.normal)}</td>
                    <td className="text-right text-xs text-muted-foreground">{naira(type.promo.weekend)}</td>
                    <td className="text-right text-xs text-muted-foreground">{naira(type.promo.longStay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Terms</p>
            <ul className="mt-2 grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
              {PROMO_TERMS.map((term) => (
                <li key={term} className="flex gap-2">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                  {term}
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Halls & venues</h2>
            <p className="text-xs text-muted-foreground">Event spaces bookable from the front desk.</p>
          </div>
          <Link to="/booking-desk" className={buttonClass("outline", "sm")}>
            <CalendarPlus className="size-4" /> Book a venue
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {db.venues.map((venue) => {
            const next = db.venueBookings
              .filter((b) => b.venueId === venue.id && b.date >= todayISO() && b.status !== "cancelled")
              .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))[0];
            return (
              <div key={venue.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{venue.name}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="size-3" /> {venue.location}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={venue.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" /> Theatre {venue.theatreCapacity.toLocaleString("en-NG")} · Banquet {venue.banquetCapacity.toLocaleString("en-NG")}</span>
                  <span>{naira(venue.rate)} before discount</span>
                  <span>{venue.type}</span>
                </div>
                <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
                  {next ? `Next: ${prettyDate(next.date)} · ${next.startTime}–${next.endTime} · ${next.customerName}` : "No upcoming bookings"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Legend</span>
        {(["available", "occupied", "reserved", "cleaning", "maintenance", "out-of-service"] as RoomStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 capitalize">
            <i className={cn("size-2 rounded-full", statusDot[s])} /> {s.replace("-", " ")}
          </span>
        ))}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Room ${selected.number}` : "Room"}
        description={selected ? `Floor ${selected.floor} · ${selected.type}` : undefined}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={applyStatus} disabled={!selected || status === selected.status}>
              Update status
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={selected.status} />
              <span className="text-xs text-muted-foreground">{naira(selected.rate)} per night</span>
              <span className="text-xs text-muted-foreground">· Sleeps {selected.capacity}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bed</p>
                <p className="mt-0.5 text-xs">{selected.bed}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current guest</p>
                <p className="mt-0.5 text-xs">{selected.guest ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Smoking</p>
                <p className="mt-0.5 text-xs">{selected.smoking ? "Smoking room" : "Non-smoking"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Occupancy</p>
                <div className="mt-1"><Progress value={(selected.capacity / 4) * 100} /></div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Amenities</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.amenities.map((a) => (
                  <span key={a} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <Field label="Set room status" hint="Occupied rooms are updated automatically on check-in and check-out.">
              <Select value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)}>
                {statusOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </Field>

            <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Front desk note</p>
              <p className="mt-0.5">
                Marking a room <span className="font-medium">available</span> releases it to sale immediately.
                Rooms under maintenance are hidden from online availability.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a room"
        description="New keys are available to sell immediately and count toward your plan limit."
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-room"><Plus className="size-4" /> Create room</Button>
          </>
        }
      >
        <form id="new-room" onSubmit={submitRoom} className="space-y-4">
          {addError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{addError}</div>
          )}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {usage.rooms} of {checks.rooms?.limit ?? "unlimited"} rooms used on {plan.name}. Need more capacity?{" "}
            <Link to="/subscription" className="font-semibold text-primary hover:underline">View upgrades</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Room number">
              <Input value={roomForm.number} onChange={(e) => setRoomForm({ ...roomForm, number: e.target.value })} placeholder="e.g. 305" required />
            </Field>
            <Field label="Floor">
              <Input
                type="number"
                min={0}
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
              />
            </Field>
            <Field label="Category">
              <Select
                value={roomForm.type}
                onChange={(e) => {
                  const type = e.target.value as RoomTypeName;
                  const rateCard = ROOM_TYPES.find((entry) => entry.type === type);
                  setRoomForm({
                    ...roomForm,
                    type,
                    capacity: rateCard?.capacity ?? roomForm.capacity,
                    bed: rateCard?.bed ?? roomForm.bed,
                  });
                }}
              >
                {ROOM_TYPES.map((entry) => (
                  <option key={entry.type} value={entry.type}>{entry.type}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sleeps">
              <Input
                type="number"
                min={1}
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Bed configuration">
              <Input value={roomForm.bed} onChange={(e) => setRoomForm({ ...roomForm, bed: e.target.value })} />
            </Field>
            <Field label="Nightly rate">
              <Input
                value={naira(ROOM_TYPES.find((entry) => entry.type === roomForm.type)?.rate ?? 0)}
                readOnly
                className="bg-muted/40"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-gold">
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
