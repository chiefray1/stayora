import type {
  Activity,
  AiSignal,
  ApiKey,
  AppNotification,
  AttendanceEntry,
  AuditLog,
  Campaign,
  Database,
  DocumentRecord,
  Guest,
  HousekeepingTask,
  Integration,
  InventoryItem,
  Invoice,
  LaundryTicket,
  MaintenanceTicket,
  PayrollRecord,
  Payment,
  PosOrder,
  PurchaseOrder,
  Reservation,
  Role,
  Room,
  RoomType,
  RoomTypeName,
  ServiceBooking,
  SpaAppointment,
  SpaService,
  Staff,
  TransportTrip,
  Venue,
  VenueBooking,
  Webhook,
} from "./types";
import { addDays, daysBetween, iso, todayISO } from "./format";
import { createChannelSeed } from "./channels";

export const PROMO_DISCOUNTS = {
  normal: 30,
  weekend: 35,
  longStay: 40,
} as const;

export const PROMO_TERMS = [
  "Rates are exclusive of 7.5% VAT and 10% service charge.",
  "Discounts are subject to promotional terms, availability and management confirmation.",
  "Long-stay eligibility must be confirmed at the time of booking.",
  "Rates are a guide for corporate discussions and not a formal quotation or approved corporate agreement.",
  "Negotiated corporate rates, credit, complimentary provisions or extras require approval and documentation.",
  "Breakfast inclusion must be confirmed in the quotation.",
];

const withTax = (subtotal: number) => Math.round(subtotal * (1 + 0.075 + 0.1));

export const ROOM_TYPES: RoomType[] = [
  {
    type: "Superior",
    rate: 100_000,
    promo: { normal: 70_000, weekend: 65_000, longStay: 60_000 },
    capacity: 2,
    bed: "Queen bed",
    size: "32 m²",
    view: "Garden view",
    blurb: "A calm, light-filled room with a queen bed, rain shower and everything you need for a restful stay.",
    amenities: ["Free Wi-Fi", "Smart TV", "Mini bar", "In-room safe", "Air conditioning", "Room service"],
  },
  {
    type: "Deluxe",
    rate: 110_000,
    promo: { normal: 77_000, weekend: 75_500, longStay: 66_000 },
    capacity: 2,
    bed: "King bed",
    size: "38 m²",
    view: "City view",
    blurb: "Extra space, a plush king bed and skyline views — our most popular room for couples and business travellers.",
    amenities: ["Free Wi-Fi", "Smart TV", "Mini bar", "In-room safe", "Air conditioning", "Nespresso machine", "Work desk"],
  },
  {
    type: "Executive",
    rate: 150_000,
    promo: { normal: 105_000, weekend: 97_500, longStay: 90_000 },
    capacity: 3,
    bed: "King bed + lounge",
    size: "46 m²",
    view: "City view",
    blurb: "A king room with a separate lounge corner, executive floor access and priority late checkout.",
    amenities: ["Free Wi-Fi", "Smart TV", "Mini bar", "In-room safe", "Air conditioning", "Lounge access", "Bathtub"],
  },
  {
    type: "Suite",
    rate: 200_000,
    promo: { normal: 140_000, weekend: 130_000, longStay: 120_000 },
    capacity: 4,
    bed: "Emperor bed",
    size: "68 m²",
    view: "Panoramic view",
    blurb: "Our signature suite with a separate living room, dining table, deep soaking tub and butler service.",
    amenities: ["Free Wi-Fi", "Smart TV", "Full bar", "In-room safe", "Air conditioning", "Living & dining room", "Soaking tub", "Butler service"],
  },
];

export const ADD_ONS = [
  { id: "breakfast", name: "Breakfast for two", price: 15_000, perNight: true, note: "Full buffet, served 6:30–10:30" },
  { id: "transfer", name: "Airport pickup", price: 25_000, perNight: false, note: "Private car, meet & greet at arrivals" },
  { id: "late-checkout", name: "Late checkout", price: 10_000, perNight: false, note: "Room held until 16:00" },
  { id: "spa", name: "Spa credit", price: 20_000, perNight: false, note: "₦20,000 credit at the Stayora spa" },
];

export const roomTypeByName = (type: RoomTypeName) =>
  ROOM_TYPES.find((r) => r.type === type) ?? ROOM_TYPES[0];

export const statusLabel: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  cleaning: "Cleaning",
  reserved: "Reserved",
  maintenance: "Maintenance",
  "out-of-service": "Out of service",
  pending: "Pending",
  confirmed: "Confirmed",
  "checked-in": "Checked in",
  "checked-out": "Checked out",
  cancelled: "Cancelled",
  "in-progress": "In progress",
  done: "Done",
  resolved: "Resolved",
  inspected: "Inspected",
  paid: "Paid",
  unpaid: "Unpaid",
  partial: "Partial",
  active: "Active",
  "on-leave": "On leave",
  inactive: "Inactive",
  open: "Open",
  preparing: "Preparing",
  served: "Served",
  posted: "Posted",
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  scheduled: "Scheduled",
  "en-route": "En route",
  completed: "Completed",
  refunded: "Refunded",
  washing: "Washing",
  ironing: "Ironing",
  ready: "Ready",
  delivered: "Delivered",
  verified: "Verified",
  expired: "Expired",
  booked: "Booked",
  overdue: "Overdue",
  void: "Void",
  revoked: "Revoked",
  error: "Error",
  paused: "Paused",
  suspended: "Suspended",
  trial: "Trial",
  renovation: "Renovation",
  present: "Present",
  late: "Late",
  absent: "Absent",
};

const guestSeed: Omit<Guest, "id" | "createdAt">[] = [
  { name: "Adaeze Okonkwo", email: "adaeze.okonkwo@gmail.com", phone: "0803 412 8890", country: "Nigeria", vip: "Platinum", loyaltyPoints: 12_400, stays: 18, lifetimeValue: 8_640_000, notes: "Prefers high floor, allergic to feather pillows." },
  { name: "Michael Bennett", email: "m.bennett@northgate.co.uk", phone: "+44 7700 900 123", country: "United Kingdom", vip: "Gold", loyaltyPoints: 7_800, stays: 9, lifetimeValue: 4_320_000, notes: "Corporate account — Northgate Energy." },
  { name: "Fatima Bello", email: "fatima.bello@outlook.com", phone: "0806 118 4420", country: "Nigeria", vip: "Silver", loyaltyPoints: 3_150, stays: 5, lifetimeValue: 1_860_000 },
  { name: "Sofia Marchetti", email: "sofia.marchetti@libero.it", phone: "+39 333 421 9087", country: "Italy", vip: "Gold", loyaltyPoints: 6_420, stays: 7, lifetimeValue: 3_240_000, notes: "Always requests a quiet room away from lifts." },
  { name: "Tunde Adeyemi", email: "tunde.adeyemi@zenithcap.ng", phone: "0805 220 7761", country: "Nigeria", vip: "Platinum", loyaltyPoints: 15_900, stays: 22, lifetimeValue: 11_200_000, notes: "Zenith Capital — monthly board stay." },
  { name: "Grace Mensah", email: "grace.mensah@gmail.com", phone: "+233 24 551 8832", country: "Ghana", vip: "None", loyaltyPoints: 640, stays: 1, lifetimeValue: 240_000 },
  { name: "Daniel Osei", email: "d.osei@accrabuild.com", phone: "+233 20 774 1190", country: "Ghana", vip: "Silver", loyaltyPoints: 2_240, stays: 4, lifetimeValue: 1_120_000 },
  { name: "Amara Nwosu", email: "amara.nwosu@yahoo.com", phone: "0812 447 3320", country: "Nigeria", vip: "Gold", loyaltyPoints: 5_980, stays: 8, lifetimeValue: 2_980_000 },
  { name: "James Whitfield", email: "jwhitfield@meridian-us.com", phone: "+1 415 555 0198", country: "United States", vip: "Platinum", loyaltyPoints: 18_300, stays: 26, lifetimeValue: 14_600_000, notes: "Meridian Group — always suite, late checkout." },
  { name: "Zainab Yusuf", email: "zainab.yusuf@gmail.com", phone: "0701 882 4419", country: "Nigeria", vip: "None", loyaltyPoints: 480, stays: 2, lifetimeValue: 460_000 },
  { name: "Chidi Balogun", email: "chidi.balogun@lagosworks.ng", phone: "0902 331 7745", country: "Nigeria", vip: "Silver", loyaltyPoints: 2_760, stays: 5, lifetimeValue: 1_540_000 },
  { name: "Elena Petrova", email: "elena.petrova@mail.ru", phone: "+7 916 220 5541", country: "Russia", vip: "Gold", loyaltyPoints: 6_100, stays: 6, lifetimeValue: 3_060_000 },
];

