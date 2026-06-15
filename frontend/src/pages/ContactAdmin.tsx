import { Link } from 'react-router-dom';
import { Phone, Mail, Smartphone, Home } from 'lucide-react';

export default function ContactAdmin() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-heading)',
          background: 'var(--title-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Liên Hệ Quản Trị Viên
        </h2>
        <p className="subtitle">Hỗ trợ kỹ thuật và giải đáp thắc mắc</p>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              boxShadow: '0 0 20px var(--primary-glow)'
            }}>
              <Phone size={40} />
            </div>
          </div>

          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Bạn cần hỗ trợ?
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Nếu bạn gặp sự cố khi nộp bài, quên mật khẩu đăng nhập hệ thống hoặc có bất kỳ thắc mắc nào về khóa học, vui lòng liên hệ với Quản trị viên qua các kênh dưới đây:
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--card-border)',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Mail size={24} color="var(--success)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Hỗ Trợ</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>huynhnhatanh@mindx.net.vn</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--card-border)',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Smartphone size={24} color="var(--primary)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hotline / Zalo</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>0778 909 082</div>
              </div>
            </div>
          </div>

          <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Home size={18} strokeWidth={2.5} />
            Về Trang Chủ
          </Link>

        </div>
      </main>
    </>
  );
}
