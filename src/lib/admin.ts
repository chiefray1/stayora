import { sizeToGb } from "./plans";
import type { AuditLog, Database } from "./types";

const DB_KEY = (tenantId: string) => `stayora.hms.${tenantId}.v1`;

export interface WorkspaceUsage {
  rooms: number;
  staff: number;
  guests: number;
  reservations: number;
  documents: number;
  storageGb: number;
  auditLogs: AuditLog[];
}

/**
 * Read a workspace's persisted operational data for platform reporting.
 * Returns null when the workspace has never been opened in this browser.
 */
export function readWorkspaceUsage(tenantId: string): WorkspaceUsage | null {
  try {
    const raw = localStorage.getItem(DB_KEY(tenantId));
    if (!raw) return null;
    const db = JSON.parse(raw) as Partial<Database>;
    const documents = Array.isArray(db.documents) ? db.documents : [];
    return {
      rooms: Array.isArray(db.rooms) ? db.rooms.length : 0,
      staff: Array.isArray(db.staff) ? db.staff.length : 0,
      guests: Array.isArray(db.guests) ? db.guests.length : 0,
      reservations: Array.isArray(db.reservations) ? db.reservations.length : 0,
      documents: documents.length,
      storageGb:
        Math.round(documents.reduce((sum, document) => sum + sizeToGb(document.size), 0) * 100) / 100,
      auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs : [],
    };
  } catch {
    return null;
  }
}

/**
 * Remove every browser-side artefact for a deleted workspace: operational
 * data, login directory, sessions, reset codes and per-tenant billing notices.
 */
export function purgeWorkspaceStorage(tenantId: string) {
  const exact = [
    DB_KEY(tenantId),
    `stayora.accounts.${tenantId}.v1`,
    `stayora.session.${tenantId}`,
    `stayora.password-resets.${tenantId}.v1`,
    `stayora.login-attempts.${tenantId}.v1`,
  ];
  exact.forEach((key) => localStorage.removeItem(key));

  const prefixes = [`stayora.billing.notice.${tenantId}.`, `stayora.billing.renewal.${tenantId}.`];
  Object.keys(localStorage)
    .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
    .forEach((key) => localStorage.removeItem(key));
}
