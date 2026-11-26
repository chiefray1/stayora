import { useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Download,
  Play,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { downloadCsv, naira } from "../lib/format";
import { Button, PageHeader, Select, StatusPill, cn } from "../components/ui";

export default function Payroll() {
  const { db, runPayroll, setPayrollStatus } = useStore();
  const [month, setMonth] = useState(db.payroll[0]?.month ?? "This month");

  const total = db.payroll.reduce((s, p) => s + p.net, 0);
  const paid = db.payroll.filter((p) => p.status === "paid");
  const paidTotal = paid.reduce((s, p) => s + p.net, 0);
  const pendingTotal = total - paidTotal;
  const pending = db.payroll.filter((p) => p.status === "pending");

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Payroll & staff"
        description="Monthly payroll, allowances, deductions and payment status."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv("stayora-payroll.csv", [
                  ["Staff", "Role", "Basic", "Allowances", "Deductions", "Net", "Month", "Status"],
                  ...db.payroll.map((p) => [p.name, p.role, p.basic, p.allowances, p.deductions, p.net, p.month, p.status]),
                ])
              }
            >
              <Download className="size-4" /> Export
            </Button>
            <Button
              onClick={() => {
                if (window.confirm(`Run payroll for ${pending.length} pending staff? This marks all records as paid.`)) runPayroll();
              }}
              disabled={pending.length === 0}
            >
              <Play className="size-4" /> Run payroll
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayStat label="Payroll cost" value={naira(total)} hint={`${db.payroll.length} staff`} icon={Wallet} tone="gold" />
        <PayStat label="Paid" value={naira(paidTotal)} hint={`${paid.length} staff settled`} icon={BadgeCheck} tone="green" />
        <PayStat label="Pending" value={naira(pendingTotal)} hint={`${pending.length} awaiting payment`} icon={Banknote} tone="amber" />
        <PayStat label="Average net" value={naira(Math.round(total / Math.max(1, db.payroll.length)))} hint="Per staff member" icon={Users} tone="blue" />
      </div>

      <div className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-gold" />
            <span className="font-semibold">Payroll run</span>
            <Select value={month} onChange={(e) => setMonth(e.target.value)} className="ml-2 w-44">
              <option value={month}>{month}</option>
            </Select>
          </div>
          <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", pending.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
            {pending.length ? `${pending.length} pending payments` : "All staff paid"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th className="text-right">Basic</th>
                <th className="text-right">Allowances</th>
                <th className="text-right">Deductions</th>
                <th className="text-right">Net pay</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {db.payroll.map((record) => (
                <tr key={record.id}>
                  <td className="text-xs font-semibold">{record.name}</td>
                  <td className="text-xs text-muted-foreground">{record.role}</td>
                  <td className="text-right text-xs">{naira(record.basic)}</td>
                  <td className="text-right text-xs text-success">+{naira(record.allowances)}</td>
                  <td className="text-right text-xs text-destructive">-{naira(record.deductions)}</td>
                  <td className="text-right text-xs font-semibold">{naira(record.net)}</td>
                  <td><StatusPill status={record.status} /></td>
                  <td>
                    <div className="flex justify-end">
                      {record.status === "pending" ? (
                        <Button size="sm" variant="soft" onClick={() => setPayrollStatus(record.id, "paid")}>Pay</Button>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Settled</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50">
                <td colSpan={5} className="px-4 py-3 text-xs font-bold">Total net payroll</td>
                <td className="px-4 py-3 text-right text-xs font-bold">{naira(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-[11px] text-muted-foreground">
        Payroll is calculated from basic salary, 15% allowances and 8% statutory deductions. Payments are
        simulated in this demo — connect a payroll provider to disburse funds.
      </div>
    </div>
  );
}

function PayStat({
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
  tone?: "gold" | "green" | "amber" | "blue";
}) {
  const tones = {
    gold: "bg-primary/10 text-gold",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
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
