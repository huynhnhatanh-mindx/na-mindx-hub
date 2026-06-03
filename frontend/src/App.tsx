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
import './App.css';

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
    return <Outlet />;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="upload" element={<Upload />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="contact-admin" element={<ContactAdmin />} />
        <Route path="login" element={<Login />} />
        <Route path="changelog" element={<Changelog />} />
        
        {/* Protected Admin & Teacher Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="presentation-arranger" element={<PresentationArranger />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
