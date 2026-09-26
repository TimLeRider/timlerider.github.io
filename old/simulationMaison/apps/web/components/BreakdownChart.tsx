"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#0f4c81", "#1a9c7d", "#b8860b", "#5a6578", "#c53030"];

export interface BreakdownItem {
  name: string;
  value: number;
}

export function BreakdownChart({ data, title }: { data: BreakdownItem[]; title: string }) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return <p className="help-text">Pas encore de données suffisantes pour afficher {title}.</p>;
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(entry) => `${entry.name}`}
          >
            {filtered.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toLocaleString("fr-FR")} €`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
