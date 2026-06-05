import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Submissions from './pages/Submissions';
import ContactAdmin from './pages/ContactAdmin';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import Changelog from './pages/Changelog';
import PresentationArranger from './pages/PresentationArranger';
import GoogleSetup from './pages/GoogleSetup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import './App.css';
import { ToastProvider } from './components/Toast';

// Route Guard component to prevent unauthorized direct URL navigation
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    
    // Nếu giáo viên chưa liên kết Google OAuth, bắt buộc chuyển hướng đến google-setup
    if (user.role === 'teacher' && (user.requiresGoogleAuth || !user.email)) {
      return <Navigate to="/google-setup" replace />;
    }

    return <Outlet />;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
};

// Route Guard dành riêng cho trang liên kết Google
const GoogleSetupRoute = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
    return <Outlet />;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="contact-admin" element={<ContactAdmin />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="changelog" element={<Changelog />} />
          
          {/* Route thiết lập liên kết tài khoản Google cho Giáo viên */}
          <Route element={<GoogleSetupRoute />}>
            <Route path="google-setup" element={<GoogleSetup />} />
          </Route>
  
          {/* Protected Admin & Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="presentation-arranger" element={<PresentationArranger />} />
          </Route>
          
          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default App;
