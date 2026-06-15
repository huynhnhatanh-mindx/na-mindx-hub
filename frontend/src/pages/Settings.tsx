import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function Settings() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Profile settings state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
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
      setEmail(user.email || '');
      setEmailNotificationsEnabled(user.emailNotificationsEnabled || false);
    } catch (e) {
      navigate('/login');
    }

    // Fetch fresh user profile from backend to ensure data (especially linked email) is fully up-to-date
    const fetchFreshProfile = async () => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            setDisplayName(data.user.displayName || '');
            setEmail(data.user.email || '');
            setEmailNotificationsEnabled(data.user.emailNotificationsEnabled || false);
            
            // Sync to localStorage
            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            const mergedUser = { ...localUser, ...data.user };
            localStorage.setItem('user', JSON.stringify(mergedUser));
            window.dispatchEvent(new Event('storage'));

            // Redirect if teacher needs to link Google
            if (data.user.role === 'teacher' && (data.user.requiresGoogleAuth || !data.user.email)) {
              navigate('/google-setup');
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi đồng bộ thông tin tài khoản từ server:', err);
      }
    };
    fetchFreshProfile();

    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
  }, [navigate]);

  // Handle theme change — live preview immediately, revert if not saved
  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    // Apply live preview to DOM
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Revert theme to saved value when leaving settings without saving
  useEffect(() => {
    return () => {
      // On unmount, revert to saved theme if user didn't save
      const currentSaved = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
      document.documentElement.setAttribute('data-theme', currentSaved);
    };
  }, []);

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
          password: password ? password : undefined,
          email: email.trim(),
          emailNotificationsEnabled: emailNotificationsEnabled
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
        displayName: resData.user.displayName,
        email: resData.user.email,
        emailNotificationsEnabled: resData.user.emailNotificationsEnabled
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

  const handleUnlinkGoogle = async () => {
    const isTeacher = currentUser?.role === 'teacher';
    const confirmMessage = isTeacher
      ? "Bạn có chắc chắn muốn hủy liên kết tài khoản Google? Việc này sẽ đưa bạn về màn hình kích hoạt để liên kết lại."
      : "Bạn có chắc chắn muốn hủy liên kết tài khoản Google?";
      
    const ok = await showConfirm(confirmMessage);
    if (!ok) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Hủy liên kết thất bại.');
      }

      // Cập nhật localStorage
      const updatedUser = {
        ...currentUser,
        requiresGoogleAuth: isTeacher,
        email: '',
        emailNotificationsEnabled: false
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setEmail('');
      setEmailNotificationsEnabled(false);

      // Gửi event storage để Header cập nhật lập tức
      window.dispatchEvent(new Event('storage'));

      showToast('Đã hủy liên kết tài khoản Google thành công!', 'success');
      setSuccess('Đã hủy liên kết tài khoản Google thành công!');

      // Redirect về google-setup sau 1.5 giây chỉ dành cho giáo viên
      if (isTeacher) {
        setTimeout(() => {
          navigate('/google-setup');
        }, 1500);
      }

    } catch (err: any) {
      showToast(err.message || 'Đã xảy ra lỗi khi hủy liên kết.', 'error');
      setError(err.message || 'Đã xảy ra lỗi khi hủy liên kết.');
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
            <ArrowLeft size={18} />
            Quay lại trang chủ
          </Link>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} autoComplete="off">
            {/* Account Metadata (Disabled Info) */}
            <div className="form-grid-2">
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

            {/* Email Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="form-label">Email tài khoản</label>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email nhận thông báo..."
                  className="form-input-field"
                  style={{ flex: 1 }}
                />
                {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
                  email ? (
                    <button
                      type="button"
                      onClick={handleUnlinkGoogle}
                      className="btn btn-danger"
                      disabled={isLoading}
                      style={{
                        height: '2.7rem',
                        padding: '0 1rem',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        width: 'auto'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Hủy liên kết Google
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/google-setup')}
                      className="btn"
                      disabled={isLoading}
                      style={{
                        height: '2.7rem',
                        padding: '0 1rem',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: 'var(--primary-glow)',
                        border: '1px solid var(--primary-glow)',
                        color: 'var(--primary)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        width: 'auto'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      Liên kết Google
                    </button>
                  )
                )}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                💡 <strong>Công dụng email:</strong> Email này dùng để nhận thông báo tự động khi học viên nộp bài mới và để khôi phục mật khẩu khi {currentUser?.role === 'admin' ? 'bạn' : 'thầy/cô'} quên. Email được tự động đồng bộ khi {currentUser?.role === 'admin' ? 'bạn' : 'thầy/cô'} liên kết tài khoản Google.
              </span>

              {/* Tùy chọn nhận thông báo email */}
              <div style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'var(--transition-smooth)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', userSelect: 'none' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Nhận thông báo qua email
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Tự động gửi email thông báo cho {currentUser?.role === 'admin' ? 'bạn' : 'thầy/cô'} bất cứ khi nào học viên nộp bài mới.
                  </span>
                </div>
                <label className="switch" style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '46px',
                  height: '24px',
                  flexShrink: 0
                }}>
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    disabled={!email.trim()}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider" style={{
                    position: 'absolute',
                    cursor: email ? 'pointer' : 'not-allowed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: emailNotificationsEnabled ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                    transition: 'var(--transition-fast)',
                    borderRadius: '24px',
                    border: '1px solid var(--card-border)',
                    opacity: email.trim() ? 1 : 0.5,
                    boxShadow: emailNotificationsEnabled ? '0 0 12px var(--primary-glow)' : 'none'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '16px',
                      width: '16px',
                      left: '3px',
                      bottom: '3px',
                      backgroundColor: '#ffffff',
                      transition: 'var(--transition-fast)',
                      borderRadius: '50%',
                      transform: emailNotificationsEnabled ? 'translateX(22px)' : 'none'
                    }} />
                  </span>
                </label>
              </div>
              {!email.trim() && (
                <span style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.35rem', display: 'block' }}>
                  ⚠️ Vui lòng nhập địa chỉ email trước để có thể kích hoạt tùy chọn này.
                </span>
              )}
            </div>

            {/* Password Fields */}
            <div className="form-grid-2">
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                
                {/* Dark Theme Card */}
                <div 
                  onClick={() => handleThemeChange('dark')}
                  style={{
                    borderRadius: '14px',
                    cursor: 'pointer',
                    border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--card-border)'}`,
                    boxShadow: theme === 'dark' ? '0 0 0 3px rgba(225, 29, 72, 0.15)' : 'none',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    transform: theme === 'dark' ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  {/* Mini dark UI mockup */}
                  <div style={{ background: '#0f0506', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.4rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #fda4af, #e11d48)' }} />
                      <div style={{ height: '5px', width: '55px', borderRadius: '3px', background: 'linear-gradient(90deg, #fecdd3, #fb7185)' }} />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ height: '4px', width: '80%', borderRadius: '3px', background: 'rgba(255,255,255,0.15)' }} />
                      <div style={{ height: '4px', width: '60%', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ height: '20px', borderRadius: '4px', background: 'linear-gradient(90deg, #e11d48, #be123c)', marginTop: '0.25rem' }} />
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{
                    background: theme === 'dark' ? 'rgba(225, 29, 72, 0.12)' : 'rgba(15,23,42,0.85)',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '1rem' }}>🌙</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: theme === 'dark' ? '#fb7185' : '#94a3b8' }}>Giao diện Tối</span>
                    {theme === 'dark' && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#e11d48', color: '#fff', borderRadius: '99px', padding: '1px 7px', fontWeight: '700' }}>Đang dùng</span>
                    )}
                  </div>
                </div>

                {/* Light Theme Card */}
                <div 
                  onClick={() => handleThemeChange('light')}
                  style={{
                    borderRadius: '14px',
                    cursor: 'pointer',
                    border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--card-border)'}`,
                    boxShadow: theme === 'light' ? '0 0 0 3px rgba(220, 38, 38, 0.15)' : 'none',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    transform: theme === 'light' ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  {/* Mini light UI mockup */}
                  <div style={{ background: '#fff5f5', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '6px', padding: '0.4rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid rgba(225,29,72,0.12)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #fb7185, #dc2626)' }} />
                      <div style={{ height: '5px', width: '55px', borderRadius: '3px', background: 'linear-gradient(90deg, #dc2626, #991b1b)' }} />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '6px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', border: '1px solid rgba(225,29,72,0.1)' }}>
                      <div style={{ height: '4px', width: '80%', borderRadius: '3px', background: 'rgba(30,41,59,0.2)' }} />
                      <div style={{ height: '4px', width: '60%', borderRadius: '3px', background: 'rgba(30,41,59,0.12)' }} />
                      <div style={{ height: '20px', borderRadius: '4px', background: 'linear-gradient(90deg, #dc2626, #991b1b)', marginTop: '0.25rem' }} />
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{
                    background: theme === 'light' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(255,245,245,0.9)',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    borderTop: '1px solid rgba(225,29,72,0.1)'
                  }}>
                    <span style={{ fontSize: '1rem' }}>☀️</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: theme === 'light' ? '#dc2626' : '#475569' }}>Giao diện Sáng</span>
                    {theme === 'light' && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#dc2626', color: '#fff', borderRadius: '99px', padding: '1px 7px', fontWeight: '700' }}>Đang dùng</span>
                    )}
                  </div>
                </div>

              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                💡 Click để xem trước. Nhấn <strong>Lưu thay đổi</strong> để áp dụng vĩnh viễn.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'var(--error-glow)',
                border: '1px solid var(--error-glow)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: 'var(--error)',
                fontSize: '0.85rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{
                background: 'var(--success-glow)',
                border: '1px solid var(--success-glow)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: 'var(--success)',
                fontSize: '0.85rem',
                fontWeight: '600',
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
