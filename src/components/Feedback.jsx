import React from 'react';

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div className="status-block status-loading">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="status-block status-error" role="alert">
      <div>
        <strong>Couldn't load this data.</strong>
        <div className="status-error-detail">{message}</div>
      </div>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="status-block status-empty">
      <strong>{title}</strong>
      {hint && <div className="status-error-detail">{hint}</div>}
    </div>
  );
}
