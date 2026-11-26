/**
 * Payment provider abstraction.
 *
 * The browser never sees or stores raw card data. A live deployment routes
 * checkout through a server (or edge function) that holds the secret keys and
 * creates the provider session. This module only knows public configuration and
 * produces the requests that server expects.
 *
 * Modes:
 *  - "sandbox": deterministic local simulation, available in development only.
 *  - "live":    requires VITE_BILLING_API_URL and server-side keys.
 *  - "disabled": production build with no billing service configured.
 */

export type ProviderId = "stripe" | "paystack" | "flutterwave" | "sandbox";
export type PaymentStatus = "succeeded" | "pending" | "failed" | "refunded";

export interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  blurb: string;
  regions: "global" | "africa" | "nigeria";
  currencies: string[];
  configured: boolean;
}

export type BillingMode = "sandbox" | "live" | "disabled";

const env = import.meta.env as Record<string, string | boolean | undefined>;

export const BILLING_API_URL = (env.VITE_BILLING_API_URL as string | undefined) ?? "";

export const BILLING_MODE: BillingMode = (() => {
  const configured = String(env.VITE_BILLING_MODE ?? "").toLowerCase();
  if (configured === "sandbox") return "sandbox";
  if (configured === "live") return BILLING_API_URL ? "live" : "disabled";
  return env.DEV ? "sandbox" : BILLING_API_URL ? "live" : "disabled";
})();

export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: "stripe",
    label: "Stripe",
    blurb: "Cards, Apple Pay and Google Pay for international hotels.",
    regions: "global",
    currencies: ["USD", "GBP", "EUR"],
    configured: Boolean(env.VITE_STRIPE_PUBLISHABLE_KEY),
  },
  {
    id: "paystack",
    label: "Paystack",
    blurb: "Cards, bank transfer and USSD for Nigerian customers.",
    regions: "nigeria",
    currencies: ["NGN", "USD"],
    configured: Boolean(env.VITE_PAYSTACK_PUBLIC_KEY),
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    blurb: "Pan-African cards and mobile money.",
    regions: "africa",
    currencies: ["NGN", "KES", "GHS", "USD"],
    configured: Boolean(env.VITE_FLUTTERWAVE_PUBLIC_KEY),
  },
];

export const providersFor = (country: string): ProviderDescriptor[] => {
  const target = country.trim().toLowerCase();
  return PROVIDERS.filter((provider) => {
    if (provider.regions === "global") return true;
    if (provider.regions === "nigeria") return target === "nigeria";
    return ["nigeria", "kenya", "ghana", "south africa"].includes(target);
  });
};

export interface CheckoutRequest {
  hotelId: string;
  hotelName: string;
  invoiceId: string;
  amount: number;
  currency: "USD" | "NGN" | "KES" | "GHS";
  provider: ProviderId;
  cycle: "monthly" | "yearly";
  customerEmail: string;
  idempotencyKey: string;
}

export interface CheckoutResult {
  ok: boolean;
  status: PaymentStatus;
  reference?: string;
  provider: ProviderId;
  mode: BillingMode;
  error?: string;
}

export const createIdempotencyKey = (prefix = "bill"): string => {
  const random = new Uint8Array(8);
  if (globalThis.crypto) globalThis.crypto.getRandomValues(random);
  const suffix = Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}-${Date.now().toString(36)}-${suffix}`;
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Starts a checkout. In sandbox mode this simulates the provider round-trip and
 * returns a deterministic success reference. In live mode it calls the billing
 * service — the client never decides that a payment succeeded.
 */
export const startCheckout = async (request: CheckoutRequest): Promise<CheckoutResult> => {
  if (BILLING_MODE === "disabled") {
    return {
      ok: false,
      status: "failed",
      provider: request.provider,
      mode: BILLING_MODE,
      error: "Live billing is not configured. Set VITE_BILLING_API_URL and provider keys on the billing service.",
    };
  }

  if (request.provider !== "sandbox" && BILLING_MODE === "live") {
    try {
      const response = await fetch(`${BILLING_API_URL.replace(/\/$/, "")}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": request.idempotencyKey,
        },
        body: JSON.stringify({ ...request, currency: request.currency }),
      });
      const payload = (await response.json()) as {
        status?: PaymentStatus;
        reference?: string;
        error?: string;
      };
      if (!response.ok) {
        return {
          ok: false,
          status: "failed",
          provider: request.provider,
          mode: BILLING_MODE,
          error: payload.error ?? "The payment provider rejected this checkout.",
        };
      }
      return {
        ok: payload.status === "succeeded" || payload.status === "pending",
        status: payload.status ?? "pending",
        reference: payload.reference,
        provider: request.provider,
        mode: BILLING_MODE,
      };
    } catch {
      return {
        ok: false,
        status: "failed",
        provider: request.provider,
        mode: BILLING_MODE,
        error: "Could not reach the billing service. No charge was made.",
      };
    }
  }

  // Sandbox only. Never reachable in a production build without BILLING_MODE=sandbox.
  if (BILLING_MODE !== "sandbox") {
    return {
      ok: false,
      status: "failed",
      provider: "sandbox",
      mode: BILLING_MODE,
      error: "Sandbox checkout is disabled outside development.",
    };
  }

  await delay(650);
  if (!request.amount || request.amount < 0) {
    return {
      ok: false,
      status: "failed",
      provider: "sandbox",
      mode: "sandbox",
      error: "Invoice amount is invalid.",
    };
  }
  return {
    ok: true,
    status: "succeeded",
    reference: `sbx_${request.idempotencyKey.slice(-12)}`,
    provider: "sandbox",
    mode: "sandbox",
  };
};

/**
 * Server-side verification shape. In sandbox it mirrors the provider response;
 * in live mode it asks the billing service to confirm the reference before any
 * invoice is marked paid.
 */
export const verifyPayment = async (
  provider: ProviderId,
  reference: string,
  idempotencyKey: string,
): Promise<{ ok: boolean; status: PaymentStatus; error?: string }> => {
  if (BILLING_MODE === "live" && provider !== "sandbox") {
    try {
      const response = await fetch(
        `${BILLING_API_URL.replace(/\/$/, "")}/payments/${encodeURIComponent(reference)}?provider=${provider}`,
        { headers: { "Idempotency-Key": idempotencyKey } },
      );
      const payload = (await response.json()) as { status?: PaymentStatus; error?: string };
      if (!response.ok) return { ok: false, status: "failed", error: payload.error ?? "Verification failed." };
      return { ok: payload.status === "succeeded", status: payload.status ?? "failed" };
    } catch {
      return { ok: false, status: "failed", error: "Verification service unavailable." };
    }
  }
  return { ok: reference.startsWith("sbx_"), status: reference.startsWith("sbx_") ? "succeeded" : "failed" };
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * HMAC-SHA256 webhook verification. Kept identical to the server contract so the
 * same function can be deployed behind an edge endpoint with the secret in env.
 */
export const verifyWebhookSignature = async (
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> => {
  if (!signature || !secret || !globalThis.crypto?.subtle) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = toHex(digest);
  const provided = signature.trim().toLowerCase();
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return diff === 0;
};

export const providerLabel = (id: ProviderId): string =>
  id === "sandbox" ? "Sandbox" : PROVIDERS.find((provider) => provider.id === id)?.label ?? id;
