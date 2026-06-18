import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        let errMsg = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      // Store session info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Dispatch storage event to notify Header component immediately
      window.dispatchEvent(new Event('storage'));

      // Redirect to Google onboarding if teacher needs Google setup, else to homepage
      if (data.user.role === 'teacher' && data.user.requiresGoogleAuth) {
        navigate('/google-setup');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến máy chủ.');
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
          Đăng Nhập Hệ Thống
        </h2>
        <p className="subtitle">Dành cho Giáo viên và Ban quản trị</p>
      </div>

      <main style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="form-label">Tên đăng nhập</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tài khoản đăng nhập..."
                  className="form-input-field"
                  style={{ paddingLeft: '38px' }}
                  required
                  disabled={isLoading}
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.8 }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Mật khẩu</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600', transition: 'var(--transition-fast)' }} className="back-link">
                  Quên mật khẩu?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="form-input-field"
                  style={{ paddingLeft: '38px' }}
                  required
                  disabled={isLoading}
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.8 }} />
              </div>
            </div>

            {error && (
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
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <ShieldAlert size={16} style={{ color: '#ef4444' }} />
                <span>{error}</span>
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
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
          
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            💡 <strong>Lưu ý:</strong> Trang đăng nhập chỉ dành riêng cho <strong>Quản trị viên</strong> và <strong>Giáo viên</strong>. Tài khoản đăng nhập sẽ do Quản trị viên hệ thống (Admin) khởi tạo và cấp phát.
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/contact-admin" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }} className="back-link">
                Liên hệ Quản trị viên
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
