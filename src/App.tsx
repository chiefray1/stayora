import { useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { StoreProvider } from "./lib/store";
import { SubscriptionProvider } from "./lib/subscription";
import { BookingGate } from "./components/SubscriptionGate";
import { TenantProvider, useTenant } from "./lib/tenants";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Book from "./pages/Book";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import BookingDesk from "./pages/BookingDesk";
import Rooms from "./pages/Rooms";
import Guests from "./pages/Guests";
import Housekeeping from "./pages/Housekeeping";
import Crm from "./pages/Crm";
import Reports from "./pages/Reports";
import Channels from "./pages/Channels";
import Payments from "./pages/Payments";
import Accounting from "./pages/Accounting";
import Pos from "./pages/Pos";
import Inventory from "./pages/Inventory";
import Procurement from "./pages/Procurement";
import Hr from "./pages/Hr";
import Payroll from "./pages/Payroll";
import Transport from "./pages/Transport";
import Whatsapp from "./pages/Whatsapp";
import Roles from "./pages/Roles";
import Team from "./pages/Team";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Policies from "./pages/Policies";
import Maintenance from "./pages/Maintenance";
import Kitchen from "./pages/Kitchen";
import Laundry from "./pages/Laundry";
import Loyalty from "./pages/Loyalty";
import Spa from "./pages/Spa";
import Events from "./pages/Events";
import Billing from "./pages/Billing";
import Documents from "./pages/Documents";
import Attendance from "./pages/Attendance";
import Integrations from "./pages/Integrations";
import Security from "./pages/Security";
import Ai from "./pages/Ai";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Admin from "./pages/Admin";
import Subscription from "./pages/Subscription";
import Pricing from "./pages/Pricing";
import PlatformSubscriptions from "./pages/PlatformSubscriptions";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Protected() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function WorkspaceRoutes() {
  const { currentTenant } = useTenant();
  return (
    <AuthProvider>
      <StoreProvider key={currentTenant.id}>
        <SubscriptionProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/book" element={<BookingGate><Book /></BookingGate>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<Policies />} />
          <Route path="/refund" element={<Policies />} />

          <Route element={<Protected />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/booking-desk" element={<BookingDesk />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/housekeeping" element={<Housekeeping />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/laundry" element={<Laundry />} />
              <Route path="/spa" element={<Spa />} />
              <Route path="/events" element={<Events />} />
              <Route path="/crm" element={<Crm />} />
              <Route path="/loyalty" element={<Loyalty />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/accounting" element={<Accounting />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/pos" element={<Pos />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/procurement" element={<Procurement />} />
              <Route path="/hr" element={<Hr />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/transport" element={<Transport />} />
              <Route path="/whatsapp" element={<Whatsapp />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/security" element={<Security />} />
              <Route path="/ai" element={<Ai />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/platform" element={<PlatformSubscriptions />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/team" element={<Team />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </SubscriptionProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <WorkspaceRoutes />
      </TenantProvider>
    </BrowserRouter>
  );
}
