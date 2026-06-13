import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Settings } from 'lucide-react';

function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <img src="/logo.png" alt="NA MindX Hub Logo" className="nav-logo-img" />
          <span className="nav-logo-text">NA MindX Hub</span>
        </div>

        {/* Hamburger Toggle Button (mobile only) */}
        <button 
          className="menu-toggle" 
          onClick={toggleMobileMenu} 
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X size={24} strokeWidth={2.5} />
          ) : (
            <Menu size={24} strokeWidth={2.5} />
          )}
        </button>

        {/* Navigation Menu */}
        <ul className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          {(!user || user.role !== 'admin') && (
            <li>
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                Trang chủ
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/features" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Chức năng
            </NavLink>
          </li>
          {!user && (
            <li>
              <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Nộp bài
              </NavLink>
            </li>
          )}
          {!user && (
            <li>
              <NavLink to="/submissions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Lịch sử nộp
              </NavLink>
            </li>
          )}
          {user && (user.role === 'admin' || user.role === 'teacher') && (
            <>
              <li>
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {user.role === 'admin' ? 'Quản trị' : 'Quản lý'}
                </NavLink>
              </li>
              <li>
                <NavLink to="/presentation-arranger" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  Xếp lịch thuyết trình
                </NavLink>
              </li>
            </>
          )}

          {/* Mobile Header Actions */}
          <li className="mobile-header-actions-item">
            {user ? (
              <div className="mobile-header-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <span className="user-greeting" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  Chào, <strong style={{ color: 'var(--text-primary)' }}>{user.displayName || user.username}</strong>
                </span>
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                  <NavLink 
                    to="/settings" 
                    className={({ isActive }) => `btn-settings ${isActive ? 'active' : ''}`}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.05)', 
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px',
                      width: '2.2rem',
                      height: '2.2rem',
                      color: 'var(--text-secondary)',
                      transition: 'var(--transition-fast)'
                    }}
                    title="Cài đặt cá nhân"
                  >
                    <Settings size={18} />
                  </NavLink>
                  <button 
                    className="btn" 
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: '#ff8a8a',
                      padding: '0.4rem 1rem',
                      height: '2.2rem',
                      flex: 1,
                      fontSize: '0.85rem'
                    }} 
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button className="btn btn-login" style={{ width: '100%' }} onClick={() => navigate('/login')}>
                  Đăng nhập
                </button>
              </div>
            )}
          </li>
        </ul>

        {/* User Actions (Desktop only) */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          {user ? (
            <>
              <span className="user-greeting" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Chào, <strong style={{ color: 'var(--text-primary)' }}>{user.displayName || user.username}</strong>
              </span>

              {/* Gear settings link (Desktop only) */}
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `btn-settings ${isActive ? 'active' : ''}`}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  width: '2.2rem',
                  height: '2.2rem',
                  color: 'var(--text-secondary)',
                  transition: 'var(--transition-fast)'
                }}
                title="Cài đặt cá nhân"
              >
                <Settings size={18} />
              </NavLink>

              <button 
                className="btn" 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#ff8a8a',
                  padding: '0.4rem 1rem',
                  height: '2.2rem',
                  width: 'auto',
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
