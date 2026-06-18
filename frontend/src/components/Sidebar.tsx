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
  LogIn, 
  User 
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
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
    
    // Sync login state in real-time
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
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
            {/* Standard Guest & General Links (Hidden for admins to keep it tidy, shown for teachers/guests) */}
            {(!user || user.role !== 'admin') && (
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
            )}
            
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
                <li>
                  <NavLink 
                    to="/settings" 
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onCloseMobile}
                  >
                    <Settings size={18} />
                    <span className="sidebar-link-text">Cài đặt cá nhân</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* Bottom User Profile Section */}
        <div className="sidebar-profile">
          {user ? (
            <>
              {/* Avatar circle */}
              <div className="sidebar-avatar" onClick={() => { navigate('/settings'); onCloseMobile(); }} style={{ cursor: 'pointer' }} title="Cài đặt tài khoản">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="sidebar-avatar-img" />
                ) : (
                  <span>{getInitials(user.displayName || user.username)}</span>
                )}
              </div>

              {/* Profile Details */}
              <div className="sidebar-profile-info">
                <span 
                  className="sidebar-profile-name" 
                  onClick={() => { navigate('/settings'); onCloseMobile(); }}
                >
                  {user.displayName || user.username}
                </span>
                <span className="sidebar-profile-role">
                  {user.role === 'admin' ? 'Admin' : 'Giáo viên'}
                </span>
              </div>

              {/* Logout quick button */}
              <button 
                onClick={handleLogout} 
                className="btn-sidebar-action"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Guest Silhouette Avatar */}
              <div className="sidebar-avatar" onClick={() => { navigate('/login'); onCloseMobile(); }} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </div>

              {/* Guest Details */}
              <div className="sidebar-profile-info">
                <span 
                  className="sidebar-profile-name" 
                  onClick={() => { navigate('/login'); onCloseMobile(); }}
                >
                  Khách hàng
                </span>
                <span className="sidebar-profile-role">Chưa đăng nhập</span>
              </div>

              {/* Login quick button */}
              <button 
                onClick={() => { navigate('/login'); onCloseMobile(); }} 
                className="btn-sidebar-action"
                title="Đăng nhập"
              >
                <LogIn size={16} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
