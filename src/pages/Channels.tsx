import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  CircleDollarSign,
  Globe2,
  HandCoins,
  Link2,
  MessageCircle,
  PlugZap,
  RefreshCw,
  Store,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useStore } from "../lib/store";
import { naira, timeAgo } from "../lib/format";
import {
  CHANNEL_KIND_LABEL,
  channelPerformance,
  type ChannelPerformanceRow,
} from "../lib/channels";
import type { ChannelConnector, ChannelKind } from "../lib/types";
import {
  Button,
  Card,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
  Tabs,
  cn,
} from "../components/ui";

const kindIcon = {
  OTA: Globe2,
  Direct: Link2,
  Offline: Store,
  Messaging: MessageCircle,
};

export default function Channels() {
  const { db, syncChannel, setChannelStatus } = useStore();
  const [filter, setFilter] = useState<"all" | ChannelKind>("all");
  const [notice, setNotice] = useState("");

  const rows = useMemo(
    () => channelPerformance(db.reservations, db.channels, { includeEmpty: true }),
    [db.reservations, db.channels],
  );
  const activeRows = useMemo(() => rows.filter((row) => row.bookings > 0).sort((a, b) => b.revenue - a.revenue), [rows]);

  const connected = db.channels.filter((channel) => channel.status === "connected").length;
  const syncing = db.channels.filter((channel) => channel.status === "syncing").length;
  const totalBookings = activeRows.reduce((sum, row) => sum + row.bookings, 0);
  const totalRevenue = activeRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCommission = activeRows.reduce((sum, row) => sum + row.commission, 0);
  const directRevenue = activeRows
    .filter((row) => row.kind === "Direct" || row.kind === "Messaging")
    .reduce((sum, row) => sum + row.revenue, 0);
  const directShare = totalRevenue ? Math.round((directRevenue / totalRevenue) * 100) : 0;
  const otaBookings = activeRows.filter((row) => row.kind === "OTA").reduce((sum, row) => sum + row.bookings, 0);

  const visibleChannels = db.channels.filter((channel) => filter === "all" || channel.kind === filter);

  const syncAll = () => {
    db.channels
      .filter((channel) => channel.status !== "syncing" && channel.status !== "disconnected")
      .forEach((channel) => syncChannel(channel.id));
    setNotice("Live channels are syncing. Availability and rates will refresh automatically.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Distribution"
        title="Booking channels"
        description="Connect OTAs, direct and offline sources so every booking lands in one live reporting engine."
        actions={
          <>
            <Button variant="outline" onClick={syncAll} disabled={syncing > 0}>
              <RefreshCw className={cn("size-4", syncing > 0 && "animate-spin")} />
              {syncing > 0 ? "Syncing…" : "Sync all channels"}
            </Button>
            <Button onClick={() => setNotice("New channel requests are reviewed by the revenue manager.")}>
              <PlugZap className="size-4" /> Request connection
            </Button>
          </>
        }
      />

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
          <Wifi className="mt-0.5 size-4 shrink-0" /> {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live connections"
          value={`${connected}/${db.channels.length}`}
          hint={`${syncing} syncing now`}
          icon={Wifi}
          tone="noir"
        />
        <StatCard
          label="Channel bookings"
          value={String(totalBookings)}
          hint={`${otaBookings} from OTAs`}
          icon={CalendarDays}
        />
        <StatCard
          label="Commission & fees"
          value={naira(totalCommission)}
          hint="Estimated on booked revenue"
          icon={HandCoins}
        />
        <StatCard
          label="Direct + WhatsApp"
          value={`${directShare}%`}
          hint={`${naira(directRevenue)} of revenue`}
          icon={CircleDollarSign}
          tone="gold"
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <SectionCard
          title="Connector health"
          subtitle="Live availability, rates and reservation delivery"
          className="xl:col-span-2"
          action={
            <Tabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: "all", label: "All", count: db.channels.length },
                { id: "OTA", label: "OTAs", count: db.channels.filter((channel) => channel.kind === "OTA").length },
                { id: "Direct", label: "Direct", count: db.channels.filter((channel) => channel.kind === "Direct").length },
                { id: "Messaging", label: "Messaging", count: db.channels.filter((channel) => channel.kind === "Messaging").length },
                { id: "Offline", label: "Offline", count: db.channels.filter((channel) => channel.kind === "Offline").length },
              ]}
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                performance={rows.find((row) => row.source === channel.source)}
                onSync={() => {
                  syncChannel(channel.id);
                  setNotice(`${channel.name} is syncing now.`);
                }}
                onToggle={() => {
                  const next = channel.status === "disconnected" ? "connected" : "disconnected";
                  setChannelStatus(channel.id, next);
                  setNotice(`${channel.name} ${next === "connected" ? "reconnected" : "disabled"}.`);
                }}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="How this feeds reports" subtitle="One source of truth">
          <div className="space-y-4">
            <FlowStep
              icon={PlugZap}
              title="1. Connectors pull bookings"
              text="OTA, direct, WhatsApp, walk-in, phone and agent bookings are normalised into the same reservation model."
            />
            <FlowStep
              icon={CalendarDays}
              title="2. Availability stays in sync"
              text="Every new booking blocks the room and updates the booking desk, calendar and housekeeping list."
            />
            <FlowStep
              icon={CircleDollarSign}
              title="3. Revenue is attributed"
              text="Reports split gross revenue, commission and net contribution by channel with no spreadsheets."
            />
            <div className="rounded-lg border border-primary/20 bg-accent px-3 py-3 text-[11px] leading-relaxed text-accent-foreground">
              <p className="flex items-center gap-1.5 font-semibold">
                <ArrowUpRight className="size-3.5 text-gold" /> Walk-ins and phone bookings count too
              </p>
              <p className="mt-1 text-muted-foreground">
                Offline channels are captured at the front desk and included in the same live channel report.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Channel performance"
        subtitle="All reservations · gross revenue, commission and net contribution"
        className="mt-4"
        bodyClassName="p-0"
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
              {activeRows.map((row) => (
                <tr key={row.source}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-gold">
                        {(() => {
                          const Icon = kindIcon[row.kind];
                          return <Icon className="size-4" />;
                        })()}
                      </span>
                      <div>
                        <p className="text-xs font-semibold">{row.name}</p>
                        <p className="text-[10px] text-muted-foreground">{row.bookings} reservations</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{CHANNEL_KIND_LABEL[row.kind]}</td>
                  <td className="text-right text-xs">{row.bookings}</td>
                  <td className="text-right text-xs">{row.roomNights}</td>
                  <td className="text-right text-xs font-medium">{naira(row.revenue)}</td>
                  <td className="text-right text-xs text-muted-foreground">
                    {row.commission ? naira(row.commission) : "—"}
                  </td>
                  <td className="text-right text-xs font-semibold">{naira(row.net)}</td>
                  <td className="text-right">
                    <span className="inline-flex min-w-10 justify-end text-xs font-semibold">{row.share}%</span>
                  </td>
                </tr>
              ))}
              {activeRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                    No channel bookings yet. Sync a connector or add a walk-in reservation.
                  </td>
                </tr>
              )}
            </tbody>
            {activeRows.length > 0 && (
              <tfoot>
                <tr className="bg-muted/50">
                  <td className="text-xs font-bold">All channels</td>
                  <td />
                  <td className="text-right text-xs font-bold">{totalBookings}</td>
                  <td className="text-right text-xs font-bold">
                    {activeRows.reduce((sum, row) => sum + row.roomNights, 0)}
                  </td>
                  <td className="text-right text-xs font-bold">{naira(totalRevenue)}</td>
                  <td className="text-right text-xs font-bold">{naira(totalCommission)}</td>
                  <td className="text-right text-xs font-bold">{naira(totalRevenue - totalCommission)}</td>
                  <td className="text-right text-xs font-bold">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function ChannelCard({
  channel,
  performance,
  onSync,
  onToggle,
}: {
  channel: ChannelConnector;
  performance?: ChannelPerformanceRow;
  onSync: () => void;
  onToggle: () => void;
}) {
  const Icon = kindIcon[channel.kind];
  const disabled = channel.status === "disconnected";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-noir text-brand-bright">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{channel.name}</p>
            <p className="text-[10px] text-muted-foreground">{CHANNEL_KIND_LABEL[channel.kind]}</p>
          </div>
        </div>
        <StatusPill status={channel.status} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Bookings</p>
          <p className="mt-0.5 text-sm font-semibold">{performance?.bookings ?? 0}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="mt-0.5 text-sm font-semibold">{naira(performance?.revenue ?? 0)}</p>
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Fee</p>
          <p className="mt-0.5 text-sm font-semibold">{channel.commissionPct}%</p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <RefreshCw className="size-3" /> Last sync {timeAgo(channel.lastSync)}
      </p>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onSync}
          disabled={channel.status === "syncing" || disabled}
        >
          <RefreshCw className={cn("size-3.5", channel.status === "syncing" && "animate-spin")} />
          {channel.status === "syncing" ? "Syncing…" : "Sync now"}
        </Button>
        <Button
          size="sm"
          variant={disabled ? "soft" : "ghost"}
          className="flex-1"
          onClick={onToggle}
        >
          {disabled ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {disabled ? "Reconnect" : "Disable"}
        </Button>
      </div>
    </Card>
  );
}

function FlowStep({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BedDouble;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
