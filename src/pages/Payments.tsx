import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CreditCard,
  Download,
  Plus,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { downloadCsv, naira, prettyDate, todayISO } from "../lib/format";
import type { Payment } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
} from "../components/ui";

export default function Payments() {
  const { db, recordPayment } = useStore();
  const today = todayISO();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    guestName: "",
    reservationRef: "",
    amount: "",
    method: "Card" as Payment["method"],
    type: "Room" as Payment["type"],
    date: today,
  });

  const filtered = useMemo(() => {
    let list = [...db.payments].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (tab !== "all") list = list.filter((p) => p.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.guestName.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          (p.reservationRef ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [db.payments, tab, search]);

  const paid = db.payments.filter((p) => p.status === "paid");
  const collectedToday = paid.filter((p) => p.date === today).reduce((s, p) => s + p.amount, 0);
  const collectedTotal = paid.reduce((s, p) => s + p.amount, 0);
  const outstanding = db.payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0) +
    db.reservations.filter((r) => r.paymentStatus === "unpaid" && r.status !== "cancelled").reduce((s, r) => s + r.total, 0);
  const refunded = db.payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!form.guestName.trim() || !amount || amount <= 0) {
      setError("Guest name and a valid amount are required.");
      return;
    }
    recordPayment({
      ref: `PAY-${Math.floor(9200 + Math.random() * 700)}`,
      guestName: form.guestName.trim(),
      reservationRef: form.reservationRef || undefined,
      amount,
      method: form.method,
      status: "paid",
      type: form.type,
      date: form.date,
    });
    setOpen(false);
    setForm({ ...form, guestName: "", reservationRef: "", amount: "" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        description="Every transaction across rooms, restaurant, transport and other folios."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv("stayora-payments.csv", [
                  ["Reference", "Guest", "Reservation", "Type", "Method", "Date", "Status", "Amount"],
                  ...filtered.map((p) => [p.ref, p.guestName, p.reservationRef ?? "", p.type, p.method, p.date, p.status, p.amount]),
                ])
              }
            >
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Record payment</Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayStat label="Collected today" value={naira(collectedToday)} hint={`${paid.filter((p) => p.date === today).length} transactions`} icon={Wallet} tone="gold" />
        <PayStat label="Collected all time" value={naira(collectedTotal)} hint={`${paid.length} settled payments`} icon={CreditCard} />
        <PayStat label="Outstanding" value={naira(outstanding)} hint="Unpaid folios & pending" icon={Receipt} tone="amber" />
        <PayStat label="Refunded" value={naira(refunded)} hint="Cancellations & adjustments" icon={ArrowDownLeft} tone="red" />
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "all", label: "All", count: db.payments.length },
              { id: "paid", label: "Paid", count: db.payments.filter((p) => p.status === "paid").length },
              { id: "pending", label: "Pending", count: db.payments.filter((p) => p.status === "pending").length },
              { id: "refunded", label: "Refunded", count: db.payments.filter((p) => p.status === "refunded").length },
            ]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest, ref…" className="w-full pl-8 sm:w-60" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Reservation</th>
                <th>Type</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold">{p.ref}</td>
                  <td className="text-xs font-medium">{p.guestName}</td>
                  <td className="font-mono text-[11px] text-muted-foreground">{p.reservationRef ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{p.type}</td>
                  <td className="text-xs text-muted-foreground">{p.method}</td>
                  <td className="text-xs text-muted-foreground">{prettyDate(p.date)}</td>
                  <td><StatusPill status={p.status} /></td>
                  <td className="text-right text-xs font-semibold">{naira(p.amount)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No payments match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        description="Post a payment against a reservation or a walk-in folio."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-payment">Record payment</Button>
          </>
        }
      >
        <form id="new-payment" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guest name">
              <Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} required />
            </Field>
            <Field label="Reservation (optional)">
              <Select value={form.reservationRef} onChange={(e) => setForm({ ...form, reservationRef: e.target.value })}>
                <option value="">No reservation</option>
                {db.reservations.filter((r) => r.status !== "cancelled").slice(0, 40).map((r) => (
                  <option key={r.id} value={r.ref}>{r.ref} · {r.guestName}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (₦)">
              <Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="120000" required />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Method">
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as Payment["method"] })}>
                {["Card", "Transfer", "Cash", "POS", "Paystack"].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Payment["type"] })}>
                {["Room", "Restaurant", "Transport", "Venue", "Service", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          {error && <p className="rounded-lg border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}

function PayStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone?: "default" | "gold" | "amber" | "red";
}) {
  const tones = {
    default: "bg-primary/10 text-gold",
    gold: "bg-primary/15 text-gold",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
