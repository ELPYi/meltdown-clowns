import React from 'react';
import { useCooldown } from '../../hooks/useCooldown.js';

interface Props {
  cooldownSec: number;
  actionKey: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children: React.ReactNode;
}

export function CooldownButton({ cooldownSec, actionKey, onClick, className, style, disabled, children }: Props) {
  const { remaining, isOnCooldown, trigger } = useCooldown(cooldownSec, actionKey);

  const handleClick = () => {
    trigger();
    onClick();
  };

  return (
    <button
      className={className}
      style={{ ...style, position: 'relative', opacity: isOnCooldown ? 0.5 : 1 }}
      disabled={disabled || isOnCooldown}
      onClick={handleClick}
    >
      {children}
      {isOnCooldown && (
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          fontSize: '1.1rem', fontWeight: 'bold', color: '#fff',
          pointerEvents: 'none', borderRadius: 'inherit',
        }}>
          {remaining}s
        </span>
      )}
    </button>
  );
}
