
import changelogData from '../data/changelog.json';

export default function Changelog() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '2rem 1rem', flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-heading)',
            background: 'var(--title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Lịch sử Cập nhật
          </h2>
          <p className="subtitle">Theo dõi các phiên bản và tính năng mới nhất của hệ thống</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {changelogData.map((release, index) => (
            <div key={index} className="glass-card" style={{ padding: '2rem', borderLeft: index === 0 ? '4px solid var(--primary)' : '4px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>
                  Phiên bản {release.version}
                  {index === 0 && <span style={{ marginLeft: '10px', fontSize: '0.8rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Mới nhất</span>}
                </h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(release.date).toLocaleDateString('vi-VN')}</span>
              </div>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>{release.title}</h4>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {release.features.map((feature, fIndex) => (
                  <li key={fIndex}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
