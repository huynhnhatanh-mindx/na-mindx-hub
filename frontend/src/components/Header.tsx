import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  const checkUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUser();
    
    // Listen to storage events to sync login state instantly
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <div className="logo-placeholder" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span>NA-MINDX-HUB</span>
        </div>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          <li>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              Trang chủ
            </NavLink>
          </li>
          {!user && (
            <li>
              <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Nộp bài
              </NavLink>
            </li>
          )}
          {(!user || user.role !== 'admin') && (
            <li>
              <NavLink to="/submissions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Lịch sử nộp
              </NavLink>
            </li>
          )}
          {user && user.role === 'admin' && (
            <li>
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Quản trị
              </NavLink>
            </li>
          )}
        </ul>

        {/* User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          {user ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Chào, <strong style={{ color: 'var(--text-primary)' }}>{user.displayName || user.username}</strong>
              </span>
              <button 
                className="btn" 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#ff8a8a',
                  padding: '0.4rem 1rem',
                  height: '2.2rem',
                  fontSize: '0.85rem'
                }} 
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button className="btn btn-login" onClick={() => navigate('/login')}>
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Header;
