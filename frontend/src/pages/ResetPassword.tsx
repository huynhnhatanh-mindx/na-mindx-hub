import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setMessage('Mã xác thực khôi phục mật khẩu trống hoặc không hợp lệ.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Mật khẩu nhập lại không trùng khớp.');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đặt lại mật khẩu thất bại.');
      }

      setStatus('success');
      setMessage(data.message || 'Mật khẩu của bạn đã được đổi thành công!');
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
          Đặt Lại Mật Khẩu Mới
        </h2>
        <p className="subtitle">Nhập mật khẩu mới bảo mật cho tài khoản của bạn</p>
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

          {!token && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '1.25rem',
              borderRadius: '8px',
              color: '#fce8e6',
              fontSize: '0.9rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              <div>
                <strong>Liên kết không hợp lệ!</strong><br />
                Đường dẫn đặt lại mật khẩu thiếu mã token xác thực. Vui lòng kiểm tra lại liên kết trong email của bạn.
              </div>
            </div>
          )}

          {token && status === 'success' ? (
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
              <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--success)' }}>Thành công!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {message || 'Mật khẩu của bạn đã được thay đổi thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.'}
              </p>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', marginTop: '1.5rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Đăng nhập ngay
              </Link>
            </div>
          ) : (
            token && (
              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label">Mật khẩu mới</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới bảo mật..."
                      className="form-input-field"
                      style={{ paddingLeft: '38px' }}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label">Nhập lại mật khẩu mới</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="form-input-field"
                      style={{ paddingLeft: '38px' }}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
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
                  disabled={isLoading}
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
                      <span>Đang lưu mật khẩu...</span>
                    </>
                  ) : (
                    <span>Lưu mật khẩu mới</span>
                  )}
                </button>
              </form>
            )
          )}

        </div>
      </main>
    </>
  );
}
