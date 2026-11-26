export const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export const compactNaira = (value: number) => {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${value}`;
};

export const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayISO = () => iso(new Date());

export const addDays = (date: string | Date, days: number) => {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : new Date(date);
  d.setDate(d.getDate() + days);
  return iso(d);
};

export const daysBetween = (from: string, to: string) => {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
};

const parseDay = (date: string) =>
  new Date(date.includes("T") ? date : `${date}T12:00:00`);

export const prettyDate = (date?: string) => {
  if (!date) return "—";
  return parseDay(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const shortDate = (date?: string) => {
  if (!date) return "—";
  return parseDay(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};

export const todayLabel = () =>
  new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const timeAgo = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const nightsLabel = (nights: number) =>
  `${nights} night${nights === 1 ? "" : "s"}`;

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const bookingRef = () =>
  `STY-${Math.floor(30000 + Math.random() * 69999)}`;

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? "");
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
