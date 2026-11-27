import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpRight,
  Ban,
  BedDouble,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  adminCreateAccount,
  adminRemoveAccount,
  adminResetPassword,
  adminSetDisabled,
  adminSetRole,
  ensureDemoWorkspaceAccounts,
  listWorkspaceAccounts,
  useAuth,
  type AccountSummary,
} from "../lib/auth";
import {
  totalRooms,
  useTenant,
  type Tenant,
  type TenantPlan,
} from "../lib/tenants";
import { useSubscription } from "../lib/subscription";
import { useStore } from "../lib/store";
import { PLAN_ORDER, formatLimit, planFor, usd } from "../lib/plans";
import { purgeWorkspaceStorage, readWorkspaceUsage, type WorkspaceUsage } from "../lib/admin";
import { downloadCsv, shortDate, timeAgo } from "../lib/format";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  SectionCard,
  Select,
  StatCard,
  StatusPill,
  Tabs,
  cn,
} from "../components/ui";

type Tab = "overview" | "workspaces" | "users" | "activity";

interface WorkspaceForm {
  name: string;
  ownerName: string;
  phone: string;
  city: string;
  country: string;
  currency: Tenant["currency"];
}

interface NewWorkspaceForm extends WorkspaceForm {
  ownerEmail: string;
  password: string;
  plan: TenantPlan;
  rooms: number;
}

interface NewUserForm {
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

const blankWorkspace: NewWorkspaceForm = {
  name: "",
  ownerName: "",
  ownerEmail: "",
  password: "stayora",
  phone: "",
  city: "",
  country: "Nigeria",
  currency: "NGN",
  plan: "free",
  rooms: 5,
};

const currencies: Tenant["currency"][] = ["NGN", "USD", "GBP", "EUR", "KES", "GHS"];
const fallbackRoles = ["Administrator", "Manager", "Front desk", "Housekeeping", "Accounting", "Restaurant & bar", "Spa & leisure"];

export default function Admin() {
  const { tenants, currentTenant, createTenant, updateTenant, removeTenant, switchTenant } = useTenant();
  const { user, refreshAccounts } = useAuth();
  const { db } = useStore();
  const {
    state,
    settings,
    assignPlan,
    suspendSubscription,
    reactivateSubscription,
    subscriptionFor,
    removeWorkspaceBilling,
  } = useSubscription();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState<NewWorkspaceForm>(blankWorkspace);

  const [manageId, setManageId] = useState<string | null>(null);
  const [manageForm, setManageForm] = useState<WorkspaceForm>({
    name: "",
    ownerName: "",
    phone: "",
    city: "",
    country: "Nigeria",
    currency: "NGN",
  });
  const [managePlan, setManagePlan] = useState<TenantPlan>("free");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [userOpen, setUserOpen] = useState(false);
  const [userBusy, setUserBusy] = useState(false);
  const [userForm, setUserForm] = useState<NewUserForm>({
    tenantId: "",
    name: "",
    email: "",
    password: "stayora",
    role: "Front desk",
  });

  const [resetTarget, setResetTarget] = useState<{ tenant: Tenant; account: AccountSummary } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const [roleTarget, setRoleTarget] = useState<{ tenant: Tenant; account: AccountSummary } | null>(null);
  const [roleValue, setRoleValue] = useState("");

  const roleNames = useMemo(() => {
    const names = db.roles.map((role) => role.name).filter((name) => name !== "Superadmin");
    return names.length ? names : fallbackRoles;
  }, [db.roles]);

  const accountRows = useMemo(
    () =>
      tenants.flatMap((tenant) =>
        listWorkspaceAccounts(tenant.id).map((account) => ({ tenant, account })),
      ),
    [tenants, version],
  );

  // Showcase workspaces seed their demo team on first visit. Seed them here so
  // the platform directory is complete before an operator opens each workspace.
  useEffect(() => {
    const seeded = tenants.some((tenant) =>
      ensureDemoWorkspaceAccounts(tenant.id, tenant.ownerEmail),
    );
    if (seeded) setVersion((value) => value + 1);
  }, [tenants]);

  const usageByTenant = useMemo(() => {
    const map: Record<string, WorkspaceUsage | null> = {};
    tenants.forEach((tenant) => {
      map[tenant.id] = readWorkspaceUsage(tenant.id);
    });
    return map;
  }, [tenants, version]);

  const mrr = useMemo(
    () =>
      tenants.reduce((sum, tenant) => {
        const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
        if (sub.status === "suspended" || sub.status === "expired") return sum;
        const plan = planFor(sub.planId, settings);
        return sum + (sub.cycle === "yearly" ? plan.yearly / 12 : plan.monthly);
      }, 0),
    [tenants, state.subscriptions, settings, subscriptionFor],
  );

  const totalUsers = accountRows.length;
  const disabledUsers = accountRows.filter((row) => row.account.disabled).length;
  const newThisMonth = tenants.filter(
    (tenant) => tenant.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7),
  ).length;
  const suspendedCount = tenants.filter((tenant) => tenant.status === "suspended").length;

