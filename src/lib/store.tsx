import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppNotification,
  ApiKey,
  AttendanceEntry,
  Campaign,
  ChannelStatus,
  Database,
  DocumentRecord,
  Guest,
  HousekeepingTask,
  Integration,
  InventoryItem,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  InvoiceType,
  LaundryStage,
  LaundryTicket,
  MaintenanceTicket,
  NotificationType,
  Payment,
  PosItem,
  PosOrder,
  PurchaseOrder,
  Reservation,
  Role,
  Room,
  RoomStatus,
  RoomTypeName,
  ServiceBooking,
  ServiceBookingStatus,
  ServiceType,
  SpaAppointment,
  SpaStatus,
  Staff,
  TransportTrip,
  VenueBooking,
  VenueBookingStatus,
  VenueSetup,
  Webhook,
} from "./types";
import { seedDatabase } from "./seed";
import { availableRoomsOfType, quoteBooking, venueCapacity, venueIsFree, venueQuote } from "./booking";
import { bookingRef, daysBetween, todayISO, uid } from "./format";
import { PLAN_LIMITS, totalRooms, useTenant, type Tenant } from "./tenants";
import { guardLimit, type GuardResult } from "./entitlements";

const storageKey = (tenantId: string) => `stayora.hms.${tenantId}.v1`;
const DATA_VERSION = 6;

export interface BookingInput {
  guest: { name: string; email: string; phone: string; country: string };
  roomType: RoomTypeName;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  addOns: string[];
  source: Reservation["source"];
  paymentMethod: "pay-on-arrival" | "card" | "transfer" | "cash";
  roomId?: string;
  notes?: string;
}

export interface BookingResult {
  ok: boolean;
  error?: string;
  reservation?: Reservation;
}

export interface VenueBookingInput {
  venueId: string;
  customerName: string;
  email?: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  setup: VenueSetup;
  deposit: number;
  paymentMethod: "Cash" | "POS" | "Transfer" | "Card";
  notes?: string;
}

export interface VenueBookingResult {
  ok: boolean;
  error?: string;
  booking?: VenueBooking;
}

export interface ServiceBookingInput {
  service: ServiceType;
  customerName: string;
  phone: string;
  roomNumber?: string;
  date: string;
  time: string;
  details?: string;
  amount: number;
  paymentMethod: "Cash" | "POS" | "Transfer" | "Card";
}

export interface ServiceBookingResult {
  ok: boolean;
  error?: string;
  booking?: ServiceBooking;
}

