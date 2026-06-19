import { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';

function Layout() {
  const { pathname } = useLocation();
  // Collapse state stored in local storage for user convenience
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === null ? true : stored === 'true';
  });
  
  // Mobile drawer menu state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(prev => !prev);
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'mobile-sidebar-open' : ''}`}>
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        isMobileOpen={isMobileOpen} 
        onCloseMobile={() => setIsMobileOpen(false)} 
      />
      <div className="app-main-area">
        <Header 
          isCollapsed={isSidebarCollapsed} 
          onToggleSidebar={toggleSidebar} 
          onToggleMobileSidebar={toggleMobileSidebar} 
        />
        <main className="main-content page-transition-container" key={pathname}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
