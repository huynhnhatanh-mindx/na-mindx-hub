import Header from './Header';
import Footer from './Footer';
import FeedbackButton from './FeedbackButton';
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <FeedbackButton />
    </div>
  );
}

export default Layout;
