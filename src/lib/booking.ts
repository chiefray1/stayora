import type { Reservation, Room, RoomTypeName, Venue, VenueBooking, VenueSetup } from "./types";
import { ADD_ONS, roomTypeByName } from "./seed";
import { daysBetween } from "./format";

const activeStatuses: Reservation["status"][] = ["pending", "confirmed", "checked-in"];

export const datesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) => aStart < bEnd && aEnd > bStart;

export const roomIsFree = (
  room: Room,
  checkIn: string,
  checkOut: string,
  reservations: Reservation[],
) => {
  if (room.status === "maintenance" || room.status === "out-of-service") return false;
  return !reservations.some(
    (res) =>
      res.roomId === room.id &&
      activeStatuses.includes(res.status) &&
      datesOverlap(checkIn, checkOut, res.checkIn, res.checkOut),
  );
};

export const availableRoomsOfType = (
  type: RoomTypeName,
  checkIn: string,
  checkOut: string,
  rooms: Room[],
  reservations: Reservation[],
) =>
  rooms.filter(
    (room) => room.type === type && roomIsFree(room, checkIn, checkOut, reservations),
  );

export interface QuoteLine {
  label: string;
  detail?: string;
  amount: number;
}

export const TAX_RATES = {
  vat: 0.075,
  serviceCharge: 0.1,
} as const;

export const quoteBooking = (
  type: RoomTypeName,
  checkIn: string,
  checkOut: string,
  addOnIds: string[],
) => {
  const nights = daysBetween(checkIn, checkOut);
  const rate = roomTypeByName(type).rate;
  const roomTotal = nights * rate;
  const lines: QuoteLine[] = [
    {
      label: `${type} room`,
      detail: `₦${rate.toLocaleString("en-NG")} × ${nights} night${nights === 1 ? "" : "s"}`,
      amount: roomTotal,
    },
  ];
  addOnIds.forEach((id) => {
    const addOn = ADD_ONS.find((a) => a.id === id);
    if (!addOn) return;
    const amount = addOn.perNight ? addOn.price * Math.max(nights, 1) : addOn.price;
    lines.push({
      label: addOn.name,
      detail: addOn.perNight ? `₦${addOn.price.toLocaleString("en-NG")} × ${nights} night${nights === 1 ? "" : "s"}` : "Once per stay",
      amount,
    });
  });
  const addOnTotal = lines.slice(1).reduce((sum, line) => sum + line.amount, 0);
  const subtotal = roomTotal + addOnTotal;
  const vat = Math.round(subtotal * TAX_RATES.vat);
  const serviceCharge = Math.round(subtotal * TAX_RATES.serviceCharge);
  lines.push(
    { label: "VAT", detail: "7.5% of subtotal", amount: vat },
    { label: "Service charge", detail: "10% of subtotal", amount: serviceCharge },
  );
  return {
    nights,
    rate,
    roomTotal,
    addOnTotal,
    vat,
    serviceCharge,
    subtotal,
    total: subtotal + vat + serviceCharge,
    lines,
  };
};

const activeVenueStatuses: VenueBooking["status"][] = ["pending", "confirmed"];

export const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && aEnd > bStart;

export const venueIsFree = (
  venueId: string,
  date: string,
  startTime: string,
  endTime: string,
  bookings: VenueBooking[],
) =>
  !bookings.some(
    (booking) =>
      booking.venueId === venueId &&
      booking.date === date &&
      activeVenueStatuses.includes(booking.status) &&
      timesOverlap(startTime, endTime, booking.startTime, booking.endTime),
  );

export const venueCapacity = (venue: Venue, setup: VenueSetup) => {
  if (setup === "Theatre") return venue.theatreCapacity;
  if (setup === "Banquet") return venue.banquetCapacity;
  return Math.max(venue.theatreCapacity, venue.banquetCapacity);
};

export const venueQuote = (venue: Venue, startTime: string, endTime: string) => {
  const halfDay = endTime <= "14:00";
  return {
    halfDay,
    label: halfDay ? "Half day" : "Full day",
    amount: halfDay ? Math.round(venue.rate * 0.6) : venue.rate,
  };
};
