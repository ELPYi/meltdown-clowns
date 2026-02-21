import React from 'react';

interface Props {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function ControlSlider({ label, value, min = 0, max = 100, step = 1, onChange }: Props) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="slider-container">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
        <span className="slider-value">{Math.round(value)}%</span>
      </div>
    </div>
  );
}
