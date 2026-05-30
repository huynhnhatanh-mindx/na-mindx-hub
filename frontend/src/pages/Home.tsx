import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

type BackendStatus = 'checking' | 'online' | 'offline';

function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  // Check Backend Connection status on mount
  useEffect(() => {
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
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              marginBottom: '1.5rem',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
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
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--secondary)',
              marginBottom: '1.5rem',
              border: '1px solid rgba(168, 85, 247, 0.2)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            
            <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Lịch Sử Bài Nộp</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Xem danh sách bài tập đã nộp của lớp học. Tra cứu lịch sử nộp theo học viên, lớp học và tải trực tiếp các tệp tin lưu trên MEGA.
            </p>
          </div>

          <Link to="/submissions" className="btn btn-outline" style={{ textDecoration: 'none', borderColor: 'var(--secondary)', color: 'var(--text-primary)', marginTop: 'auto' }}>
            Xem lịch sử →
          </Link>
        </section>

        {/* Coming Soon Resources Card */}
        <section className="glass-card" style={{ opacity: 0.7, borderStyle: 'dashed' }}>
          <div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            
            <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Kho Tài Liệu <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--secondary)', border: '1px solid var(--secondary)', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem' }}>Soon</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Nơi lưu trữ giáo trình, mã nguồn mẫu và tài liệu bổ trợ được chia sẻ trực tiếp từ Mentor Huỳnh Nhật Anh cho các thành viên lớp HCM4.
            </p>
          </div>

          <button className="btn btn-outline" disabled style={{ cursor: 'not-allowed', color: 'var(--text-muted)' }}>
            Đang phát triển...
          </button>
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
