import { useMemo, useState } from "react";
import {
  BedDouble,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Download,
  HandCoins,
  Link2,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { addDays, daysBetween, downloadCsv, naira, shortDate, todayISO } from "../lib/format";
import { CHANNEL_KIND_LABEL, channelPerformance } from "../lib/channels";
import type { Payment } from "../lib/types";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
} from "../components/ui";
import { Donut, OccupancyChart } from "../components/Charts";

const streamDefinitions: { label: string; types: Payment["type"][] }[] = [
  { label: "Rooms", types: ["Room"] },
  { label: "Food & beverage", types: ["Restaurant"] },
  { label: "Transport", types: ["Transport"] },
  { label: "Venues & events", types: ["Venue"] },
  { label: "Guest services", types: ["Service"] },
  { label: "Other income", types: ["Other"] },
];

export default function Reports() {
  const { db, addNotification } = useStore();
  const today = todayISO();
  const [from, setFrom] = useState(addDays(today, -180));
  const [to, setTo] = useState(today);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    name: "Daily flash report",
    frequency: "Daily",
    recipients: "All staff",
    format: "CSV",
  });

  const occupied = db.rooms.filter((room) => room.status === "occupied");
  const occupancy = Math.round((occupied.length / db.rooms.length) * 100);
  const adr = occupied.length ? Math.round(occupied.reduce((sum, room) => sum + room.rate, 0) / occupied.length) : 0;

  const periodPayments = useMemo(
    () => db.payments.filter((payment) => payment.status === "paid" && payment.date >= from && payment.date <= to),
    [db.payments, from, to],
  );
  const roomRevenue = periodPayments
    .filter((payment) => payment.type === "Room")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const otherRevenue = periodPayments
    .filter((payment) => payment.type !== "Room")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalRevenue = roomRevenue + otherRevenue;
  const periodDays = Math.max(1, daysBetween(from, to) + 1);
  const availableRoomNights = db.rooms.length * periodDays;
  const revpar = Math.round(roomRevenue / availableRoomNights);
  const trevpar = Math.round(totalRevenue / availableRoomNights);

  const operatingExpenses = useMemo(
    () =>
      db.purchaseOrders
        .filter((order) => order.status !== "cancelled" && order.date >= from && order.date <= to)
        .reduce((sum, order) => sum + order.total, 0),
    [db.purchaseOrders, from, to],
  );
  const netContribution = totalRevenue - operatingExpenses;
  const gopMargin = totalRevenue ? Math.round((netContribution / totalRevenue) * 100) : 0;

  const channelRows = useMemo(
    () => channelPerformance(db.reservations, db.channels, { from, to }),
    [db.reservations, db.channels, from, to],
  );
  const sortedChannels = [...channelRows].sort((a, b) => b.revenue - a.revenue);
  const channelBookings = channelRows.reduce((sum, row) => sum + row.bookings, 0);
  const totalCommission = channelRows.reduce((sum, row) => sum + row.commission, 0);

  const revenueStreams = streamDefinitions
    .map((stream) => {
      const payments = periodPayments.filter((payment) => stream.types.includes(payment.type));
      const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      return {
        label: stream.label,
        transactions: payments.length,
        revenue,
        share: totalRevenue ? Math.round((revenue / totalRevenue) * 100) : 0,
        average: payments.length ? Math.round(revenue / payments.length) : 0,
      };
    })
    .filter((stream) => stream.revenue > 0);

  const exportReport = () => {
    downloadCsv("stayora-report.csv", [
      ["Stayora Hotel — management report", `${from} to ${to}`],
      [],
      ["Metric", "Value"],
      ["Occupancy today", `${occupancy}%`],
      ["ADR today", adr],
      ["RevPAR (period)", revpar],
      ["TRevPAR (period)", trevpar],
      ["Room revenue", roomRevenue],
      ["Other revenue", otherRevenue],
      ["Total revenue", totalRevenue],
      ["Operating purchases", operatingExpenses],
      ["Net contribution", netContribution],
      [],
      ["Channel", "Type", "Bookings", "Room nights", "Revenue", "Commission", "Net", "Share"],
      ...sortedChannels.map((row) => [
        row.name,
        CHANNEL_KIND_LABEL[row.kind],
        row.bookings,
        row.roomNights,
        row.revenue,
        row.commission,
        row.net,
        `${row.share}%`,
      ]),
      [],
      ["Revenue stream", "Transactions", "Revenue", "Share", "Average ticket"],
      ...revenueStreams.map((stream) => [
        stream.label,
        stream.transactions,
        stream.revenue,
        `${stream.share}%`,
        stream.average,
      ]),
    ]);
    addNotification({
      type: "report",
      title: "Management report exported",
      message: `Occupancy, channel performance and revenue streams for ${from} to ${to} are ready.`,
      audience: "all",
      link: "/reports",
      actor: "Reports",
    });
    setNotice("Report exported. The team has been notified in the bell menu.");
  };

  const scheduleReport = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification({
      type: "report",
      title: `${scheduleForm.name} scheduled`,
      message: `${scheduleForm.frequency} · ${scheduleForm.recipients} · ${scheduleForm.format}`,
      audience: scheduleForm.recipients === "Superadmin only" ? "superadmin" : "all",
      link: "/reports",
      actor: "Reports",
    });
    setScheduleOpen(false);
    setNotice(`${scheduleForm.name} scheduled. The team has been notified in the bell menu.`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Business intelligence"
        title="Reports & analytics"
        description="Live occupancy, channel contribution and revenue streams from every booking source."
        actions={
          <>
            <Button variant="outline" onClick={exportReport}><Download className="size-4" /> Export report</Button>
            <Button onClick={() => setScheduleOpen(true)}><CalendarClock className="size-4" /> Schedule report</Button>
          </>
        }
      />

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {notice}
        </div>
      )}

      <div className="surface-card mb-5 flex flex-wrap items-end gap-3 p-4">
        <Field label="From" className="w-full sm:w-44">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To" className="w-full sm:w-44">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1.5 font-semibold">{shortDate(from)} — {shortDate(to)}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
            {channelRows.length} active channels
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy today" value={`${occupancy}%`} hint={`${occupied.length} of ${db.rooms.length} rooms`} icon={Percent} tone="noir" />
        <StatCard label="ADR today" value={naira(adr)} hint={`RevPAR ${naira(revpar)}`} icon={TrendingUp} />
        <StatCard label="Room revenue" value={naira(roomRevenue)} hint={`${periodDays} day period`} icon={BedDouble} />
        <StatCard label="Total revenue" value={naira(totalRevenue)} hint={`${channelBookings} channel bookings`} icon={Wallet} tone="gold" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <SectionCard
          title="Revenue by channel"
          subtitle={`${shortDate(from)} — ${shortDate(to)} · gross booking value`}
          className="xl:col-span-2"
          action={<span className="text-xs font-semibold text-muted-foreground">{naira(totalCommission)} fees</span>}
        >
          <div className="space-y-3">
            {sortedChannels.slice(0, 8).map((row) => (
              <div key={row.source}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <i className="size-2 shrink-0 rounded-full bg-primary" />
                    <span className="truncate font-medium">{row.name}</span>
                    <span className="hidden text-[10px] text-muted-foreground sm:inline">{CHANNEL_KIND_LABEL[row.kind]}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{naira(row.revenue)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, row.share)}%` }} />
                </div>
              </div>
            ))}
            {sortedChannels.length === 0 && (
              <p className="py-10 text-center text-xs text-muted-foreground">No channel revenue in this period.</p>
            )}
          </div>
        </SectionCard>
        <SectionCard title="Booking sources" subtitle="Bookings in selected period">
          <Donut
            data={sortedChannels.map((row) => ({ name: row.name, value: row.bookings }))}
            centerLabel="bookings"
            centerValue={String(channelBookings)}
          />
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <SectionCard title="Occupancy & ADR" subtitle="Current week">
          <OccupancyChart />
        </SectionCard>

        <SectionCard title="Revenue streams" subtitle="Paid transactions in selected period" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Stream</th>
                  <th className="text-right">Transactions</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Share</th>
                  <th className="text-right">Avg ticket</th>
                </tr>
              </thead>
              <tbody>
                {revenueStreams.map((stream) => (
                  <tr key={stream.label}>
                    <td className="text-xs font-medium">{stream.label}</td>
                    <td className="text-right text-xs text-muted-foreground">{stream.transactions}</td>
                    <td className="text-right text-xs font-semibold">{naira(stream.revenue)}</td>
                    <td className="text-right text-xs">{stream.share}%</td>
                    <td className="text-right text-xs text-muted-foreground">{naira(stream.average)}</td>
                  </tr>
                ))}
                {revenueStreams.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No paid transactions in this period.
                    </td>
                  </tr>
                )}
                <tr className="bg-muted/50">
                  <td className="text-xs font-bold">Total</td>
                  <td className="text-right text-xs font-bold">{periodPayments.length}</td>
                  <td className="text-right text-xs font-bold">{naira(totalRevenue)}</td>
                  <td className="text-right text-xs font-bold">100%</td>
                  <td className="text-right text-xs font-bold">{naira(periodPayments.length ? Math.round(totalRevenue / periodPayments.length) : 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Channel contribution"
        subtitle="Live bookings, commission and net contribution by source"
        className="mt-4"
        bodyClassName="p-0"
        action={<Link2 className="size-4 text-gold" />}
      >
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Type</th>
                <th className="text-right">Bookings</th>
                <th className="text-right">Room nights</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Commission</th>
                <th className="text-right">Net</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {sortedChannels.map((row) => (
                <tr key={row.source}>
                  <td className="text-xs font-semibold">{row.name}</td>
                  <td className="text-xs text-muted-foreground">{CHANNEL_KIND_LABEL[row.kind]}</td>
                  <td className="text-right text-xs">{row.bookings}</td>
                  <td className="text-right text-xs">{row.roomNights}</td>
                  <td className="text-right text-xs font-medium">{naira(row.revenue)}</td>
                  <td className="text-right text-xs text-muted-foreground">{row.commission ? naira(row.commission) : "—"}</td>
                  <td className="text-right text-xs font-semibold">{naira(row.net)}</td>
                  <td className="text-right text-xs font-semibold">{row.share}%</td>
                </tr>
              ))}
              {sortedChannels.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                    No channel bookings in this period.
                  </td>
                </tr>
              )}
            </tbody>
            {sortedChannels.length > 0 && (
              <tfoot>
                <tr className="bg-muted/50">
                  <td className="text-xs font-bold">All channels</td>
                  <td />
                  <td className="text-right text-xs font-bold">{channelBookings}</td>
                  <td className="text-right text-xs font-bold">{sortedChannels.reduce((sum, row) => sum + row.roomNights, 0)}</td>
                  <td className="text-right text-xs font-bold">{naira(sortedChannels.reduce((sum, row) => sum + row.revenue, 0))}</td>
                  <td className="text-right text-xs font-bold">{naira(totalCommission)}</td>
                  <td className="text-right text-xs font-bold">{naira(sortedChannels.reduce((sum, row) => sum + row.net, 0))}</td>
                  <td className="text-right text-xs font-bold">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <KpiNote title="RevPAR" value={naira(revpar)} note="Room revenue per available room" />
        <KpiNote title="TRevPAR" value={naira(trevpar)} note="Total revenue per available room" />
        <KpiNote title="Net contribution" value={`${gopMargin}%`} note={`${naira(netContribution)} after purchases`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-primary/20 bg-accent px-4 py-3 text-xs text-accent-foreground">
          <p className="flex items-center gap-2 font-semibold"><HandCoins className="size-4 text-gold" /> Channel costs</p>
          <p className="mt-1 text-muted-foreground">
            Commission is estimated from each connector's configured rate. Net contribution updates automatically.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs">
          <p className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-gold" /> Operating purchases</p>
          <p className="mt-1 text-muted-foreground">
            {naira(operatingExpenses)} in purchase orders during this period, compared with {naira(totalRevenue)} revenue.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/20 bg-accent px-4 py-3 text-xs text-accent-foreground">
        <p className="flex items-center gap-2 font-semibold"><BellRing className="size-4 text-gold" /> Report notifications</p>
        <p className="mt-1 text-muted-foreground">
          Every exported or scheduled report creates a bell notification for superadmins and staff.
        </p>
      </div>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule a report"
        description="Choose who receives the report and how often it is generated."
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button type="submit" form="schedule-report"><CalendarClock className="size-4" /> Schedule report</Button>
          </>
        }
      >
        <form id="schedule-report" onSubmit={scheduleReport} className="space-y-4">
          <Field label="Report name">
            <Input
              value={scheduleForm.name}
              onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
              placeholder="Daily flash report"
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Frequency">
              <Select value={scheduleForm.frequency} onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}>
                {["Daily", "Weekly", "Monthly", "Quarterly"].map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
              </Select>
            </Field>
            <Field label="Recipients">
              <Select value={scheduleForm.recipients} onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}>
                <option>All staff</option>
                <option>Superadmin only</option>
              </Select>
            </Field>
            <Field label="Format">
              <Select value={scheduleForm.format} onChange={(e) => setScheduleForm({ ...scheduleForm, format: e.target.value })}>
                {["CSV", "PDF", "Excel"].map((format) => <option key={format} value={format}>{format}</option>)}
              </Select>
            </Field>
          </div>
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            In this demo, scheduling publishes an immediate bell notification instead of running a background job.
          </p>
        </form>
      </Modal>
    </div>
  );
}

function KpiNote({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="noir-panel p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-noir-muted">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-noir-muted">{note}</p>
    </div>
  );
}
