import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import {
  Avatar,
  Button,
  Field,
  Input,
  PageHeader,
  SectionCard,
  cn,
} from "../components/ui";

interface Preferences {
  reportNotifications: boolean;
  emailDigest: boolean;
  smsAlerts: boolean;
  shiftReminders: boolean;
}

const defaultPreferences: Preferences = {
  reportNotifications: true,
  emailDigest: true,
  smsAlerts: false,
  shiftReminders: true,
};

export default function Settings() {
  const { user, changePassword, signOut } = useAuth();
  const { db } = useStore();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const preferenceKey = `stayora.preferences.${user?.email ?? "staff"}`;
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const raw = localStorage.getItem(preferenceKey);
      return raw ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<Preferences>) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  useEffect(() => {
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
    window.dispatchEvent(new Event("stayora:preferences"));
  }, [preferenceKey, preferences]);

  const staff = db.staff.find((member) => member.email.toLowerCase() === user?.email.toLowerCase());
  const unreadReports = db.notifications.filter(
    (n) => n.type === "report" && !n.read && (n.audience === "all" || user?.role === "Superadmin"),
  ).length;

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ tone: "error", text: "The new passwords do not match." });
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.ok) {
        setFeedback({ tone: "error", text: result.error ?? "Unable to change your password." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ tone: "ok", text: "Password changed. Use your new password next time you sign in." });
    } finally {
      setPasswordBusy(false);
    }
  };

  const updatePreference = (key: keyof Preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const signOutNow = () => {
    signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div>
      <PageHeader
        eyebrow="My account"
        title="Profile settings"
        description="Manage your password, notifications and signed-in session."
        actions={
          <Link to="/profile">
            <Button variant="outline"><UserRound className="size-4" /> View profile</Button>
          </Link>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <SectionCard title="Change password" subtitle="Use a strong password you do not reuse elsewhere">
            <form onSubmit={submitPassword} className="space-y-4">
              <Field label="Current password">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setFeedback(null); }}
                    className="pl-9"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="New password" hint="At least 6 characters.">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setFeedback(null); }}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <Field label="Confirm new password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFeedback(null); }}
                    autoComplete="new-password"
                    required
                  />
                </Field>
              </div>
              {feedback && (
                <p
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-xs font-medium",
                    feedback.tone === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-destructive/20 bg-rose-50 text-destructive",
                  )}
                >
                  {feedback.tone === "ok" && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />}
                  {feedback.text}
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={passwordBusy}>
                  <ShieldCheck className="size-4" /> {passwordBusy ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Notification preferences" subtitle={`${unreadReports} unread report notification${unreadReports === 1 ? "" : "s"}`}>
            <div className="divide-y divide-border">
              <PreferenceRow
                icon={BellRing}
                label="Report notifications"
                description="In-app bell alerts when reports are generated or published."
                checked={preferences.reportNotifications}
                onChange={() => updatePreference("reportNotifications")}
              />
              <PreferenceRow
                icon={Mail}
                label="Email digest"
                description="A summary of reports and operational alerts sent to your work email."
                checked={preferences.emailDigest}
                onChange={() => updatePreference("emailDigest")}
              />
              <PreferenceRow
                icon={Smartphone}
                label="SMS alerts"
                description="Urgent operational alerts by text message."
                checked={preferences.smsAlerts}
                onChange={() => updatePreference("smsAlerts")}
              />
              <PreferenceRow
                icon={Clock3}
                label="Shift reminders"
                description="A reminder before your shift starts."
                checked={preferences.shiftReminders}
                onChange={() => updatePreference("shiftReminders")}
              />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Signed-in account" subtitle="Current session">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
              <Avatar name={user?.name ?? "Staff"} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name ?? "Staff member"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Access level</span>
                <span className="font-semibold">{user?.role ?? "Front desk"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-semibold">{staff?.department ?? user?.department ?? "Management"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shift</span>
                <span className="font-semibold">{staff?.shift ?? user?.shift ?? "Flexible"}</span>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={signOutNow}>
              <LogOut className="size-4" /> Sign out of this device
            </Button>
          </SectionCard>

          <div className="rounded-lg border border-primary/20 bg-accent px-4 py-4 text-xs text-accent-foreground">
            <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-gold" /> Demo security</p>
            <p className="mt-1.5 text-muted-foreground">
              Passwords are stored in this browser for the demo. Connect your identity provider before going live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferenceRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof BellRing;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-gold"><Icon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full bg-white shadow-sm transition",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
