import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  Download,
  Filter,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { addDays, downloadCsv, naira, nightsLabel, prettyDate, todayISO } from "../lib/format";
import { ROOM_TYPES } from "../lib/seed";
import { BOOKING_SOURCES } from "../lib/channels";
import { availableRoomsOfType } from "../lib/booking";
import type { Reservation, RoomTypeName } from "../lib/types";
import {
  Avatar,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
  Textarea,
  buttonClass,
  cn,
} from "../components/ui";

type TabId = "all" | "arrivals" | "inhouse" | "upcoming" | "departed" | "cancelled";

export default function Reservations() {
  const { db, createBooking, checkIn, checkOut, cancelReservation } = useStore();
  const today = todayISO();
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "Nigeria",
    roomType: "Deluxe" as RoomTypeName,
    checkIn: today,
    checkOut: addDays(today, 2),
    adults: 2,
    children: 0,
    source: "Walk-in" as Reservation["source"],
    paymentMethod: "pay-on-arrival" as "pay-on-arrival" | "card" | "transfer" | "cash",
    notes: "",
  });

  const filtered = useMemo(() => {
    let list = [...db.reservations].sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1));
    if (tab === "arrivals") list = list.filter((r) => r.checkIn === today && r.status === "confirmed");
    if (tab === "inhouse") list = list.filter((r) => r.status === "checked-in");
    if (tab === "upcoming") list = list.filter((r) => r.checkIn > today && r.status === "confirmed");
    if (tab === "departed") list = list.filter((r) => r.status === "checked-out");
    if (tab === "cancelled") list = list.filter((r) => r.status === "cancelled");
    if (source !== "all") list = list.filter((r) => r.source === source);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.guestName.toLowerCase().includes(q) ||
          r.ref.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.roomNumber ?? "").includes(q),
      );
    }
    return list;
  }, [db.reservations, tab, source, search, today]);

  const counts = {
    all: db.reservations.length,
    arrivals: db.reservations.filter((r) => r.checkIn === today && r.status === "confirmed").length,
    inhouse: db.reservations.filter((r) => r.status === "checked-in").length,
    upcoming: db.reservations.filter((r) => r.checkIn > today && r.status === "confirmed").length,
    departed: db.reservations.filter((r) => r.status === "checked-out").length,
    cancelled: db.reservations.filter((r) => r.status === "cancelled").length,
  };

  const availability = useMemo(
    () =>
      form.checkOut > form.checkIn
        ? availableRoomsOfType(form.roomType, form.checkIn, form.checkOut, db.rooms, db.reservations).length
        : 0,
    [form.roomType, form.checkIn, form.checkOut, db.rooms, db.reservations],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = createBooking({
      guest: { name: form.name, email: form.email, phone: form.phone, country: form.country },
      roomType: form.roomType,
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
      setError(result.error ?? "Could not create reservation.");
      return;
    }
    setOpen(false);
    setNotice(`${result.reservation?.ref} created for ${result.reservation?.guestName} · Room ${result.reservation?.roomNumber}`);
    setForm({ ...form, name: "", email: "", phone: "", notes: "" });
    setTimeout(() => setNotice(""), 6000);
  };

  const exportCsv = () => {
    downloadCsv("stayora-reservations.csv", [
      ["Reference", "Guest", "Email", "Phone", "Room", "Type", "Check-in", "Check-out", "Nights", "Source", "Status", "Payment", "Total (NGN)"],
      ...filtered.map((r) => [
        r.ref, r.guestName, r.email, r.phone, r.roomNumber ?? "", r.roomType,
        r.checkIn, r.checkOut, r.nights, r.source, r.status, r.paymentStatus, r.total,
      ]),
    ]);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Front office"
        title="Reservations"
        description="Direct, OTA, corporate and walk-in bookings with live folios and instant check-in."
        actions={
          <>
            <Link to="/booking-desk" className={buttonClass("outline")}>
              <CalendarPlus className="size-4" /> Booking desk
            </Link>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => { setOpen(true); setError(""); }}>
              <Plus className="size-4" /> New reservation
            </Button>
          </>
        }
      />

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "All", count: counts.all },
              { id: "arrivals", label: "Arrivals", count: counts.arrivals },
              { id: "inhouse", label: "In-house", count: counts.inhouse },
              { id: "upcoming", label: "Upcoming", count: counts.upcoming },
              { id: "departed", label: "Departed", count: counts.departed },
              { id: "cancelled", label: "Cancelled", count: counts.cancelled },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guest, ref, room…"
                className="w-full pl-8 sm:w-56"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Select value={source} onChange={(e) => setSource(e.target.value)} className="w-full pl-8 sm:w-40">
                <option value="all">All sources</option>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base min-w-[1000px]">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay</th>
                <th>Source</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                  <td>
                    <span className="font-mono text-xs font-semibold text-foreground">{r.ref}</span>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Booked {prettyDate(r.createdAt)}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.guestName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{r.guestName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-xs font-semibold">{r.roomNumber ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{r.roomType}</p>
                  </td>
                  <td>
                    <p className="text-xs">{prettyDate(r.checkIn)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {prettyDate(r.checkOut)} · {nightsLabel(r.nights)}
                    </p>
                  </td>
                  <td><span className="text-xs text-muted-foreground">{r.source}</span></td>
                  <td className="text-xs font-semibold">{naira(r.total)}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td><StatusPill status={r.paymentStatus} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      {r.status === "confirmed" && (
                        <Button size="sm" variant="soft" onClick={() => checkIn(r.id)}>Check in</Button>
                      )}
                      {r.status === "checked-in" && (
                        <Button size="sm" variant="outline" onClick={() => checkOut(r.id)}>Check out</Button>
                      )}
                      {(r.status === "confirmed" || r.status === "pending") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-rose-50"
                          onClick={() => {
                            if (window.confirm(`Cancel reservation ${r.ref}?`)) cancelReservation(r.id);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      {(r.status === "checked-out" || r.status === "cancelled") && (
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>View</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    No reservations match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New reservation"
        description="Create a booking on behalf of a guest. Availability is checked live."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-reservation">Create reservation</Button>
          </>
        }
      >
        <form id="new-reservation" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guest name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="guest@email.com" required />
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

          <Field
            label="Room type"
            hint={form.checkOut > form.checkIn ? `${availability} ${form.roomType} room${availability === 1 ? "" : "s"} available for these dates` : "Choose valid dates to check availability"}
          >
            <Select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomTypeName })}>
              {ROOM_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.type} — {naira(t.rate)}/night · sleeps {t.capacity}</option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source">
              <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Reservation["source"] })}>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Payment">
              <Select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}
              >
                <option value="pay-on-arrival">Pay on arrival</option>
                <option value="cash">Cash — paid now</option>
                <option value="card">Card / Paystack</option>
                <option value="transfer">Bank transfer</option>
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Preferences, arrival time, special requests…" />
          </Field>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
          )}
        </form>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Reservation ${detail.ref}` : "Reservation"}
        description={detail ? `${detail.guestName} · ${detail.roomType}` : undefined}
        width="md"
        footer={
          detail && (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              {detail.status === "confirmed" && (
                <Button onClick={() => { checkIn(detail.id); setDetail(null); }}>Check in guest</Button>
              )}
              {detail.status === "checked-in" && (
                <Button onClick={() => { checkOut(detail.id); setDetail(null); }}>Check out guest</Button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Guest" value={detail.guestName} />
              <Detail label="Contact" value={detail.phone} />
              <Detail label="Email" value={detail.email} />
              <Detail label="Source" value={detail.source} />
              <Detail label="Room" value={`${detail.roomNumber ?? "—"} · ${detail.roomType}`} />
              <Detail label="Guests" value={`${detail.adults} adults${detail.children ? `, ${detail.children} children` : ""}`} />
              <Detail label="Check-in" value={prettyDate(detail.checkIn)} />
              <Detail label="Check-out" value={prettyDate(detail.checkOut)} />
              <Detail label="Nights" value={String(detail.nights)} />
              <Detail label="Rate" value={`${naira(detail.rate)} / night`} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
              <div>
                <p className="text-xs font-semibold">Total</p>
                <p className="text-[11px] text-muted-foreground">{detail.addOns.length ? `Add-ons: ${detail.addOns.join(", ")}` : "Room only"}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-semibold">{naira(detail.total)}</p>
                <StatusPill status={detail.paymentStatus} className="mt-1" />
              </div>
            </div>
            {detail.notes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail.notes}</p>
              </div>
            )}
            <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" /> Created {prettyDate(detail.createdAt)}
              <span className="ml-auto flex items-center gap-1"><Users className="size-3.5" /> {detail.status}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xs font-medium")}>{value}</p>
    </div>
  );
}
