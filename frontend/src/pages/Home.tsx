import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, FileText, Shield, Calendar, Users } from 'lucide-react';

type BackendStatus = 'checking' | 'online' | 'offline';

function Home() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
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

  // Check Backend Connection status and User role on mount
  useEffect(() => {
    checkUser();
    
    // Sync login/logout state in real-time
    window.addEventListener('storage', checkUser);

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

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkUser);
    };
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
        {user && (user.role === 'admin' || user.role === 'teacher') ? (
          <>
            {/* Admin/Teacher Dashboard Card */}
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
                  <Shield size={24} />
                </div>

                <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
                  {user.role === 'admin' ? 'Quản Trị Hệ Thống' : 'Quản Lý Bài Nộp'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Xem danh sách bài tập đã nộp, phê duyệt trạng thái, xóa bài tập và quản lý cấu hình hệ thống lớp học.
                </p>
              </div>

              <Link to="/admin" className="btn btn-primary" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', marginTop: 'auto' }}>
                Quản lý ngay →
              </Link>
            </section>

            {/* Presentation Arranger Card */}
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
                  <Calendar size={24} />
                </div>

                <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Xếp Lịch Thuyết Trình</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Hệ thống sắp xếp lịch báo cáo bài tập lớn hoặc thuyết trình đề tài ngẫu nhiên, công bằng và trực quan.
                </p>
              </div>

              <Link to="/presentation-arranger" className="btn btn-primary" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', marginTop: 'auto' }}>
                Xếp lịch ngay →
              </Link>
            </section>

            {/* Group Arranger Card */}
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
                  <Users size={24} />
                </div>

                <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Chia Nhóm Học Tập</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Chia nhóm học viên tự nguyện hoặc ngẫu nhiên với giới hạn thành viên mỗi nhóm linh hoạt.
                </p>
              </div>

              <Link to="/group-arranger" className="btn btn-primary" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', marginTop: 'auto' }}>
                Chia nhóm ngay →
              </Link>
            </section>

            {/* Upload Student Homework Card */}
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
                  <UploadCloud size={24} />
                </div>

                <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Nộp Bài Tập</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Khu vực nộp bài tập học viên trực tiếp lên Google Drive lưu trữ của lớp học.
                </p>
              </div>

              <Link to="/upload" className="btn btn-outline" style={{ textDecoration: 'none', borderColor: 'var(--secondary)', color: 'var(--text-primary)', marginTop: 'auto' }}>
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
                  background: 'var(--primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--primary-glow)'
                }}>
                  <FileText size={24} />
                </div>

                <h3 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Lịch Sử Bài Nộp</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Tra cứu và xem lại danh sách bài tập của lớp học đã được tải lên lưu trữ.
                </p>
              </div>

              <Link to="/submissions" className="btn btn-outline" style={{ textDecoration: 'none', borderColor: 'var(--secondary)', color: 'var(--text-primary)', marginTop: 'auto' }}>
                Xem lịch sử →
              </Link>
            </section>
          </>
        ) : (
          <>
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
          </>
        )}
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
