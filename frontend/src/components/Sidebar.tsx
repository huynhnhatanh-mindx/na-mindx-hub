import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Info, 
  UploadCloud, 
  History, 
  Shield, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  LogIn 
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
    
    // Sync login state in real-time
    window.addEventListener('storage', checkUser);

    const handleOutsideClick = () => {
      setShowProfileMenu(false);
    };
    document.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('storage', checkUser);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    onCloseMobile();
    navigate('/');
  };

  // Generate avatar initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile Sidebar overlay */}
      <div 
        className="sidebar-overlay" 
        onClick={onCloseMobile}
        style={{ display: isMobileOpen ? 'block' : 'none' }}
      />

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Logo Header */}
        <div className="sidebar-logo" onClick={() => { navigate('/'); onCloseMobile(); }}>
          <img src="/logo.png" alt="NA MindX Hub Logo" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">NA MindX Hub</span>
        </div>

        {/* Navigation Menu List */}
        <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <ul className="sidebar-menu">
            <li>
              <NavLink 
                to="/" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
                end
              >
                <Home size={18} />
                <span className="sidebar-link-text">Trang chủ</span>
              </NavLink>
            </li>
            
            <li>
              <NavLink 
                to="/features" 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <Info size={18} />
                <span className="sidebar-link-text">Chức năng</span>
              </NavLink>
            </li>

            {!user && (
              <>
                <li>
                  <NavLink 
                    to="/upload" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <UploadCloud size={18} />
                    <span className="sidebar-link-text">Nộp bài tập</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/submissions" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <History size={18} />
                    <span className="sidebar-link-text">Lịch sử nộp</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Logged in Teacher & Admin Links */}
            {user && (user.role === 'admin' || user.role === 'teacher') && (
              <>
                <li>
                  <NavLink 
                    to="/admin" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <Shield size={18} />
                    <span className="sidebar-link-text">
                      {user.role === 'admin' ? 'Quản trị hệ thống' : 'Quản lý bài nộp'}
                    </span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/presentation-arranger" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <Calendar size={18} />
                    <span className="sidebar-link-text">Lịch thuyết trình</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/group-arranger" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <Users size={18} />
                    <span className="sidebar-link-text">Chia nhóm</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* Bottom User Profile Section */}
        {user ? (
          <div 
            className="sidebar-profile" 
            onClick={(e) => {
              e.stopPropagation();
              setShowProfileMenu(prev => !prev);
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="sidebar-profile-menu" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="sidebar-profile-menu-item" 
                  onClick={() => {
                    setShowProfileMenu(false);
                    onCloseMobile();
                    navigate('/settings');
                  }}
                >
                  <Settings size={16} />
                  <span>Thông tin cá nhân</span>
                </button>
                <button 
                  className="sidebar-profile-menu-item logout" 
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}

            {/* Avatar circle */}
            <div className="sidebar-avatar" title="Tài khoản">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="sidebar-avatar-img" />
              ) : (
                <span>{getInitials(user.displayName || user.username)}</span>
              )}
            </div>

            {/* Profile Details */}
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">
                {user.displayName || user.username}
              </span>
              <span className="sidebar-profile-role">
                {user.role === 'admin' ? 'Admin' : 'Giáo viên'}
              </span>
            </div>
          </div>
        ) : (
          <div className="sidebar-profile-guest">
            <button 
              onClick={() => { navigate('/login'); onCloseMobile(); }} 
              className="sidebar-login-btn"
              title="Đăng nhập"
            >
              <LogIn size={18} />
              <span className="sidebar-login-text">Đăng nhập</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

