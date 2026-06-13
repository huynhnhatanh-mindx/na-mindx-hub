import React from 'react';
import { UploadCloud, Clock, GraduationCap, Calendar, History, Cloud, Mail, Palette } from 'lucide-react';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  color: string;
}

export default function Features() {
  const featuresList: FeatureItem[] = [
    {
      icon: <UploadCloud size={28} />,
      title: 'Nộp Bài Tập & Tải Lên Đa Tệp',
      description: 'Hỗ trợ kéo thả (drag-and-drop) tải nhiều tệp cùng lúc. Cho phép nộp cả file báo cáo lẫn đường dẫn Canva/Google Slides trực tiếp trên giao diện dành cho giai đoạn thuyết trình.',
      badge: 'Core',
      color: 'var(--primary)'
    },
    {
      icon: <Clock size={28} />,
      title: 'Kiểm Soát Hạn Chót Theo Giai Đoạn',
      description: 'Đếm ngược thời gian thực trực quan (Xanh/Vàng/Đỏ) theo từng mốc Checkpoint 1, Checkpoint 2, Sản phẩm cuối và Thuyết trình. Tự động khóa cổng nộp bài khi quá hạn.',
      badge: 'Real-time',
      color: 'var(--error)'
    },
    {
      icon: <GraduationCap size={28} />,
      title: 'Quản Lý Lớp Học & Lịch Trình',
      description: 'Cấu hình linh hoạt thời gian bắt đầu lớp, giờ học và lịch nộp bài. Tự động tính toán các mốc hạn nộp bài thông minh theo lịch học nếu chưa được thiết lập thủ công.',
      color: 'var(--secondary)'
    },
    {
      icon: <Calendar size={28} />,
      title: 'Xếp Lịch Thuyết Trình Tự Động',
      description: 'Công cụ đắc lực hỗ trợ giáo viên và admin sắp xếp thứ tự học viên thuyết trình tự động hoặc bằng kéo thả thủ công, giúp quản lý buổi báo cáo cuối khóa chuyên nghiệp.',
      badge: 'New',
      color: '#38bdf8'
    },
    {
      icon: <History size={28} />,
      title: 'Tra Cứu Lịch Sử Bài Nộp',
      description: 'Học viên có thể nhập mã tra cứu cá nhân để xem lại toàn bộ lịch sử các lần nộp bài của mình, quản lý tiến trình học tập một cách chủ động.',
      color: 'var(--success)'
    },
    {
      icon: <Cloud size={28} />,
      title: 'Lưu Trữ Qua Google Drive Giáo Viên',
      description: 'Dữ liệu bài tập của học viên được lưu trực tiếp vào Google Drive cá nhân của Giáo viên phụ trách thông qua Google OAuth. Admin có toàn quyền xóa bài nộp dự phòng.',
      badge: 'OAuth 2.0',
      color: '#eab308'
    },
    {
      icon: <Mail size={28} />,
      title: 'Gửi Email & Đồng Bộ Thực Tế',
      description: 'Tự động gửi email thông báo cho giáo viên ngay khi học viên nộp bài thành công. Cập nhật đồng bộ tức thời danh sách thông qua luồng sự kiện Server-Sent Events (SSE).',
      color: '#ec4899'
    },
    {
      icon: <Palette size={28} />,
      title: 'Hỗ Trợ Giao Diện Sáng & Tối',
      description: 'Trải nghiệm giao diện hiện đại, mượt mà với 2 tông màu sáng/tối dễ dàng thay đổi trong phần Cài đặt cá nhân, bảo vệ mắt khi tương tác lâu.',
      color: '#10b981'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '3rem 1.5rem', flex: 1 }}>
        
        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: '800',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-heading)',
            background: 'var(--title-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Chức Năng Chính Hệ Thống
          </h2>
          <p className="subtitle" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Khám phá các tính năng hiện đại được tích hợp trong hệ thống quản lý và nộp bài tập NA MindX Hub
          </p>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1.75rem',
          marginBottom: '2rem'
        }}>
          {featuresList.map((feature, index) => (
            <div 
              key={index} 
              className="glass-card feature-card" 
              style={{ 
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'var(--transition-smooth)',
                height: '100%',
                border: '1px solid var(--card-border)'
              }}
            >
              {/* Card Header (Icon & Badge) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `rgba(255, 255, 255, 0.03)`,
                  border: `1px solid var(--card-border)`,
                  color: feature.color,
                  boxShadow: `0 8px 20px -6px ${feature.color}30`
                }}>
                  {feature.icon}
                </div>

                {feature.badge && (
                  <span style={{
                    fontSize: '0.725rem',
                    background: `rgba(255, 255, 255, 0.04)`,
                    color: 'var(--text-secondary)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid var(--card-border)'
                  }}>
                    {feature.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <h3 style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: 'var(--text-secondary)'
                }}>
                  {feature.description}
                </p>
              </div>

              {/* Background Glow Overlay */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: feature.color,
                opacity: 0.03,
                filter: 'blur(30px)',
                pointerEvents: 'none'
              }}></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
