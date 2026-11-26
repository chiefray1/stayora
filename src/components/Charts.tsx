import { useMemo } from "react";
import { revenueByMonth, occupancyWeek } from "../lib/seed";

export function RevenueBars() {
  const max = Math.max(...revenueByMonth.map((m) => m.rooms + m.fnb + m.other));
  const W = 620;
  const H = 210;
  const padX = 34;
  const padY = 18;
  const barW = 46;
  const gap = (W - padX * 2 - barW * revenueByMonth.length) / (revenueByMonth.length - 1);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[oklch(62%_0.096_78)]" /> Rooms</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[oklch(58%_0.08_240)]" /> F&B</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[oklch(56%_0.11_150)]" /> Other</span>
        <span className="ml-auto font-semibold text-foreground">₦93.0M in July</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Revenue for the last six months">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padY + (H - padY * 2) * (1 - t);
          return (
            <g key={t}>
              <line x1={padX} x2={W - padX} y1={y} y2={y} stroke="oklch(92% 0.01 82)" strokeWidth="1" />
              <text x={4} y={y + 3} fontSize="9" fill="oklch(58% 0.014 65)">{Math.round(max * t)}</text>
            </g>
          );
        })}
        {revenueByMonth.map((m, i) => {
          const x = padX + i * (barW + gap);
          const scale = (H - padY * 2) / max;
          const roomsH = m.rooms * scale;
          const fnbH = m.fnb * scale;
          const otherH = m.other * scale;
          let y = H - padY;
          return (
            <g key={m.month}>
              <rect x={x} y={y - roomsH} width={barW} height={roomsH} rx={4} fill="oklch(62% 0.096 78)" />
              <rect x={x} y={y - roomsH - fnbH} width={barW} height={fnbH} rx={4} fill="oklch(58% 0.08 240)" />
              <rect x={x} y={y - roomsH - fnbH - otherH} width={barW} height={otherH} rx={4} fill="oklch(56% 0.11 150)" />
              <text x={x + barW / 2} y={H - 3} textAnchor="middle" fontSize="10" fill="oklch(52% 0.014 65)">
                {m.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function OccupancyChart() {
  const W = 620;
  const H = 190;
  const padX = 34;
  const padY = 16;
  const max = 100;
  const step = (W - padX * 2) / (occupancyWeek.length - 1);
  const points = occupancyWeek.map((d, i) => {
    const x = padX + i * step;
    const y = padY + (H - padY * 2) * (1 - d.occupancy / max);
    return { ...d, x, y };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${padX},${H - padY} ${line} ${padX + (occupancyWeek.length - 1) * step},${H - padY}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Occupancy for the current week">
      <defs>
        <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(62% 0.096 78)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="oklch(62% 0.096 78)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((t) => {
        const y = padY + (H - padY * 2) * (1 - t / 100);
        return (
          <g key={t}>
            <line x1={padX} x2={W - padX} y1={y} y2={y} stroke="oklch(92% 0.01 82)" />
            <text x={4} y={y + 3} fontSize="9" fill="oklch(58% 0.014 65)">{t}%</text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#occFill)" />
      <polyline points={line} fill="none" stroke="oklch(62% 0.096 78)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.day}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="oklch(62% 0.096 78)" strokeWidth="2" />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="oklch(52% 0.014 65)">{p.day}</text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="oklch(38% 0.02 62)">
            {p.occupancy}%
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Donut({
  data,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const colors = ["oklch(62% 0.096 78)", "oklch(58% 0.08 240)", "oklch(56% 0.11 150)", "oklch(68% 0.13 75)", "oklch(55% 0.2 25)"];
  const gradient = useMemo(() => {
    let acc = 0;
    return data
      .map((d, i) => {
        const start = (acc / total) * 100;
        acc += d.value;
        const end = (acc / total) * 100;
        return `${colors[i % colors.length]} ${start}% ${end}%`;
      })
      .join(", ");
  }, [data, total]);

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <div className="size-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="absolute inset-[18px] grid place-items-center rounded-full bg-card text-center">
          <div>
            <p className="font-display text-2xl font-semibold leading-none">{centerValue}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-xs">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <i className="size-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-semibold">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MiniBars({ values, tone = "gold" }: { values: number[]; tone?: "gold" | "blue" }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-10 items-end gap-1">
      {values.map((v, i) => (
        <span
          key={i}
          className={tone === "gold" ? "w-1.5 rounded-sm bg-primary/70" : "w-1.5 rounded-sm bg-info/70"}
          style={{ height: `${Math.max(10, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
