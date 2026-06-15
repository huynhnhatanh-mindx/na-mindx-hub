import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, FileText } from 'lucide-react';

type BackendStatus = 'checking' | 'online' | 'offline';

function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  // Check Backend Connection status and User role on mount
  useEffect(() => {
    // Redirect admin away from home page
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          window.location.href = '/admin';
          return;
        }
      } catch (e) { }
    }

    const checkConnection = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
        console.error('Error connecting to backend:', error);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Hero Welcome Section */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem', marginTop: '1rem' }}>
        <h2 style={{
          fontSize: '3rem',
          fontWeight: '800',
          marginBottom: '0.75rem',
          fontFamily: 'var(--font-heading)',
          background: 'var(--title-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          NA-MINDX-HUB
        </h2>
        <p className="subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Nền tảng nộp bài tập, chia sẻ tài nguyên và kết nối học tập cho lớp học MindX - HCM4.
        </p>
      </div>

      {/* Main Feature Grid */}
      <main className="grid" style={{ marginBottom: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

        {/* Active Upload Card */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%' }}>
          <div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              marginBottom: '1.5rem',
              border: '1px solid var(--primary-glow)'
            }}>
              <UploadCloud size={24} />
            </div>

            <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Nộp Bài Tập</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Tải bài tập và các file tài liệu lên máy chủ của lớp học. Hệ thống hỗ trợ kéo thả tệp tin nhanh chóng và quản lý danh sách file trực quan.
            </p>
          </div>

          <Link to="/upload" className="btn btn-primary" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', marginTop: 'auto' }}>
            Nộp bài ngay →
          </Link>
        </section>

        {/* Submissions History Card */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%' }}>
          <div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--secondary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              marginBottom: '1.5rem',
              border: '1px solid var(--secondary-glow)'
            }}>
              <FileText size={24} />
            </div>

            <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Lịch Sử Bài Nộp</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Xem danh sách bài tập đã nộp của lớp học. Tra cứu lịch sử nộp theo học viên, lớp học và tải trực tiếp các tệp tin lưu trên Google Drive.
            </p>
          </div>

          <Link to="/submissions" className="btn btn-outline" style={{ textDecoration: 'none', borderColor: 'var(--secondary)', color: 'var(--text-primary)', marginTop: 'auto' }}>
            Xem lịch sử →
          </Link>
        </section>


      </main>

      {/* Backend Status Indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Trạng thái kết nối máy chủ:</span>
        {backendStatus === 'online' ? (
          <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
            Online
          </span>
        ) : backendStatus === 'checking' ? (
          <span style={{ color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            Đang kiểm tra...
          </span>
        ) : (
          <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--error)', borderRadius: '50%', display: 'inline-block' }}></span>
            Offline
          </span>
        )}
      </div>
    </>
  );
}

export default Home;
