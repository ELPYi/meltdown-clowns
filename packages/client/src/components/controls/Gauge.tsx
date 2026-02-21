import React from 'react';

interface Props {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  thresholds?: [number, number]; // [warning, danger]
  decimals?: number;
}

export function Gauge({ label, value, max = 100, unit = '', thresholds, decimals = 0 }: Props) {
  const percent = Math.min(100, (value / max) * 100);

  let status = 'safe';
  if (thresholds) {
    if (value >= thresholds[1]) status = 'danger';
    else if (value >= thresholds[0]) status = 'warning';
  }

  const barColor = status === 'danger' ? 'var(--danger)'
    : status === 'warning' ? 'var(--warning)'
    : 'var(--safe)';

  return (
    <div className="gauge">
      <div className="gauge-label">{label}</div>
      <div className={`gauge-value ${status}`}>
        {value.toFixed(decimals)}
      </div>
      {unit && <div className="gauge-unit">{unit}</div>}
      <div className="gauge-bar">
        <div
          className="gauge-bar-fill"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
