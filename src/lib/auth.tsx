import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTenant } from "./tenants";

export interface SessionUser {
  name: string;
  email: string;
  role: string;
  tenantId: string;
  phone?: string;
  department?: string;
  shift?: string;
  staffId?: string;
  issuedAt?: number;
  expiresAt?: number;
}

interface AuthAccount {
  email: string;
  name: string;
  role: string;
  passwordHash?: string;
  salt?: string;
  iterations?: number;
  password?: string;
  createdAt?: string;
  /** Platform administrators can disable a login without deleting it. */
  disabled?: boolean;
}

/** Safe projection of an account for team screens — never exposes password material. */
export interface AccountSummary {
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  disabled?: boolean;
}

interface PasswordReset {
  codeHash: string;
  expiresAt: number;
  requestedAt: number;
  attempts: number;
}

interface LoginAttempt {
  count: number;
  lockedUntil: number;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  code?: string;
}

type ProfilePatch = Partial<Pick<SessionUser, "name" | "email" | "phone" | "department" | "shift" | "staffId">>;

interface ProvisionInput {
  email: string;
  name: string;
  password: string;
  role?: string;
  tenantId?: string;
}

interface AuthValue {
  user: SessionUser | null;
  /** Login accounts for the active workspace (no password material). */
  accounts: AccountSummary[];
  /** Non-owner logins currently using a plan seat. */
  staffSeats: number;
  signIn: (email: string, password: string, tenantId?: string) => Promise<AuthResult>;
  signOut: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<AuthResult>;
  updateProfile: (patch: ProfilePatch) => AuthResult;
  provisionAccount: (input: ProvisionInput) => Promise<AuthResult>;
  removeAccount: (email: string) => AuthResult;
  refreshAccounts: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const sessionKey = (tenantId: string) => `stayora.session.${tenantId}`;
const accountsKey = (tenantId: string) => `stayora.accounts.${tenantId}.v1`;
const resetsKey = (tenantId: string) => `stayora.password-resets.${tenantId}.v1`;
const attemptsKey = (tenantId: string) => `stayora.login-attempts.${tenantId}.v1`;

const SESSION_TTL = 12 * 60 * 60 * 1000;
const RESET_TTL = 15 * 60 * 1000;
const RESET_COOLDOWN = 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const PBKDF2_ITERATIONS = 120_000;
const DEMO_PASSWORD = "stayora";

/** Seeded showcase workspaces — only these get demo staff accounts created automatically. */
export const DEMO_TENANT_IDS = ["tnt-stayora-lagos", "tnt-stayora-abuja", "tnt-zuri-nairobi"];

const DEMO_ACCOUNTS = (domain: string): AuthAccount[] => [
  { email: `admin@${domain}`, name: "Ada Admin", role: "Superadmin", password: DEMO_PASSWORD },
  { email: `manager@${domain}`, name: "Ngozi Manager", role: "Manager", password: DEMO_PASSWORD },
  { email: `ada.obi@${domain}`, name: "Ada Obi", role: "Front desk", password: DEMO_PASSWORD },
];

export const demoAccountsFor = (ownerEmail: string) =>
  DEMO_ACCOUNTS(ownerEmail.split("@")[1] || "stayora.ng");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const randomSalt = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
};

