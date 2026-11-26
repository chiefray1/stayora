import { Fingerprint, Globe2, KeyRound, Lock, ScrollText, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { useStore } from "../lib/store";
import { useTenant } from "../lib/tenants";
import { timeAgo } from "../lib/format";
import { PageHeader, SectionCard, StatCard, StatusPill, cn } from "../components/ui";

export default function Security() {
  const { db, logAudit } = useStore();
  const { currentTenant, updateTenant } = useTenant();
  const security = currentTenant.security;

  const toggles = [
    {
      key: "twoFactor" as const,
      title: "Two-factor authentication",
      description: "Require an authenticator code for administrators and managers.",
      icon: KeyRound,
    },
    {
      key: "sso" as const,
      title: "Single sign-on (SAML)",
      description: "Connect Okta, Azure AD or Google Workspace for staff access.",
      icon: UserCheck,
    },
    {
      key: "ipAllowlist" as const,
      title: "IP allowlist",
      description: "Restrict back-office access to hotel and head-office networks.",
      icon: Globe2,
    },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = db.auditLogs.filter((log) => log.at.startsWith(today)).length;
  const actors = new Set(db.auditLogs.map((log) => log.actor)).size;
  const score =
    60 +
    (security.twoFactor ? 15 : 0) +
    (security.sso ? 10 : 0) +
    (security.ipAllowlist ? 10 : 0) +
    (currentTenant.plan === "professional" ? 5 : 0);

  const toggle = (key: "twoFactor" | "sso" | "ipAllowlist") => {
    updateTenant(currentTenant.id, { security: { ...security, [key]: !security[key] } });
    logAudit(`Updated security setting · ${key}`, "Security");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Trust & compliance"
        title="Security & audit"
        description="Harden access, monitor every action and evidence tenant isolation for audits."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Security score" value={`${Math.min(100, score)}%`} delta="+8 this quarter" up hint="Policy coverage" icon={ShieldCheck} tone="noir" />
        <StatCard label="Audit events today" value={String(todayEvents)} hint={`${db.auditLogs.length} retained`} icon={ScrollText} />
        <StatCard label="Active actors" value={String(actors)} hint="Staff and system" icon={Fingerprint} />
        <StatCard label="Data residency" value={security.dataResidency.split(",")[0]} hint={security.dataResidency.split(",")[1]?.trim() ?? ""} icon={Lock} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-3">
          <SectionCard title="Access controls" subtitle="Applied to every sign-in in this workspace">
            <div className="divide-y divide-border">
              {toggles.map((item) => (
                <div key={item.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold"><item.icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={security[item.key]}
                    aria-label={item.title}
                    onClick={() => toggle(item.key)}
                    className={cn("relative h-5 w-9 shrink-0 rounded-full border transition", security[item.key] ? "border-primary bg-primary" : "border-border bg-muted")}
                  >
                    <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-white shadow-sm transition", security[item.key] ? "left-[18px]" : "left-0.5")} />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Tenant isolation" subtitle="How this workspace is separated">
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> Each workspace has its own encrypted storage namespace and session scope.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> API keys, webhooks and audit logs never cross tenant boundaries.</p>
              <p className="flex items-start gap-2"><ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Platform superadmins can switch workspaces from the tenant console; actions are logged.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusPill status="active" />
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{currentTenant.id}</span>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Audit trail" subtitle="Most recent 40 actions across this workspace" bodyClassName="p-0">
          <div className="scroll-thin max-h-[620px] overflow-y-auto">
            <table className="table-base min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {db.auditLogs.slice(0, 40).map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-[11px] text-muted-foreground">{timeAgo(log.at)}</td>
                    <td className="text-xs font-semibold">{log.actor}</td>
                    <td className="text-xs">{log.action}</td>
                    <td className="text-xs">{log.module}</td>
                    <td className="text-[10px] text-muted-foreground">{log.ip}<span className="block">{log.device}</span></td>
                  </tr>
                ))}
                {db.auditLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No audit events yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
