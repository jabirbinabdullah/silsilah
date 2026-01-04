import React, { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number, action?: { label: string; onClick: () => void }) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration: number = 3000, action?: { label: string; onClick: () => void }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, duration, action };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="position-fixed"
      style={{
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastProps {
  toast: Toast;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const bgColor = {
    success: 'bg-success',
    info: 'bg-info',
    warning: 'bg-warning',
    error: 'bg-danger',
  }[toast.type];

  const icon = {
    success: '✓',
    info: 'ℹ',
    warning: '⚠',
    error: '✕',
  }[toast.type];

  return (
    <div
      className={`${bgColor} text-white p-3 mb-2 rounded`}
      style={{
        animation: 'slideIn 0.3s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          className="btn btn-sm btn-light text-dark ms-2"
          onClick={() => {
            toast.action?.onClick();
            onClose();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        className="btn btn-sm btn-link text-white p-0"
        onClick={onClose}
        style={{ textDecoration: 'none' }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
