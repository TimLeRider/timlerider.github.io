"use client";

interface GaugeProps {
  label: string;
  valuePercent: number;
  thresholds?: { good: number; warning: number }; // en dessous de good = vert, en dessous de warning = orange, sinon rouge
  displayValue?: string;
}

export function Gauge({
  label,
  valuePercent,
  thresholds = { good: 33, warning: 40 },
  displayValue,
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, valuePercent));
  const color =
    valuePercent <= thresholds.good
      ? "var(--color-success)"
      : valuePercent <= thresholds.warning
      ? "var(--color-warning)"
      : "var(--color-danger)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="stat-label" style={{ margin: 0 }}>
          {label}
        </span>
        <strong style={{ color }}>{displayValue ?? `${valuePercent.toFixed(1)}%`}</strong>
      </div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  );
}
