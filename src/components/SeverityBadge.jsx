import React from 'react';

const STYLES = {
  Critical: { bg: 'var(--critical-soft)', fg: 'var(--critical)' },
  High: { bg: 'var(--high-soft)', fg: 'var(--high)' },
  Medium: { bg: 'var(--medium-soft)', fg: 'var(--medium)' },
  Low: { bg: 'var(--low-soft)', fg: 'var(--low)' },
  Normal: { bg: 'var(--normal-soft)', fg: 'var(--normal)' },
};

export default function SeverityBadge({ level }) {
  const style = STYLES[level] || STYLES.Low;
  return (
    <span
      style={{
        background: style.bg,
        color: style.fg,
        fontSize: 11.5,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 999,
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {level}
    </span>
  );
}
