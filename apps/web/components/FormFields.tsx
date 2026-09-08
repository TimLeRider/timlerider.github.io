"use client";

import { ReactNode } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  help?: string;
}

export function NumberField({ label, value, onChange, min = 0, step = 1, suffix, help }: NumberFieldProps) {
  return (
    <div className="field">
      <label>
        {label} {suffix ? `(${suffix})` : ""}
      </label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {help && <span className="help-text">{help}</span>}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  help?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  help,
}: SelectFieldProps<T>) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {help && <span className="help-text">{help}</span>}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <div className="field field-checkbox">
      <input
        type="checkbox"
        id={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={label} style={{ margin: 0 }}>
        {label}
      </label>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      {help && <span className="help-text">{help}</span>}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="form-section">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </div>
  );
}