const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const hashPassword = async (password: string, salt: string, iterations = PBKDF2_ITERATIONS) => {
  if (!globalThis.crypto?.subtle) throw new Error("Secure password hashing is unavailable.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
};

const hashResetCode = async (email: string, code: string) => {
  if (!globalThis.crypto?.subtle) throw new Error("Secure reset codes are unavailable.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${email}|${code}|reset-v1`),
  );
  return bytesToBase64(new Uint8Array(digest));
};

const readAccounts = (tenantId: string): Record<string, AuthAccount> => {
  try {
    const raw = localStorage.getItem(accountsKey(tenantId));
    return raw ? (JSON.parse(raw) as Record<string, AuthAccount>) : {};
  } catch {
    return {};
  }
};

const writeAccounts = (tenantId: string, accounts: Record<string, AuthAccount>) => {
  localStorage.setItem(accountsKey(tenantId), JSON.stringify(accounts));
};

const readResets = (tenantId: string): Record<string, PasswordReset> => {
  try {
    const raw = localStorage.getItem(resetsKey(tenantId));
    return raw ? (JSON.parse(raw) as Record<string, PasswordReset>) : {};
  } catch {
    return {};
  }
};

const writeResets = (tenantId: string, resets: Record<string, PasswordReset>) => {
  localStorage.setItem(resetsKey(tenantId), JSON.stringify(resets));
};

const readAttempts = (tenantId: string): Record<string, LoginAttempt> => {
  try {
    const raw = localStorage.getItem(attemptsKey(tenantId));
    return raw ? (JSON.parse(raw) as Record<string, LoginAttempt>) : {};
  } catch {
    return {};
  }
};

const writeAttempts = (tenantId: string, attempts: Record<string, LoginAttempt>) => {
  localStorage.setItem(attemptsKey(tenantId), JSON.stringify(attempts));
};

const clearLoginAttempts = (tenantId: string, email: string) => {
  const attempts = readAttempts(tenantId);
  delete attempts[email];
  writeAttempts(tenantId, attempts);
};

const recordFailedLogin = (tenantId: string, email: string) => {
  const attempts = readAttempts(tenantId);
  const current = attempts[email] ?? { count: 0, lockedUntil: 0 };
  const count = current.count + 1;
  attempts[email] = {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
  };
  writeAttempts(tenantId, attempts);
};

const toSession = (account: AuthAccount, tenantId: string, previous?: SessionUser | null): SessionUser => ({
  name: account.name,
  email: account.email,
  role: account.role,
  tenantId,
  phone: previous?.phone,
  department: previous?.department,
  shift: previous?.shift,
  staffId: previous?.staffId,
  issuedAt: previous?.issuedAt ?? Date.now(),
  expiresAt: previous?.expiresAt ?? Date.now() + SESSION_TTL,
});

const readSession = (tenantId: string): SessionUser | null => {
  try {
    const raw = localStorage.getItem(sessionKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.email || !parsed?.role) return null;
    const expiresAt = parsed.expiresAt ?? Date.now() + SESSION_TTL;
    if (expiresAt < Date.now()) {
      localStorage.removeItem(sessionKey(tenantId));
      return null;
    }
    const account = readAccounts(tenantId)[normalizeEmail(parsed.email)];
    if (!account || account.disabled) {
      localStorage.removeItem(sessionKey(tenantId));
      return null;
    }
    return { ...toSession(account, tenantId, parsed), expiresAt };
  } catch {
    return null;
  }
};

/* ---------------------------------------------------------------------------
 * Platform administration
 *
 * These helpers let the platform console work across every workspace without
 * loading each tenant's AuthProvider. They operate on the same per-tenant
 * storage as the regular sign-in flow, so changes take effect immediately.
 * ------------------------------------------------------------------------- */

/**
 * Seed the showcase workspaces' demo team for the platform console even when
 * that workspace has not been opened in this browser yet. The workspace's own
 * AuthProvider hashes the temporary passwords on first visit.
 * Returns true when accounts were created.
 */
export function ensureDemoWorkspaceAccounts(tenantId: string, ownerEmail: string): boolean {
  if (!DEMO_TENANT_IDS.includes(tenantId)) return false;
  if (Object.keys(readAccounts(tenantId)).length > 0) return false;
  writeAccounts(
    tenantId,
    Object.fromEntries(
      demoAccountsFor(ownerEmail).map((account) => [
        account.email,
        { ...account, createdAt: new Date().toISOString() },
      ]),
    ),
  );
  return true;
}

/** Read the login directory of any workspace without exposing password material. */
export function listWorkspaceAccounts(tenantId: string): AccountSummary[] {
  return Object.values(readAccounts(tenantId))
    .map((account) => ({
      email: account.email,
      name: account.name,
      role: account.role,
      createdAt: account.createdAt,
      disabled: account.disabled,
    }))
    .sort((left, right) => {
      const rank = (role: string) => (role === "Superadmin" ? 0 : 1);
      return rank(left.role) - rank(right.role) || left.name.localeCompare(right.name);
    });
}

const clearSessionFor = (tenantId: string, email: string) => {
  try {
    const raw = localStorage.getItem(sessionKey(tenantId));
    if (!raw) return;
    const session = JSON.parse(raw) as SessionUser;
    if (normalizeEmail(session.email) === normalizeEmail(email)) {
      localStorage.removeItem(sessionKey(tenantId));
    }
  } catch {
    // ignore malformed sessions
  }
};

export async function adminCreateAccount(input: {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  role?: string;
}): Promise<AuthResult> {
  const normalized = normalizeEmail(input.email);
  if (!isEmail(normalized)) return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const accounts = readAccounts(input.tenantId);
  if (accounts[normalized]) return { ok: false, error: "An account with that email already exists in this workspace." };

  const isFirstAccount = Object.keys(accounts).length === 0;
  if (!isFirstAccount && input.role === "Superadmin") {
    return { ok: false, error: "This workspace already has a Superadmin." };
  }
  const role = isFirstAccount ? "Superadmin" : input.role ?? "Front desk";
  const createdAt = new Date().toISOString();

  try {
    const salt = randomSalt();
    const passwordHash = await hashPassword(input.password, salt);
    accounts[normalized] = {
      email: normalized,
      name: input.name.trim(),
      role,
      salt,
      passwordHash,
      iterations: PBKDF2_ITERATIONS,
      createdAt,
    };
  } catch {
    accounts[normalized] = {
      email: normalized,
      name: input.name.trim(),
      role,
      password: input.password,
      createdAt,
    };
  }
  writeAccounts(input.tenantId, accounts);
  return { ok: true };
}

export async function adminResetPassword(input: {
  tenantId: string;
  email: string;
  newPassword: string;
}): Promise<AuthResult> {
  if (input.newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const normalized = normalizeEmail(input.email);
  const accounts = readAccounts(input.tenantId);
  const account = accounts[normalized];
  if (!account) return { ok: false, error: "That account could not be found." };

  try {
    const salt = randomSalt();
    const passwordHash = await hashPassword(input.newPassword, salt);
    accounts[normalized] = {
      ...account,
      password: undefined,
      salt,
      passwordHash,
      iterations: PBKDF2_ITERATIONS,
    };
  } catch {
    accounts[normalized] = {
      ...account,
      password: input.newPassword,
      salt: undefined,
      passwordHash: undefined,
      iterations: undefined,
    };
  }
  writeAccounts(input.tenantId, accounts);

  const resets = readResets(input.tenantId);
  delete resets[normalized];
  writeResets(input.tenantId, resets);
  clearLoginAttempts(input.tenantId, normalized);
  clearSessionFor(input.tenantId, normalized);
  return { ok: true };
}

export function adminSetRole(input: { tenantId: string; email: string; role: string }): AuthResult {
  const normalized = normalizeEmail(input.email);
  const accounts = readAccounts(input.tenantId);
  const account = accounts[normalized];
  if (!account) return { ok: false, error: "That account could not be found." };
  if (account.role === "Superadmin") {
    return { ok: false, error: "The workspace Superadmin's role cannot be changed." };
  }
  if (input.role === "Superadmin") {
    return { ok: false, error: "Only the workspace owner can be Superadmin." };
  }
  accounts[normalized] = { ...account, role: input.role };
  writeAccounts(input.tenantId, accounts);
  return { ok: true };
}

export function adminSetDisabled(input: { tenantId: string; email: string; disabled: boolean }): AuthResult {
  const normalized = normalizeEmail(input.email);
  const accounts = readAccounts(input.tenantId);
  const account = accounts[normalized];
  if (!account) return { ok: false, error: "That account could not be found." };
  if (account.role === "Superadmin" && input.disabled) {
    return { ok: false, error: "The workspace Superadmin cannot be disabled." };
  }
  accounts[normalized] = { ...account, disabled: input.disabled };
  writeAccounts(input.tenantId, accounts);
  if (input.disabled) clearSessionFor(input.tenantId, normalized);
  return { ok: true };
}

export function adminRemoveAccount(input: { tenantId: string; email: string }): AuthResult {
  const normalized = normalizeEmail(input.email);
  const accounts = readAccounts(input.tenantId);
  const account = accounts[normalized];
  if (!account) return { ok: false, error: "That account could not be found." };
  if (account.role === "Superadmin") {
    return { ok: false, error: "Delete the workspace to remove its Superadmin." };
  }
  delete accounts[normalized];
  writeAccounts(input.tenantId, accounts);
  clearSessionFor(input.tenantId, normalized);
  return { ok: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant.id;
  const [user, setUser] = useState<SessionUser | null>(() => readSession(tenantId));
  const [accountVersion, setAccountVersion] = useState(0);
  const refreshAccounts = useCallback(() => setAccountVersion((version) => version + 1), []);

  const accounts = useMemo<AccountSummary[]>(
    () =>
      Object.values(readAccounts(tenantId))
        .map((account) => ({
          email: account.email,
          name: account.name,
          role: account.role,
          createdAt: account.createdAt,
          disabled: account.disabled,
        }))
        .sort((left, right) => {
          const rank = (role: string) => (role === "Superadmin" ? 0 : 1);
          return rank(left.role) - rank(right.role) || left.name.localeCompare(right.name);
        }),
    [tenantId, accountVersion],
  );

  /** The workspace owner (Superadmin) does not consume a staff seat. Disabled logins are freed. */
  const staffSeats = useMemo(
    () => accounts.filter((account) => account.role !== "Superadmin" && !account.disabled).length,
    [accounts],
  );

  useEffect(() => {
    setUser((previous) => {
      if (previous?.role === "Superadmin") return { ...previous, tenantId };
      return readSession(tenantId);
    });
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;
    const prepareAccounts = async () => {
      const accounts = readAccounts(tenantId);
      if (Object.keys(accounts).length === 0) {
        // Self-serve workspaces start with only the owner account. Demo workspaces
        // get their showcase team seeded once.
        if (!DEMO_TENANT_IDS.includes(tenantId)) return;
        writeAccounts(
          tenantId,
          Object.fromEntries(
            demoAccountsFor(currentTenant.ownerEmail).map((account) => [
              account.email,
              { ...account, createdAt: new Date().toISOString() },
            ]),
          ),
        );
        if (!cancelled) refreshAccounts();
        return;
      }

      let changed = false;
      for (const [email, account] of Object.entries(accounts)) {
        if (!account.password) continue;
        try {
          const salt = account.salt ?? randomSalt();
          const passwordHash = await hashPassword(account.password, salt);
          accounts[email] = {
            ...account,
            password: undefined,
            salt,
            passwordHash,
            iterations: PBKDF2_ITERATIONS,
          };
          changed = true;
        } catch {
          return;
        }
      }
      if (changed && !cancelled) {
        writeAccounts(tenantId, accounts);
        refreshAccounts();
      }
    };
    void prepareAccounts();
    return () => {
      cancelled = true;
    };
  }, [tenantId, currentTenant.ownerEmail, refreshAccounts]);

  useEffect(() => {
    if (user) localStorage.setItem(sessionKey(user.tenantId), JSON.stringify(user));
    else localStorage.removeItem(sessionKey(tenantId));
  }, [user, tenantId]);

  useEffect(() => {
    if (!user?.expiresAt) return;
    const remaining = user.expiresAt - Date.now();
    if (remaining <= 0) {
      setUser(null);
      return;
    }
    const timer = window.setTimeout(() => setUser(null), remaining);
    return () => window.clearTimeout(timer);
  }, [user?.expiresAt]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      accounts,
      staffSeats,
      signIn: async (email: string, password: string, targetTenantId?: string) => {
        const scope = targetTenantId ?? tenantId;
        const normalized = normalizeEmail(email);
        if (!isEmail(normalized)) return { ok: false, error: "Enter a valid work email address." };
        if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

        const attempts = readAttempts(scope);
        const currentAttempt = attempts[normalized];
        if (currentAttempt?.lockedUntil && currentAttempt.lockedUntil > Date.now()) {
          const minutes = Math.max(1, Math.ceil((currentAttempt.lockedUntil - Date.now()) / 60_000));
          return { ok: false, error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
        }

        const accounts = readAccounts(scope);
        const account = accounts[normalized];
        if (!account) {
          recordFailedLogin(scope, normalized);
          return { ok: false, error: "No staff account found for this workspace. Contact an administrator." };
        }
        if (account.disabled) {
          return { ok: false, error: "This account has been disabled by the platform team. Contact your administrator." };
        }

        try {
          let valid = false;
          if (account.passwordHash && account.salt) {
            const candidate = await hashPassword(password, account.salt, account.iterations ?? PBKDF2_ITERATIONS);
            valid = safeEqual(candidate, account.passwordHash);
          } else if (account.password) {
            valid = safeEqual(account.password, password);
            if (valid) {
              const salt = randomSalt();
              const passwordHash = await hashPassword(password, salt);
              accounts[normalized] = {
                ...account,
                password: undefined,
                salt,
                passwordHash,
                iterations: PBKDF2_ITERATIONS,
              };
              writeAccounts(scope, accounts);
              if (scope === tenantId) refreshAccounts();
            }
          }

          if (!valid) {
            recordFailedLogin(scope, normalized);
            return { ok: false, error: "Incorrect password. Try again or reset it below." };
          }

          clearLoginAttempts(scope, normalized);
          setUser(toSession(account, scope));
          return { ok: true };
        } catch {
          return { ok: false, error: "Secure sign-in is unavailable. Open the site over HTTPS and try again." };
        }
      },
      signOut: () => {
        Object.keys(localStorage)
          .filter((key) => key.startsWith("stayora.session."))
          .forEach((key) => localStorage.removeItem(key));
        setUser(null);
      },
      changePassword: async (currentPassword: string, newPassword: string) => {
        if (!user) return { ok: false, error: "You need to be signed in to change your password." };
        if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };
        if (currentPassword === newPassword) return { ok: false, error: "Choose a password different from your current one." };

        const scope = user.tenantId;
        const normalized = normalizeEmail(user.email);
        const accounts = readAccounts(scope);
        const existing = accounts[normalized];
        if (!existing) return { ok: false, error: "Your staff account could not be found." };

        try {
          let valid = false;
          if (existing.passwordHash && existing.salt) {
            const candidate = await hashPassword(
              currentPassword,
              existing.salt,
              existing.iterations ?? PBKDF2_ITERATIONS,
            );
            valid = safeEqual(candidate, existing.passwordHash);
          } else if (existing.password) {
            valid = safeEqual(existing.password, currentPassword);
          }
          if (!valid) return { ok: false, error: "Your current password is incorrect." };

          const salt = randomSalt();
          const passwordHash = await hashPassword(newPassword, salt);
          accounts[normalized] = {
            ...existing,
            password: undefined,
            salt,
            passwordHash,
            iterations: PBKDF2_ITERATIONS,
          };
          writeAccounts(scope, accounts);
          clearLoginAttempts(scope, normalized);
          return { ok: true };
        } catch {
          return { ok: false, error: "Secure password hashing is unavailable. Open the site over HTTPS and try again." };
        }
      },
      requestPasswordReset: async (email: string) => {
        const normalized = normalizeEmail(email);
        if (!isEmail(normalized)) return { ok: false, error: "Enter a valid work email address." };

        const resets = readResets(tenantId);
        const existing = resets[normalized];
        if (existing && Date.now() - existing.requestedAt < RESET_COOLDOWN) {
          return { ok: false, error: "Please wait a minute before requesting another code." };
        }

        try {
          const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
          resets[normalized] = {
            codeHash: await hashResetCode(normalized, code),
            expiresAt: Date.now() + RESET_TTL,
            requestedAt: Date.now(),
            attempts: 0,
          };
          writeResets(tenantId, resets);
          return { ok: true, code };
        } catch {
          return { ok: false, error: "Secure reset codes are unavailable. Open the site over HTTPS and try again." };
        }
      },
      resetPassword: async (email: string, code: string, newPassword: string) => {
        const normalized = normalizeEmail(email);
        if (!isEmail(normalized)) return { ok: false, error: "Enter a valid work email address." };
        if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };

        const resets = readResets(tenantId);
        const reset = resets[normalized];
        const genericError = "The reset code is incorrect or has expired. Request a new code.";
        if (!reset) return { ok: false, error: genericError };
        if (reset.expiresAt < Date.now() || reset.attempts >= MAX_ATTEMPTS) {
          delete resets[normalized];
          writeResets(tenantId, resets);
          return { ok: false, error: genericError };
        }

        try {
          const candidate = await hashResetCode(normalized, code.trim());
          if (!safeEqual(candidate, reset.codeHash)) {
            reset.attempts += 1;
            if (reset.attempts >= MAX_ATTEMPTS) delete resets[normalized];
            else resets[normalized] = reset;
            writeResets(tenantId, resets);
            return { ok: false, error: genericError };
          }

          const accounts = readAccounts(tenantId);
          const existing = accounts[normalized];
          if (!existing) {
            delete resets[normalized];
            writeResets(tenantId, resets);
            return { ok: false, error: genericError };
          }

          const salt = randomSalt();
          const passwordHash = await hashPassword(newPassword, salt);
          accounts[normalized] = {
            ...existing,
            password: undefined,
            salt,
            passwordHash,
            iterations: PBKDF2_ITERATIONS,
          };
          writeAccounts(tenantId, accounts);
          delete resets[normalized];
          writeResets(tenantId, resets);
          clearLoginAttempts(tenantId, normalized);
          refreshAccounts();
          return { ok: true };
        } catch {
          return { ok: false, error: "Secure password hashing is unavailable. Open the site over HTTPS and try again." };
        }
      },
      updateProfile: (patch: ProfilePatch) => {
        if (!user) return { ok: false, error: "You need to be signed in to update your profile." };
        const scope = user.tenantId;
        const previousEmail = normalizeEmail(user.email);
        const nextEmail = normalizeEmail(patch.email ?? user.email);
        if (!isEmail(nextEmail)) return { ok: false, error: "Enter a valid work email address." };

        const accounts = readAccounts(scope);
        const account = accounts[previousEmail];
        if (!account) return { ok: false, error: "Your staff account could not be found." };
        if (nextEmail !== previousEmail && accounts[nextEmail]) {
          return { ok: false, error: "That email is already linked to another staff account." };
        }

        delete accounts[previousEmail];
        accounts[nextEmail] = {
          ...account,
          email: nextEmail,
          name: patch.name ?? account.name,
        };
        writeAccounts(scope, accounts);
        refreshAccounts();

        setUser((prev) => (prev ? { ...prev, ...patch, email: nextEmail } : prev));
        return { ok: true };
      },
      provisionAccount: async (input: ProvisionInput) => {
        const scope = input.tenantId ?? tenantId;
        const normalized = normalizeEmail(input.email);
        if (!isEmail(normalized)) return { ok: false, error: "Enter a valid owner email address." };
        if (input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
        const accounts = readAccounts(scope);
        if (accounts[normalized]) return { ok: false, error: "An account with that email already exists in this workspace." };

        // The first account created for a workspace is always its distinctive Superadmin.
        // Every later account must be given a normal role.
        const isFirstAccount = Object.keys(accounts).length === 0;
        if (!isFirstAccount && input.role === "Superadmin") {
          return { ok: false, error: "This workspace already has a Superadmin. Choose a staff role instead." };
        }
        const role = isFirstAccount ? "Superadmin" : input.role ?? "Front desk";
        const createdAt = new Date().toISOString();

        try {
          const salt = randomSalt();
          const passwordHash = await hashPassword(input.password, salt);
          accounts[normalized] = {
            email: normalized,
            name: input.name.trim(),
            role,
            salt,
            passwordHash,
            iterations: PBKDF2_ITERATIONS,
            createdAt,
          };
          writeAccounts(scope, accounts);
          if (scope === tenantId) refreshAccounts();
          return { ok: true };
        } catch {
          accounts[normalized] = {
            email: normalized,
            name: input.name.trim(),
            role,
            password: input.password,
            createdAt,
          };
          writeAccounts(scope, accounts);
          if (scope === tenantId) refreshAccounts();
          return { ok: true };
        }
      },
      removeAccount: (email: string) => {
        const scope = user?.tenantId ?? tenantId;
        const normalized = normalizeEmail(email);
        if (!user) return { ok: false, error: "You need to be signed in to manage staff access." };
        if (normalized === normalizeEmail(user.email)) {
          return { ok: false, error: "You cannot remove your own account." };
        }
        const accounts = readAccounts(scope);
        const account = accounts[normalized];
        if (!account) return { ok: false, error: "That staff account could not be found." };
        if (account.role === "Superadmin") {
          return { ok: false, error: "The workspace Superadmin cannot be removed." };
        }
        delete accounts[normalized];
        writeAccounts(scope, accounts);
        refreshAccounts();
        return { ok: true };
      },
      refreshAccounts,
    }),
    [tenantId, user, accounts, staffSeats, refreshAccounts],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
