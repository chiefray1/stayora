export type RoomTypeName = "Superior" | "Deluxe" | "Executive" | "Suite";

export type RoomStatus =
  | "available"
  | "occupied"
  | "cleaning"
  | "reserved"
  | "maintenance"
  | "out-of-service";

export interface RoomType {
  type: RoomTypeName;
  rate: number;
  promo: {
    normal: number;
    weekend: number;
    longStay: number;
  };
  capacity: number;
  bed: string;
  size: string;
  view: string;
  blurb: string;
  amenities: string[];
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomTypeName;
  status: RoomStatus;
  rate: number;
  capacity: number;
  bed: string;
  smoking: boolean;
  amenities: string[];
  guest?: string;
}

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "checked-out"
  | "cancelled";

export type BookingSource =
  | "Direct"
  | "Booking.com"
  | "Expedia"
  | "Agoda"
  | "Airbnb"
  | "Hotels.com"
  | "Trip.com"
  | "Corporate"
  | "Walk-in"
  | "WhatsApp"
  | "Phone"
  | "Travel agent";

export type ChannelKind = "OTA" | "Direct" | "Offline" | "Messaging";
export type ChannelStatus = "connected" | "manual" | "syncing" | "disconnected";

export interface ChannelConnector {
  id: string;
  source: BookingSource;
  name: string;
  kind: ChannelKind;
  status: ChannelStatus;
  commissionPct: number;
  autoSync: boolean;
  lastSync: string;
  note: string;
}

export interface Reservation {
  id: string;
  ref: string;
  guestId: string;
  guestName: string;
  email: string;
  phone: string;
  roomType: RoomTypeName;
  roomId?: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  rate: number;
  addOns: string[];
  total: number;
  source: BookingSource;
  status: ReservationStatus;
  paymentStatus: "paid" | "unpaid" | "partial" | "refunded";
  notes?: string;
  createdAt: string;
}

export type VipTier = "None" | "Silver" | "Gold" | "Platinum";

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  vip: VipTier;
  loyaltyPoints: number;
  stays: number;
  lifetimeValue: number;
  createdAt: string;
  notes?: string;
}

export type TaskStatus = "pending" | "in-progress" | "done" | "inspected";

export interface HousekeepingTask {
  id: string;
  roomNumber: string;
  type: "Departure clean" | "Stayover" | "Deep clean" | "Inspection" | "Turndown" | "Arrival prep";
  assignee: string;
  status: TaskStatus;
  priority: "Low" | "Normal" | "High";
  createdAt: string;
}

export interface Payment {
  id: string;
  ref: string;
  guestName: string;
  reservationRef?: string;
  amount: number;
  method: "Card" | "Transfer" | "Cash" | "POS" | "Paystack";
  status: "paid" | "pending" | "refunded";
  date: string;
  type: "Room" | "Restaurant" | "Transport" | "Venue" | "Service" | "Other";
}

export type VenueType = "Hall" | "Ballroom" | "Conference" | "Meeting room" | "Outdoor" | "Private dining";

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  capacity: number;
  theatreCapacity: number;
  banquetCapacity: number;
  rate: number;
  location: string;
  amenities: string[];
  status: "available" | "maintenance";
}

export type VenueSetup = "Banquet" | "Theatre" | "Classroom" | "Cocktail" | "Boardroom" | "U-shape";
export type VenueBookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface VenueBooking {
  id: string;
  ref: string;
  venueId: string;
  venueName: string;
  customerName: string;
  email: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  setup: VenueSetup;
  rate: number;
  deposit: number;
  total: number;
  status: VenueBookingStatus;
  notes?: string;
  createdAt: string;
}

export type ServiceType =
  | "Airport pickup"
  | "City transfer"
  | "Laundry"
  | "Spa treatment"
  | "Restaurant table"
  | "Other";
export type ServiceBookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface ServiceBooking {
  id: string;
  ref: string;
  service: ServiceType;
  customerName: string;
  phone: string;
  roomNumber?: string;
  date: string;
  time: string;
  details?: string;
  amount: number;
  status: ServiceBookingStatus;
  createdAt: string;
}

export interface PosItem {
  name: string;
  qty: number;
  price: number;
}

export interface PosOrder {
  id: string;
  ref: string;
  roomNumber?: string;
  items: PosItem[];
  total: number;
  status: "open" | "preparing" | "served" | "posted";
  channel: "Restaurant" | "Bar" | "Room service";
  date: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
}

export interface PurchaseOrder {
  id: string;
  ref: string;
  supplier: string;
  description: string;
  total: number;
  status: "draft" | "sent" | "received" | "cancelled";
  date: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: "active" | "on-leave" | "inactive";
  shift: "Morning" | "Afternoon" | "Night" | "Flexible";
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  name: string;
  role: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  month: string;
  status: "pending" | "paid";
}

