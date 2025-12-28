import React from 'react';

export class ErrorBoundary extends React.Component<{
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  children: React.ReactNode;
}, { hasError: boolean; error?: Error }>
{
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="alert alert-danger" role="alert">
          <strong>Something went wrong.</strong>
          <div className="mt-1">Please try again or refresh the page.</div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
