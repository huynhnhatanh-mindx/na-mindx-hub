import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Profile settings state
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Theme settings state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load user profile and current theme on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      setDisplayName(user.displayName || '');
    } catch (e) {
      navigate('/login');
    }

    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
  }, [navigate]);

  // Handle theme change (local state only, applied on save)
  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
  };

  // Handle Profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');

    try {
      // Persist and apply the selected theme on submit
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);

      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          password: password ? password : undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Cập nhật thất bại.');
      }

      const resData = await res.json();
      
      // Update locally stored user data
      const updatedUser = {
        ...currentUser,
        displayName: resData.user.displayName
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      
      setSuccess('Cập nhật thông tin cá nhân thành công!');
      setPassword('');
      setConfirmPassword('');

      // Dispatch storage event to notify Header component immediately
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật.');
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
          Cài Đặt Cá Nhân
        </h2>
        <p className="subtitle">Quản lý hồ sơ cá nhân và cấu hình tùy chọn giao diện sáng tối</p>
      </div>

      <main style={{ maxWidth: '650px', margin: '0 auto', width: '100%', marginBottom: '4rem' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          {/* Back button */}
          <Link to="/" style={{
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Quay lại trang chủ
          </Link>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} autoComplete="off">
            {/* Account Metadata (Disabled Info) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="form-label">Tên đăng nhập</label>
                <input
                  type="text"
                  value={currentUser?.username || ''}
                  disabled
                  className="form-input-field"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="form-label">Vai trò hiện tại</label>
                <input
                  type="text"
                  value={currentUser?.role === 'admin' ? 'Quản trị viên (Admin)' : 'Giáo viên (Teacher)'}
                  disabled
                  className="form-input-field"
                />
              </div>
            </div>

            {/* Display Name Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="form-label">Tên hiển thị (Họ và Tên)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
                className="form-input-field"
              />
            </div>

            {/* Password Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="form-label">Mật khẩu mới</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu bảo mật..."
                  autoComplete="new-password"
                  className="form-input-field"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  *(Để trống nếu không muốn thay đổi mật khẩu)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu..."
                  autoComplete="new-password"
                  className="form-input-field"
                />
              </div>
            </div>

            {/* Theme Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <label className="form-label">Chọn Giao Diện (Theme)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {/* Dark Theme Card */}
                <div 
                  onClick={() => handleThemeChange('dark')}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--card-border)'}`,
                    boxShadow: theme === 'dark' ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #818cf8 0%, #1e1b4b 100%)',
                    boxShadow: '0 0 8px rgba(129, 140, 248, 0.5)'
                  }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>Giao diện Tối (Dark)</span>
                </div>

                {/* Light Theme Card */}
                <div 
                  onClick={() => handleThemeChange('light')}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'rgba(0,0,0,0.08)'}`,
                    boxShadow: theme === 'light' ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #fcd34d 0%, #fb923c 100%)',
                    boxShadow: '0 0 8px rgba(251, 146, 60, 0.5)'
                  }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>Giao diện Sáng (Light)</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#fce8e6',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#e6fcf5',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                {success}
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ height: '2.8rem', fontSize: '0.95rem' }}
            >
              {isLoading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
