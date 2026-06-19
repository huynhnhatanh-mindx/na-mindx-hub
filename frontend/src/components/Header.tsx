import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Eye } from 'lucide-react';

interface HeaderProps {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export default function Header({ isCollapsed, onToggleSidebar, onToggleMobileSidebar }: HeaderProps) {
  const { pathname } = useLocation();
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    // Fetch and increment visitor count
    const recordVisit = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/visits`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.count === 'number') {
            setVisitCount(data.count);
          }
        }
      } catch (err) {
        console.error('Failed to record visit:', err);
      }
    };
    recordVisit();
  }, []);

  // Map pathnames to beautiful display breadcrumbs
  const getBreadcrumbTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Trang chủ';
      case '/features':
        return 'Chức năng hệ thống';
      case '/upload':
        return 'Nộp bài tập học viên';
      case '/submissions':
        return 'Lịch sử nộp bài';
      case '/contact-admin':
        return 'Liên hệ Quản trị viên';
      case '/login':
        return 'Đăng nhập hệ thống';
      case '/admin':
        return 'Bảng quản trị';
      case '/settings':
        return 'Cài đặt cá nhân';
      case '/presentation-arranger':
        return 'Xếp lịch thuyết trình';
      case '/group-arranger':
        return 'Chia nhóm học tập';
      default:
        if (path.startsWith('/reset-password')) return 'Khôi phục mật khẩu';
        if (path.startsWith('/forgot-password')) return 'Quên mật khẩu';
        return 'NA MindX Hub';
    }
  };

  return (
    <header className="header-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="header-topbar-left" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Toggle Button for Desktop Sidebar Collapse */}
        <button 
          onClick={onToggleSidebar} 
          className="btn-toggle-sidebar"
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
          id="btn-toggle-desktop"
        >
          <Menu size={20} />
        </button>

        {/* Toggle Button for Mobile Sidebar Drawer */}
        <button 
          onClick={onToggleMobileSidebar} 
          className="btn-toggle-sidebar"
          id="btn-toggle-mobile"
          title="Mở menu điều hướng"
        >
          <Menu size={20} />
        </button>

        {/* Dynamic Breadcrumb path title */}
        <span className="header-topbar-breadcrumb">
          NA MindX Hub &gt; <strong>{getBreadcrumbTitle(pathname)}</strong>
        </span>
      </div>

      {/* Visitor Counter placed in top right corner */}
      <div className="header-topbar-right" style={{ display: 'flex', alignItems: 'center', paddingRight: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '20px',
          background: 'rgba(239, 68, 68, 0.04)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.05), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Eye size={15} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 3px var(--primary-glow))' }} />
            <span 
              className="pulse-dot" 
              style={{ 
                backgroundColor: 'var(--success)', 
                animation: 'pulse-success 1.6s infinite', 
                width: '5px', 
                height: '5px', 
                position: 'absolute', 
                top: '-1px', 
                right: '-1px', 
                boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' 
              }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
              fontFamily: 'monospace'
            }}>
              {visitCount.toLocaleString('vi-VN')}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              lượt truy cập
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
