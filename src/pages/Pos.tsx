import { useMemo, useState } from "react";
import {
  BookOpen,
  ChefHat,
  Minus,
  Plus,
  Receipt,
  Utensils,
} from "lucide-react";
import { useStore } from "../lib/store";
import { naira, todayISO } from "../lib/format";
import type { PosItem, PosOrder } from "../lib/types";
import {
  Button,
  Field,
  PageHeader,
  Select,
  StatusPill,
  cn,
} from "../components/ui";

const menu = [
  { name: "Jollof rice & chicken", price: 9_500, category: "Mains" },
  { name: "Grilled sea bass", price: 24_000, category: "Mains" },
  { name: "Club sandwich", price: 11_000, category: "Mains" },
  { name: "Suya platter", price: 14_500, category: "Starters" },
  { name: "Pepper soup", price: 8_000, category: "Starters" },
  { name: "Breakfast buffet", price: 15_000, category: "Breakfast" },
  { name: "Chapman", price: 4_000, category: "Drinks" },
  { name: "Fresh juice", price: 4_500, category: "Drinks" },
  { name: "House red (bottle)", price: 38_500, category: "Bar" },
  { name: "Signature cocktail", price: 8_500, category: "Bar" },
];

const flow: PosOrder["status"][] = ["open", "preparing", "served", "posted"];
const nextLabel: Record<PosOrder["status"], string> = {
  open: "Send to kitchen",
  preparing: "Mark served",
  served: "Post to folio",
  posted: "Posted",
};

export default function Pos() {
  const { db, addPosOrder, advancePosOrder } = useStore();
  const today = todayISO();
  const [channel, setChannel] = useState<PosOrder["channel"]>("Restaurant");
  const [roomNumber, setRoomNumber] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  const items: PosItem[] = useMemo(
    () =>
      menu
        .filter((m) => (cart[m.name] ?? 0) > 0)
        .map((m) => ({ name: m.name, qty: cart[m.name], price: m.price })),
    [cart],
  );
  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  const revenueToday = db.posOrders
    .filter((o) => o.date === today)
    .reduce((sum, o) => sum + o.total, 0);
  const open = db.posOrders.filter((o) => o.status !== "posted");
  const postedToRooms = db.posOrders.filter((o) => o.roomNumber && o.status === "posted");

  const bump = (name: string, delta: number) =>
    setCart((prev) => {
      const next = Math.max(0, (prev[name] ?? 0) + delta);
      return { ...prev, [name]: next };
    });

  const placeOrder = () => {
    if (items.length === 0) return;
    addPosOrder({ roomNumber: roomNumber || undefined, items, channel });
    setCart({});
    setRoomNumber("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Food & beverage"
        title="Restaurant & bar"
        description="Take orders, run the kitchen line and post charges straight to guest folios."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
            <ChefHat className="size-4 text-gold" /> {open.length} active tickets
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PosStat label="Revenue today" value={naira(revenueToday)} hint={`${db.posOrders.filter((o) => o.date === today).length} orders`} icon={Receipt} />
        <PosStat label="Open tickets" value={String(open.length)} hint="In the kitchen line" icon={ChefHat} tone="amber" />
        <PosStat label="Posted to rooms" value={String(postedToRooms.length)} hint="Charged to folios" icon={BookOpen} tone="blue" />
        <PosStat label="Average check" value={naira(db.posOrders.length ? Math.round(db.posOrders.reduce((s, o) => s + o.total, 0) / db.posOrders.length) : 0)} hint="All channels" icon={Utensils} tone="green" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.3fr]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">New order</h2>
            <p className="text-xs text-muted-foreground">Tap items to build a ticket</p>
          </div>
          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Channel">
                <Select value={channel} onChange={(e) => setChannel(e.target.value as PosOrder["channel"])}>
                  {["Restaurant", "Bar", "Room service"].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Charge to room (optional)">
                <Select value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}>
                  <option value="">Walk-in / table</option>
                  {db.rooms.filter((r) => r.status === "occupied").map((r) => (
                    <option key={r.id} value={r.number}>Room {r.number} · {r.guest ?? r.type}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {menu.map((item) => {
                const qty = cart[item.name] ?? 0;
                return (
                  <div
                    key={item.name}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                      qty > 0 ? "border-primary/40 bg-accent/50" : "border-border bg-white",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.category} · {naira(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => bump(item.name, -1)}
                        className="grid size-6 place-items-center rounded border border-border bg-white text-muted-foreground hover:text-foreground disabled:opacity-40"
                        disabled={qty === 0}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-4 text-center font-semibold">{qty}</span>
                      <button
                        onClick={() => bump(item.name, 1)}
                        className="grid size-6 place-items-center rounded border border-border bg-white text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order total</p>
                <p className="font-display text-2xl font-semibold">{naira(total)}</p>
              </div>
              <Button onClick={placeOrder} disabled={items.length === 0}>
                <Plus className="size-4" /> Create order
              </Button>
            </div>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Kitchen & bar tickets</h2>
              <p className="text-xs text-muted-foreground">Today's orders</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">{db.posOrders.length} orders</span>
          </div>
          <div className="divide-y divide-border">
            {db.posOrders.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
                  <Utensils className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">
                    {order.ref} · {order.channel}
                    {order.roomNumber ? ` · Room ${order.roomNumber}` : ""}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">{naira(order.total)}</p>
                  <StatusPill status={order.status} />
                </div>
                {order.status !== "posted" ? (
                  <Button
                    size="sm"
                    variant={order.status === "open" ? "soft" : "outline"}
                    onClick={() => advancePosOrder(order.id)}
                  >
                    {nextLabel[order.status]}
                  </Button>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Settled</span>
                )}
              </div>
            ))}
            {db.posOrders.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No orders yet today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PosStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Receipt;
  tone?: "gold" | "amber" | "blue" | "green";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
    green: "bg-emerald-100 text-emerald-700",
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
