import { ChefHat, Clock3, Flame, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useStore } from "../lib/store";
import { naira } from "../lib/format";
import { Button, PageHeader, SectionCard, StatCard, cn } from "../components/ui";

const columns = [
  { status: "open" as const, label: "New orders", hint: "Waiting to be started", tone: "border-amber-200 bg-amber-50" },
  { status: "preparing" as const, label: "On the pass", hint: "Cooking now", tone: "border-sky-200 bg-sky-50" },
  { status: "served" as const, label: "Ready to serve", hint: "Pick up from the pass", tone: "border-emerald-200 bg-emerald-50" },
];

export default function Kitchen() {
  const { db, advancePosOrder } = useStore();
  const active = db.posOrders.filter((order) => order.status !== "posted");
  const openCount = db.posOrders.filter((order) => order.status === "open").length;
  const preparing = db.posOrders.filter((order) => order.status === "preparing").length;
  const served = db.posOrders.filter((order) => order.status === "served").length;
  const roomService = active.filter((order) => order.channel === "Room service").length;
  const activeValue = active.reduce((sum, order) => sum + order.total, 0);

  const nextLabel = (status: string) =>
    status === "open" ? "Start cooking" : status === "preparing" ? "Mark ready" : "Close ticket";

  return (
    <div>
      <PageHeader
        eyebrow="Food & beverage"
        title="Kitchen display"
        description="Live tickets from the restaurant, bar and room service. Keep every course moving."
        actions={
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" /> Refresh pass
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="New orders" value={String(openCount)} hint="Waiting to start" icon={ChefHat} tone="noir" />
        <StatCard label="Cooking now" value={String(preparing)} hint="On the line" icon={Flame} />
        <StatCard label="Ready to serve" value={String(served)} hint="At the pass" icon={UtensilsCrossed} />
        <StatCard label="Room service" value={String(roomService)} hint={`${naira(activeValue)} open value`} icon={Clock3} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {columns.map((column) => {
          const orders = db.posOrders.filter((order) => order.status === column.status);
          return (
            <SectionCard
              key={column.status}
              title={column.label}
              subtitle={`${orders.length} ticket${orders.length === 1 ? "" : "s"} · ${column.hint}`}
              bodyClassName="space-y-2"
            >
              {orders.map((order) => (
                <article key={order.id} className={cn("rounded-lg border p-3", column.tone)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{order.ref}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.channel}
                        {order.roomNumber ? ` · Room ${order.roomNumber}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
                      {order.items.reduce((sum, item) => sum + item.qty, 0)} items
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 border-t border-black/5 pt-2 text-xs">
                    {order.items.map((item) => (
                      <li key={item.name} className="flex items-center justify-between gap-2">
                        <span>
                          <span className="font-semibold">{item.qty}×</span> {item.name}
                        </span>
                        <span className="text-muted-foreground">{naira(item.qty * item.price)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2">
                    <span className="text-xs font-semibold">{naira(order.total)}</span>
                    <Button size="sm" onClick={() => advancePosOrder(order.id)}>
                      {nextLabel(order.status)}
                    </Button>
                  </div>
                </article>
              ))}
              {orders.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                  No tickets in this stage.
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
