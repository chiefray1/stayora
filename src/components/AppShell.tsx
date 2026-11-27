import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bell,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  CalendarPlus,
  Car,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Database,
  Fingerprint,
  Flower2,
  FolderOpen,
  Gift,
  KeyRound,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PartyPopper,
  PlugZap,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import { canAccessPath, isPlatformAdmin, moduleForPath } from "../lib/permissions";
import { timeAgo, todayLabel } from "../lib/format";
import { useTenant } from "../lib/tenants";
import { useEntitlements } from "../lib/subscription";
import { ModuleGate, PlanBadge } from "./SubscriptionGate";
import { Avatar, cn } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reservations", label: "Reservations", icon: CalendarDays },
      { to: "/booking-desk", label: "Booking desk", icon: CalendarPlus },
      { to: "/rooms", label: "Rooms & halls", icon: BedDouble },
      { to: "/guests", label: "Guests", icon: Users },
      { to: "/housekeeping", label: "Housekeeping", icon: Sparkles },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
      { to: "/kitchen", label: "Kitchen display", icon: UtensilsCrossed },
      { to: "/laundry", label: "Laundry", icon: Shirt },
      { to: "/spa", label: "Spa & gym", icon: Flower2 },
      { to: "/events", label: "Events & venues", icon: PartyPopper },
    ],
  },
  {
    label: "Revenue",
    items: [
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/accounting", label: "Accounting", icon: Wallet },
      { to: "/billing", label: "Billing & invoices", icon: ReceiptText },
      { to: "/channels", label: "Booking channels", icon: Link2 },
      { to: "/reports", label: "Reports & analytics", icon: BarChart3 },
      { to: "/pos", label: "Restaurant & bar", icon: BookOpen },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/crm", label: "CRM & marketing", icon: MessageCircle },
      { to: "/loyalty", label: "Loyalty", icon: Gift },
      { to: "/whatsapp", label: "WhatsApp agent", icon: Sparkles },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/hr", label: "HR & attendance", icon: UserCog },
      { to: "/attendance", label: "Attendance", icon: Fingerprint },
      { to: "/payroll", label: "Payroll & staff", icon: Wallet },
      { to: "/team", label: "Team & access", icon: UserPlus },
      { to: "/roles", label: "Roles & permissions", icon: ShieldCheck },
    ],
  },
  {
    label: "Supplies",
    items: [
      { to: "/inventory", label: "Inventory", icon: Package },
      { to: "/procurement", label: "Procurement", icon: ClipboardList },
      { to: "/transport", label: "Transport", icon: Car },
      { to: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/subscription", label: "Subscription & billing", icon: CreditCard },
      { to: "/integrations", label: "Integrations & API", icon: PlugZap },
      { to: "/security", label: "Security & audit", icon: ShieldAlert },
      { to: "/ai", label: "AI studio", icon: BrainCircuit },
      { to: "/properties", label: "Properties & config", icon: Building2 },
      { to: "/tenants", label: "Tenant console", icon: Database },
      { to: "/platform", label: "Subscription control", icon: ShieldCheck },
    ],
  },
];

const accountItems: NavItem[] = [
  { to: "/profile", label: "Staff profile", icon: UserRound },
  { to: "/settings", label: "Profile settings", icon: Settings },
];

