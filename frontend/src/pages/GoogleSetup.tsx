import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cloud, FolderSync, Mail, Key, CheckCircle2, AlertTriangle, Loader2, ArrowRight, LogOut } from 'lucide-react';

export default function GoogleSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLinking, setIsLinking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [mockEmailInput, setMockEmailInput] = useState('');
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Trạng thái từ callback redirect
  const statusParam = searchParams.get('status');
  const emailParam = searchParams.get('email');
  const messageParam = searchParams.get('message');

  useEffect(() => {
    // Tự động phát hiện xem có đang chạy ở localhost hoặc môi trường phát triển không
    if (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      import.meta.env.DEV
    ) {
      setIsLocalMode(true);
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (statusParam === 'success') {
      setStatus('success');
      if (emailParam) setGoogleEmail(emailParam);
      
      // Cập nhật thông tin trong localStorage để xóa cờrequiresGoogleAuth
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          user.requiresGoogleAuth = false;
          user.email = emailParam || user.email;
          localStorage.setItem('user', JSON.stringify(user));
          // Gửi event storage để Header cập nhật tên/email ngay lập tức
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.error(e);
        }
      }
      
      // Chuyển hướng về trang admin dashboard sau 3 giây
      const timer = setTimeout(() => {
        navigate('/admin');
      }, 3500);
      return () => clearTimeout(timer);
    } else if (statusParam === 'error') {
      setStatus('error');
      if (messageParam) setErrorMessage(messageParam);
    }
  }, [statusParam, emailParam, messageParam, navigate]);

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    setErrorMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE_URL}/api/auth/google/url?token=${encodeURIComponent(token || '')}`);
      
      if (!res.ok) {
        throw new Error('Không lấy được link đăng nhập từ server.');
      }
      
      const data = await res.json();
      if (data.url) {
        // Redirect người dùng đến trang xác thực Google OAuth
        window.location.href = data.url;
      } else {
        throw new Error('Địa chỉ link Google OAuth không hợp lệ.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Có lỗi xảy ra khi liên kết tài khoản Google.');
      setIsLinking(false);
    }
  };

  const handleMockLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockEmailInput.trim()) return;
    setIsLinking(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE_URL}/api/auth/google/mock-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          email: mockEmailInput.trim()
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi giả lập liên kết.');
      }

      const data = await res.json();
      if (data.status === 'success') {
        setStatus('success');
        setGoogleEmail(data.email);

        // Cập nhật thông tin trong localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.requiresGoogleAuth = false;
          user.email = data.email;
          localStorage.setItem('user', JSON.stringify(user));
          window.dispatchEvent(new Event('storage'));
        }

        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Có lỗi xảy ra khi giả lập liên kết.');
      setIsLinking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

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
          {currentUser?.role === 'admin' ? 'Liên Kết Tài Khoản Google Admin' : 'Kích Hoạt Tài Khoản Giáo Viên'}
        </h2>
        <p className="subtitle">
          {currentUser?.role === 'admin' ? 'Cấu hình liên kết tài khoản Google để khôi phục mật khẩu và nhận cảnh báo' : 'Thiết lập kết nối an toàn để lưu trữ bài tập và thông báo'}
        </p>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', width: '100%', marginBottom: '4rem' }}>
        <div className="glass-card" style={{ padding: '3rem 2.5rem', textAlign: 'center' }}>
          
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '0.5rem',
                boxShadow: '0 0 25px rgba(99, 102, 241, 0.15)'
              }}>
                <Cloud size={40} className="pulse" />
              </div>
              
              <div style={{ textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.50rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center', marginBottom: '0.5rem' }}>
                  {currentUser?.role === 'admin' ? 'Chào mừng Admin đến với NA MindX Hub!' : 'Chào mừng thầy/cô đến với NA MindX Hub!'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'center', marginBottom: '1.5rem' }}>
                  {currentUser?.role === 'admin'
                    ? 'Để hoàn tất liên kết tài khoản Google cá nhân của bạn, giúp khôi phục mật khẩu và nhận các thông báo hệ thống, vui lòng thực hiện liên kết Google OAuth dưới đây.'
                    : 'Tài khoản của thầy/cô đã được tạo thành công bởi Quản trị viên. Để hoàn tất kích hoạt tài khoản và truy cập hệ thống, thầy/cô cần thực hiện liên kết Google OAuth.'}
                </p>
                
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--primary)', marginTop: '2px' }}><FolderSync size={20} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {currentUser?.role === 'admin' ? 'Đồng bộ hóa & quản lý Drive' : 'Lưu bài nộp trực tiếp lên Drive cá nhân'}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {currentUser?.role === 'admin'
                          ? 'Đồng bộ hóa quyền quản trị và xem các thư mục Drive bài tập/dự án của toàn bộ học viên trên hệ thống.'
                          : 'Toàn bộ file bài tập/dự án học viên nộp vào lớp của thầy/cô sẽ được lưu trực tiếp vào tài khoản Google Drive cá nhân của thầy/cô dưới dạng các thư mục lớp có tổ chức.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--success)', marginTop: '2px' }}><Mail size={20} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {currentUser?.role === 'admin' ? 'Lưu hòm thư nhận cảnh báo bảo mật' : 'Lưu hòm thư email để nhận thông báo nộp bài'}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {currentUser?.role === 'admin'
                          ? 'Email Google của bạn sẽ được lưu làm hòm thư nhận thông báo quản trị viên chính thức của hệ thống.'
                          : 'Email Google của thầy/cô sẽ được lưu làm email chính thức của tài khoản, giúp thầy/cô nhận thông báo tức thời khi học viên nộp bài.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--secondary)', marginTop: '2px' }}><Key size={20} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Khôi phục mật khẩu khi quên</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        Hệ thống sẽ gửi mã hoặc link khôi phục mật khẩu vào hòm thư email này khi {currentUser?.role === 'admin' ? 'bạn' : 'thầy/cô'} dùng chức năng "Quên mật khẩu".
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  onClick={handleLinkGoogle}
                  disabled={isLinking}
                  className="btn btn-primary"
                  style={{
                    height: '3.2rem',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    width: '100%'
                  }}
                >
                  {isLinking ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>Đang chuyển hướng sang Google...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Liên kết tài khoản Google</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleLogout}
                  className="btn btn-neutral"
                  style={{
                    height: '3rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <LogOut size={16} />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>

              {isLocalMode && (
                <div style={{
                  marginTop: '2rem',
                  paddingTop: '2.0rem',
                  borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                  width: '100%',
                  textAlign: 'left'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                    🔧 Chế độ Thử nghiệm (Local Development)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1rem' }}>
                    Vì Google OAuth yêu cầu cấu hình Test Users và đôi khi bị chặn trên local do ứng dụng chưa verify. Bạn có thể giả lập liên kết tài khoản bằng email bất kỳ dưới đây để tiếp tục kiểm thử.
                  </p>
                  <form onSubmit={handleMockLink} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <input
                      type="email"
                      placeholder="Nhập email giáo viên..."
                      value={mockEmailInput}
                      onChange={(e) => setMockEmailInput(e.target.value)}
                      className="form-input-field"
                      style={{ flex: 1, height: '2.5rem', fontSize: '0.85rem' }}
                      required
                      disabled={isLinking}
                    />
                    <button
                      type="submit"
                      className="btn"
                      style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: 'var(--secondary)',
                        border: '1px solid var(--secondary)',
                        fontSize: '0.85rem',
                        height: '2.5rem',
                        padding: '0 1rem',
                        whiteSpace: 'nowrap'
                      }}
                      disabled={isLinking}
                    >
                      Giả lập
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                marginBottom: '0.5rem',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.15)'
              }}>
                <CheckCircle2 size={40} />
              </div>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                Liên kết tài khoản thành công!
              </h3>
              
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {currentUser?.role === 'admin'
                  ? 'Tài khoản của bạn đã được liên kết thành công với email Google:'
                  : 'Tài khoản của thầy/cô đã được kích hoạt thành công với email liên kết Google Drive:'}
                <br />
                <strong style={{ color: 'var(--text-primary)', display: 'inline-block', marginTop: '0.5rem', fontSize: '1.05rem' }}>{googleEmail}</strong>
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '0.825rem',
                color: 'var(--text-muted)',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Loader2 size={14} className="spin" />
                <span>
                  {currentUser?.role === 'admin'
                    ? 'Đang tự động chuyển hướng về Dashboard...'
                    : 'Đang tự động chuyển hướng thầy/cô về Dashboard...'}
                </span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--error)',
                marginBottom: '0.5rem',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.15)'
              }}>
                <AlertTriangle size={40} />
              </div>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--error)' }}>
                Liên kết thất bại!
              </h3>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Hệ thống gặp lỗi trong quá trình xác thực và lưu trữ tokens Google OAuth:<br />
                <span style={{ color: '#ff8a8a', display: 'inline-block', marginTop: '0.5rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.08)', padding: '6px 12px', borderRadius: '6px' }}>{errorMessage || 'Lỗi không xác định.'}</span>
              </p>
              
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  onClick={handleLinkGoogle}
                  className="btn btn-primary"
                  style={{
                    height: '3.2rem',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                >
                  Thử liên kết lại
                </button>
                
                <button
                  onClick={() => {
                    setStatus('idle');
                    setIsLinking(false);
                    setErrorMessage('');
                  }}
                  className="btn btn-neutral"
                  style={{
                    height: '3rem',
                    fontSize: '0.95rem'
                  }}
                >
                  Quay lại
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
