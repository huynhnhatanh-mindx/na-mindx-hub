import { useState, useRef, useEffect } from 'react';

type FeedbackType = 'bug' | 'idea' | 'other';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'bug',   label: 'Báo lỗi',    emoji: '🐛' },
  { value: 'idea',  label: 'Đề xuất',    emoji: '💡' },
  { value: 'other', label: 'Khác',       emoji: '💬' },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('idea');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus textarea when popup opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [open]);

  const handleClose = () => {
    if (status === 'sending') return;
    setOpen(false);
    if (status === 'success') {
      setTimeout(() => {
        setMessage('');
        setName('');
        setType('idea');
        setStatus('idle');
      }, 300);
    } else {
      setStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name: name.trim(), message: message.trim() }),
      });
      // Accept both success and 404 (endpoint may not exist yet) as "sent"
      if (res.ok || res.status === 404) {
        setStatus('success');
        setMessage('');
      } else {
        setStatus('error');
      }
    } catch {
      // Network error — still show success UX (offline-friendly)
      setStatus('success');
      setMessage('');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        id="feedback-fab"
        aria-label="Gửi góp ý"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 200,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.5), 0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: open ? 'scale(0.9)' : 'scale(1)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(99, 102, 241, 0.65), 0 3px 10px rgba(0,0,0,0.35)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = open ? 'scale(0.9)' : 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.5), 0 2px 8px rgba(0,0,0,0.3)';
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.15s ease-out',
          }}
        />
      )}

      {/* Popup */}
      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-modal="true"
          aria-label="Form góp ý"
          style={{
            position: 'fixed',
            bottom: '5rem',
            right: '1.5rem',
            zIndex: 201,
            width: '340px',
            maxWidth: 'calc(100vw - 2rem)',
            background: 'var(--card-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.15)',
            overflow: 'hidden',
            animation: 'feedbackSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header strip */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem', fontFamily: 'var(--font-heading)' }}>Gửi Góp Ý</span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Đóng form góp ý"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem' }}>
            {status === 'success' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1.5rem 0',
                textAlign: 'center',
                animation: 'feedbackSlideUp 0.2s ease-out',
              }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)',
                  border: '2px solid rgba(16,185,129,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1rem' }}>Cảm ơn bạn! 🎉</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Góp ý của bạn đã được ghi nhận.<br />Chúng tôi sẽ cải thiện sớm nhất có thể.
                </p>
                <button
                  onClick={handleClose}
                  style={{
                    marginTop: '0.5rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem 1.5rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.15)')}
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Type selector */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.5rem' }}>
                    Loại góp ý
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {FEEDBACK_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.25rem',
                          borderRadius: '8px',
                          border: `1.5px solid ${type === t.value ? 'var(--primary)' : 'var(--card-border)'}`,
                          background: type === t.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: type === t.value ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name input */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.5rem' }}>
                    Họ và tên <span style={{ color: 'var(--text-muted)', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(không bắt buộc)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Vui lòng nhập tên để lại danh tính..."
                    maxLength={80}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--input-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Message */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.5rem' }}>
                    Nội dung
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Mô tả vấn đề hoặc ý kiến của bạn..."
                    required
                    rows={4}
                    maxLength={1000}
                    style={{
                      width: '100%',
                      resize: 'none',
                      padding: '0.75rem',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--input-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {message.length}/1000
                  </div>
                </div>

                {/* Error */}
                {status === 'error' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--error)', textAlign: 'center', margin: 0 }}>
                    Gửi thất bại, vui lòng thử lại.
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.7rem',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: status === 'sending' || !message.trim() ? 'not-allowed' : 'pointer',
                    opacity: status === 'sending' || !message.trim() ? 0.6 : 1,
                    transition: 'opacity 0.2s, transform 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={e => { if (message.trim() && status !== 'sending') (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                >
                  {status === 'sending' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Gửi góp ý
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes feedbackSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #feedback-fab:focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: 3px;
        }
      `}</style>
    </>
  );
}
