import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  showConfirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 4000
  ) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  };

  const handleConfirmResponse = (value: boolean) => {
    if (confirm) {
      confirm.resolve(value);
      setConfirm(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} strokeWidth={2.5} color="var(--success)" />;
      case 'error':
        return <AlertOctagon size={18} strokeWidth={2.5} color="var(--error)" />;
      case 'warning':
        return <AlertTriangle size={18} strokeWidth={2.5} color="#f59e0b" />;
      case 'info':
      default:
        return <Info size={18} strokeWidth={2.5} color="var(--primary)" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Floating Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <span className="toast-icon">{getIcon(toast.type)}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Glassmorphic Confirm Modal */}
      {confirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content glass-card" style={{ maxWidth: '450px', padding: '2rem' }}>
            <div className="confirm-modal-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={28} color="#f59e0b" style={{ flexShrink: 0 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, fontFamily: 'var(--font-heading)' }}>Xác nhận thao tác</h3>
            </div>
            <p className="confirm-modal-message" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {confirm.message}
            </p>
            <div className="confirm-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => handleConfirmResponse(false)}
                style={{ height: '2.5rem', padding: '0 1.25rem', fontSize: '0.875rem' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleConfirmResponse(true)}
                style={{
                  height: '2.5rem',
                  padding: '0 1.25rem',
                  fontSize: '0.875rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ff8a8a',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
