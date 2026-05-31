import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface LeaderboardItem {
  fullName: string;
  className: string;
  submissionCount: number;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboardData(data);
        }
      } catch (err) {
        console.error('Lỗi tải bảng xếp hạng:', err);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-heading)',
          background: 'var(--title-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Bảng Xếp Hạng
        </h2>
        <p className="subtitle">Top học viên có số lần nộp bài nhiều nhất</p>
      </div>

      <main style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <Link to="/" style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'var(--transition-fast)'
            }}
              className="back-link"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Quay lại trang chủ
            </Link>
          </div>

          {leaderboardLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Đang tải dữ liệu bảng xếp hạng...
            </div>
          ) : leaderboardData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Chưa có dữ liệu bài nộp nào trên hệ thống.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leaderboardData.map((item, index) => {
                let badge = null;
                let bgStyle = 'rgba(255, 255, 255, 0.03)';
                let borderStyle = '1px solid rgba(255, 255, 255, 0.05)';
                let paddingStyle = '1.25rem';
                
                if (index === 0) {
                  badge = '🥇';
                  bgStyle = 'rgba(245, 158, 11, 0.1)';
                  borderStyle = '1px solid rgba(245, 158, 11, 0.3)';
                  paddingStyle = '1.5rem';
                } else if (index === 1) {
                  badge = '🥈';
                  bgStyle = 'rgba(156, 163, 175, 0.1)';
                  borderStyle = '1px solid rgba(156, 163, 175, 0.3)';
                } else if (index === 2) {
                  badge = '🥉';
                  bgStyle = 'rgba(180, 83, 9, 0.1)';
                  borderStyle = '1px solid rgba(180, 83, 9, 0.3)';
                } else {
                  badge = <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 'bold' }}>#{index + 1}</span>;
                }

                return (
                  <div key={`${item.fullName}-${item.className}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: paddingStyle,
                    background: bgStyle,
                    border: borderStyle,
                    borderRadius: '12px',
                    transition: 'transform 0.2s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ width: '40px', textAlign: 'center', fontSize: '1.5rem' }}>
                        {badge}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: index === 0 ? '1.25rem' : '1.1rem' }}>{item.fullName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', marginTop: '0.25rem' }}>Lớp: {item.className}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: index === 0 ? '1.75rem' : '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {item.submissionCount}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>bài nộp</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
