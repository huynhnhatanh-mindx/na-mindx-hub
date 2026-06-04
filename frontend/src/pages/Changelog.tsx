import { useState } from 'react';
import changelogData from '../data/changelog.json';

export default function Changelog() {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true });

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {changelogData.map((release, index) => {
            const isExpanded = !!expandedIndices[index];
            return (
              <div 
                key={index} 
                className="glass-card" 
                style={{ 
                  padding: '1.5rem 2rem', 
                  borderLeft: index === 0 ? '4px solid var(--primary)' : '4px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpand(index)}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  userSelect: 'none'
                }}>
                  <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      fontSize: '1rem', 
                      color: 'var(--text-muted)', 
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      display: 'inline-block'
                    }}>
                      ▶
                    </span>
                    Phiên bản {release.version}
                    {index === 0 && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        background: 'var(--primary)', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        Mới nhất
                      </span>
                    )}
                  </h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {new Date(release.date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                
                {isExpanded && (
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>
                      {release.title}
                    </h4>
                    <ul style={{ 
                      listStyleType: 'disc', 
                      paddingLeft: '1.5rem', 
                      color: 'var(--text-primary)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem',
                      lineHeight: '1.5'
                    }}>
                      {release.features.map((feature, fIndex) => (
                        <li key={fIndex}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
