import { useStore } from "../lib/store";
import { downloadCsv, naira, prettyDate } from "../lib/format";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Download,
  Landmark,
  Receipt,
  Scale,
} from "lucide-react";
import { Button, PageHeader, SectionCard, StatCard, StatusPill, cn } from "../components/ui";

const ledger = [
  { account: "Room revenue", code: "4010", debit: 0, credit: 64_700_000 },
  { account: "Food & beverage revenue", code: "4020", debit: 0, credit: 20_500_000 },
  { account: "Spa & other revenue", code: "4030", debit: 0, credit: 7_800_000 },
  { account: "Cost of sales — F&B", code: "5010", debit: 12_300_000, credit: 0 },
  { account: "Housekeeping & laundry", code: "5020", debit: 3_400_000, credit: 0 },
  { account: "Utilities", code: "5030", debit: 5_900_000, credit: 0 },
  { account: "Payroll", code: "5040", debit: 8_700_000, credit: 0 },
  { account: "Marketing", code: "5050", debit: 1_800_000, credit: 0 },
  { account: "Maintenance", code: "5060", debit: 1_600_000, credit: 0 },
  { account: "Bank — GTBank", code: "1010", debit: 71_400_000, credit: 68_200_000 },
  { account: "Accounts receivable", code: "1100", debit: 4_900_000, credit: 2_100_000 },
  { account: "Accounts payable", code: "2010", debit: 1_200_000, credit: 3_400_000 },
];

export default function Accounting() {
  const { db } = useStore();
  const revenue = db.payments.filter((p) => p.status === "paid" && p.type === "Room").reduce((s, p) => s + p.amount, 0) + 7_800_000;
  const expenses = 12_300_000 + 3_400_000 + 5_900_000 + 8_700_000 + 1_800_000 + 1_600_000;
  const netProfit = 93_000_000 - expenses;
  const unpaid = db.reservations.filter((r) => r.paymentStatus !== "paid" && r.status !== "cancelled");

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Accounting"
        description="General ledger, departmental P&L and outstanding invoices in one place."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("stayora-ledger.csv", [
                ["Account", "Code", "Debit", "Credit"],
                ...ledger.map((l) => [l.account, l.code, l.debit, l.credit]),
              ])
            }
          >
            <Download className="size-4" /> Export ledger
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (MTD)" value={naira(93_000_000)} delta="+11.5%" up hint="Rooms, F&B, other" icon={ArrowUpRight} tone="noir" />
        <StatCard label="Operating expenses" value={naira(expenses)} delta="+3.1%" up={false} hint="Excluding tax" icon={ArrowDownRight} />
        <StatCard label="Net profit" value={naira(netProfit)} delta="+18.2%" up hint={`${Math.round((netProfit / 93_000_000) * 100)}% margin`} icon={Scale} tone="gold" />
        <StatCard label="Outstanding invoices" value={naira(unpaid.reduce((s, r) => s + r.total, 0))} hint={`${unpaid.length} folios open`} icon={Receipt} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <SectionCard title="Trial balance" subtitle="July 2026 · ₦" className="xl:col-span-2" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[560px]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Code</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.code}>
                    <td className="text-xs font-medium">{row.account}</td>
                    <td className="font-mono text-[11px] text-muted-foreground">{row.code}</td>
                    <td className={cn("text-right text-xs", row.debit ? "font-semibold" : "text-muted-foreground")}>
                      {row.debit ? naira(row.debit) : "—"}
                    </td>
                    <td className={cn("text-right text-xs", row.credit ? "font-semibold" : "text-muted-foreground")}>
                      {row.credit ? naira(row.credit) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/50">
                  <td className="text-xs font-bold" colSpan={2}>Totals</td>
                  <td className="text-right text-xs font-bold">{naira(ledger.reduce((s, l) => s + l.debit, 0))}</td>
                  <td className="text-right text-xs font-bold">{naira(ledger.reduce((s, l) => s + l.credit, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <div className="noir-panel p-4">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-noir-muted">
              <Landmark className="size-3.5 text-primary" /> Bank position
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">{naira(32_400_000)}</p>
            <p className="text-[11px] text-noir-muted">GTBank · 0123456789</p>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs">
              <div className="flex justify-between text-noir-muted"><span>Receipts today</span><span className="font-semibold text-white">{naira(db.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0))}</span></div>
              <div className="flex justify-between text-noir-muted"><span>Pending transfers</span><span className="font-semibold text-white">{naira(240_000)}</span></div>
            </div>
          </div>

          <SectionCard title="Accounts" subtitle="Snapshot" bodyClassName="p-4">
            <div className="space-y-3 text-xs">
              {[
                { label: "Accounts receivable", value: naira(2_800_000), tone: "text-foreground" },
                { label: "Accounts payable", value: naira(2_200_000), tone: "text-destructive" },
                { label: "VAT payable", value: naira(1_450_000), tone: "text-foreground" },
                { label: "Guest deposits", value: naira(3_900_000), tone: "text-success" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={cn("font-semibold", row.tone)}>{row.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Outstanding invoices"
        subtitle={`${unpaid.length} folios awaiting settlement`}
        className="mt-4"
        bodyClassName="p-0"
        action={<span className="flex items-center gap-1 text-xs text-muted-foreground"><BookOpen className="size-3.5" /> Auto-reconciled</span>}
      >
        <div className="overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-semibold">{r.ref}</td>
                  <td className="text-xs">{r.guestName}</td>
                  <td className="text-xs text-muted-foreground">{r.roomNumber ?? "—"} · {r.roomType}</td>
                  <td className="text-xs text-muted-foreground">{prettyDate(r.checkIn)} → {prettyDate(r.checkOut)}</td>
                  <td><StatusPill status={r.paymentStatus} /></td>
                  <td className="text-right text-xs font-semibold">{naira(r.total)}</td>
                </tr>
              ))}
              {unpaid.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">All folios are settled.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