  const filteredWorkspaces = useMemo(
    () =>
      tenants.filter((tenant) => {
        const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
        if (planFilter !== "all" && sub.planId !== planFilter) return false;
        if (statusFilter !== "all" && sub.status !== statusFilter && tenant.status !== statusFilter) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          return (
            tenant.name.toLowerCase().includes(q) ||
            tenant.city.toLowerCase().includes(q) ||
            tenant.ownerEmail.toLowerCase().includes(q) ||
            tenant.id.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tenants, state.subscriptions, subscriptionFor, planFilter, statusFilter, query],
  );

  const filteredAccounts = useMemo(
    () =>
      accountRows.filter(({ tenant, account }) => {
        if (workspaceFilter !== "all" && tenant.id !== workspaceFilter) return false;
        if (roleFilter !== "all" && account.role !== roleFilter) return false;
        if (accountStatusFilter === "active" && account.disabled) return false;
        if (accountStatusFilter === "disabled" && !account.disabled) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          return (
            account.name.toLowerCase().includes(q) ||
            account.email.toLowerCase().includes(q) ||
            tenant.name.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [accountRows, workspaceFilter, roleFilter, accountStatusFilter, query],
  );

  const activity = useMemo(() => {
    const events: { id: string; at: string; kind: string; title: string; detail: string; tenant: string }[] = [];

    tenants.forEach((tenant) => {
      events.push({
        id: `ws-${tenant.id}`,
        at: tenant.createdAt,
        kind: "workspace",
        title: `${tenant.name} created`,
        detail: `${tenant.ownerName} · ${tenant.city}, ${tenant.country}`,
        tenant: tenant.name,
      });
    });

    accountRows.forEach(({ tenant, account }) => {
      if (!account.createdAt) return;
      events.push({
        id: `acc-${tenant.id}-${account.email}`,
        at: account.createdAt,
        kind: "user",
        title: `${account.name} added`,
        detail: `${account.role} · ${account.email}`,
        tenant: tenant.name,
      });
    });

    state.events.forEach((event) => {
      events.push({
        id: event.id,
        at: event.at,
        kind: "billing",
        title: event.type.replace(/_/g, " "),
        detail: event.detail,
        tenant: tenants.find((tenant) => tenant.id === event.hotelId)?.name ?? event.hotelId,
      });
    });

    Object.entries(usageByTenant).forEach(([tenantId, usage]) => {
      usage?.auditLogs.slice(0, 4).forEach((log) => {
        events.push({
          id: `aud-${tenantId}-${log.id}`,
          at: log.at,
          kind: "audit",
          title: log.action,
          detail: `${log.actor} · ${log.module}`,
          tenant: tenants.find((tenant) => tenant.id === tenantId)?.name ?? tenantId,
        });
      });
    });

    return events
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
      .slice(0, 80);
  }, [tenants, accountRows, usageByTenant, state.events]);

  const currentPlanOf = (tenantId: string) =>
    state.subscriptions[tenantId]?.planId ?? subscriptionFor(tenantId).planId;

  const resetFeedback = () => {
    setNotice("");
    setError("");
  };

  /* ---------------------------------------------------------------- actions */

  const createWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    const email = createForm.ownerEmail.trim().toLowerCase();
    if (!createForm.name.trim() || !createForm.ownerName.trim() || !email || !createForm.city.trim()) {
      setError("Complete the workspace name, owner name, owner email and city.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid owner email address.");
      return;
    }
    if (tenants.some((tenant) => tenant.ownerEmail.toLowerCase() === email)) {
      setError("A workspace already exists for that owner email.");
      return;
    }
    if (createForm.password.length < 6) {
      setError("The owner password must be at least 6 characters.");
      return;
    }

    setCreateBusy(true);
    try {
      const tenant = createTenant({
        name: createForm.name,
        ownerName: createForm.ownerName,
        ownerEmail: email,
        phone: createForm.phone,
        city: createForm.city,
        country: createForm.country,
        plan: createForm.plan,
        rooms: Math.max(1, Number(createForm.rooms) || 1),
        currency: createForm.currency,
      });
      const result = await adminCreateAccount({
        tenantId: tenant.id,
        email,
        name: createForm.ownerName,
        password: createForm.password,
        role: "Superadmin",
      });
      if (!result.ok) {
        setError(result.error ?? "Workspace created, but the owner account could not be provisioned.");
        return;
      }
      if (createForm.plan !== "free") {
        assignPlan(tenant.id, createForm.plan, "monthly", 30);
      }
      refreshAccounts();
      setVersion((value) => value + 1);
      setCreateOpen(false);
      setNotice(
        `Workspace “${tenant.name}” created. Owner sign-in: ${email} / ${createForm.password}`,
      );
      setCreateForm(blankWorkspace);
    } finally {
      setCreateBusy(false);
    }
  };

  const openManage = (tenant: Tenant) => {
    resetFeedback();
    setManageId(tenant.id);
    setManageForm({
      name: tenant.name,
      ownerName: tenant.ownerName,
      phone: tenant.phone,
      city: tenant.city,
      country: tenant.country,
      currency: tenant.currency,
    });
    setManagePlan(currentPlanOf(tenant.id));
  };

  const saveWorkspace = () => {
    resetFeedback();
    const tenant = tenants.find((entry) => entry.id === manageId);
    if (!tenant) return;
    const name = manageForm.name.trim();
    if (!name) {
      setError("Workspace name is required.");
      return;
    }
    updateTenant(tenant.id, {
      name,
      legalName: name,
      ownerName: manageForm.ownerName.trim(),
      phone: manageForm.phone.trim(),
      city: manageForm.city.trim(),
      country: manageForm.country.trim(),
      currency: manageForm.currency,
    });
    if (managePlan !== currentPlanOf(tenant.id)) {
      assignPlan(tenant.id, managePlan, "monthly", 30);
    }
    setVersion((value) => value + 1);
    setManageId(null);
    setNotice(`Workspace “${name}” updated.`);
  };

  const toggleSuspend = (tenant: Tenant) => {
    resetFeedback();
    const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
    if (sub.status === "suspended" || tenant.status === "suspended") {
      reactivateSubscription(tenant.id);
      setNotice(`“${tenant.name}” is active again.`);
    } else {
      suspendSubscription(tenant.id, "Suspended from the admin console");
      setNotice(`“${tenant.name}” was suspended. Its data is preserved.`);
    }
    setVersion((value) => value + 1);
  };

  const openWorkspace = (tenant: Tenant) => {
    switchTenant(tenant.id);
    navigate("/dashboard");
  };

  const deleteWorkspace = () => {
    resetFeedback();
    const tenant = tenants.find((entry) => entry.id === deleteId);
    if (!tenant) return;
    if (tenant.id === currentTenant.id) {
      setError("Switch to another workspace before deleting this one.");
      return;
    }
    if (deleteConfirm.trim() !== tenant.name) {
      setError("Type the workspace name exactly to confirm deletion.");
      return;
    }
    purgeWorkspaceStorage(tenant.id);
    removeWorkspaceBilling(tenant.id);
    removeTenant(tenant.id);
    setDeleteId(null);
    setDeleteConfirm("");
    setVersion((value) => value + 1);
    setNotice(`“${tenant.name}” was deleted with its users, data and sessions.`);
  };

  const openAddUser = () => {
    resetFeedback();
    setUserForm({
      tenantId: workspaceFilter !== "all" ? workspaceFilter : tenants[0]?.id ?? "",
      name: "",
      email: "",
      password: "stayora",
      role: roleNames[0] ?? "Front desk",
    });
    setUserOpen(true);
  };

  const addUser = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    const tenant = tenants.find((entry) => entry.id === userForm.tenantId);
    if (!tenant) {
      setError("Choose a workspace for this user.");
      return;
    }
    const email = userForm.email.trim().toLowerCase();
    if (!userForm.name.trim() || !email) {
      setError("Enter the user's name and email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (userForm.password.length < 6) {
      setError("The temporary password must be at least 6 characters.");
      return;
    }

    setUserBusy(true);
    try {
      const result = await adminCreateAccount({
        tenantId: tenant.id,
        email,
        name: userForm.name,
        password: userForm.password,
        role: userForm.role,
      });
      if (!result.ok) {
        setError(result.error ?? "The user could not be created.");
        return;
      }
      refreshAccounts();
      setVersion((value) => value + 1);
      setUserOpen(false);
      setNotice(
        `${userForm.name.trim()} can sign in to ${tenant.name} with ${email} / ${userForm.password}.`,
      );
    } finally {
      setUserBusy(false);
    }
  };

  const resetUserPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    if (!resetTarget) return;
    if (resetPassword.length < 6) {
      setError("The new password must be at least 6 characters.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError("The two passwords do not match.");
      return;
    }
    setResetBusy(true);
    try {
      const result = await adminResetPassword({
        tenantId: resetTarget.tenant.id,
        email: resetTarget.account.email,
        newPassword: resetPassword,
      });
      if (!result.ok) {
        setError(result.error ?? "The password could not be reset.");
        return;
      }
      refreshAccounts();
      setVersion((value) => value + 1);
      setNotice(
        `Password reset for ${resetTarget.account.email}. They must sign in again with the new password.`,
      );
      setResetTarget(null);
      setResetPassword("");
      setResetConfirm("");
    } finally {
      setResetBusy(false);
    }
  };

  const saveRole = () => {
    resetFeedback();
    if (!roleTarget) return;
    const result = adminSetRole({
      tenantId: roleTarget.tenant.id,
      email: roleTarget.account.email,
      role: roleValue,
    });
    if (!result.ok) {
      setError(result.error ?? "The role could not be changed.");
      return;
    }
    refreshAccounts();
    setVersion((value) => value + 1);
    setNotice(`${roleTarget.account.name} is now ${roleValue} in ${roleTarget.tenant.name}.`);
    setRoleTarget(null);
  };

  const toggleDisabled = (tenant: Tenant, account: AccountSummary) => {
    resetFeedback();
    const next = !account.disabled;
    const result = adminSetDisabled({ tenantId: tenant.id, email: account.email, disabled: next });
    if (!result.ok) {
      setError(result.error ?? "That account could not be updated.");
      return;
    }
    refreshAccounts();
    setVersion((value) => value + 1);
    setNotice(`${account.name}'s login was ${next ? "disabled" : "re-enabled"}.`);
  };

  const removeUser = (tenant: Tenant, account: AccountSummary) => {
    resetFeedback();
    if (!window.confirm(`Remove ${account.name}'s login from ${tenant.name}? This cannot be undone.`)) {
      return;
    }
    const result = adminRemoveAccount({ tenantId: tenant.id, email: account.email });
    if (!result.ok) {
      setError(result.error ?? "That account could not be removed.");
      return;
    }
    refreshAccounts();
    setVersion((value) => value + 1);
    setNotice(`${account.name}'s login was removed from ${tenant.name}.`);
  };

  const exportWorkspaces = () => {
    downloadCsv("stayora-workspaces.csv", [
      ["Workspace", "ID", "Owner", "Owner email", "City", "Country", "Plan", "Status", "Users", "Rooms", "Created"],
      ...tenants.map((tenant) => [
        tenant.name,
        tenant.id,
        tenant.ownerName,
        tenant.ownerEmail,
        tenant.city,
        tenant.country,
        currentPlanOf(tenant.id),
        tenant.status,
        String(listWorkspaceAccounts(tenant.id).length),
        String(totalRooms(tenant)),
        tenant.createdAt.slice(0, 10),
      ]),
    ]);
  };

  const exportUsers = () => {
    downloadCsv("stayora-users.csv", [
      ["Name", "Email", "Workspace", "Role", "Status", "Created"],
      ...accountRows.map(({ tenant, account }) => [
        account.name,
        account.email,
        tenant.name,
        account.role,
        account.disabled ? "disabled" : "active",
        account.createdAt?.slice(0, 10) ?? "",
      ]),
    ]);
  };

  /* ------------------------------------------------------------------- view */

  return (
    <div>
      <PageHeader
        eyebrow="Platform administration"
        title="Admin console"
        description="Manage every workspace, user and subscription on Stayora from one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/platform" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted">
              <Wallet className="size-4" /> Billing control
            </Link>
            <Button onClick={() => { resetFeedback(); setCreateOpen(true); }}>
              <Plus className="size-4" /> New workspace
            </Button>
          </div>
        }
      />

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> <span className="min-w-0 break-words">{notice}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={(next) => { setTab(next); resetFeedback(); }}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "workspaces", label: `Workspaces (${tenants.length})` },
          { id: "users", label: `Users (${totalUsers})` },
          { id: "activity", label: "Activity" },
        ]}
      />

      {tab === "overview" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Workspaces"
              value={String(tenants.length)}
              hint={`${tenants.filter((tenant) => tenant.status === "active").length} active · ${suspendedCount} suspended`}
              icon={Building2}
              tone="noir"
            />
            <StatCard
              label="Users"
              value={String(totalUsers)}
              hint={disabledUsers ? `${disabledUsers} disabled login${disabledUsers === 1 ? "" : "s"}` : "All logins active"}
              icon={Users}
            />
            <StatCard label="MRR" value={usd(mrr)} hint="Active subscriptions" up icon={TrendingUp} tone="green" />
            <StatCard label="New this month" value={String(newThisMonth)} hint="Self-serve and provisioned" icon={Sparkles} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard title="Plan distribution" subtitle="Workspaces by package" className="xl:col-span-2">
              <div className="space-y-4">
                {PLAN_ORDER.map((planId) => {
                  const plan = planFor(planId, settings);
                  const count = tenants.filter((tenant) => currentPlanOf(tenant.id) === planId).length;
                  const pct = tenants.length ? Math.round((count / tenants.length) * 100) : 0;
                  return (
                    <div key={planId}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium">{plan.name.replace("Stayora ", "")}</span>
                        <span className="text-muted-foreground">{count} workspace{count === 1 ? "" : "s"} · {pct}%</span>
                      </div>
                      <Progress value={pct} tone={planId === "professional" ? "blue" : planId === "starter" ? "gold" : "green"} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {PLAN_ORDER.map((planId) => {
                  const plan = planFor(planId, settings);
                  return (
                    <div key={planId} className="rounded-lg border border-border px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {plan.name.replace("Stayora ", "")}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-semibold">
                        {plan.monthly === 0 ? "Free" : `${usd(plan.monthly)}`}
                        {plan.monthly > 0 && <span className="text-[10px] font-normal text-muted-foreground">/mo</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatLimit(plan.limits.rooms)} rooms · {formatLimit(plan.limits.staff)} staff
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Needs attention" subtitle="Suspended or past-due workspaces" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {tenants
                  .filter((tenant) => {
                    const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
                    return tenant.status === "suspended" || sub.status === "past_due" || sub.status === "expired";
                  })
                  .slice(0, 6)
                  .map((tenant) => (
                    <li key={tenant.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{tenant.name}</p>
                        <StatusPill status={tenant.status} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {planFor(currentPlanOf(tenant.id), settings).name} · {tenant.city}
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openManage(tenant)}>Manage</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleSuspend(tenant)}>
                          {tenant.status === "suspended" ? "Reactivate" : "Suspend"}
                        </Button>
                      </div>
                    </li>
                  ))}
                {suspendedCount === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted-foreground">Every workspace is healthy.</li>
                )}
              </ul>
            </SectionCard>

            <SectionCard title="Recent workspaces" subtitle="Newest hotels and groups" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {[...tenants]
                  .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                  .slice(0, 6)
                  .map((tenant) => (
                    <li key={tenant.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{tenant.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {tenant.ownerName} · {shortDate(tenant.createdAt)}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openManage(tenant)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </li>
                  ))}
              </ul>
            </SectionCard>

            <SectionCard title="Quick actions" subtitle="Common platform tasks">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { resetFeedback(); setCreateOpen(true); }}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-muted"
                >
                  <Building2 className="size-4 text-gold" /> New workspace
                </button>
                <button
                  type="button"
                  onClick={openAddUser}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-xs font-semibold transition hover:bg-muted"
                >
                  <UserPlus className="size-4 text-gold" /> Add user
                </button>
                <Link
                  to="/tenants"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold transition hover:bg-muted"
                >
                  <ArrowRightLeft className="size-4 text-gold" /> Tenant console
                </Link>
                <Link
                  to="/platform"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold transition hover:bg-muted"
                >
                  <Wallet className="size-4 text-gold" /> Subscription control
                </Link>
              </div>
              <div className="mt-3 rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
                <p className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="size-3.5 text-gold" /> Platform mode
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  You are signed in as {user?.email}. Every action is isolated to the selected workspace.
                </p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "workspaces" && (
        <SectionCard
          className="mt-4"
          title="All workspaces"
          subtitle="Search, change packages, suspend access or open a workspace."
          bodyClassName="p-0"
          action={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspaces…" className="w-full pl-8 sm:w-48" />
              </div>
              <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="w-full sm:w-32">
                <option value="all">All plans</option>
                {PLAN_ORDER.map((planId) => (
                  <option key={planId} value={planId}>{planFor(planId, settings).name.replace("Stayora ", "")}</option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-32">
                {["all", "active", "trial", "suspended", "free", "past_due", "expired"].map((status) => (
                  <option key={status} value={status}>{status === "all" ? "All statuses" : status.replace("_", " ")}</option>
                ))}
              </Select>
              <Button variant="outline" size="sm" onClick={exportWorkspaces} className="w-full sm:w-auto">
                <Download className="size-4" /> Export
              </Button>
            </div>
          }
        >
          <div className="hidden overflow-x-auto md:block">
            <table className="table-base min-w-[1040px]">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Owner</th>
                  <th>Location</th>
                  <th>Users</th>
                  <th>Rooms</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkspaces.map((tenant) => {
                  const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
                  const usage = usageByTenant[tenant.id];
                  const users = listWorkspaceAccounts(tenant.id).length;
                  return (
                    <tr key={tenant.id} className={tenant.id === currentTenant.id ? "bg-accent/30" : undefined}>
                      <td>
                        <p className="text-xs font-semibold">{tenant.name}</p>
                        <p className="text-[10px] text-muted-foreground">{tenant.slug} · {tenant.id}</p>
                      </td>
                      <td>
                        <p className="text-xs font-medium">{tenant.ownerName}</p>
                        <p className="text-[10px] text-muted-foreground">{tenant.ownerEmail}</p>
                      </td>
                      <td className="text-xs">{tenant.city}, {tenant.country}</td>
                      <td className="text-xs tabular-nums">{users}</td>
                      <td className="text-xs tabular-nums">{usage?.rooms ?? totalRooms(tenant)}</td>
                      <td>
                        <Select
                          value={sub.planId}
                          onChange={(event) => {
                            resetFeedback();
                            const nextPlan = event.target.value as TenantPlan;
                            assignPlan(tenant.id, nextPlan, sub.cycle, 30);
                            setVersion((value) => value + 1);
                            setNotice(`“${tenant.name}” moved to ${planFor(nextPlan, settings).name}.`);
                          }}
                          className="h-7 w-28 py-0.5 text-[11px]"
                        >
                          {PLAN_ORDER.map((planId) => (
                            <option key={planId} value={planId}>{planFor(planId, settings).name.replace("Stayora ", "")}</option>
                          ))}
                        </Select>
                      </td>
                      <td><StatusPill status={tenant.status} /></td>
                      <td className="text-xs text-muted-foreground">{shortDate(tenant.createdAt)}</td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openManage(tenant)}>
                            <Pencil className="size-3.5" /> Manage
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openWorkspace(tenant)}>
                            <ArrowUpRight className="size-3.5" /> Open
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleSuspend(tenant)}>
                            {tenant.status === "suspended" ? "Activate" : "Suspend"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredWorkspaces.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No workspaces match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {filteredWorkspaces.map((tenant) => {
              const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
              const usage = usageByTenant[tenant.id];
              return (
                <li key={tenant.id} className="px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tenant.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{tenant.ownerName} · {tenant.ownerEmail}</p>
                    </div>
                    <StatusPill status={tenant.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="uppercase tracking-wide text-muted-foreground">Plan</p>
                      <p className="mt-0.5 font-semibold">{planFor(sub.planId, settings).name.replace("Stayora ", "")}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-muted-foreground">Users</p>
                      <p className="mt-0.5 font-semibold">{listWorkspaceAccounts(tenant.id).length}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide text-muted-foreground">Rooms</p>
                      <p className="mt-0.5 font-semibold">{usage?.rooms ?? totalRooms(tenant)}</p>
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="size-3" /> {tenant.city}, {tenant.country} · created {shortDate(tenant.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openManage(tenant)}>
                      <Pencil className="size-3.5" /> Manage
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openWorkspace(tenant)}>
                      <ArrowUpRight className="size-3.5" /> Open
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleSuspend(tenant)}>
                      {tenant.status === "suspended" ? "Activate" : "Suspend"}
                    </Button>
                  </div>
                </li>
              );
            })}
            {filteredWorkspaces.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">No workspaces match these filters.</li>
            )}
          </ul>
        </SectionCard>
      )}

      {tab === "users" && (
        <SectionCard
          className="mt-4"
          title="All users"
          subtitle="Every login across every workspace, with role and access control."
          bodyClassName="p-0"
          action={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users…" className="w-full pl-8 sm:w-44" />
              </div>
              <Select value={workspaceFilter} onChange={(e) => setWorkspaceFilter(e.target.value)} className="w-full sm:w-40">
                <option value="all">All workspaces</option>
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </Select>
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full sm:w-32">
                <option value="all">All roles</option>
                {["Superadmin", ...roleNames].map((role) => <option key={role} value={role}>{role}</option>)}
              </Select>
              <Select value={accountStatusFilter} onChange={(e) => setAccountStatusFilter(e.target.value)} className="w-full sm:w-28">
                <option value="all">Any status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
              <Button size="sm" variant="outline" onClick={exportUsers} className="w-full sm:w-auto">
                <Download className="size-4" /> Export
              </Button>
              <Button size="sm" onClick={openAddUser} className="w-full sm:w-auto">
                <UserPlus className="size-4" /> Add user
              </Button>
            </div>
          }
        >
          <div className="hidden overflow-x-auto md:block">
            <table className="table-base min-w-[960px]">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Workspace</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(({ tenant, account }) => {
                  const isOwner = account.role === "Superadmin";
                  return (
                    <tr key={`${tenant.id}-${account.email}`}>
                      <td>
                        <p className="text-xs font-semibold">{account.name}</p>
                        <p className="text-[10px] text-muted-foreground">{account.email}</p>
                      </td>
                      <td className="text-xs">{tenant.name}</td>
                      <td>
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          isOwner ? "bg-primary/10 text-gold" : "bg-muted text-muted-foreground",
                        )}>
                          {account.role}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">{account.createdAt ? shortDate(account.createdAt) : "—"}</td>
                      <td><StatusPill status={account.disabled ? "inactive" : "active"} /></td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              resetFeedback();
                              setResetTarget({ tenant, account });
                              setResetPassword("");
                              setResetConfirm("");
                            }}
                          >
                            <KeyRound className="size-3.5" /> Reset
                          </Button>
                          {!isOwner && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  resetFeedback();
                                  setRoleTarget({ tenant, account });
                                  setRoleValue(account.role);
                                }}
                              >
                                <UserCog className="size-3.5" /> Role
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleDisabled(tenant, account)}>
                                <Ban className="size-3.5" /> {account.disabled ? "Enable" : "Disable"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => removeUser(tenant, account)}>
                                <Trash2 className="size-3.5" /> Remove
                              </Button>
                            </>
                          )}
                          {isOwner && <span className="px-2 text-[10px] font-semibold text-muted-foreground">Owner</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No users match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {filteredAccounts.map(({ tenant, account }) => {
              const isOwner = account.role === "Superadmin";
              return (
                <li key={`${tenant.id}-${account.email}`} className="px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{account.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{account.email}</p>
                    </div>
                    <StatusPill status={account.disabled ? "inactive" : "active"} />
                  </div>
                  <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
                    {tenant.name} · {account.role} · {account.createdAt ? shortDate(account.createdAt) : "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetFeedback();
                        setResetTarget({ tenant, account });
                        setResetPassword("");
                        setResetConfirm("");
                      }}
                    >
                      <KeyRound className="size-3.5" /> Reset password
                    </Button>
                    {!isOwner ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            resetFeedback();
                            setRoleTarget({ tenant, account });
                            setRoleValue(account.role);
                          }}
                        >
                          <UserCog className="size-3.5" /> Role
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleDisabled(tenant, account)}>
                          <Ban className="size-3.5" /> {account.disabled ? "Enable" : "Disable"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeUser(tenant, account)}>
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      </>
                    ) : (
                      <span className="px-1 text-[10px] font-semibold text-muted-foreground">Workspace owner</span>
                    )}
                  </div>
                </li>
              );
            })}
            {filteredAccounts.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">No users match these filters.</li>
            )}
          </ul>
        </SectionCard>
      )}