export interface TransportTrip {
  id: string;
  ref: string;
  guestName: string;
  pickup: string;
  dropoff: string;
  datetime: string;
  driver: string;
  vehicle: string;
  status: "scheduled" | "en-route" | "completed" | "cancelled";
  fare: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  users: number;
  permissions: string[];
}

export interface Campaign {
  id: string;
  name: string;
  channel: "Email" | "WhatsApp" | "SMS";
  audience: string;
  sent: number;
  opened: number;
  revenue: number;
  status: "draft" | "scheduled" | "sent";
}

export interface Activity {
  time: string;
  text: string;
  who: string;
}

export type NotificationType = "report" | "system" | "booking" | "payment" | "maintenance";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  audience: "all" | "superadmin";
  link?: string;
  actor?: string;
}

export interface MaintenanceTicket {
  id: string;
  ref: string;
  roomNumber: string;
  issue: string;
  category: "Electrical" | "Plumbing" | "HVAC" | "Furniture" | "IT" | "Other";
  priority: "Low" | "Normal" | "High" | "Urgent";
  status: "open" | "in-progress" | "resolved";
  assignee: string;
  reportedBy: string;
  createdAt: string;
  resolvedAt?: string;
}

export type LaundryService = "Wash & fold" | "Dry clean" | "Press only" | "Express wash";
export type LaundryStage = "received" | "washing" | "ironing" | "ready" | "delivered";

export interface LaundryTicket {
  id: string;
  ref: string;
  guestName: string;
  roomNumber?: string;
  service: LaundryService;
  itemCount: number;
  price: number;
  express: boolean;
  stage: LaundryStage;
  pickupAt: string;
  returnAt: string;
  notes?: string;
  createdAt: string;
}

export type SpaStatus = "booked" | "confirmed" | "in-progress" | "completed" | "cancelled";

export interface SpaService {
  id: string;
  name: string;
  category: "Massage" | "Facial" | "Body" | "Wellness" | "Gym";
  duration: number;
  price: number;
}

export interface SpaAppointment {
  id: string;
  ref: string;
  guestName: string;
  roomNumber?: string;
  serviceName: string;
  therapist: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: SpaStatus;
  notes?: string;
  createdAt: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type InvoiceType = "Room" | "Restaurant" | "Events" | "Spa" | "Laundry" | "Mixed";

export interface InvoiceLine {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  ref: string;
  customerName: string;
  reservationRef?: string;
  type: InvoiceType;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  notes?: string;
}

export type DocumentType =
  | "Passport"
  | "National ID"
  | "Visa"
  | "Contract"
  | "Invoice"
  | "Receipt"
  | "Signature"
  | "Other";

export interface DocumentRecord {
  id: string;
  name: string;
  type: DocumentType;
  ownerName: string;
  size: string;
  uploadedAt: string;
  expiresAt?: string;
  status: "verified" | "pending" | "expired";
}

export interface AttendanceEntry {
  id: string;
  staffId: string;
  name: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  method: "Face" | "Fingerprint" | "PIN" | "GPS" | "Manual";
  status: "present" | "late" | "on-leave" | "absent";
}

export interface Integration {
  id: string;
  name: string;
  category: "Payments" | "OTAs" | "Door locks" | "Messaging" | "Accounting" | "POS" | "Scanners" | "AI";
  provider: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string;
  note: string;
}

export interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: "active" | "revoked";
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused";
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  module: string;
  ip: string;
  device: string;
}

export type AiSignalKind = "Pricing" | "Forecast" | "Sentiment" | "Upsell" | "Maintenance" | "Fraud";

export interface AiSignal {
  id: string;
  kind: AiSignalKind;
  title: string;
  detail: string;
  impact: string;
  confidence: number;
}

export interface Database {
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  tasks: HousekeepingTask[];
  payments: Payment[];
  posOrders: PosOrder[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  staff: Staff[];
  payroll: PayrollRecord[];
  trips: TransportTrip[];
  roles: Role[];
  campaigns: Campaign[];
  venues: Venue[];
  venueBookings: VenueBooking[];
  serviceBookings: ServiceBooking[];
  activity: Activity[];
  notifications: AppNotification[];
  maintenance: MaintenanceTicket[];
  channels: ChannelConnector[];
  laundry: LaundryTicket[];
  spaServices: SpaService[];
  spaAppointments: SpaAppointment[];
  invoices: Invoice[];
  documents: DocumentRecord[];
  attendance: AttendanceEntry[];
  integrations: Integration[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  auditLogs: AuditLog[];
  aiSignals: AiSignal[];
  seededAt: string;
  dataVersion?: number;
}
