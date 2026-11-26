import type {
  BookingSource,
  ChannelConnector,
  ChannelKind,
  ChannelStatus,
  Reservation,
} from "./types";

export const BOOKING_SOURCES: BookingSource[] = [
  "Direct",
  "Booking.com",
  "Expedia",
  "Agoda",
  "Airbnb",
  "Hotels.com",
  "Trip.com",
  "Corporate",
  "Walk-in",
  "WhatsApp",
  "Phone",
  "Travel agent",
];

export const CHANNEL_KIND_LABEL: Record<ChannelKind, string> = {
  OTA: "Online travel agency",
  Direct: "Direct channel",
  Offline: "Offline / manual",
  Messaging: "Messaging",
};

export const CHANNEL_STATUS_LABEL: Record<ChannelStatus, string> = {
  connected: "Connected",
  manual: "Manual entry",
  syncing: "Syncing",
  disconnected: "Disconnected",
};

const channel = (
  source: BookingSource,
  kind: ChannelKind,
  status: ChannelStatus,
  commissionPct: number,
  autoSync: boolean,
  note: string,
  minutesAgo: number,
): ChannelConnector => ({
  id: `channel-${source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  source,
  name: source,
  kind,
  status,
  commissionPct,
  autoSync,
  lastSync: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  note,
});

export const createChannelSeed = (): ChannelConnector[] => [
  channel("Direct", "Direct", "connected", 0, true, "Website and direct reservations", 2),
  channel("Booking.com", "OTA", "connected", 15, true, "Two-way availability and rate sync", 4),
  channel("Expedia", "OTA", "connected", 18, true, "Expedia Group partner connection", 7),
  channel("Agoda", "OTA", "connected", 17, true, "Asia-Pacific and global demand", 11),
  channel("Airbnb", "OTA", "connected", 12, true, "Entire-home and apartment listings", 16),
  channel("Hotels.com", "OTA", "connected", 15, true, "Expedia Group retail brand", 21),
  channel("Trip.com", "OTA", "connected", 16, true, "International leisure travellers", 28),
  channel("Corporate", "Offline", "manual", 8, false, "Negotiated corporate accounts", 45),
  channel("Walk-in", "Offline", "manual", 0, false, "Front desk walk-in bookings", 1),
  channel("WhatsApp", "Messaging", "connected", 0, true, "Ada AI booking agent", 3),
  channel("Phone", "Offline", "manual", 0, false, "Telephone reservations", 19),
  channel("Travel agent", "Offline", "manual", 10, false, "Agent and tour operator bookings", 34),
];

export interface ChannelPerformanceRow {
  source: BookingSource;
  name: string;
  kind: ChannelKind;
  status: ChannelStatus;
  commissionPct: number;
  bookings: number;
  roomNights: number;
  revenue: number;
  commission: number;
  net: number;
  adr: number;
  share: number;
}

export interface ChannelPerformanceOptions {
  from?: string;
  to?: string;
  includeEmpty?: boolean;
}

export const channelPerformance = (
  reservations: Reservation[],
  channels: ChannelConnector[],
  options: ChannelPerformanceOptions = {},
): ChannelPerformanceRow[] => {
  const active = reservations.filter((reservation) => {
    if (reservation.status === "cancelled") return false;
    if (options.from && reservation.checkOut < options.from) return false;
    if (options.to && reservation.checkIn > options.to) return false;
    return true;
  });

  const rows = BOOKING_SOURCES.map((source) => {
    const connector = channels.find((item) => item.source === source);
    const sourceReservations = active.filter((reservation) => reservation.source === source);
    const revenue = sourceReservations.reduce((sum, reservation) => sum + reservation.total, 0);
    const roomNights = sourceReservations.reduce((sum, reservation) => sum + reservation.nights, 0);
    const commissionPct = connector?.commissionPct ?? 0;
    const commission = Math.round((revenue * commissionPct) / 100);
    return {
      source,
      name: connector?.name ?? source,
      kind: connector?.kind ?? "Offline",
      status: connector?.status ?? "manual",
      commissionPct,
      bookings: sourceReservations.length,
      roomNights,
      revenue,
      commission,
      net: revenue - commission,
      adr: roomNights ? Math.round(revenue / roomNights) : 0,
      share: 0,
    };
  });

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0) || 1;
  return rows
    .map((row) => ({ ...row, share: Math.round((row.revenue / totalRevenue) * 100) }))
    .filter((row) => options.includeEmpty || row.bookings > 0);
};

export const topChannelRows = (rows: ChannelPerformanceRow[], limit = 6) => {
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  if (sorted.length <= limit) return sorted;
  const visible = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);
  return [
    ...visible,
    {
      ...rest[0],
      source: "Other" as BookingSource,
      name: "Other channels",
      bookings: rest.reduce((sum, row) => sum + row.bookings, 0),
      roomNights: rest.reduce((sum, row) => sum + row.roomNights, 0),
      revenue: rest.reduce((sum, row) => sum + row.revenue, 0),
      commission: rest.reduce((sum, row) => sum + row.commission, 0),
      net: rest.reduce((sum, row) => sum + row.net, 0),
      share: rest.reduce((sum, row) => sum + row.share, 0),
      adr: 0,
      commissionPct: 0,
      kind: "Offline" as ChannelKind,
      status: "manual" as ChannelStatus,
    },
  ];
};
