import { useMemo, useState } from "react";
import { Plus, Shirt, Sparkles, Timer, Truck } from "lucide-react";
import { useStore } from "../lib/store";
import type { LaundryService, LaundryStage } from "../lib/types";
import { addDays, naira, prettyDate, todayISO } from "../lib/format";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
  StatusPill,
  Textarea,
  cn,
} from "../components/ui";

const services: LaundryService[] = ["Wash & fold", "Dry clean", "Press only", "Express wash"];
const stages: { id: LaundryStage; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "washing", label: "Washing" },
  { id: "ironing", label: "Ironing" },
  { id: "ready", label: "Ready" },
  { id: "delivered", label: "Delivered" },
];

const emptyForm = {
  guestName: "",
  roomNumber: "",
  service: "Wash & fold" as LaundryService,
  itemCount: 4,
  price: 12_000,
  express: false,
  pickupAt: todayISO(),
  returnAt: addDays(todayISO(), 2),
  notes: "",
};

export default function Laundry() {
  const { db, addLaundryTicket, advanceLaundryStage, logAudit } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const active = db.laundry.filter((ticket) => ticket.stage !== "delivered");
  const express = active.filter((ticket) => ticket.express).length;
  const ready = db.laundry.filter((ticket) => ticket.stage === "ready").length;
  const revenue = db.laundry.reduce((sum, ticket) => sum + ticket.price, 0);
  const stageIndex = (stage: LaundryStage) => stages.findIndex((item) => item.id === stage);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [stage.id, db.laundry.filter((ticket) => ticket.stage === stage.id).length]),
      ) as Record<LaundryStage, number>,
    [db.laundry],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.guestName.trim()) return;
    addLaundryTicket({
      guestName: form.guestName.trim(),
      roomNumber: form.roomNumber.trim() || undefined,
      service: form.service,
      itemCount: Number(form.itemCount),
      price: Number(form.price),
      express: form.express,
      pickupAt: form.pickupAt,
      returnAt: form.returnAt,
      notes: form.notes.trim() || undefined,
    });
    logAudit(`Created laundry ticket for ${form.guestName.trim()}`, "Laundry");
    setOpen(false);
    setForm(emptyForm);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Guest services"
        title="Laundry & valet"
        description="Track every garment from collection to delivery with express and dry-clean handling."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New ticket</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Active tickets" value={String(active.length)} hint={`${counts.received} awaiting collection`} icon={Shirt} tone="noir" />
        <StatCard label="Express items" value={String(express)} hint="Same-day promise" icon={Timer} />
        <StatCard label="Ready for delivery" value={String(ready)} hint="Awaiting runner" icon={Truck} />
        <StatCard label="Laundry revenue" value={naira(revenue)} hint="This period" icon={Sparkles} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {stages.map((stage) => (
          <div key={stage.id} className="surface-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stage.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{counts[stage.id]}</p>
          </div>
        ))}
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Laundry board</h2>
            <p className="text-xs text-muted-foreground">Move tickets through washing, ironing and delivery.</p>
          </div>
          <StatusPill status={`${active.length} active`} />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Guest</th>
                <th>Service</th>
                <th>Items</th>
                <th>Return</th>
                <th>Value</th>
                <th>Stage</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {db.laundry.map((ticket) => {
                const next = stages[Math.min(stageIndex(ticket.stage) + 1, stages.length - 1)];
                return (
                  <tr key={ticket.id}>
                    <td>
                      <p className="text-xs font-semibold">{ticket.ref}</p>
                      <p className="text-[10px] text-muted-foreground">{prettyDate(ticket.createdAt)}</p>
                    </td>
                    <td>
                      <p className="text-xs font-medium">{ticket.guestName}</p>
                      <p className="text-[10px] text-muted-foreground">{ticket.roomNumber ? `Room ${ticket.roomNumber}` : "Walk-in"}</p>
                    </td>
                    <td className="text-xs">{ticket.service}{ticket.express ? " · Express" : ""}</td>
                    <td className="text-xs">{ticket.itemCount}</td>
                    <td className="text-xs">{prettyDate(ticket.returnAt)}</td>
                    <td className="text-xs font-semibold">{naira(ticket.price)}</td>
                    <td><StatusPill status={ticket.stage} /></td>
                    <td className="text-right">
                      {ticket.stage === "delivered" ? (
                        <span className="text-[11px] text-muted-foreground">Completed</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            advanceLaundryStage(ticket.id, next.id);
                            logAudit(`Laundry ${ticket.ref} moved to ${next.label}`, "Laundry");
                          }}
                        >
                          {next.label}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {db.laundry.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No laundry tickets yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New laundry ticket"
        description="Capture the guest, service level and promised return date."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="laundry-form"><Shirt className="size-4" /> Create ticket</Button>
          </>
        }
      >
        <form id="laundry-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guest name">
              <Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="e.g. Adaeze Okonkwo" required />
            </Field>
            <Field label="Room number">
              <Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Service">
              <Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value as LaundryService })}>
                {services.map((service) => <option key={service} value={service}>{service}</option>)}
              </Select>
            </Field>
            <Field label="Item count">
              <Input type="number" min={1} value={form.itemCount} onChange={(e) => setForm({ ...form, itemCount: Number(e.target.value) })} />
            </Field>
            <Field label="Price (₦)">
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </Field>
            <Field label="Pickup date">
              <Input type="date" value={form.pickupAt} onChange={(e) => setForm({ ...form, pickupAt: e.target.value })} />
            </Field>
            <Field label="Return date">
              <Input type="date" value={form.returnAt} onChange={(e) => setForm({ ...form, returnAt: e.target.value })} />
            </Field>
            <label className={cn("flex cursor-pointer items-center gap-2 self-end rounded-lg border px-3 py-2 text-xs", form.express ? "border-primary/40 bg-accent" : "border-border bg-white")}>
              <input type="checkbox" checked={form.express} onChange={(e) => setForm({ ...form, express: e.target.checked })} className="size-3.5 accent-[oklch(62%_0.096_78)]" />
              Express same-day service
            </label>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Garment details, stains, special instructions…" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
