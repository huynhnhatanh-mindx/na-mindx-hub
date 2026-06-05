import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '4rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--error)',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.15)',
            position: 'relative'
          }}>
            <Compass size={50} style={{ animation: 'spin 12s linear infinite' }} />
          </div>
        </div>

        <h1 style={{
          fontSize: '6rem',
          fontWeight: '900',
          margin: 0,
          fontFamily: 'var(--font-heading)',
          background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: '1'
        }}>
          404
        </h1>
        
        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          marginTop: '1rem',
          marginBottom: '0.5rem',
          color: 'var(--text-primary)'
        }}>
          Không Tìm Thấy Trang
        </h2>
        <p className="subtitle" style={{ maxWidth: '500px', margin: '0 auto 2rem auto', fontSize: '1rem' }}>
          Đường dẫn bạn đang cố gắng truy cập không tồn tại hoặc đã bị di chuyển sang vị trí khác.
        </p>

        <main style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Vui lòng kiểm tra lại URL hoặc nhấp nút dưới đây để quay trở lại bảng điều khiển chính.
            </p>
            
            <Link 
              to="/" 
              className="btn btn-primary" 
              style={{ 
                textDecoration: 'none', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                margin: '0 auto'
              }}
            >
              <Home size={18} />
              Quay lại Trang Chủ
            </Link>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
