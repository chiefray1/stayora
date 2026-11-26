import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Plus,
  Send,
  Truck,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { naira, prettyDate } from "../lib/format";
import type { PurchaseOrder } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  cn,
} from "../components/ui";

export default function Procurement() {
  const { db, addPurchaseOrder, setPoStatus } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier: "Lagos Hospitality Supplies",
    description: "",
    total: "",
  });

  const suppliers = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; spend: number }>();
    db.purchaseOrders.forEach((po) => {
      const current = map.get(po.supplier) ?? { name: po.supplier, orders: 0, spend: 0 };
      map.set(po.supplier, { name: po.supplier, orders: current.orders + 1, spend: current.spend + po.total });
    });
    db.inventory.forEach((item) => {
      if (!map.has(item.supplier)) map.set(item.supplier, { name: item.supplier, orders: 0, spend: 0 });
    });
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [db.purchaseOrders, db.inventory]);

  const openOrders = db.purchaseOrders.filter((p) => p.status === "draft" || p.status === "sent");
  const spend = db.purchaseOrders.filter((p) => p.status !== "cancelled").reduce((s, p) => s + p.total, 0);
  const received = db.purchaseOrders.filter((p) => p.status === "received").length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(form.total);
    if (!form.description.trim() || !total) return;
    addPurchaseOrder({ supplier: form.supplier, description: form.description.trim(), total });
    setOpen(false);
    setForm({ ...form, description: "", total: "" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Supply chain"
        title="Procurement"
        description="Purchase orders, supplier spend and delivery tracking."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New purchase order</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProcStat label="Open orders" value={String(openOrders.length)} hint="Draft & sent" icon={ClipboardList} tone="amber" />
        <ProcStat label="Received" value={String(received)} hint="Delivered orders" icon={CheckCircle2} tone="green" />
        <ProcStat label="Total spend" value={naira(spend)} hint="All active POs" icon={Wallet} />
        <ProcStat label="Suppliers" value={String(suppliers.length)} hint="Approved vendors" icon={Building2} tone="blue" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div className="surface-card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Purchase orders</h2>
              <p className="text-xs text-muted-foreground">Track from draft to delivery</p>
            </div>
            <Truck className="size-5 text-gold" />
          </div>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="font-mono text-xs font-semibold">{po.ref}</td>
                    <td className="text-xs">{po.supplier}</td>
                    <td className="max-w-[220px] truncate text-xs text-muted-foreground">{po.description}</td>
                    <td className="text-xs text-muted-foreground">{prettyDate(po.date)}</td>
                    <td><StatusPill status={po.status} /></td>
                    <td className="text-right text-xs font-semibold">{naira(po.total)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {po.status === "draft" && (
                          <Button size="sm" variant="soft" onClick={() => setPoStatus(po.id, "sent")}>Send</Button>
                        )}
                        {po.status === "sent" && (
                          <Button size="sm" variant="outline" onClick={() => setPoStatus(po.id, "received")}>Receive</Button>
                        )}
                        {(po.status === "draft" || po.status === "sent") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-rose-50"
                            onClick={() => setPoStatus(po.id, "cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                        {po.status === "received" && <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Delivered</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Suppliers</h2>
            <p className="text-xs text-muted-foreground">Spend to date</p>
          </div>
          <div className="divide-y divide-border">
            {suppliers.map((supplier, i) => (
              <div key={supplier.name} className="flex items-center gap-3 px-5 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-bold text-gold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{supplier.name}</p>
                  <p className="text-[10px] text-muted-foreground">{supplier.orders} orders</p>
                </div>
                <p className="text-xs font-semibold">{naira(supplier.spend)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New purchase order"
        description="Draft a PO. It can be sent to the supplier once reviewed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-po"><Send className="size-4" /> Save draft</Button>
          </>
        }
      >
        <form id="new-po" onSubmit={submit} className="space-y-4">
          <Field label="Supplier">
            <Select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
              {suppliers.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              <option value="New supplier">New supplier…</option>
            </Select>
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Bath amenities × 200" required />
          </Field>
          <Field label="Total value (₦)">
            <Input type="number" min="1" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required />
          </Field>
          <p className={cn("rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground")}>
            New POs are created as drafts. Send them from the procurement table to notify the supplier.
          </p>
        </form>
      </Modal>
    </div>
  );
}

function ProcStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone?: "gold" | "amber" | "green" | "blue";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    amber: "bg-amber-100 text-amber-700",
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