      {tab === "activity" && (
        <SectionCard
          className="mt-4"
          title="Platform activity"
          subtitle="Workspace creation, new users, billing events and hotel audit entries."
          bodyClassName="p-0"
          action={
            <Button variant="outline" size="sm" onClick={() => downloadCsv("stayora-activity.csv", [
              ["When", "Type", "Workspace", "Event", "Detail"],
              ...activity.map((event) => [event.at, event.kind, event.tenant, event.title, event.detail]),
            ])}>
              <Download className="size-4" /> Export
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {activity.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 text-xs sm:px-4">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  {event.kind === "workspace" ? <Building2 className="size-3" /> : event.kind === "user" ? <Users className="size-3" /> : event.kind === "billing" ? <Wallet className="size-3" /> : <Activity className="size-3" />}
                </span>
                <span className="font-medium">{event.tenant}</span>
                <span className="text-muted-foreground">{event.title}</span>
                <span className="hidden text-[10px] text-muted-foreground sm:inline">{event.detail}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(event.at)}</span>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</li>
            )}
          </ul>
        </SectionCard>
      )}

      {/* --------------------------------------------------------- create modal */}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a workspace"
        description="Provision an isolated hotel workspace with its own owner, data and subscription."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="admin-create-workspace" disabled={createBusy}>
              <Building2 className="size-4" /> {createBusy ? "Creating…" : "Create workspace"}
            </Button>
          </>
        }
      >
        <form id="admin-create-workspace" onSubmit={createWorkspace} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Workspace / hotel group" className="sm:col-span-2">
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Azura Collection" required />
            </Field>
            <Field label="Owner name">
              <Input value={createForm.ownerName} onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })} placeholder="e.g. Chioma Nwankwo" required />
            </Field>
            <Field label="Owner email" hint="This becomes the Superadmin sign-in.">
              <Input type="email" value={createForm.ownerEmail} onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })} placeholder="owner@hotel.com" required />
            </Field>
            <Field label="Temporary password" hint="At least 6 characters.">
              <Input value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="0803 000 0000" />
            </Field>
            <Field label="City">
              <Input value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} placeholder="Lagos" required />
            </Field>
            <Field label="Country">
              <Input value={createForm.country} onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })} />
            </Field>
            <Field label="Plan">
              <Select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value as TenantPlan })}>
                {PLAN_ORDER.map((planId) => (
                  <option key={planId} value={planId}>
                    {planFor(planId, settings).name.replace("Stayora ", "")} · {planFor(planId, settings).monthly === 0 ? "Free" : `${usd(planFor(planId, settings).monthly)}/mo`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rooms at launch">
              <Input type="number" min={1} value={createForm.rooms} onChange={(e) => setCreateForm({ ...createForm, rooms: Number(e.target.value) })} />
            </Field>
            <Field label="Currency">
              <Select value={createForm.currency} onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value as Tenant["currency"] })}>
                {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </Select>
            </Field>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
          )}
          <div className="rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
            The first account is always this workspace's Superadmin. The owner can invite staff within
            the package limits, and can upgrade later from Subscription &amp; billing.
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------- manage modal */}

      <Modal
        open={!!manageId}
        onClose={() => setManageId(null)}
        title="Manage workspace"
        description={manageId ? tenants.find((tenant) => tenant.id === manageId)?.id : undefined}
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setManageId(null)}>Cancel</Button>
            <Button onClick={saveWorkspace}>Save changes</Button>
          </>
        }
      >
        {(() => {
          const tenant = tenants.find((entry) => entry.id === manageId);
          if (!tenant) return null;
          const usage = usageByTenant[tenant.id];
          const sub = state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id);
          return (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Workspace name">
                  <Input value={manageForm.name} onChange={(e) => setManageForm({ ...manageForm, name: e.target.value })} />
                </Field>
                <Field label="Owner name">
                  <Input value={manageForm.ownerName} onChange={(e) => setManageForm({ ...manageForm, ownerName: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={manageForm.phone} onChange={(e) => setManageForm({ ...manageForm, phone: e.target.value })} />
                </Field>
                <Field label="City">
                  <Input value={manageForm.city} onChange={(e) => setManageForm({ ...manageForm, city: e.target.value })} />
                </Field>
                <Field label="Country">
                  <Input value={manageForm.country} onChange={(e) => setManageForm({ ...manageForm, country: e.target.value })} />
                </Field>
                <Field label="Currency">
                  <Select value={manageForm.currency} onChange={(e) => setManageForm({ ...manageForm, currency: e.target.value as Tenant["currency"] })}>
                    {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </Select>
                </Field>
                <Field label="Plan" hint="Changing the plan updates entitlements immediately.">
                  <Select value={managePlan} onChange={(e) => setManagePlan(e.target.value as TenantPlan)}>
                    {PLAN_ORDER.map((planId) => (
                      <option key={planId} value={planId}>{planFor(planId, settings).name.replace("Stayora ", "")}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Owner email" hint="Login email — contact support to change it.">
                  <Input value={tenant.ownerEmail} readOnly className="bg-muted/40" />
                </Field>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  { label: "Users", value: String(listWorkspaceAccounts(tenant.id).length), icon: Users },
                  { label: "Rooms", value: String(usage?.rooms ?? totalRooms(tenant)), icon: BedDouble },
                  { label: "Reservations", value: String(usage?.reservations ?? 0), icon: FileText },
                  { label: "Storage", value: `${usage?.storageGb ?? 0} GB`, icon: Gauge },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <item.icon className="size-3" /> {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border px-3 py-2.5 text-[11px]">
                <p className="font-semibold">Subscription</p>
                <p className="mt-0.5 text-muted-foreground">
                  {planFor(sub.planId, settings).name} · {sub.status.replace("_", " ")} · renews{" "}
                  {shortDate(sub.nextBillingDate)} · {sub.cycle}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => toggleSuspend(tenant)}>
                    {tenant.status === "suspended" ? "Reactivate workspace" : "Suspend workspace"}
                  </Button>
                  <Link to="/platform" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gold hover:underline">
                    Billing control <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
                  <AlertTriangle className="size-3.5" /> Danger zone
                </p>
                <p className="mt-0.5 text-[11px] text-rose-700/80">
                  Deleting a workspace removes its users, data, sessions and billing records from this
                  browser. This cannot be undone.
                </p>
                <Button
                  size="sm"
                  variant="danger"
                  className="mt-2"
                  disabled={tenant.id === currentTenant.id}
                  onClick={() => {
                    resetFeedback();
                    setDeleteId(tenant.id);
                    setDeleteConfirm("");
                  }}
                >
                  <Trash2 className="size-3.5" /> Delete workspace
                </Button>
                {tenant.id === currentTenant.id && (
                  <p className="mt-1 text-[10px] text-rose-700/80">Switch to another workspace before deleting this one.</p>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* -------------------------------------------------------- delete modal */}

      <Modal
        open={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteConfirm(""); }}
        title="Delete workspace"
        description="This permanently removes the workspace and everything in it."
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeleteId(null); setDeleteConfirm(""); }}>Cancel</Button>
            <Button variant="danger" onClick={deleteWorkspace}>
              <Trash2 className="size-4" /> Delete permanently
            </Button>
          </>
        }
      >
        {(() => {
          const tenant = tenants.find((entry) => entry.id === deleteId);
          if (!tenant) return null;
          return (
            <div className="space-y-3">
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] text-rose-700">
                <p className="font-semibold">{tenant.name}</p>
                <p className="mt-0.5">{tenant.ownerName} · {tenant.ownerEmail}</p>
                <p className="mt-1">
                  {listWorkspaceAccounts(tenant.id).length} user account{listWorkspaceAccounts(tenant.id).length === 1 ? "" : "s"} will lose access.
                </p>
              </div>
              <Field label={`Type “${tenant.name}” to confirm`}>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={tenant.name} />
              </Field>
              {error && (
                <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* -------------------------------------------------------- add user modal */}

      <Modal
        open={userOpen}
        onClose={() => setUserOpen(false)}
        title="Add a user"
        description="Create a login inside any workspace. The owner account is never replaced."
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserOpen(false)}>Cancel</Button>
            <Button type="submit" form="admin-add-user" disabled={userBusy}>
              <UserPlus className="size-4" /> {userBusy ? "Creating…" : "Create user"}
            </Button>
          </>
        }
      >
        <form id="admin-add-user" onSubmit={addUser} className="space-y-4">
          <Field label="Workspace">
            <Select value={userForm.tenantId} onChange={(e) => setUserForm({ ...userForm, tenantId: e.target.value })}>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="e.g. Tunde Bello" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="tunde@hotel.com" required />
            </Field>
            <Field label="Role">
              <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                {roleNames.map((role) => <option key={role} value={role}>{role}</option>)}
              </Select>
            </Field>
            <Field label="Temporary password" hint="At least 6 characters.">
              <Input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
            </Field>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
          )}
          <div className="rounded-lg border border-primary/20 bg-accent px-3 py-2 text-[11px] text-accent-foreground">
            The user only sees the modules included in their workspace package and role.
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------- reset password */}

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset password"
        description={resetTarget ? `${resetTarget.account.name} · ${resetTarget.tenant.name}` : undefined}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="submit" form="admin-reset-password" disabled={resetBusy}>
              <KeyRound className="size-4" /> {resetBusy ? "Saving…" : "Reset password"}
            </Button>
          </>
        }
      >
        <form id="admin-reset-password" onSubmit={resetUserPassword} className="space-y-3">
          <Field label="New password" hint="At least 6 characters.">
            <Input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Field label="Confirm password">
            <Input value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} autoComplete="new-password" required />
          </Field>
          {error && (
            <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
          )}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Existing sessions for this user are signed out. Share the new password securely.
          </div>
        </form>
      </Modal>

      {/* --------------------------------------------------------- role modal */}

      <Modal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        title="Change role"
        description={roleTarget ? `${roleTarget.account.name} · ${roleTarget.tenant.name}` : undefined}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button onClick={saveRole}><UserCog className="size-4" /> Save role</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Role" hint="The role is further limited by the workspace package.">
            <Select value={roleValue} onChange={(e) => setRoleValue(e.target.value)}>
              {roleNames.map((role) => <option key={role} value={role}>{role}</option>)}
            </Select>
          </Field>
          {error && (
            <p className="rounded-md border border-destructive/20 bg-rose-50 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
