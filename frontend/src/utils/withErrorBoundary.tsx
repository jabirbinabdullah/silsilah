import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function withErrorBoundary<P>(Component: React.ComponentType<P>, fallback?: React.ReactNode) {
  return function Wrapped(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