interface StoreValue {
  db: Database;
  createBooking: (input: BookingInput) => BookingResult;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;
  cancelReservation: (id: string) => void;
  setRoomStatus: (id: string, status: RoomStatus) => void;
  addGuest: (guest: Omit<Guest, "id" | "createdAt">) => void;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  addTask: (task: Omit<HousekeepingTask, "id" | "createdAt">) => void;
  setTaskStatus: (id: string, status: HousekeepingTask["status"]) => void;
  recordPayment: (payment: Omit<Payment, "id" | "date"> & { date?: string }) => void;
  addPosOrder: (order: { roomNumber?: string; items: PosItem[]; channel: PosOrder["channel"] }) => void;
  advancePosOrder: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => void;
  addPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "ref" | "date" | "status">) => void;
  setPoStatus: (id: string, status: PurchaseOrder["status"]) => void;
  addStaff: (staff: Omit<Staff, "id">) => GuardResult;
  addRoom: (room: Omit<Room, "id">) => GuardResult;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  setStaffStatus: (id: string, status: Staff["status"]) => void;
  addNotification: (input: {
    type: NotificationType;
    title: string;
    message: string;
    audience?: "all" | "superadmin";
    link?: string;
    actor?: string;
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids?: string[]) => void;
  addMaintenanceTicket: (ticket: Omit<MaintenanceTicket, "id" | "ref" | "createdAt" | "status" | "resolvedAt">) => void;
  setMaintenanceStatus: (id: string, status: MaintenanceTicket["status"]) => void;
  runPayroll: () => void;
  setPayrollStatus: (id: string, status: "pending" | "paid") => void;
  addTrip: (trip: Omit<TransportTrip, "id" | "ref">) => void;
  setTripStatus: (id: string, status: TransportTrip["status"]) => void;
  createVenueBooking: (input: VenueBookingInput) => VenueBookingResult;
  setVenueBookingStatus: (id: string, status: VenueBookingStatus) => void;
  createServiceBooking: (input: ServiceBookingInput) => ServiceBookingResult;
  setServiceBookingStatus: (id: string, status: ServiceBookingStatus) => void;
  addRole: (role: Omit<Role, "id" | "users">) => void;
  addCampaign: (campaign: Omit<Campaign, "id" | "sent" | "opened" | "revenue" | "status">) => void;
  syncChannel: (id: string) => void;
  setChannelStatus: (id: string, status: ChannelStatus) => void;
  addLaundryTicket: (input: Omit<LaundryTicket, "id" | "ref" | "stage" | "createdAt">) => void;
  advanceLaundryStage: (id: string, stage: LaundryStage) => void;
  addSpaAppointment: (input: Omit<SpaAppointment, "id" | "ref" | "createdAt" | "status">) => void;
  setSpaAppointmentStatus: (id: string, status: SpaStatus) => void;
  createInvoice: (input: {
    customerName: string;
    type: InvoiceType;
    lines: InvoiceLine[];
    discount?: number;
    dueAt: string;
    notes?: string;
    reservationRef?: string;
  }) => void;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  addDocument: (input: Omit<DocumentRecord, "id" | "uploadedAt">) => void;
  setDocumentStatus: (id: string, status: DocumentRecord["status"]) => void;
  addAttendance: (input: Omit<AttendanceEntry, "id" | "date"> & { date?: string }) => void;
  clockOut: (id: string) => void;
  setIntegrationStatus: (id: string, status: Integration["status"]) => void;
  createApiKey: (label: string) => void;
  revokeApiKey: (id: string) => void;
  addWebhook: (url: string, events: string[]) => void;
  setWebhookStatus: (id: string, status: Webhook["status"]) => void;
  logAudit: (action: string, module: string, actor?: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const loadDb = (tenant: Tenant): Database => {
  const roomCount = Math.max(1, totalRooms(tenant));
  const staffCount = Math.max(1, Math.min(12, PLAN_LIMITS[tenant.plan].staff));
  const seed = seedDatabase({
    roomCount,
    staffCount,
    tenantName: tenant.name,
    city: tenant.city,
  });
  try {
    const raw = localStorage.getItem(storageKey(tenant.id));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Database>;
      if (parsed && parsed.dataVersion === DATA_VERSION && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
        return {
          ...seed,
          ...parsed,
          venues: Array.isArray(parsed.venues) && parsed.venues.length ? parsed.venues : seed.venues,
          venueBookings: Array.isArray(parsed.venueBookings) ? parsed.venueBookings : seed.venueBookings,
          serviceBookings: Array.isArray(parsed.serviceBookings) ? parsed.serviceBookings : seed.serviceBookings,
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : seed.notifications,
          maintenance: Array.isArray(parsed.maintenance) ? parsed.maintenance : seed.maintenance,
          channels: Array.isArray(parsed.channels) && parsed.channels.length ? parsed.channels : seed.channels,
          laundry: Array.isArray(parsed.laundry) ? parsed.laundry : seed.laundry,
          spaServices: Array.isArray(parsed.spaServices) && parsed.spaServices.length ? parsed.spaServices : seed.spaServices,
          spaAppointments: Array.isArray(parsed.spaAppointments) ? parsed.spaAppointments : seed.spaAppointments,
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : seed.invoices,
          documents: Array.isArray(parsed.documents) ? parsed.documents : seed.documents,
          attendance: Array.isArray(parsed.attendance) ? parsed.attendance : seed.attendance,
          integrations: Array.isArray(parsed.integrations) && parsed.integrations.length ? parsed.integrations : seed.integrations,
          apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : seed.apiKeys,
          webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : seed.webhooks,
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : seed.auditLogs,
          aiSignals: Array.isArray(parsed.aiSignals) && parsed.aiSignals.length ? parsed.aiSignals : seed.aiSignals,
          dataVersion: DATA_VERSION,
        } as Database;
      }
    }
  } catch {
    // ignore corrupted storage and reseed
  }
  return seed;
};

const activityEntry = (text: string, who: string) => ({
  time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  text,
  who,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant();
  const [db, setDb] = useState<Database>(() => loadDb(currentTenant));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(currentTenant.id), JSON.stringify(db));
    } catch {
      // storage full — keep running in memory
    }
  }, [db, currentTenant.id]);

  const createBooking = useCallback(
    (input: BookingInput): BookingResult => {
      const today = todayISO();
      const { checkIn, checkOut } = input;
      if (!checkIn || !checkOut) return { ok: false, error: "Please choose your arrival and departure dates." };
      if (checkOut <= checkIn) return { ok: false, error: "Departure must be after arrival." };
      if (checkIn < today) return { ok: false, error: "Arrival date cannot be in the past." };
      const nights = daysBetween(checkIn, checkOut);
      if (nights < 1) return { ok: false, error: "A stay must be at least one night." };
      const email = input.guest.email.trim();
      if (!input.guest.name.trim() || !input.guest.phone.trim())
        return { ok: false, error: "Please complete the guest name and phone number." };
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, error: "Please enter a valid email address." };

      const quota = guardLimit("reservations", 1);
      if (!quota.ok) return { ok: false, error: quota.message };

      const rooms = availableRoomsOfType(input.roomType, checkIn, checkOut, db.rooms, db.reservations);
      if (rooms.length === 0)
        return { ok: false, error: `No ${input.roomType} rooms are available for those dates. Please try other dates or a different room type.` };

      const room = input.roomId ? rooms.find((r) => r.id === input.roomId) : rooms[0];
      if (!room)
        return { ok: false, error: "That room is no longer available. Pick another room or let the desk auto-assign one." };
      const quote = quoteBooking(input.roomType, checkIn, checkOut, input.addOns);
      const paid = input.paymentMethod !== "pay-on-arrival";
      let ref = bookingRef();
      while (db.reservations.some((r) => r.ref === ref)) ref = bookingRef();

      const existing = db.guests.find((g) =>
        email ? g.email.toLowerCase() === email.toLowerCase() : g.phone.trim() === input.guest.phone.trim(),
      );
      const guestId = existing?.id ?? uid("guest");

      const reservation: Reservation = {
        id: uid("res"),
        ref,
        guestId,
        guestName: input.guest.name.trim(),
        email,
        phone: input.guest.phone.trim(),
        roomType: input.roomType,
        roomId: room.id,
        roomNumber: room.number,
        checkIn,
        checkOut,
        adults: input.adults,
        children: input.children,
        nights,
        rate: quote.rate,
        addOns: input.addOns,
        total: quote.total,
        source: input.source,
        status: "confirmed",
        paymentStatus: paid ? "paid" : "unpaid",
        notes: input.notes,
        createdAt: today,
      };

      setDb((prev) => {
        const guests = existing
          ? prev.guests.map((g) =>
              g.id === guestId
                ? {
                    ...g,
                    name: input.guest.name.trim(),
                    email: email || g.email,
                    phone: input.guest.phone.trim(),
                    country: input.guest.country || g.country,
                    stays: g.stays + 1,
                    lifetimeValue: g.lifetimeValue + quote.total,
                    loyaltyPoints: g.loyaltyPoints + Math.round(quote.total / 1_000),
                  }
                : g,
            )
          : [
              ...prev.guests,
              {
                id: guestId,
                name: input.guest.name.trim(),
                email,
                phone: input.guest.phone.trim(),
                country: input.guest.country || "Nigeria",
                vip: "None" as const,
                loyaltyPoints: Math.round(quote.total / 1_000),
                stays: 1,
                lifetimeValue: quote.total,
                createdAt: today,
              },
            ];

        const payments = paid
          ? [
              {
                id: uid("pay"),
                ref: `PAY-${Math.floor(7000 + Math.random() * 2999)}`,
                guestName: reservation.guestName,
                reservationRef: ref,
                amount: quote.total,
                method: (input.paymentMethod === "card"
                  ? "Paystack"
                  : input.paymentMethod === "cash"
                    ? "Cash"
                    : "Transfer") as Payment["method"],
                status: "paid" as const,
                date: today,
                type: "Room" as const,
              },
              ...prev.payments,
            ]
          : prev.payments;

        const roomsNext = prev.rooms.map((r) =>
          r.id === room.id && r.status === "available" ? { ...r, status: "reserved" as const } : r,
        );

        const tasks =
          checkIn === today
            ? [
                {
                  id: uid("task"),
                  roomNumber: room.number,
                  type: "Arrival prep" as const,
                  assignee: "Housekeeping team",
                  status: "pending" as const,
                  priority: "High" as const,
                  createdAt: today,
                },
                ...prev.tasks,
              ]
            : prev.tasks;

        return {
          ...prev,
          reservations: [reservation, ...prev.reservations],
          guests,
          payments,
          rooms: roomsNext,
          tasks,
          activity: [
            activityEntry(
              `${ref} booked · ${reservation.guestName} · ${input.roomType} ${room.number} · ${nights} night${nights === 1 ? "" : "s"}`,
              input.source === "Walk-in"
                ? paid
                  ? "Front desk · Paid"
                  : "Front desk"
                : paid
                  ? "Online booking · Paid"
                  : "Online booking",
            ),
            ...prev.activity,
          ],
        };
      });

      return { ok: true, reservation };
    },
    [db],
  );

  const checkIn = useCallback((id: string) => {
    setDb((prev) => {
      const res = prev.reservations.find((r) => r.id === id);
      if (!res) return prev;
      return {
        ...prev,
        reservations: prev.reservations.map((r) => (r.id === id ? { ...r, status: "checked-in" } : r)),
        rooms: prev.rooms.map((room) =>
          room.id === res.roomId ? { ...room, status: "occupied", guest: res.guestName } : room,
        ),
        activity: [
          activityEntry(`Reservation ${res.ref} checked in to room ${res.roomNumber}`, "Reception"),
          ...prev.activity,
        ],
      };
    });
  }, []);

  const checkOut = useCallback((id: string) => {
    setDb((prev) => {
      const res = prev.reservations.find((r) => r.id === id);
      if (!res) return prev;
      const today = todayISO();
      return {
        ...prev,
        reservations: prev.reservations.map((r) => (r.id === id ? { ...r, status: "checked-out" } : r)),
        rooms: prev.rooms.map((room) =>
          room.id === res.roomId ? { ...room, status: "cleaning", guest: undefined } : room,
        ),
        tasks: [
          {
            id: uid("task"),
            roomNumber: res.roomNumber ?? "",
            type: "Departure clean",
            assignee: "Housekeeping team",
            status: "pending",
            priority: "High",
            createdAt: today,
          },
          ...prev.tasks,
        ],
        activity: [
          activityEntry(`Reservation ${res.ref} checked out of room ${res.roomNumber}`, "Reception"),
          ...prev.activity,
        ],
      };
    });
  }, []);

  const cancelReservation = useCallback((id: string) => {
    setDb((prev) => {
      const res = prev.reservations.find((r) => r.id === id);
      if (!res) return prev;
      return {
        ...prev,
        reservations: prev.reservations.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)),
        rooms: prev.rooms.map((room) =>
          room.id === res.roomId && room.status === "reserved" ? { ...room, status: "available" } : room,
        ),
        activity: [
          activityEntry(`Reservation ${res.ref} cancelled`, "Front desk"),
          ...prev.activity,
        ],
      };
    });
  }, []);

  const setRoomStatus = useCallback((id: string, status: RoomStatus) => {
    setDb((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === id
          ? { ...room, status, guest: status === "occupied" ? room.guest : undefined }
          : room,
      ),
      activity: [
        activityEntry(
          `Room ${prev.rooms.find((r) => r.id === id)?.number ?? ""} marked ${status}`,
          "Front desk",
        ),
        ...prev.activity,
      ],
    }));
  }, []);

  const addGuest = useCallback((guest: Omit<Guest, "id" | "createdAt">) => {
    setDb((prev) => ({
      ...prev,
      guests: [{ ...guest, id: uid("guest"), createdAt: todayISO() }, ...prev.guests],
      activity: [activityEntry(`Guest profile created · ${guest.name}`, "Front desk"), ...prev.activity],
    }));
  }, []);

  const updateGuest = useCallback((id: string, patch: Partial<Guest>) => {
    setDb((prev) => ({
      ...prev,
      guests: prev.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);

  const addTask = useCallback((task: Omit<HousekeepingTask, "id" | "createdAt">) => {
    setDb((prev) => ({
      ...prev,
      tasks: [{ ...task, id: uid("task"), createdAt: todayISO() }, ...prev.tasks],
    }));
  }, []);

  const setTaskStatus = useCallback((id: string, status: HousekeepingTask["status"]) => {
    setDb((prev) => {
      const task = prev.tasks.find((t) => t.id === id);
      const rooms =
        task && status === "inspected"
          ? prev.rooms.map((room) =>
              room.number === task.roomNumber && room.status === "cleaning"
                ? { ...room, status: "available" as const }
                : room,
            )
          : prev.rooms;
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        rooms,
        activity:
          task && status === "inspected"
            ? [activityEntry(`Room ${task.roomNumber} passed inspection and released to sale`, "Housekeeping"), ...prev.activity]
            : prev.activity,
      };
    });
  }, []);

  const recordPayment = useCallback(
    (payment: Omit<Payment, "id" | "date"> & { date?: string }) => {
      setDb((prev) => ({
        ...prev,
        payments: [
          { ...payment, id: uid("pay"), date: payment.date ?? todayISO() },
          ...prev.payments,
        ],
        reservations: payment.reservationRef
          ? prev.reservations.map((r) =>
              r.ref === payment.reservationRef ? { ...r, paymentStatus: "paid" } : r,
            )
          : prev.reservations,
        activity: [
          activityEntry(
            `Payment of ₦${payment.amount.toLocaleString("en-NG")} recorded · ${payment.guestName}`,
            "Accounting",
          ),
          ...prev.activity,
        ],
      }));
    },
    [],
  );

  const addPosOrder = useCallback(
    (order: { roomNumber?: string; items: PosItem[]; channel: PosOrder["channel"] }) => {
      const total = order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
      setDb((prev) => ({
        ...prev,
        posOrders: [
          {
            id: uid("pos"),
            ref: `${order.channel === "Bar" ? "B" : "R"}-${Math.floor(1200 + Math.random() * 800)}`,
            roomNumber: order.roomNumber,
            items: order.items,
            total,
            status: "open",
            channel: order.channel,
            date: todayISO(),
          },
          ...prev.posOrders,
        ],
      }));
    },
    [],
  );

  const advancePosOrder = useCallback((id: string) => {
    const flow: PosOrder["status"][] = ["open", "preparing", "served", "posted"];
    setDb((prev) => ({
      ...prev,
      posOrders: prev.posOrders.map((order) => {
        if (order.id !== id) return order;
        const next = flow[Math.min(flow.indexOf(order.status) + 1, flow.length - 1)];
        return { ...order, status: next };
      }),
    }));
  }, []);

  const adjustStock = useCallback((id: string, delta: number) => {
    setDb((prev) => ({
      ...prev,
      inventory: prev.inventory.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
      ),
    }));
  }, []);

  const addInventoryItem = useCallback((item: Omit<InventoryItem, "id">) => {
    setDb((prev) => ({
      ...prev,
      inventory: [{ ...item, id: uid("inv") }, ...prev.inventory],
    }));
  }, []);

  const addPurchaseOrder = useCallback(
    (po: Omit<PurchaseOrder, "id" | "ref" | "date" | "status">) => {
      setDb((prev) => ({
        ...prev,
        purchaseOrders: [
          {
            ...po,
            id: uid("po"),
            ref: `PO-${Math.floor(2300 + Math.random() * 700)}`,
            status: "draft",
            date: todayISO(),
          },
          ...prev.purchaseOrders,
        ],
      }));
    },
    [],
  );

  const setPoStatus = useCallback((id: string, status: PurchaseOrder["status"]) => {
    setDb((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((po) => (po.id === id ? { ...po, status } : po)),
    }));
  }, []);

  const addStaff = useCallback((staff: Omit<Staff, "id">): GuardResult => {
    const guard = guardLimit("staff", 1);
    if (!guard.ok) return guard;
    setDb((prev) => ({
      ...prev,
      staff: [{ ...staff, id: uid("staff") }, ...prev.staff],
    }));
    return { ok: true };
  }, []);

  const addRoom = useCallback((room: Omit<Room, "id">): GuardResult => {
    const guard = guardLimit("rooms", 1);
    if (!guard.ok) return guard;
    setDb((prev) => ({
      ...prev,
      rooms: [{ ...room, id: uid("room") }, ...prev.rooms],
    }));
    return { ok: true };
  }, []);

  const updateStaff = useCallback((id: string, patch: Partial<Staff>) => {
    setDb((prev) => ({
      ...prev,
      staff: prev.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const setStaffStatus = useCallback((id: string, status: Staff["status"]) => {
    setDb((prev) => ({
      ...prev,
      staff: prev.staff.map((s) => (s.id === id ? { ...s, status } : s)),
    }));
  }, []);

  const addNotification = useCallback(
    (input: {
      type: NotificationType;
      title: string;
      message: string;
      audience?: "all" | "superadmin";
      link?: string;
      actor?: string;
    }) => {
      setDb((prev) => ({
        ...prev,
        notifications: [
          {
            id: uid("note"),
            type: input.type,
            title: input.title,
            message: input.message,
            createdAt: new Date().toISOString(),
            read: false,
            audience: input.audience ?? "all",
            link: input.link,
            actor: input.actor,
          },
          ...prev.notifications,
        ],
      }));
    },
    [],
  );

  const markNotificationRead = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback((ids?: string[]) => {
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        !ids || ids.includes(n.id) ? { ...n, read: true } : n,
      ),
    }));
  }, []);

  const addMaintenanceTicket = useCallback(
    (ticket: Omit<MaintenanceTicket, "id" | "ref" | "createdAt" | "status" | "resolvedAt">) => {
      setDb((prev) => ({
        ...prev,
        maintenance: [
          {
            ...ticket,
            id: uid("mt"),
            ref: `MT-${Math.floor(450 + Math.random() * 500)}`,
            status: "open",
            createdAt: todayISO(),
          },
          ...prev.maintenance,
        ],
        activity: [activityEntry(`Maintenance ticket opened · ${ticket.issue}`, ticket.reportedBy), ...prev.activity],
      }));
    },
    [],
  );

  const setMaintenanceStatus = useCallback((id: string, status: MaintenanceTicket["status"]) => {
    setDb((prev) => ({
      ...prev,
      maintenance: prev.maintenance.map((ticket) =>
        ticket.id === id
          ? { ...ticket, status, resolvedAt: status === "resolved" ? todayISO() : undefined }
          : ticket,
      ),
    }));
  }, []);

  const runPayroll = useCallback(() => {
    setDb((prev) => ({
      ...prev,
      payroll: prev.payroll.map((p) => ({ ...p, status: "paid" })),
      activity: [activityEntry("Payroll run completed for all staff", "Accounting"), ...prev.activity],
    }));
  }, []);

  const setPayrollStatus = useCallback((id: string, status: "pending" | "paid") => {
    setDb((prev) => ({
      ...prev,
      payroll: prev.payroll.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  }, []);

  const addTrip = useCallback((trip: Omit<TransportTrip, "id" | "ref">) => {
    setDb((prev) => ({
      ...prev,
      trips: [
        { ...trip, id: uid("trip"), ref: `TR-${Math.floor(4500 + Math.random() * 500)}` },
        ...prev.trips,
      ],
    }));
  }, []);

  const setTripStatus = useCallback((id: string, status: TransportTrip["status"]) => {
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  }, []);

  const createVenueBooking = useCallback(
    (input: VenueBookingInput): VenueBookingResult => {
      const today = todayISO();
      const venue = db.venues.find((v) => v.id === input.venueId);
      if (!venue) return { ok: false, error: "Choose a hall or venue for this booking." };
      if (venue.status !== "available") return { ok: false, error: `${venue.name} is currently unavailable for bookings.` };
      if (!input.customerName.trim() || !input.phone.trim())
        return { ok: false, error: "Customer name and phone number are required." };
      if (!input.date || input.date < today) return { ok: false, error: "Choose a date from today onwards." };
      if (!input.startTime || !input.endTime || input.endTime <= input.startTime)
        return { ok: false, error: "End time must be after the start time." };
      if (input.guests < 1) return { ok: false, error: "Enter the number of guests attending." };
      const maxGuests = venueCapacity(venue, input.setup);
      if (input.guests > maxGuests)
        return { ok: false, error: `${venue.name} holds a maximum of ${maxGuests} guests in ${input.setup.toLowerCase()} setup.` };
      if (!venueIsFree(venue.id, input.date, input.startTime, input.endTime, db.venueBookings))
        return { ok: false, error: `${venue.name} is already booked for that date and time.` };

      const quote = venueQuote(venue, input.startTime, input.endTime);
      const deposit = Math.min(Math.max(0, Math.round(input.deposit)), quote.amount);
      let ref = `VEN-${Math.floor(4000 + Math.random() * 5999)}`;
      while (db.venueBookings.some((b) => b.ref === ref)) ref = `VEN-${Math.floor(4000 + Math.random() * 5999)}`;

      const booking: VenueBooking = {
        id: uid("vb"),
        ref,
        venueId: venue.id,
        venueName: venue.name,
        customerName: input.customerName.trim(),
        email: input.email?.trim() ?? "",
        phone: input.phone.trim(),
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        guests: input.guests,
        setup: input.setup,
        rate: quote.amount,
        deposit,
        total: quote.amount,
        status: "confirmed",
        notes: input.notes?.trim() || undefined,
        createdAt: today,
      };

      setDb((prev) => {
        const payments =
          deposit > 0
            ? [
                {
                  id: uid("pay"),
                  ref: `PAY-${Math.floor(7000 + Math.random() * 2999)}`,
                  guestName: booking.customerName,
                  amount: deposit,
                  method: input.paymentMethod as Payment["method"],
                  status: "paid" as const,
                  date: today,
                  type: "Venue" as const,
                },
                ...prev.payments,
              ]
            : prev.payments;

        return {
          ...prev,
          venueBookings: [booking, ...prev.venueBookings],
          payments,
          activity: [
            activityEntry(
              `${ref} booked · ${booking.venueName} · ${booking.customerName} · ${quote.label}`,
              "Front desk",
            ),
            ...prev.activity,
          ],
        };
      });

      return { ok: true, booking };
    },
    [db],
  );

  const setVenueBookingStatus = useCallback((id: string, status: VenueBookingStatus) => {
    setDb((prev) => {
      const booking = prev.venueBookings.find((b) => b.id === id);
      if (!booking) return prev;
      return {
        ...prev,
        venueBookings: prev.venueBookings.map((b) => (b.id === id ? { ...b, status } : b)),
        activity: [
          activityEntry(`Venue booking ${booking.ref} marked ${status}`, "Front desk"),
          ...prev.activity,
        ],
      };
    });
  }, []);

  const createServiceBooking = useCallback(
    (input: ServiceBookingInput): ServiceBookingResult => {
      const today = todayISO();
      if (!input.customerName.trim() || !input.phone.trim())
        return { ok: false, error: "Customer name and phone number are required." };
      if (!input.date || input.date < today) return { ok: false, error: "Choose a date from today onwards." };
      if (!input.time) return { ok: false, error: "Choose a time for the service." };
      if (input.amount < 0) return { ok: false, error: "Amount cannot be negative." };

      let ref = `SRV-${Math.floor(3000 + Math.random() * 5999)}`;
      while (db.serviceBookings.some((b) => b.ref === ref)) ref = `SRV-${Math.floor(3000 + Math.random() * 5999)}`;

      const booking: ServiceBooking = {
        id: uid("sb"),
        ref,
        service: input.service,
        customerName: input.customerName.trim(),
        phone: input.phone.trim(),
        roomNumber: input.roomNumber?.trim() || undefined,
        date: input.date,
        time: input.time,
        details: input.details?.trim() || undefined,
        amount: Math.max(0, Math.round(input.amount)),
        status: "confirmed",
        createdAt: today,
      };

      setDb((prev) => {
        const payments =
          booking.amount > 0
            ? [
                {
                  id: uid("pay"),
                  ref: `PAY-${Math.floor(7000 + Math.random() * 2999)}`,
                  guestName: booking.customerName,
                  amount: booking.amount,
                  method: input.paymentMethod as Payment["method"],
                  status: "paid" as const,
                  date: today,
                  type: "Service" as const,
                },
                ...prev.payments,
              ]
            : prev.payments;

        return {
          ...prev,
          serviceBookings: [booking, ...prev.serviceBookings],
          payments,
          activity: [
            activityEntry(`${ref} booked · ${booking.service} · ${booking.customerName}`, "Front desk"),
            ...prev.activity,
          ],
        };
      });

      return { ok: true, booking };
    },
    [db],
  );

  const setServiceBookingStatus = useCallback((id: string, status: ServiceBookingStatus) => {
    setDb((prev) => {
      const booking = prev.serviceBookings.find((b) => b.id === id);
      if (!booking) return prev;
      return {
        ...prev,
        serviceBookings: prev.serviceBookings.map((b) => (b.id === id ? { ...b, status } : b)),
        activity: [
          activityEntry(`Service ${booking.ref} marked ${status}`, "Front desk"),
          ...prev.activity,
        ],
      };
    });
  }, []);

  const addRole = useCallback((role: Omit<Role, "id" | "users">) => {
    setDb((prev) => ({
      ...prev,
      roles: [...prev.roles, { ...role, id: uid("role"), users: 0 }],
    }));
  }, []);

  const addCampaign = useCallback(
    (campaign: Omit<Campaign, "id" | "sent" | "opened" | "revenue" | "status">) => {
      setDb((prev) => ({
        ...prev,
        campaigns: [
          { ...campaign, id: uid("camp"), sent: 0, opened: 0, revenue: 0, status: "draft" },
          ...prev.campaigns,
        ],
      }));
    },
    [],
  );

  const syncChannel = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === id ? { ...channel, status: "syncing" as const } : channel,
      ),
    }));
    window.setTimeout(() => {
      setDb((prev) => ({
        ...prev,
        channels: prev.channels.map((channel) =>
          channel.id === id
            ? {
                ...channel,
                status: channel.autoSync ? ("connected" as const) : ("manual" as const),
                lastSync: new Date().toISOString(),
              }
            : channel,
        ),
        activity: [
          activityEntry(
            `${prev.channels.find((channel) => channel.id === id)?.name ?? "Channel"} synced with live reservations`,
            "Channel manager",
          ),
          ...prev.activity,
        ],
      }));
    }, 900);
  }, []);

  const setChannelStatus = useCallback((id: string, status: ChannelStatus) => {
    setDb((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === id
          ? {
              ...channel,
              status,
              lastSync: status === "connected" ? new Date().toISOString() : channel.lastSync,
            }
          : channel,
      ),
    }));
  }, []);

  const addLaundryTicket = useCallback(
    (input: Omit<LaundryTicket, "id" | "ref" | "stage" | "createdAt">) => {
      setDb((prev) => ({
        ...prev,
        laundry: [
          {
            ...input,
            id: uid("laun"),
            ref: `LD-${Math.floor(8800 + Math.random() * 900)}`,
            stage: "received",
            createdAt: todayISO(),
          },
          ...prev.laundry,
        ],
        activity: [
          activityEntry(`Laundry ticket opened · ${input.guestName} · ${input.service}`, "Laundry"),
          ...prev.activity,
        ],
      }));
    },
    [],
  );

  const advanceLaundryStage = useCallback((id: string, stage: LaundryStage) => {
    setDb((prev) => {
      const ticket = prev.laundry.find((item) => item.id === id);
      return {
        ...prev,
        laundry: prev.laundry.map((item) => (item.id === id ? { ...item, stage } : item)),
        activity: ticket
          ? [activityEntry(`Laundry ${ticket.ref} moved to ${stage}`, "Laundry"), ...prev.activity]
          : prev.activity,
      };
    });
  }, []);

  const addSpaAppointment = useCallback(
    (input: Omit<SpaAppointment, "id" | "ref" | "createdAt" | "status">) => {
      setDb((prev) => ({
        ...prev,
        spaAppointments: [
          {
            ...input,
            id: uid("spa"),
            ref: `SPA-${Math.floor(500 + Math.random() * 500)}`,
            status: "booked",
            createdAt: todayISO(),
          },
          ...prev.spaAppointments,
        ],
        activity: [
          activityEntry(`Spa booking · ${input.guestName} · ${input.serviceName}`, "Spa & leisure"),
          ...prev.activity,
        ],
      }));
    },
    [],
  );

  const setSpaAppointmentStatus = useCallback((id: string, status: SpaStatus) => {
    setDb((prev) => ({
      ...prev,
      spaAppointments: prev.spaAppointments.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
  }, []);

  const createInvoice = useCallback(
    (input: {
      customerName: string;
      type: InvoiceType;
      lines: InvoiceLine[];
      discount?: number;
      dueAt: string;
      notes?: string;
      reservationRef?: string;
    }) => {
      const subtotal = input.lines.reduce((sum, line) => sum + line.amount, 0);
      const tax = Math.round((subtotal * currentTenant.taxRate) / 100);
      const discount = Math.max(0, Math.round(input.discount ?? 0));
      const total = Math.max(0, subtotal + tax - discount);
      setDb((prev) => ({
        ...prev,
        invoices: [
          {
            id: uid("inv"),
            ref: `INV-${Math.floor(24_000 + Math.random() * 5_000)}`,
            customerName: input.customerName,
            reservationRef: input.reservationRef,
            type: input.type,
            lines: input.lines,
            subtotal,
            tax,
            discount,
            total,
            status: "draft",
            issuedAt: todayISO(),
            dueAt: input.dueAt,
            notes: input.notes,
          },
          ...prev.invoices,
        ],
        activity: [activityEntry(`Invoice drafted · ${input.customerName} · ${input.type}`, "Billing"), ...prev.activity],
      }));
    },
    [currentTenant.taxRate],
  );

  const setInvoiceStatus = useCallback((id: string, status: InvoiceStatus) => {
    setDb((prev) => {
      const invoice = prev.invoices.find((item) => item.id === id);
      return {
        ...prev,
        invoices: prev.invoices.map((item) => (item.id === id ? { ...item, status } : item)),
        activity: invoice
          ? [activityEntry(`Invoice ${invoice.ref} marked ${status}`, "Billing"), ...prev.activity]
          : prev.activity,
      };
    });
  }, []);

  const addDocument = useCallback((input: Omit<DocumentRecord, "id" | "uploadedAt">) => {
    setDb((prev) => ({
      ...prev,
      documents: [{ ...input, id: uid("doc"), uploadedAt: todayISO() }, ...prev.documents],
    }));
  }, []);

  const setDocumentStatus = useCallback((id: string, status: DocumentRecord["status"]) => {
    setDb((prev) => ({
      ...prev,
      documents: prev.documents.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
  }, []);

  const addAttendance = useCallback(
    (input: Omit<AttendanceEntry, "id" | "date"> & { date?: string }) => {
      setDb((prev) => ({
        ...prev,
        attendance: [
          { ...input, id: uid("att"), date: input.date ?? todayISO() },
          ...prev.attendance,
        ],
      }));
    },
    [],
  );

  const clockOut = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      attendance: prev.attendance.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              clockOut: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            }
          : entry,
      ),
    }));
  }, []);

  const setIntegrationStatus = useCallback((id: string, status: Integration["status"]) => {
    setDb((prev) => ({
      ...prev,
      integrations: prev.integrations.map((item) =>
        item.id === id
          ? { ...item, status, lastSync: status === "connected" ? new Date().toISOString() : item.lastSync }
          : item,
      ),
    }));
  }, []);

  const createApiKey = useCallback((label: string) => {
    const token = Math.random().toString(36).slice(2, 10);
    setDb((prev) => ({
      ...prev,
      apiKeys: [
        {
          id: uid("key"),
          label: label.trim() || "Untitled key",
          prefix: `sty_live_${token.slice(0, 4)}`,
          createdAt: todayISO(),
          lastUsed: "Never",
          status: "active",
        },
        ...prev.apiKeys,
      ],
    }));
  }, []);

  const revokeApiKey = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      apiKeys: prev.apiKeys.map((key) => (key.id === id ? { ...key, status: "revoked" } : key)),
    }));
  }, []);

  const addWebhook = useCallback((url: string, events: string[]) => {
    setDb((prev) => ({
      ...prev,
      webhooks: [{ id: uid("wh"), url: url.trim(), events, status: "active" }, ...prev.webhooks],
    }));
  }, []);

  const setWebhookStatus = useCallback((id: string, status: Webhook["status"]) => {
    setDb((prev) => ({
      ...prev,
      webhooks: prev.webhooks.map((hook) => (hook.id === id ? { ...hook, status } : hook)),
    }));
  }, []);

  const logAudit = useCallback((action: string, module: string, actor = "System") => {
    setDb((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: uid("aud"),
          at: new Date().toISOString(),
          actor,
          action,
          module,
          ip: "102.89.44.10",
          device: "Chrome · Windows",
        },
        ...prev.auditLogs,
      ].slice(0, 120),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setDb(
      seedDatabase({
        roomCount: Math.max(1, totalRooms(currentTenant)),
        staffCount: Math.max(1, Math.min(12, PLAN_LIMITS[currentTenant.plan].staff)),
        tenantName: currentTenant.name,
        city: currentTenant.city,
      }),
    );
  }, [currentTenant]);

  const value = useMemo<StoreValue>(
    () => ({
      db,
      createBooking,
      checkIn,
      checkOut,
      cancelReservation,
      setRoomStatus,
      addGuest,
      updateGuest,
      addTask,
      setTaskStatus,
      recordPayment,
      addPosOrder,
      advancePosOrder,
      adjustStock,
      addInventoryItem,
      addPurchaseOrder,
      setPoStatus,
      addStaff,
      addRoom,
      updateStaff,
      setStaffStatus,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      addMaintenanceTicket,
      setMaintenanceStatus,
      runPayroll,
      setPayrollStatus,
      addTrip,
      setTripStatus,
      createVenueBooking,
      setVenueBookingStatus,
      createServiceBooking,
      setServiceBookingStatus,
      addRole,
      addCampaign,
      syncChannel,
      setChannelStatus,
      addLaundryTicket,
      advanceLaundryStage,
      addSpaAppointment,
      setSpaAppointmentStatus,
      createInvoice,
      setInvoiceStatus,
      addDocument,
      setDocumentStatus,
      addAttendance,
      clockOut,
      setIntegrationStatus,
      createApiKey,
      revokeApiKey,
      addWebhook,
      setWebhookStatus,
      logAudit,
      resetDemo,
    }),
    [
      db,
      createBooking,
      checkIn,
      checkOut,
      cancelReservation,
      setRoomStatus,
      addGuest,
      updateGuest,
      addTask,
      setTaskStatus,
      recordPayment,
      addPosOrder,
      advancePosOrder,
      adjustStock,
      addInventoryItem,
      addPurchaseOrder,
      setPoStatus,
      addStaff,
      addRoom,
      updateStaff,
      setStaffStatus,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      addMaintenanceTicket,
      setMaintenanceStatus,
      runPayroll,
      setPayrollStatus,
      addTrip,
      setTripStatus,
      createVenueBooking,
      setVenueBookingStatus,
      createServiceBooking,
      setServiceBookingStatus,
      addRole,
      addCampaign,
      syncChannel,
      setChannelStatus,
      addLaundryTicket,
      advanceLaundryStage,
      addSpaAppointment,
      setSpaAppointmentStatus,
      createInvoice,
      setInvoiceStatus,
      addDocument,
      setDocumentStatus,
      addAttendance,
      clockOut,
      setIntegrationStatus,
      createApiKey,
      revokeApiKey,
      addWebhook,
      setWebhookStatus,
      logAudit,
      resetDemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
