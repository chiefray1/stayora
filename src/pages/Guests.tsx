import { useMemo, useState } from "react";
import {
  Crown,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { downloadCsv, naira, prettyDate } from "../lib/format";
import type { Guest, VipTier } from "../lib/types";
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
  VipPill,
  cn,
} from "../components/ui";

export default function Guests() {
  const { db, addGuest, updateGuest } = useStore();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "Nigeria",
    vip: "None" as VipTier,
  });
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    let list = [...db.guests].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
    if (tier !== "all") list = list.filter((g) => g.vip === tier);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.email.toLowerCase().includes(q) ||
          g.phone.includes(q) ||
          g.country.toLowerCase().includes(q),
      );
    }
    return list;
  }, [db.guests, tier, search]);

  const vipCount = db.guests.filter((g) => g.vip !== "None").length;
  const repeat = db.guests.filter((g) => g.stays > 1).length;
  const avgLtv = db.guests.length
    ? Math.round(db.guests.reduce((sum, g) => sum + g.lifetimeValue, 0) / db.guests.length)
    : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Name, email and phone are required.");
      return;
    }
    addGuest({
      ...form,
      loyaltyPoints: 0,
      stays: 0,
      lifetimeValue: 0,
    });
    setOpen(false);
    setForm({ name: "", email: "", phone: "", country: "Nigeria", vip: "None" });
  };

  const saveNote = () => {
    if (!selected) return;
    updateGuest(selected.id, { notes: note });
    setSelected({ ...selected, notes: note });
  };

  const guestReservations = selected
    ? db.reservations.filter((r) => r.guestId === selected.id).slice(0, 5)
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Guest experience"
        title="Guest CRM"
        description="Profiles, VIP tiers, loyalty points and lifetime value for every guest."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv("stayora-guests.csv", [
                  ["Name", "Email", "Phone", "Country", "VIP", "Stays", "Points", "Lifetime value"],
                  ...filtered.map((g) => [g.name, g.email, g.phone, g.country, g.vip, g.stays, g.loyaltyPoints, g.lifetimeValue]),
                ])
              }
            >
              Export
            </Button>
            <Button onClick={() => setOpen(true)}>
              <UserPlus className="size-4" /> Add guest
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GuestStat icon={Users} label="Guest profiles" value={String(db.guests.length)} hint="Total in CRM" />
        <GuestStat icon={Crown} label="VIP guests" value={String(vipCount)} hint="Silver, Gold & Platinum" />
        <GuestStat icon={Star} label="Repeat guests" value={`${Math.round((repeat / Math.max(1, db.guests.length)) * 100)}%`} hint={`${repeat} returning`} />
        <GuestStat icon={Star} label="Average LTV" value={naira(avgLtv)} hint="Lifetime value" />
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={tier}
            onChange={setTier}
            tabs={[
              { id: "all", label: "All guests", count: db.guests.length },
              { id: "Platinum", label: "Platinum" },
              { id: "Gold", label: "Gold" },
              { id: "Silver", label: "Silver" },
              { id: "None", label: "Standard" },
            ]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone…"
              className="w-full pl-8 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base min-w-[880px]">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Tier</th>
                <th>Stays</th>
                <th>Loyalty points</th>
                <th>Lifetime value</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="cursor-pointer" onClick={() => { setSelected(g); setNote(g.notes ?? ""); }}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={g.name} size="sm" />
                      <div>
                        <p className="text-xs font-semibold">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground">Since {prettyDate(g.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-xs">{g.email}</p>
                    <p className="text-[10px] text-muted-foreground">{g.phone}</p>
                  </td>
                  <td className="text-xs text-muted-foreground">{g.country}</td>
                  <td><VipPill tier={g.vip} /></td>
                  <td className="text-xs font-semibold">{g.stays}</td>
                  <td className="text-xs">{g.loyaltyPoints.toLocaleString("en-NG")}</td>
                  <td className="text-xs font-semibold">{naira(g.lifetimeValue)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setSelected(g); setNote(g.notes ?? ""); }}>
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No guests match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add guest profile"
        description="Create a CRM profile for a new or returning guest."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-guest"><Plus className="size-4" /> Create profile</Button>
          </>
        }
      >
        <form id="new-guest" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label="VIP tier">
              <Select value={form.vip} onChange={(e) => setForm({ ...form, vip: e.target.value as VipTier })}>
                {["None", "Silver", "Gold", "Platinum"].map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          {error && <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Guest"}
        description={selected ? `${selected.country} · guest since ${prettyDate(selected.createdAt)}` : undefined}
        width="lg"
        footer={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={selected.name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl font-semibold">{selected.name}</p>
                  <VipPill tier={selected.vip} />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" /> {selected.email}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="size-3" /> {selected.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lifetime value</p>
                <p className="font-display text-2xl font-semibold">{naira(selected.lifetimeValue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/60 px-2 py-3">
                <p className="font-display text-xl font-semibold">{selected.stays}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stays</p>
              </div>
              <div className="rounded-lg bg-muted/60 px-2 py-3">
                <p className="font-display text-xl font-semibold">{selected.loyaltyPoints.toLocaleString("en-NG")}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</p>
              </div>
              <div className="rounded-lg bg-muted/60 px-2 py-3">
                <p className="font-display text-xl font-semibold">{guestReservations.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent bookings</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reservation history</p>
              <div className="overflow-hidden rounded-lg border border-border">
                {guestReservations.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">No reservations yet.</p>
                )}
                {guestReservations.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 text-xs last:border-0">
                    <span className="font-mono font-semibold">{r.ref}</span>
                    <span className="text-muted-foreground">{r.roomType} {r.roomNumber ?? ""}</span>
                    <span className="text-muted-foreground">{prettyDate(r.checkIn)} → {prettyDate(r.checkOut)}</span>
                    <span className="ml-auto font-semibold">{naira(r.total)}</span>
                    <StatusPill status={r.status} />
                  </div>
                ))}
              </div>
            </div>

            <Field label="Preferences & notes">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, room preferences, special occasions…" />
            </Field>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveNote} disabled={note === (selected.notes ?? "")}>
                Save note
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GuestStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <Icon className="size-4 text-gold" />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none">{value}</p>
      <p className={cn("mt-1 text-[10px] text-muted-foreground")}>{hint}</p>
    </div>
  );
}
