import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface HeaderProps {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export default function Header({ isCollapsed, onToggleSidebar, onToggleMobileSidebar }: HeaderProps) {
  const { pathname } = useLocation();

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
    <header className="header-topbar">
      <div className="header-topbar-left">
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

      {/* Keep the topbar clean & minimal as requested */}
      <div className="header-topbar-right">
        {/* Can be extended in the future for quick settings/theme switches */}
      </div>
    </header>
  );
}