const allItems = [...groups.flatMap((g) => g.items), ...accountItems];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const { db } = useStore();
  const { tenants, currentTenant, switchTenant } = useTenant();
  const { plan, canModule } = useEntitlements();
  const pendingTasks = db.tasks.filter((t) => t.status === "pending" || t.status === "in-progress").length;
  const roomFloors = new Set(db.rooms.map((room) => room.floor)).size;
  const canSwitchWorkspace = user?.role === "Superadmin" && isPlatformAdmin(user.email);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(user?.role, db.roles, item.to, user?.email)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-noir text-noir-text">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <img src="/assets/stayora-mark.png" alt="Stayora" className="h-8 w-auto" />
        <div>
          <p className="font-display text-base leading-tight text-white">Stayora</p>
          <p className="text-[9px] uppercase tracking-[0.22em] text-noir-muted">Hotel Suite</p>
        </div>
      </div>

      <div className="sidebar-property mx-3 mb-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[9px] uppercase tracking-[0.16em] text-noir-muted">Workspace</p>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-brand-bright">
            {plan.name.replace("Stayora ", "")}
          </span>
        </div>
        {canSwitchWorkspace ? (
          <select
            value={currentTenant.id}
            onChange={(event) => {
              switchTenant(event.target.value);
              onNavigate?.();
            }}
            aria-label="Switch workspace"
            className="mt-1 w-full cursor-pointer truncate bg-transparent text-[11px] font-semibold text-white outline-none [&>option]:text-foreground"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-1 truncate text-[11px] font-semibold text-white">{currentTenant.name}</p>
        )}
        <p className="text-[10px] text-noir-muted">
          {db.rooms.length} keys · {roomFloors} floors · {currentTenant.branches.length}{" "}
          {currentTenant.branches.length === 1 ? "branch" : "branches"}
        </p>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-3">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-1.5">
            <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-noir-muted/70">
              {group.label}
            </p>
            <ul className="space-y-px">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2 rounded-md px-2 py-0.5 text-[12px] font-medium transition",
                        isActive
                          ? "bg-white/[0.09] text-white shadow-[inset_2px_0_0_0_var(--color-brand-bright)]"
                          : "text-noir-muted hover:bg-white/[0.05] hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("size-3.5", isActive ? "text-brand-bright" : "text-noir-muted/80 group-hover:text-brand-bright")} />
                        <span className="flex-1">{item.label}</span>
                        {(() => {
                          const moduleId = moduleForPath(item.to);
                          if (!moduleId || canModule(moduleId)) return null;
                          return <LockKeyhole className="size-3 text-noir-muted/60" aria-label="Requires a plan upgrade" />;
                        })()}
                        {item.to === "/housekeeping" && pendingTasks > 0 && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                            {pendingTasks}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2.5">
        {canModule("booking") ? (
          <Link
            to="/book"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-bright transition hover:bg-primary/15"
          >
            <span className="flex items-center gap-1.5"><ArrowUpRight className="size-3" /> Open booking page</span>
          </Link>
        ) : (
          <Link
            to="/subscription"
            onClick={onNavigate}
            className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-noir-muted transition hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex items-center gap-1.5"><LockKeyhole className="size-3" /> Add booking system</span>
          </Link>
        )}
        <div className="flex items-center gap-2 rounded-lg px-1 py-0.5">
          <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2 rounded-md transition hover:bg-white/[0.04]">
            <Avatar name={user?.name ?? "Front Desk"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-white">{user?.name ?? "Front Desk"}</p>
              <p className="truncate text-[9px] text-noir-muted">{user?.role ?? "Front desk"}</p>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-noir-muted transition hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-[9px] text-noir-muted">
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white">Privacy</Link>
          <span>·</span>
          <Link to="/refund" target="_blank" rel="noopener noreferrer" className="hover:text-white">Refund policy</Link>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { db, markNotificationRead, markAllNotificationsRead } = useStore();
  const { currentTenant } = useTenant();
  const { canModule } = useEntitlements();
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const current = allItems.find((item) => location.pathname.startsWith(item.to));
  const currentModule = moduleForPath(location.pathname);
  const notificationPreferences = useMemo(() => {
    try {
      const raw = localStorage.getItem(`stayora.preferences.${user?.email ?? "staff"}`);
      return raw ? (JSON.parse(raw) as { reportNotifications?: boolean }) : null;
    } catch {
      return null;
    }
  }, [preferenceVersion, user?.email]);
  const visibleNotifications = db.notifications
    .filter((notification) => notification.audience === "all" || user?.role === "Superadmin")
    .filter((notification) => notification.type !== "report" || notificationPreferences?.reportNotifications !== false);
  const unreadNotifications = visibleNotifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onPreferences = () => setPreferenceVersion((value) => value + 1);
    window.addEventListener("stayora:preferences", onPreferences);
    return () => window.removeEventListener("stayora:preferences", onPreferences);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!canAccessPath(user?.role, db.roles, location.pathname, user?.email)) {
    const fallback = canAccessPath(user?.role, db.roles, "/dashboard", user?.email) ? "/dashboard" : "/profile";
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-72 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-noir-muted hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
            <button
              onClick={() => setOpen(true)}
              className="rounded-md border border-border p-2 text-muted-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            <div className="hidden min-w-0 items-center gap-2 text-xs md:flex">
              <span className="max-w-[12rem] truncate text-muted-foreground">{currentTenant.name}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold">{current?.label ?? "Dashboard"}</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="relative hidden xl:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="field w-56 pl-8"
                  placeholder="Search guests, rooms, refs…"
                  aria-label="Search"
                />
              </div>
              <span className="hidden text-xs text-muted-foreground md:block">{todayLabel()}</span>
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => {
                    setNotificationsOpen((value) => !value);
                    setProfileOpen(false);
                  }}
                  className="relative rounded-md border border-border bg-white p-2 text-muted-foreground transition hover:text-foreground"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="size-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">Notifications</p>
                        <p className="text-[10px] text-muted-foreground">{unreadNotifications} unread</p>
                      </div>
                      <button
                        onClick={() => markAllNotificationsRead(visibleNotifications.map((notification) => notification.id))}
                        disabled={unreadNotifications === 0}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-gold transition hover:bg-accent disabled:opacity-40"
                      >
                        <CheckCheck className="size-3.5" /> Mark all read
                      </button>
                    </div>
                    <div className="scroll-thin max-h-[360px] overflow-y-auto">
                      {visibleNotifications.slice(0, 8).map((notification) => {
                        const NotificationIcon =
                          notification.type === "report"
                            ? BarChart3
                            : notification.type === "maintenance"
                              ? Wrench
                              : notification.type === "booking"
                                ? CalendarDays
                                : notification.type === "payment"
                                  ? CreditCard
                                  : Settings;
                        return (
                          <Link
                            key={notification.id}
                            to={notification.link ?? "/reports"}
                            onClick={() => {
                              markNotificationRead(notification.id);
                              setNotificationsOpen(false);
                            }}
                            className={cn(
                              "flex gap-3 border-b border-border/70 px-4 py-3 transition last:border-0 hover:bg-muted/50",
                              !notification.read && "bg-accent/40",
                            )}
                          >
                            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold">
                              <NotificationIcon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-xs font-semibold">{notification.title}</span>
                                {!notification.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{notification.message}</span>
                              <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                {notification.actor && <span>{notification.actor} ·</span>}
                                <span>{timeAgo(notification.createdAt)}</span>
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                      {visibleNotifications.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <Bell className="mx-auto size-6 text-muted-foreground/50" />
                          <p className="mt-2 text-xs font-semibold">No notifications yet</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Report alerts will appear here.</p>
                        </div>
                      )}
                    </div>
                    <Link
                      to="/reports"
                      onClick={() => setNotificationsOpen(false)}
                      className="flex items-center justify-center border-t border-border px-4 py-2.5 text-[11px] font-semibold text-gold transition hover:bg-accent"
                    >
                      View reports
                    </Link>
                  </div>
                )}
              </div>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setProfileOpen((value) => !value);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md border border-border bg-white py-1 pl-1 pr-2 transition hover:border-primary/30"
                  aria-label="Account menu"
                  aria-expanded={profileOpen}
                >
                  <Avatar name={user?.name ?? "Front Desk"} size="sm" />
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold leading-tight">{user?.name ?? "Front Desk"}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{user?.role ?? "Front desk"}</p>
                  </div>
                  <ChevronDown className={cn("size-3.5 text-muted-foreground transition", profileOpen && "rotate-180")} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-xs font-semibold">{user?.name ?? "Staff member"}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
                      <span className="mt-2 inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                        {user?.role ?? "Front desk"}
                      </span>
                    </div>
                    <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition hover:bg-muted">
                      <UserRound className="size-4 text-muted-foreground" /> My profile
                    </Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition hover:bg-muted">
                      <KeyRound className="size-4 text-muted-foreground" /> Profile settings
                    </Link>
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-xs font-medium text-destructive transition hover:bg-rose-50"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1560px] px-4 py-4 sm:px-5 lg:py-5">
          {currentModule ? (
            <ModuleGate moduleId={currentModule}>
              <Outlet />
            </ModuleGate>
          ) : (
            <Outlet />
          )}
        </main>

        <footer className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 pb-4 text-[10px] text-muted-foreground sm:px-5">
          <span>© {new Date().getFullYear()} Stayora Hotel Suite · {currentTenant.city}</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Database className="size-3" /> Tenant-isolated demo data</span>
            {canModule("booking") && (
              <Link to="/book" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                <Settings className="size-3" /> Booking page
              </Link>
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}