const sources: Reservation["source"][] = [
  "Direct",
  "Booking.com",
  "Expedia",
  "Corporate",
  "Walk-in",
  "WhatsApp",
];

export interface SeedProfile {
  roomCount?: number;
  staffCount?: number;
  tenantName?: string;
  city?: string;
}

export function seedDatabase(profile: SeedProfile = {}): Database {
  const today = todayISO();
  const now = new Date().toISOString();
  const roomCount = Math.max(1, profile.roomCount ?? 48);
  const totalFloors = Math.max(1, Math.ceil(roomCount / 12));
  const guests: Guest[] = guestSeed.map((g, i) => ({
    ...g,
    id: `guest-${i + 1}`,
    createdAt: addDays(today, -120 + i * 7),
  }));

  const pattern: Room["status"][] = [
    "available",
    "occupied",
    "available",
    "cleaning",
    "available",
    "reserved",
    "maintenance",
    "occupied",
    "available",
    "occupied",
    "available",
    "cleaning",
  ];

  const rooms: Room[] = Array.from({ length: roomCount }, (_, i) => {
    const floor = Math.floor(i / 12) + 1;
    const type = floor === totalFloors ? ROOM_TYPES[3] : ROOM_TYPES[i % 3];
    const status = pattern[i % pattern.length];
    return {
      id: `room-${i + 1}`,
      number: `${floor}${String((i % 12) + 1).padStart(2, "0")}`,
      floor,
      type: type.type,
      status,
      rate: type.rate,
      capacity: type.capacity,
      bed: type.bed,
      smoking: i % 17 === 0,
      amenities: type.amenities,
    };
  });

  const occupied = rooms.filter((r) => r.status === "occupied");
  const reserved = rooms.filter((r) => r.status === "reserved");
  const cleaning = rooms.filter((r) => r.status === "cleaning");
  const available = rooms.filter((r) => r.status === "available");

  let refSeq = 24_001;
  const nextRef = () => `STY-${refSeq++}`;

  const reservations: Reservation[] = [];

  occupied.forEach((room, i) => {
    const guest = guests[i % guests.length];
    const nights = 2 + (i % 3);
    const checkIn = addDays(today, -(1 + (i % 3)));
    const checkOut = addDays(today, nights - (i % 3));
    const type = roomTypeByName(room.type);
    room.guest = guest.name;
    reservations.push({
      id: `res-${i + 1}`,
      ref: nextRef(),
      guestId: guest.id,
      guestName: guest.name,
      email: guest.email,
      phone: guest.phone,
      roomType: room.type,
      roomId: room.id,
      roomNumber: room.number,
      checkIn,
      checkOut,
      adults: Math.min(2, type.capacity),
      children: 0,
      nights: daysBetween(checkIn, checkOut),
      rate: room.rate,
      addOns: i % 3 === 0 ? ["breakfast"] : [],
      total: withTax(daysBetween(checkIn, checkOut) * room.rate + (i % 3 === 0 ? daysBetween(checkIn, checkOut) * 15_000 : 0)),
      source: sources[i % sources.length],
      status: "checked-in",
      paymentStatus: i % 4 === 0 ? "unpaid" : "paid",
      notes: i === 0 ? "High floor requested — confirmed 8th floor equivalent (room 401)." : undefined,
      createdAt: addDays(checkIn, -14),
    });
  });

  reserved.forEach((room, i) => {
    const guest = guests[(i + 5) % guests.length];
    const checkIn = today;
    const checkOut = addDays(today, 2 + i);
    const type = roomTypeByName(room.type);
    reservations.push({
      id: `res-reserved-${i + 1}`,
      ref: nextRef(),
      guestId: guest.id,
      guestName: guest.name,
      email: guest.email,
      phone: guest.phone,
      roomType: room.type,
      roomId: room.id,
      roomNumber: room.number,
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      nights: daysBetween(checkIn, checkOut),
      rate: room.rate,
      addOns: i === 0 ? ["breakfast", "transfer"] : [],
      total: withTax(daysBetween(checkIn, checkOut) * room.rate),
      source: i === 0 ? "WhatsApp" : "Direct",
      status: "confirmed",
      paymentStatus: i === 0 ? "paid" : "partial",
      createdAt: addDays(today, -3),
    });
    void type;
  });

  const futureBookings = [
    { guest: guests[1], type: "Deluxe" as RoomTypeName, inDays: 3, nights: 3, source: "Corporate" as const },
    { guest: guests[3], type: "Suite" as RoomTypeName, inDays: 5, nights: 2, source: "Direct" as const },
    { guest: guests[6], type: "Superior" as RoomTypeName, inDays: 2, nights: 4, source: "Booking.com" as const },
    { guest: guests[8], type: "Executive" as RoomTypeName, inDays: 7, nights: 5, source: "Corporate" as const },
    { guest: guests[10], type: "Deluxe" as RoomTypeName, inDays: 10, nights: 1, source: "Expedia" as const },
  ];
  futureBookings.forEach((b, i) => {
    const checkIn = addDays(today, b.inDays);
    const checkOut = addDays(checkIn, b.nights);
    const type = roomTypeByName(b.type);
    const room = rooms.find(
      (r) =>
        r.type === b.type &&
        r.status !== "maintenance" &&
        r.status !== "out-of-service" &&
        !reservations.some(
          (res) =>
            res.roomId === r.id &&
            res.status !== "cancelled" &&
            res.status !== "checked-out" &&
            res.checkIn < checkOut &&
            res.checkOut > checkIn,
        ),
    );
    reservations.push({
      id: `res-future-${i + 1}`,
      ref: nextRef(),
      guestId: b.guest.id,
      guestName: b.guest.name,
      email: b.guest.email,
      phone: b.guest.phone,
      roomType: b.type,
      roomId: room?.id,
      roomNumber: room?.number,
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      nights: b.nights,
      rate: type.rate,
      addOns: i % 2 === 0 ? ["breakfast"] : [],
      total: withTax(b.nights * type.rate + (i % 2 === 0 ? b.nights * 15_000 : 0)),
      source: b.source,
      status: "confirmed",
      paymentStatus: i % 2 === 0 ? "paid" : "unpaid",
      createdAt: addDays(today, -7),
    });
  });

  const channelBookings = [
    { guest: guests[0], type: "Deluxe" as RoomTypeName, inDays: 4, nights: 2, source: "Agoda" as const, status: "confirmed" as const, paid: true },
    { guest: guests[2], type: "Superior" as RoomTypeName, inDays: 6, nights: 3, source: "Airbnb" as const, status: "confirmed" as const, paid: true },
    { guest: guests[5], type: "Executive" as RoomTypeName, inDays: 8, nights: 2, source: "Hotels.com" as const, status: "confirmed" as const, paid: false },
    { guest: guests[7], type: "Suite" as RoomTypeName, inDays: 12, nights: 2, source: "Trip.com" as const, status: "confirmed" as const, paid: true },
    { guest: guests[9], type: "Deluxe" as RoomTypeName, inDays: 1, nights: 1, source: "Phone" as const, status: "confirmed" as const, paid: false },
    { guest: guests[11], type: "Executive" as RoomTypeName, inDays: 9, nights: 3, source: "Travel agent" as const, status: "confirmed" as const, paid: true },
    { guest: guests[4], type: "Superior" as RoomTypeName, inDays: 0, nights: 2, source: "Walk-in" as const, status: "checked-in" as const, paid: true },
    { guest: guests[6], type: "Deluxe" as RoomTypeName, inDays: 15, nights: 4, source: "Direct" as const, status: "confirmed" as const, paid: false },
  ];

  channelBookings.forEach((booking, i) => {
    const checkIn = addDays(today, booking.inDays);
    const checkOut = addDays(checkIn, booking.nights);
    const type = roomTypeByName(booking.type);
    const room = rooms.find(
      (candidate) =>
        candidate.type === booking.type &&
        candidate.status !== "maintenance" &&
        candidate.status !== "out-of-service" &&
        !reservations.some(
          (reservation) =>
            reservation.roomId === candidate.id &&
            reservation.status !== "cancelled" &&
            reservation.status !== "checked-out" &&
            reservation.checkIn < checkOut &&
            reservation.checkOut > checkIn,
        ),
    );
    if (booking.status === "checked-in" && room) {
      room.status = "occupied";
      room.guest = booking.guest.name;
    }
    reservations.push({
      id: `res-channel-${i + 1}`,
      ref: nextRef(),
      guestId: booking.guest.id,
      guestName: booking.guest.name,
      email: booking.guest.email,
      phone: booking.guest.phone,
      roomType: booking.type,
      roomId: room?.id,
      roomNumber: room?.number,
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      nights: booking.nights,
      rate: type.rate,
      addOns: i % 3 === 0 ? ["breakfast"] : [],
      total: withTax(
        booking.nights * type.rate + (i % 3 === 0 ? booking.nights * 15_000 : 0),
      ),
      source: booking.source,
      status: booking.status,
      paymentStatus: booking.paid ? "paid" : "unpaid",
      createdAt: addDays(today, -6 + i),
    });
  });

  reservations.push({
    id: "res-history-1",
    ref: "STY-23874",
    guestId: guests[4].id,
    guestName: guests[4].name,
    email: guests[4].email,
    phone: guests[4].phone,
    roomType: "Executive",
    roomId: "room-29",
    roomNumber: "305",
    checkIn: addDays(today, -12),
    checkOut: addDays(today, -9),
    adults: 2,
    children: 1,
    nights: 3,
    rate: 150_000,
    addOns: ["breakfast"],
    total: withTax(495_000),
    source: "Corporate",
    status: "checked-out",
    paymentStatus: "paid",
    createdAt: addDays(today, -20),
  });

  reservations.push({
    id: "res-cancelled-1",
    ref: "STY-23902",
    guestId: guests[9].id,
    guestName: guests[9].name,
    email: guests[9].email,
    phone: guests[9].phone,
    roomType: "Deluxe",
    checkIn: addDays(today, 4),
    checkOut: addDays(today, 6),
    adults: 1,
    children: 0,
    nights: 2,
    rate: 110_000,
    addOns: [],
    total: withTax(220_000),
    source: "Booking.com",
    status: "cancelled",
    paymentStatus: "refunded",
    createdAt: addDays(today, -2),
  });

  const payments: Payment[] = reservations
    .filter((r) => r.paymentStatus === "paid")
    .map((r, i) => ({
      id: `pay-${i + 1}`,
      ref: `PAY-${9_000 + i}`,
      guestName: r.guestName,
      reservationRef: r.ref,
      amount: r.total,
      method: (["Paystack", "Card", "Transfer", "POS", "Cash"] as Payment["method"][])[i % 5],
      status: "paid",
      date: r.checkIn,
      type: "Room",
    }));

  payments.push(
    { id: "pay-pos-1", ref: "PAY-9101", guestName: "Adaeze Okonkwo", amount: 86_500, method: "POS", status: "paid", date: today, type: "Restaurant" },
    { id: "pay-trans-1", ref: "PAY-9102", guestName: "James Whitfield", amount: 45_000, method: "Cash", status: "paid", date: today, type: "Transport" },
    { id: "pay-pending-1", ref: "PAY-9103", guestName: "Chidi Balogun", reservationRef: "STY-23902", amount: 240_000, method: "Transfer", status: "pending", date: today, type: "Room" },
  );

  const housekeepers = ["Blessing Eze", "Ngozi Umeh", "Samuel Idowu", "Halima Sani", "Emeka Obi"];
  const tasks: HousekeepingTask[] = [
    ...cleaning.map((room, i) => ({
      id: `task-clean-${i + 1}`,
      roomNumber: room.number,
      type: "Departure clean" as const,
      assignee: housekeepers[i % housekeepers.length],
      status: "pending" as const,
      priority: "High" as const,
      createdAt: today,
    })),
    { id: "task-1", roomNumber: "108", type: "Stayover", assignee: "Blessing Eze", status: "in-progress", priority: "Normal", createdAt: today },
    { id: "task-2", roomNumber: "203", type: "Inspection", assignee: "Ngozi Umeh", status: "done", priority: "Normal", createdAt: today },
    { id: "task-3", roomNumber: "307", type: "Turndown", assignee: "Samuel Idowu", status: "pending", priority: "Low", createdAt: today },
    { id: "task-4", roomNumber: "405", type: "Arrival prep", assignee: "Halima Sani", status: "inspected", priority: "High", createdAt: today },
    { id: "task-5", roomNumber: "117", type: "Deep clean", assignee: "Emeka Obi", status: "pending", priority: "High", createdAt: today },
  ];

  const posOrders: PosOrder[] = [
    { id: "pos-1", ref: "R-1188", roomNumber: "402", items: [{ name: "Grilled sea bass", qty: 2, price: 24_000 }, { name: "House red (bottle)", qty: 1, price: 38_500 }], total: 86_500, status: "posted", channel: "Restaurant", date: today },
    { id: "pos-2", ref: "R-1189", roomNumber: undefined, items: [{ name: "Jollof rice & chicken", qty: 2, price: 9_500 }, { name: "Chapman", qty: 2, price: 4_000 }], total: 27_000, status: "served", channel: "Restaurant", date: today },
    { id: "pos-3", ref: "R-1190", roomNumber: "204", items: [{ name: "Club sandwich", qty: 1, price: 11_000 }, { name: "Fresh juice", qty: 1, price: 4_500 }], total: 15_500, status: "preparing", channel: "Room service", date: today },
    { id: "pos-4", ref: "B-0442", roomNumber: undefined, items: [{ name: "Signature cocktail", qty: 3, price: 8_500 }], total: 25_500, status: "open", channel: "Bar", date: today },
    { id: "pos-5", ref: "R-1187", roomNumber: "310", items: [{ name: "Breakfast buffet", qty: 2, price: 15_000 }], total: 30_000, status: "posted", channel: "Restaurant", date: today },
  ];

  const inventory: InventoryItem[] = [
    { id: "inv-1", sku: "BATH-001", name: "Bath amenities kit", category: "Toiletries", quantity: 18, reorderLevel: 40, unitCost: 3_500, supplier: "Lagos Hospitality Supplies" },
    { id: "inv-2", sku: "LIN-014", name: "King bed linen set", category: "Linen", quantity: 64, reorderLevel: 30, unitCost: 28_000, supplier: "Cotton & Co." },
    { id: "inv-3", sku: "MINI-008", name: "Mini bar water 75cl", category: "F&B", quantity: 220, reorderLevel: 120, unitCost: 600, supplier: "Pure Springs" },
    { id: "inv-4", sku: "CLN-021", name: "Multi-surface cleaner 5L", category: "Cleaning", quantity: 12, reorderLevel: 15, unitCost: 8_900, supplier: "CleanPro NG" },
    { id: "inv-5", sku: "TECH-003", name: "Keycard blanks (pack of 100)", category: "Technology", quantity: 7, reorderLevel: 5, unitCost: 45_000, supplier: "AccessTech" },
    { id: "inv-6", sku: "FNB-112", name: "Coffee beans 1kg", category: "F&B", quantity: 36, reorderLevel: 20, unitCost: 18_500, supplier: "Roast Republic" },
    { id: "inv-7", sku: "LIN-022", name: "Bath towel, 600gsm", category: "Linen", quantity: 96, reorderLevel: 50, unitCost: 12_500, supplier: "Cotton & Co." },
    { id: "inv-8", sku: "CLN-034", name: "Laundry detergent 10L", category: "Cleaning", quantity: 9, reorderLevel: 12, unitCost: 22_000, supplier: "CleanPro NG" },
    { id: "inv-9", sku: "FNB-140", name: "House wine (case of 6)", category: "F&B", quantity: 14, reorderLevel: 8, unitCost: 96_000, supplier: "Cellar 54" },
    { id: "inv-10", sku: "TECH-009", name: "Smart TV remote", category: "Technology", quantity: 22, reorderLevel: 10, unitCost: 9_000, supplier: "AccessTech" },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    { id: "po-1", ref: "PO-2201", supplier: "Lagos Hospitality Supplies", description: "Bath amenities kits × 200", total: 700_000, status: "sent", date: addDays(today, -2) },
    { id: "po-2", ref: "PO-2202", supplier: "Cotton & Co.", description: "King linen sets × 40", total: 1_120_000, status: "received", date: addDays(today, -9) },
    { id: "po-3", ref: "PO-2203", supplier: "CleanPro NG", description: "Cleaning chemicals restock", total: 340_000, status: "draft", date: today },
    { id: "po-4", ref: "PO-2204", supplier: "Cellar 54", description: "House wine × 20 cases", total: 1_920_000, status: "sent", date: addDays(today, -1) },
  ];

  const staffSeed = [
    { name: "Ifeoma Chukwu", role: "General Manager", department: "Management", shift: "Flexible" as const },
    { name: "Ada Obi", role: "Front Desk Supervisor", department: "Front Office", shift: "Morning" as const },
    { name: "Tobi Alade", role: "Front Desk Agent", department: "Front Office", shift: "Afternoon" as const },
    { name: "Blessing Eze", role: "Housekeeping Supervisor", department: "Housekeeping", shift: "Morning" as const },
    { name: "Samuel Idowu", role: "Housekeeper", department: "Housekeeping", shift: "Morning" as const },
    { name: "Emeka Obi", role: "Maintenance Technician", department: "Engineering", shift: "Afternoon" as const },
    { name: "Kemi Lawal", role: "Financial Controller", department: "Accounting", shift: "Flexible" as const },
    { name: "Chinedu Uche", role: "Restaurant Manager", department: "F&B", shift: "Afternoon" as const },
    { name: "Halima Sani", role: "Chef de Partie", department: "Kitchen", shift: "Morning" as const },
    { name: "Femi Adebayo", role: "Driver", department: "Transport", shift: "Flexible" as const },
    { name: "Ngozi Umeh", role: "Housekeeper", department: "Housekeeping", shift: "Afternoon" as const },
    { name: "David Okoro", role: "Night Auditor", department: "Front Office", shift: "Night" as const },
  ];
  const staff: Staff[] = staffSeed.slice(0, Math.max(1, profile.staffCount ?? 12)).map((s, i) => ({
    ...s,
    id: `staff-${i + 1}`,
    email: `${s.name.split(" ")[0].toLowerCase()}.${s.name.split(" ")[1].toLowerCase()}@stayora.ng`,
    phone: `080${i} 55${i} 10${i}0`,
    status: i === 8 ? "on-leave" : "active",
  }));

  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const payroll: PayrollRecord[] = staff.map((s, i) => {
    const basic = [450_000, 280_000, 180_000, 260_000, 140_000, 160_000, 380_000, 240_000, 200_000, 120_000, 140_000, 190_000][i] ?? 150_000;
    const allowances = Math.round(basic * 0.15);
    const deductions = Math.round(basic * 0.08);
    return {
      id: `pr-${i + 1}`,
      staffId: s.id,
      name: s.name,
      role: s.role,
      basic,
      allowances,
      deductions,
      net: basic + allowances - deductions,
      month: monthLabel,
      status: i < 4 ? "paid" : "pending",
    };
  });

  const trips: TransportTrip[] = [
    { id: "trip-1", ref: "TR-4401", guestName: "James Whitfield", pickup: "Murtala Muhammed Airport", dropoff: "Stayora Hotel", datetime: `${today} 14:30`, driver: "Femi Adebayo", vehicle: "Toyota Prado · LSD-441-KJA", status: "scheduled", fare: 25_000 },
    { id: "trip-2", ref: "TR-4402", guestName: "Adaeze Okonkwo", pickup: "Stayora Hotel", dropoff: "Victoria Island", datetime: `${today} 16:00`, driver: "Femi Adebayo", vehicle: "Toyota Camry · KJA-882-XY", status: "en-route", fare: 18_000 },
    { id: "trip-3", ref: "TR-4403", guestName: "Sofia Marchetti", pickup: "Stayora Hotel", dropoff: "Lekki Phase 1", datetime: `${addDays(today, 1)} 09:00`, driver: "Musa Danjuma", vehicle: "Mercedes E-Class · KJA-119-AB", status: "scheduled", fare: 30_000 },
    { id: "trip-4", ref: "TR-4404", guestName: "Michael Bennett", pickup: "Murtala Muhammed Airport", dropoff: "Stayora Hotel", datetime: `${today} 11:00`, driver: "Musa Danjuma", vehicle: "Toyota Prado · LSD-441-KJA", status: "completed", fare: 25_000 },
    { id: "trip-5", ref: "TR-4405", guestName: "Tunde Adeyemi", pickup: "Stayora Hotel", dropoff: "Ikeja GRA", datetime: `${addDays(today, 2)} 08:30`, driver: "Femi Adebayo", vehicle: "Toyota Camry · KJA-882-XY", status: "scheduled", fare: 22_000 },
  ];

  const roles: Role[] = [
    { id: "role-0", name: "Superadmin", description: "Owner-level access to every module, report and staff account.", users: 1, permissions: ["dashboard", "reservations", "rooms", "guests", "housekeeping", "maintenance", "crm", "reports", "payments", "accounting", "pos", "inventory", "procurement", "hr", "payroll", "transport", "whatsapp", "roles", "kitchen", "laundry", "loyalty", "spa", "events", "billing", "documents", "attendance", "integrations", "security", "ai", "properties", "tenants"] },
    { id: "role-1", name: "Administrator", description: "Full access to every module, settings and staff accounts.", users: 1, permissions: ["dashboard", "reservations", "rooms", "guests", "housekeeping", "maintenance", "crm", "reports", "payments", "accounting", "pos", "inventory", "procurement", "hr", "payroll", "transport", "whatsapp", "roles", "kitchen", "laundry", "loyalty", "spa", "events", "billing", "documents", "attendance", "integrations", "security", "ai", "properties"] },
    { id: "role-2", name: "Manager", description: "Operations oversight with reporting and approvals.", users: 2, permissions: ["dashboard", "reservations", "rooms", "guests", "housekeeping", "maintenance", "crm", "reports", "payments", "inventory", "hr", "kitchen", "laundry", "loyalty", "spa", "events", "billing", "documents", "attendance", "ai", "properties"] },
    { id: "role-3", name: "Front desk", description: "Check-in/out, reservations and guest profiles.", users: 4, permissions: ["dashboard", "reservations", "rooms", "guests", "payments", "transport", "maintenance", "loyalty", "spa", "events", "billing", "documents", "laundry"] },
    { id: "role-4", name: "Housekeeping", description: "Room board, laundry and task assignment only.", users: 6, permissions: ["dashboard", "rooms", "housekeeping", "laundry"] },
    { id: "role-5", name: "Accounting", description: "Payments, folios, payroll and financial reports.", users: 2, permissions: ["dashboard", "payments", "accounting", "reports", "payroll", "procurement", "billing", "documents"] },
    { id: "role-6", name: "Restaurant & bar", description: "POS orders, kitchen display and stock.", users: 5, permissions: ["dashboard", "pos", "inventory", "kitchen"] },
    { id: "role-7", name: "Spa & leisure", description: "Spa appointments, gym sessions and guest wellness.", users: 3, permissions: ["dashboard", "spa", "guests", "billing"] },
  ];

  const campaigns: Campaign[] = [
    { id: "camp-1", name: "Rainy season escape", channel: "Email", audience: "Gold & Platinum · Lagos", sent: 1_240, opened: 612, revenue: 4_860_000, status: "sent" },
    { id: "camp-2", name: "Corporate Q4 retainer", channel: "Email", audience: "Corporate accounts", sent: 84, opened: 51, revenue: 7_200_000, status: "sent" },
    { id: "camp-3", name: "Weekend suite upgrade", channel: "WhatsApp", audience: "Past guests · 12 months", sent: 2_100, opened: 1_460, revenue: 3_150_000, status: "scheduled" },
    { id: "camp-4", name: "Birthday spa treat", channel: "SMS", audience: "Guests with birthdays this month", sent: 0, opened: 0, revenue: 0, status: "draft" },
  ];

  const venues: Venue[] = [
    {
      id: "venue-1",
      name: "Vienna Hall",
      type: "Hall",
      capacity: 20,
      theatreCapacity: 20,
      banquetCapacity: 20,
      rate: 350_000,
      location: "Events wing · Ground floor",
      amenities: ["Theatre setting", "Banquet setting", "PA system", "Air conditioning"],
      status: "available",
    },
    {
      id: "venue-2",
      name: "Gordian Hall",
      type: "Hall",
      capacity: 80,
      theatreCapacity: 80,
      banquetCapacity: 60,
      rate: 800_000,
      location: "Events wing · First floor",
      amenities: ["Theatre setting", "Banquet setting", "PA system", "Projector & screen", "Air conditioning"],
      status: "available",
    },
    {
      id: "venue-3",
      name: "Augusto Hall",
      type: "Hall",
      capacity: 100,
      theatreCapacity: 100,
      banquetCapacity: 80,
      rate: 1_500_000,
      location: "Events wing · Ground floor",
      amenities: ["Theatre setting", "Banquet setting", "Stage", "PA system", "Air conditioning"],
      status: "available",
    },
    {
      id: "venue-4",
      name: "Whitestone Hall",
      type: "Hall",
      capacity: 1_400,
      theatreCapacity: 1_400,
      banquetCapacity: 1_200,
      rate: 10_000_000,
      location: "Convention wing",
      amenities: ["Theatre setting", "Banquet setting", "Stage", "LED wall", "PA system", "Air conditioning"],
      status: "available",
    },
    {
      id: "venue-5",
      name: "Pool Area",
      type: "Outdoor",
      capacity: 600,
      theatreCapacity: 600,
      banquetCapacity: 400,
      rate: 3_000_000,
      location: "Poolside",
      amenities: ["Theatre setting", "Banquet setting", "Cocktail setup", "Canopy option"],
      status: "available",
    },
  ];

  const venueBookings: VenueBooking[] = [
    {
      id: "vb-1",
      ref: "VEN-3101",
      venueId: "venue-1",
      venueName: "Vienna Hall",
      customerName: "Lagos Business Circle",
      email: "events@lagosbusinesscircle.ng",
      phone: "0803 411 2200",
      date: addDays(today, 3),
      startTime: "09:00",
      endTime: "13:00",
      guests: 18,
      setup: "Theatre",
      rate: 350_000,
      deposit: 175_000,
      total: 350_000,
      status: "confirmed",
      notes: "Corporate briefing · theatre setup for 18",
      createdAt: today,
    },
    {
      id: "vb-2",
      ref: "VEN-3102",
      venueId: "venue-2",
      venueName: "Gordian Hall",
      customerName: "Sterling Capital",
      email: "ops@sterlingcapital.ng",
      phone: "0902 118 4400",
      date: addDays(today, 1),
      startTime: "09:00",
      endTime: "17:00",
      guests: 60,
      setup: "Banquet",
      rate: 800_000,
      deposit: 400_000,
      total: 800_000,
      status: "confirmed",
      notes: "Board retreat · banquet setup for 60",
      createdAt: today,
    },
    {
      id: "vb-3",
      ref: "VEN-3103",
      venueId: "venue-3",
      venueName: "Augusto Hall",
      customerName: "Amaka & Tobi",
      email: "amaka.tobi@gmail.com",
      phone: "0812 553 7710",
      date: addDays(today, 5),
      startTime: "16:00",
      endTime: "21:00",
      guests: 80,
      setup: "Banquet",
      rate: 1_500_000,
      deposit: 500_000,
      total: 1_500_000,
      status: "pending",
      notes: "Engagement banquet · 80 guests",
      createdAt: today,
    },
    {
      id: "vb-4",
      ref: "VEN-3104",
      venueId: "venue-4",
      venueName: "Whitestone Hall",
      customerName: "Oracle Energy",
      email: "training@oracleenergy.com",
      phone: "0805 224 9911",
      date: addDays(today, 2),
      startTime: "09:00",
      endTime: "17:00",
      guests: 1_000,
      setup: "Theatre",
      rate: 10_000_000,
      deposit: 5_000_000,
      total: 10_000_000,
      status: "confirmed",
      notes: "HSE training · 1,000 delegates · lunch buffet",
      createdAt: today,
    },
  ];

  const serviceBookings: ServiceBooking[] = [
    {
      id: "sb-1",
      ref: "SRV-2101",
      service: "Airport pickup",
      customerName: "James Whitfield",
      phone: "+44 7700 900123",
      roomNumber: "402",
      date: today,
      time: "14:30",
      details: "Flight BA075 · meet at arrivals gate",
      amount: 25_000,
      status: "confirmed",
      createdAt: today,
    },
    {
      id: "sb-2",
      ref: "SRV-2102",
      service: "Spa treatment",
      customerName: "Sofia Marchetti",
      phone: "+39 333 440 2211",
      roomNumber: "204",
      date: today,
      time: "17:00",
      details: "60-minute deep tissue massage",
      amount: 20_000,
      status: "pending",
      createdAt: today,
    },
    {
      id: "sb-3",
      ref: "SRV-2103",
      service: "Laundry",
      customerName: "Adaeze Okonkwo",
      phone: "0806 771 2200",
      roomNumber: "310",
      date: today,
      time: "09:00",
      details: "Express laundry · 6 items · return 18:00",
      amount: 8_500,
      status: "completed",
      createdAt: today,
    },
    {
      id: "sb-4",
      ref: "SRV-2104",
      service: "Restaurant table",
      customerName: "Michael Bennett",
      phone: "+1 415 555 0134",
      roomNumber: "108",
      date: addDays(today, 1),
      time: "19:30",
      details: "Table for 4 · window seat · birthday",
      amount: 0,
      status: "confirmed",
      createdAt: today,
    },
  ];

  const activity: Activity[] = [
    { time: "12:04", text: "Reservation STY-24086 checked in to room 204", who: "Reception · Ada" },
    { time: "11:47", text: "Payment of ₦190,000 confirmed via Paystack", who: "Accounting · System" },
    { time: "11:20", text: "Room 310 passed inspection and released to sale", who: "Housekeeping · Supervisor" },
    { time: "10:52", text: "Maintenance ticket #442 opened — AC fault, room 117", who: "Maintenance · Emeka" },
    { time: "09:35", text: "Restaurant order #1188 posted to room 402 folio", who: "Restaurant · Kitchen" },
  ];

  const notifications: AppNotification[] = [
    {
      id: "note-1",
      type: "report",
      title: "Daily flash report is ready",
      message: "Occupancy, arrivals, departures and revenue for today have been compiled.",
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      read: false,
      audience: "all",
      link: "/reports",
      actor: "Night audit",
    },
    {
      id: "note-2",
      type: "report",
      title: "Monthly P&L published",
      message: "The July departmental profit and loss report is available for review.",
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: false,
      audience: "all",
      link: "/reports",
      actor: "Accounting",
    },
    {
      id: "note-3",
      type: "report",
      title: "Arrivals report updated",
      message: "Three new arrivals were added to the expected-arrivals report.",
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      read: true,
      audience: "all",
      link: "/reports",
      actor: "Front desk",
    },
  ];

  const maintenance: MaintenanceTicket[] = [
    {
      id: "mt-1",
      ref: "MT-442",
      roomNumber: "117",
      issue: "Air conditioning not cooling",
      category: "HVAC",
      priority: "High",
      status: "in-progress",
      assignee: "Emeka Obi",
      reportedBy: "Ada Obi",
      createdAt: today,
    },
    {
      id: "mt-2",
      ref: "MT-443",
      roomNumber: "204",
      issue: "Shower mixer leaking",
      category: "Plumbing",
      priority: "Normal",
      status: "open",
      assignee: "Emeka Obi",
      reportedBy: "Blessing Eze",
      createdAt: today,
    },
    {
      id: "mt-3",
      ref: "MT-444",
      roomNumber: "310",
      issue: "Smart TV remote not responding",
      category: "IT",
      priority: "Low",
      status: "open",
      assignee: "Samuel Idowu",
      reportedBy: "Ngozi Umeh",
      createdAt: today,
    },
    {
      id: "mt-4",
      ref: "MT-445",
      roomNumber: "Lobby",
      issue: "Chandelier flickering",
      category: "Electrical",
      priority: "Urgent",
      status: "in-progress",
      assignee: "Emeka Obi",
      reportedBy: "Ifeoma Chukwu",
      createdAt: today,
    },
    {
      id: "mt-5",
      ref: "MT-446",
      roomNumber: "108",
      issue: "Wardrobe hinge replacement",
      category: "Furniture",
      priority: "Normal",
      status: "resolved",
      assignee: "Samuel Idowu",
      reportedBy: "Blessing Eze",
      createdAt: addDays(today, -1),
      resolvedAt: today,
    },
  ];

  const laundry: LaundryTicket[] = [
    { id: "laun-1", ref: "LD-8801", guestName: "Adaeze Okonkwo", roomNumber: "310", service: "Express wash", itemCount: 6, price: 18_500, express: true, stage: "washing", pickupAt: today, returnAt: today, notes: "Return before 18:00 — dinner reservation.", createdAt: today },
    { id: "laun-2", ref: "LD-8802", guestName: "James Whitfield", roomNumber: "402", service: "Dry clean", itemCount: 3, price: 24_000, express: false, stage: "received", pickupAt: today, returnAt: addDays(today, 2), notes: "Two suits, one dress shirt.", createdAt: today },
    { id: "laun-3", ref: "LD-8803", guestName: "Sofia Marchetti", roomNumber: "204", service: "Press only", itemCount: 4, price: 9_000, express: false, stage: "ironing", pickupAt: today, returnAt: today, createdAt: today },
    { id: "laun-4", ref: "LD-8804", guestName: "Michael Bennett", roomNumber: "108", service: "Wash & fold", itemCount: 8, price: 14_000, express: false, stage: "ready", pickupAt: addDays(today, -1), returnAt: today, createdAt: addDays(today, -1) },
    { id: "laun-5", ref: "LD-8805", guestName: "Housekeeping · Floor 2", service: "Wash & fold", itemCount: 24, price: 62_000, express: false, stage: "delivered", pickupAt: addDays(today, -2), returnAt: addDays(today, -1), notes: "Linen bulk cycle.", createdAt: addDays(today, -2) },
    { id: "laun-6", ref: "LD-8806", guestName: "Fatima Bello", roomNumber: "115", service: "Express wash", itemCount: 2, price: 8_000, express: true, stage: "received", pickupAt: today, returnAt: addDays(today, 1), createdAt: today },
  ];

  const spaServices: SpaService[] = [
    { id: "spa-svc-1", name: "Deep tissue massage", category: "Massage", duration: 60, price: 32_000 },
    { id: "spa-svc-2", name: "Swedish full-body massage", category: "Massage", duration: 90, price: 45_000 },
    { id: "spa-svc-3", name: "Hydrafacial glow", category: "Facial", duration: 45, price: 28_000 },
    { id: "spa-svc-4", name: "Hot stone therapy", category: "Body", duration: 75, price: 38_000 },
    { id: "spa-svc-5", name: "Couples retreat", category: "Wellness", duration: 120, price: 85_000 },
    { id: "spa-svc-6", name: "Personal training session", category: "Gym", duration: 60, price: 15_000 },
  ];

  const spaAppointments: SpaAppointment[] = [
    { id: "spa-1", ref: "SPA-501", guestName: "Sofia Marchetti", roomNumber: "204", serviceName: "Deep tissue massage", therapist: "Amaka Ibe", date: today, time: "17:00", duration: 60, price: 32_000, status: "confirmed", notes: "Focus on shoulders and lower back.", createdAt: today },
    { id: "spa-2", ref: "SPA-502", guestName: "Adaeze Okonkwo", roomNumber: "310", serviceName: "Hydrafacial glow", therapist: "Tara Bello", date: today, time: "15:30", duration: 45, price: 28_000, status: "in-progress", createdAt: today },
    { id: "spa-3", ref: "SPA-503", guestName: "James Whitfield", roomNumber: "402", serviceName: "Couples retreat", therapist: "Amaka Ibe", date: addDays(today, 1), time: "11:00", duration: 120, price: 85_000, status: "booked", notes: "Anniversary — prepare sparkling water.", createdAt: today },
    { id: "spa-4", ref: "SPA-504", guestName: "Grace Mensah", roomNumber: "216", serviceName: "Swedish full-body massage", therapist: "Ify Nnamdi", date: addDays(today, 1), time: "09:00", duration: 90, price: 45_000, status: "confirmed", createdAt: today },
    { id: "spa-5", ref: "SPA-505", guestName: "Tunde Adeyemi", roomNumber: "401", serviceName: "Personal training session", therapist: "Coach Deji", date: addDays(today, -1), time: "07:00", duration: 60, price: 15_000, status: "completed", createdAt: addDays(today, -1) },
  ];

  const invoices: Invoice[] = [
    { id: "inv-1001", ref: "INV-24001", customerName: "James Whitfield", reservationRef: "STY-24001", type: "Room", lines: [{ description: "Suite accommodation · 3 nights", amount: 600_000 }, { description: "Breakfast for two", amount: 90_000 }], subtotal: 690_000, tax: 51_750, discount: 0, total: 741_750, status: "paid", issuedAt: addDays(today, -3), dueAt: today, notes: "Corporate account — Meridian Group." },
    { id: "inv-1002", ref: "INV-24002", customerName: "Oracle Energy", type: "Events", lines: [{ description: "Whitestone Hall · HSE training", amount: 10_000_000 }, { description: "Catering · 1,000 delegates", amount: 4_500_000 }], subtotal: 14_500_000, tax: 1_087_500, discount: 500_000, total: 15_087_500, status: "sent", issuedAt: addDays(today, -1), dueAt: addDays(today, 14), notes: "50% deposit already received." },
    { id: "inv-1003", ref: "INV-24003", customerName: "Adaeze Okonkwo", reservationRef: "STY-24086", type: "Mixed", lines: [{ description: "Executive room · 2 nights", amount: 300_000 }, { description: "Restaurant & mini bar", amount: 86_500 }, { description: "Laundry express", amount: 18_500 }], subtotal: 405_000, tax: 30_375, discount: 10_000, total: 425_375, status: "sent", issuedAt: today, dueAt: addDays(today, 7) },
    { id: "inv-1004", ref: "INV-24004", customerName: "Chidi Balogun", reservationRef: "STY-23902", type: "Room", lines: [{ description: "Deluxe room · 2 nights", amount: 220_000 }], subtotal: 220_000, tax: 16_500, discount: 0, total: 236_500, status: "overdue", issuedAt: addDays(today, -18), dueAt: addDays(today, -4), notes: "Payment plan agreed with accounting." },
    { id: "inv-1005", ref: "INV-24005", customerName: "Sofia Marchetti", reservationRef: "STY-24015", type: "Spa", lines: [{ description: "Deep tissue massage", amount: 32_000 }, { description: "Hot stone therapy", amount: 38_000 }], subtotal: 70_000, tax: 5_250, discount: 7_000, total: 68_250, status: "draft", issuedAt: today, dueAt: addDays(today, 7) },
  ];

  const documents: DocumentRecord[] = [
    { id: "doc-1", name: "Adaeze-Okonkwo-passport.pdf", type: "Passport", ownerName: "Adaeze Okonkwo", size: "1.8 MB", uploadedAt: addDays(today, -3), expiresAt: "2029-04-18", status: "verified" },
    { id: "doc-2", name: "James-Whitfield-passport.pdf", type: "Passport", ownerName: "James Whitfield", size: "2.1 MB", uploadedAt: addDays(today, -5), expiresAt: "2030-11-02", status: "verified" },
    { id: "doc-3", name: "Oracle-Energy-event-contract.pdf", type: "Contract", ownerName: "Oracle Energy", size: "840 KB", uploadedAt: addDays(today, -2), status: "verified" },
    { id: "doc-4", name: "Sterling-Capital-purchase-order.pdf", type: "Other", ownerName: "Sterling Capital", size: "512 KB", uploadedAt: addDays(today, -1), status: "pending" },
    { id: "doc-5", name: "Sofia-Marchetti-national-id.pdf", type: "National ID", ownerName: "Sofia Marchetti", size: "1.2 MB", uploadedAt: today, expiresAt: addDays(today, 2), status: "pending" },
    { id: "doc-6", name: "INV-24001-receipt.pdf", type: "Receipt", ownerName: "James Whitfield", size: "240 KB", uploadedAt: addDays(today, -3), status: "verified" },
  ];

  const attendance: AttendanceEntry[] = [
    { id: "att-1", staffId: "staff-1", name: "Ifeoma Chukwu", department: "Management", date: today, clockIn: "07:42", method: "Face", status: "present" },
    { id: "att-2", staffId: "staff-2", name: "Ada Obi", department: "Front Office", date: today, clockIn: "06:58", method: "Fingerprint", status: "present" },
    { id: "att-3", staffId: "staff-3", name: "Tobi Alade", department: "Front Office", date: today, clockIn: "14:12", method: "PIN", status: "late" },
    { id: "att-4", staffId: "staff-4", name: "Blessing Eze", department: "Housekeeping", date: today, clockIn: "07:05", clockOut: "15:04", method: "GPS", status: "present" },
    { id: "att-5", staffId: "staff-6", name: "Emeka Obi", department: "Engineering", date: today, clockIn: "13:55", method: "Face", status: "present" },
    { id: "att-6", staffId: "staff-9", name: "Halima Sani", department: "Kitchen", date: today, clockIn: "06:30", method: "Fingerprint", status: "present" },
    { id: "att-7", staffId: "staff-10", name: "Femi Adebayo", department: "Transport", date: today, clockIn: "08:20", method: "GPS", status: "late" },
    { id: "att-8", staffId: "staff-12", name: "David Okoro", department: "Front Office", date: today, clockIn: "22:00", method: "PIN", status: "present" },
  ];

  const integrations: Integration[] = [
    { id: "int-1", name: "Paystack", category: "Payments", provider: "Paystack Nigeria", status: "connected", lastSync: now, note: "Cards, bank transfer and USSD settlement." },
    { id: "int-2", name: "Booking.com", category: "OTAs", provider: "Booking.com B.V.", status: "connected", lastSync: now, note: "Two-way availability and rate sync." },
    { id: "int-3", name: "Expedia Partner Central", category: "OTAs", provider: "Expedia Group", status: "connected", lastSync: now, note: "Reservations and cancellation updates." },
    { id: "int-4", name: "SALTO KS", category: "Door locks", provider: "Salto Systems", status: "error", lastSync: addDays(today, -2), note: "Key encoder offline — check gateway." },
    { id: "int-5", name: "Termii SMS", category: "Messaging", provider: "Termii", status: "connected", lastSync: now, note: "Transactional SMS and OTP delivery." },
    { id: "int-6", name: "QuickBooks Online", category: "Accounting", provider: "Intuit", status: "disconnected", lastSync: addDays(today, -14), note: "Map chart of accounts before enabling." },
    { id: "int-7", name: "Epson TM-T88 fiscal printer", category: "POS", provider: "Epson", status: "connected", lastSync: now, note: "Receipt printing at front desk and restaurant." },
    { id: "int-8", name: "Passport scanner · Acuant", category: "Scanners", provider: "Acuant", status: "connected", lastSync: now, note: "MRZ and document capture at check-in." },
    { id: "int-9", name: "OpenAI Assistants", category: "AI", provider: "OpenAI", status: "connected", lastSync: now, note: "Guest chatbot, sentiment analysis and report drafting." },
    { id: "int-10", name: "WhatsApp Business Cloud", category: "Messaging", provider: "Meta", status: "connected", lastSync: now, note: "Concierge agent and booking confirmations." },
  ];

  const apiKeys: ApiKey[] = [
    { id: "key-1", label: "Booking engine · production", prefix: "sty_live_7x4a", createdAt: addDays(today, -90), lastUsed: now, status: "active" },
    { id: "key-2", label: "Channel manager bridge", prefix: "sty_live_2m9c", createdAt: addDays(today, -45), lastUsed: now, status: "active" },
    { id: "key-3", label: "Legacy reporting export", prefix: "sty_test_8k1d", createdAt: addDays(today, -180), lastUsed: addDays(today, -30), status: "revoked" },
  ];

  const webhooks: Webhook[] = [
    { id: "wh-1", url: "https://ops.stayora.app/hooks/reservations", events: ["reservation.created", "reservation.cancelled"], status: "active" },
    { id: "wh-2", url: "https://accounting.stayora.app/hooks/invoices", events: ["invoice.paid", "payment.refunded"], status: "active" },
  ];

  const auditLogs: AuditLog[] = [
    { id: "aud-1", at: new Date(Date.now() - 9 * 60 * 1000).toISOString(), actor: "Ada Obi", action: "Checked in reservation STY-24086", module: "Front desk", ip: "102.89.44.12", device: "Chrome · Windows" },
    { id: "aud-2", at: new Date(Date.now() - 28 * 60 * 1000).toISOString(), actor: "Kemi Lawal", action: "Recorded payment ₦86,500 via POS", module: "Accounting", ip: "102.89.44.18", device: "Safari · iPad" },
    { id: "aud-3", at: new Date(Date.now() - 55 * 60 * 1000).toISOString(), actor: "Ifeoma Chukwu", action: "Updated Deluxe weekend rate", module: "Configuration", ip: "102.89.44.10", device: "Chrome · macOS" },
    { id: "aud-4", at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), actor: "Blessing Eze", action: "Released room 310 to sale after inspection", module: "Housekeeping", ip: "105.112.9.44", device: "Android · Staff app" },
    { id: "aud-5", at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), actor: "System", action: "Night audit rolled business date", module: "Audit", ip: "10.0.0.4", device: "System" },
    { id: "aud-6", at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), actor: "Ngozi Manager", action: "Approved purchase order PO-2204", module: "Procurement", ip: "102.89.44.16", device: "Chrome · Windows" },
    { id: "aud-7", at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), actor: "Ada Admin", action: "Created role Spa & leisure supervisor", module: "Roles", ip: "102.89.44.11", device: "Chrome · macOS" },
    { id: "aud-8", at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), actor: "Tobi Alade", action: "Exported occupancy report (CSV)", module: "Reports", ip: "102.89.44.20", device: "Chrome · Windows" },
  ];

  const aiSignals: AiSignal[] = [
    { id: "ai-1", kind: "Pricing", title: "Raise Deluxe rate by 12% for Friday–Saturday", detail: "Occupancy is forecast at 94% this weekend with 11 remaining Deluxe rooms. Competitor set is averaging ₦126,000.", impact: "+₦1.84M projected revenue", confidence: 92 },
    { id: "ai-2", kind: "Forecast", title: "Occupancy forecast · next 14 days", detail: "Weekends are pacing 18% above last month. Midweek corporate demand softens from Tuesday.", impact: "78% average occupancy", confidence: 88 },
    { id: "ai-3", kind: "Upsell", title: "Offer suite upgrade to 6 arriving Gold guests", detail: "Guests have high lifetime value and prior suite stays. Bundle breakfast and late checkout.", impact: "+₦420,000 ancillary revenue", confidence: 84 },
    { id: "ai-4", kind: "Sentiment", title: "Breakfast wait time mentioned in 3 reviews", detail: "Recent sentiment shifted negative around 09:00–09:30 service. Consider extending buffet until 11:00.", impact: "Review score risk −0.2", confidence: 79 },
    { id: "ai-5", kind: "Maintenance", title: "Predictive failure · AHU unit, floor 3", detail: "Vibration and temperature variance patterns indicate a filter or bearing issue within 10–14 days.", impact: "Avoid 2 room outages", confidence: 86 },
    { id: "ai-6", kind: "Fraud", title: "Unusual refund pattern flagged", detail: "Three card refunds from the same device within 40 minutes were blocked for manual review.", impact: "₦310,000 protected", confidence: 95 },
  ];

  return {
    rooms,
    reservations,
    guests,
    tasks,
    payments,
    posOrders,
    inventory,
    purchaseOrders,
    staff,
    payroll,
    trips,
    roles,
    campaigns,
    venues,
    venueBookings,
    serviceBookings,
    activity,
    notifications,
    maintenance,
    channels: createChannelSeed(),
    laundry,
    spaServices,
    spaAppointments,
    invoices,
    documents,
    attendance,
    integrations,
    apiKeys,
    webhooks,
    auditLogs,
    aiSignals,
    seededAt: now,
    dataVersion: 6,
  };
}

export const revenueByMonth = [
  { month: "Feb", rooms: 42.1, fnb: 12.4, other: 4.2 },
  { month: "Mar", rooms: 48.6, fnb: 14.1, other: 5.0 },
  { month: "Apr", rooms: 44.2, fnb: 13.2, other: 4.6 },
  { month: "May", rooms: 53.9, fnb: 16.8, other: 6.1 },
  { month: "Jun", rooms: 58.4, fnb: 18.2, other: 6.9 },
  { month: "Jul", rooms: 64.7, fnb: 20.5, other: 7.8 },
];

export const occupancyWeek = [
  { day: "Mon", occupancy: 72, adr: 118 },
  { day: "Tue", occupancy: 68, adr: 112 },
  { day: "Wed", occupancy: 75, adr: 121 },
  { day: "Thu", occupancy: 81, adr: 130 },
  { day: "Fri", occupancy: 92, adr: 148 },
  { day: "Sat", occupancy: 96, adr: 162 },
  { day: "Sun", occupancy: 84, adr: 139 },
];

