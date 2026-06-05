import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPassword() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: input.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi khôi phục mật khẩu.');
      }

      setStatus('success');
      setMessage(data.message || 'Email khôi phục mật khẩu đã được gửi đi thành công.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Lỗi hệ thống không thể kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-heading)',
          background: 'var(--title-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Khôi Phục Mật Khẩu
        </h2>
        <p className="subtitle">Nhận liên kết đặt lại mật khẩu qua email liên kết của tài khoản</p>
      </div>

      <main style={{ maxWidth: '480px', margin: '0 auto', width: '100%', marginBottom: '4rem' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          
          <Link to="/login" style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            transition: 'var(--transition-fast)'
          }}
            className="back-link"
          >
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>

          {status === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                marginBottom: '0.5rem'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--success)' }}>Yêu cầu đã được xử lý!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {message || 'Hệ thống đã gửi email hướng dẫn khôi phục mật khẩu. Vui lòng kiểm tra hộp thư đến (hoặc hộp thư rác/spam) của bạn.'}
              </p>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', marginTop: '1.5rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Quay lại Đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Nhập <strong>Tên đăng nhập</strong> hoặc <strong>Email</strong> liên kết của bạn. Hệ thống sẽ tự động tìm kiếm tài khoản và gửi đường link đặt lại mật khẩu mới.
              </p>

              <div className="form-group" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="form-label">Tên đăng nhập hoặc Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ví dụ: giaovien1 hoặc email..."
                    className="form-input-field"
                    style={{ paddingLeft: '38px' }}
                    required
                    disabled={isLoading}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {status === 'error' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '1rem',
                  borderRadius: '8px',
                  color: '#fce8e6',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !input.trim()}
                style={{
                  width: '100%',
                  height: '3rem',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi link khôi phục</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </main>
    </>
  );
}
