import { NavLink } from 'react-router-dom';

function Header() {
  const handleLoginClick = () => {
    alert('Chức năng Đăng nhập đang được phát triển. Tài khoản sẽ do Ban quản trị (Admin) cung cấp trực tiếp sau này.');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo Placeholder */}
        <div className="logo-placeholder">
          <span>NA-MINDX-HUB</span>
        </div>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          <li>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              Trang chủ
            </NavLink>
          </li>
          <li>
            <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Nộp bài
            </NavLink>
          </li>
        </ul>

        {/* Login Button */}
        <div>
          <button className="btn btn-login" onClick={handleLoginClick}>
            Đăng nhập
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
