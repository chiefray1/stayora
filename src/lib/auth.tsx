import {
  createContext,
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

interface AuthResult {
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
  signIn: (email: string, password: string, tenantId?: string) => Promise<AuthResult>;
  signOut: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<AuthResult>;
  updateProfile: (patch: ProfilePatch) => AuthResult;
  provisionAccount: (input: ProvisionInput) => Promise<AuthResult>;
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
    if (!account) return null;
    return { ...toSession(account, tenantId, parsed), expiresAt };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant.id;
  const [user, setUser] = useState<SessionUser | null>(() => readSession(tenantId));

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
        writeAccounts(
          tenantId,
          Object.fromEntries(
            demoAccountsFor(currentTenant.ownerEmail).map((account) => [account.email, account]),
          ),
        );
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
      if (changed && !cancelled) writeAccounts(tenantId, accounts);
    };
    void prepareAccounts();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

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
        try {
          const salt = randomSalt();
          const passwordHash = await hashPassword(input.password, salt);
          accounts[normalized] = {
            email: normalized,
            name: input.name.trim(),
            role: input.role ?? "Superadmin",
            salt,
            passwordHash,
            iterations: PBKDF2_ITERATIONS,
          };
          writeAccounts(scope, accounts);
          return { ok: true };
        } catch {
          accounts[normalized] = {
            email: normalized,
            name: input.name.trim(),
            role: input.role ?? "Superadmin",
            password: input.password,
          };
          writeAccounts(scope, accounts);
          return { ok: true };
        }
      },
    }),
    [tenantId, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
