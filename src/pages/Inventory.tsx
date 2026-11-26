import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { useStore } from "../lib/store";
import { naira } from "../lib/format";
import type { InventoryItem } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  Select,
  cn,
} from "../components/ui";

export default function Inventory() {
  const { db, adjustStock, addInventoryItem, addPurchaseOrder } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "F&B",
    quantity: "0",
    reorderLevel: "10",
    unitCost: "0",
    supplier: "",
  });

  const categories = useMemo(() => Array.from(new Set(db.inventory.map((i) => i.category))), [db.inventory]);

  const filtered = useMemo(() => {
    let list = db.inventory;
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q),
      );
    }
    return list;
  }, [db.inventory, category, search]);

  const lowStock = db.inventory.filter((i) => i.quantity <= i.reorderLevel);
  const stockValue = db.inventory.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addInventoryItem({
      sku: form.sku || `SKU-${Math.floor(100 + Math.random() * 899)}`,
      name: form.name,
      category: form.category,
      quantity: Number(form.quantity) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      unitCost: Number(form.unitCost) || 0,
      supplier: form.supplier || "Unassigned",
    });
    setOpen(false);
    setForm({ sku: "", name: "", category: "F&B", quantity: "0", reorderLevel: "10", unitCost: "0", supplier: "" });
  };

  const reorder = (item: InventoryItem) => {
    const qty = Math.max(item.reorderLevel * 2 - item.quantity, item.reorderLevel);
    addPurchaseOrder({
      supplier: item.supplier,
      description: `${item.name} × ${qty}`,
      total: qty * item.unitCost,
    });
    setNotice(`Purchase order drafted for ${item.name} × ${qty} — see Procurement.`);
    setTimeout(() => setNotice(""), 6000);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Supply chain"
        title="Inventory"
        description="Stock levels, reorder points and suppliers for every department."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add item</Button>}
      />

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InvStat label="SKUs tracked" value={String(db.inventory.length)} hint={`${categories.length} categories`} icon={Boxes} />
        <InvStat label="Low stock" value={String(lowStock.length)} hint="At or below reorder point" icon={AlertTriangle} tone="red" />
        <InvStat label="Stock value" value={naira(stockValue)} hint="At unit cost" icon={Warehouse} tone="gold" />
        <InvStat label="Open POs" value={String(db.purchaseOrders.filter((p) => p.status !== "received" && p.status !== "cancelled").length)} hint="Awaiting delivery" icon={ShoppingCart} tone="blue" />
      </div>

      {lowStock.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0" />
          <p className="flex-1">
            <span className="font-semibold">{lowStock.length} item{lowStock.length === 1 ? "" : "s"} need attention:</span>{" "}
            {lowStock.map((i) => i.name).join(", ")}
          </p>
        </div>
      )}

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  category === c ? "border-primary bg-accent text-accent-foreground" : "border-border bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "all" ? "All categories" : c}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, SKU, supplier…" className="w-full pl-8 sm:w-64" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base min-w-[960px]">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Stock level</th>
                <th className="text-right">Unit cost</th>
                <th className="text-right">Value</th>
                <th className="text-right">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const low = item.quantity <= item.reorderLevel;
                const pct = Math.min(100, (item.quantity / Math.max(item.reorderLevel * 2, 1)) * 100);
                return (
                  <tr key={item.id}>
                    <td>
                      <p className="text-xs font-semibold">{item.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{item.sku}</p>
                    </td>
                    <td className="text-xs text-muted-foreground">{item.category}</td>
                    <td className="text-xs text-muted-foreground">{item.supplier}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <Progress value={pct} tone={low ? "red" : "green"} />
                        </div>
                        <span className={cn("text-xs font-semibold", low && "text-destructive")}>{item.quantity}</span>
                        <span className="text-[10px] text-muted-foreground">/ reorder {item.reorderLevel}</span>
                      </div>
                    </td>
                    <td className="text-right text-xs">{naira(item.unitCost)}</td>
                    <td className="text-right text-xs font-semibold">{naira(item.quantity * item.unitCost)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          className="grid size-7 place-items-center rounded border border-border bg-white text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="size-3" />
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, 1)}
                          className="grid size-7 place-items-center rounded border border-border bg-white text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-3" />
                        </button>
                        <Button size="sm" variant="ghost" onClick={() => reorder(item)}>Reorder</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No items match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add inventory item"
        description="Create a new SKU with a reorder point and supplier."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-item"><Package className="size-4" /> Add item</Button>
          </>
        }
      >
        <form id="new-item" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item name" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="SKU" hint="Leave blank to auto-generate">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="BATH-001" />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["F&B", "Linen", "Toiletries", "Cleaning", "Technology", "Maintenance"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Quantity">
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Reorder level">
              <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </Field>
            <Field label="Unit cost (₦)">
              <Input type="number" min="0" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            </Field>
            <Field label="Supplier">
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InvStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Boxes;
  tone?: "gold" | "red" | "blue";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    red: "bg-rose-100 text-rose-700",
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
