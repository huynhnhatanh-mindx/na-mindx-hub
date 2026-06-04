import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/date';

interface Submission {
  _id: string;
  teacher: string;
  className: string;
  fullName: string;
  stage: string;
  session: string;
  attemptNumber: number;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  
  // Filter dropdown states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [classOptions, setClassOptions] = useState<string[]>([]);

  const fetchLoggedSubmissions = async () => {
    setError('');
    setIsLoading(true);
    setHasQueried(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('storage'));
          window.location.href = '/login';
          return;
        }
        let errMsg = 'Không thể tải lịch sử nộp bài.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const resData = await response.json();
      setSubmissions(resData.data || []);
      setFilteredSubmissions(resData.data || []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
      setSubmissions([]);
      setFilteredSubmissions([]);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        // Auto fetch
        setError('');
        setIsLoading(true);
        setHasQueried(true);
        const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        fetch(`${API_BASE_URL}/api/submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => {
            if (!res.ok) {
              if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('storage'));
                window.location.href = '/login';
                throw new Error('Phiên đăng nhập hết hạn.');
              }
              throw new Error('Không thể tải lịch sử nộp bài.');
            }
            return res.json();
          })
          .then(resData => {
            setSubmissions(resData.data || []);
            setFilteredSubmissions(resData.data || []);
          })
          .catch(err => {
            setError(err.message);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  // Form query states
  const [studentCode, setStudentCode] = useState('');
  const [hasQueried, setHasQueried] = useState(false);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setHasQueried(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (!studentCode.trim()) {
        setError('Vui lòng nhập Mã tra cứu học viên.');
        setIsLoading(false);
        return;
      }
      const url = `${API_BASE_URL}/api/submissions?studentCode=${encodeURIComponent(studentCode.trim())}`;

      const response = await fetch(url);
      if (!response.ok) {
        let errMsg = 'Không thể tra cứu lịch sử nộp bài.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const resData = await response.json();
      setSubmissions(resData.data || []);
      setFilteredSubmissions(resData.data || []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
      setSubmissions([]);
      setFilteredSubmissions([]);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically extract class list from fetched submissions
  useEffect(() => {
    const classes = Array.from(new Set(submissions.map((sub) => sub.className).filter(Boolean)));
    setClassOptions(classes);
  }, [submissions]);

  // Filter submissions when search term, class, or stage changes
  useEffect(() => {
    let filtered = submissions;

    // Search term filter
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(
        (sub) =>
          sub.fullName.toLowerCase().includes(term) ||
          sub.className.toLowerCase().includes(term) ||
          sub.teacher.toLowerCase().includes(term) ||
          sub.fileName.toLowerCase().includes(term)
      );
    }

    // Class filter
    if (selectedClass) {
      filtered = filtered.filter(
        (sub) => sub.className === selectedClass
      );
    }

    // Stage filter
    if (selectedStage) {
      filtered = filtered.filter(
        (sub) => sub.stage.toLowerCase() === selectedStage.toLowerCase()
      );
    }

    setFilteredSubmissions(filtered);
  }, [searchTerm, selectedClass, selectedStage, submissions]);

  const formatDate = (dateStr: string) => formatDateTime(dateStr);

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
          WebkitTextFillColor: 'transparent'
        }}>
          Lịch Sử Nộp Bài Tập
        </h2>
        <p className="subtitle">Danh sách bài nộp và tài liệu học tập của học viên lớp NA MindX</p>
      </div>

      <main style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          
          {/* Top Bar with Back Link & Search */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
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

            {/* Search & Filter Controls Row - visible when results are loaded */}
            {hasQueried && submissions.length > 0 && (
              <div 
                className="submissions-filters"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  width: '100%',
                  justifyContent: 'flex-start',
                  marginTop: '1rem'
                }}
              >
                {/* Search Text input */}
                <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: '350px' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm học viên, tên tệp..."
                    className="form-input-field"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="var(--text-secondary)" 
                    strokeWidth="2"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                {/* Class Filter Dropdown */}
                <div style={{ flex: '1 1 150px', maxWidth: '200px' }}>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="form-select-field"
                  >
                    <option value="">Tất cả lớp học</option>
                    {classOptions.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                {/* Stage Filter Dropdown */}
                <div style={{ flex: '1 1 180px', maxWidth: '220px' }}>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="form-select-field"
                  >
                    <option value="">Tất cả giai đoạn</option>
                    <option value="checkpoint 1">Checkpoint 1</option>
                    <option value="checkpoint 2">Checkpoint 2</option>
                    <option value="sản phẩm cuối khóa">Sản phẩm cuối khóa</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Search/Query Panel */}
          {user ? (
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Lịch sử nộp bài toàn hệ thống
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Bạn đang đăng nhập với tư cách <strong>{user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}</strong> ({user.displayName || user.username}).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Tìm thấy {filteredSubmissions.length} bản ghi
                </span>
                <button 
                  onClick={fetchLoggedSubmissions}
                  className="btn btn-neutral"
                  style={{
                    padding: '0.4rem 1rem',
                    height: '2.2rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                  disabled={isLoading}
                >
                  Tải lại
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleQuery} style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '400px' }}>
                <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: '500', fontSize: '0.95rem' }}>
                  Mã tra cứu học viên (Student Lookup Code)
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="Nhập mã học viên của bạn (ví dụ: HV001)..."
                    className="form-input-field"
                    style={{ marginTop: '0.25rem' }}
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  maxWidth: '200px',
                  height: '2.5rem',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Tra cứu
              </button>
            </form>
          )}

          {/* Loader */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              <div className="pulse-dot" style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--primary)', marginRight: '8px' }}></div>
              Đang tra cứu lịch sử nộp bài...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '1.25rem',
              borderRadius: '10px',
              color: '#fce8e6',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <p>{error}</p>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !error && hasQueried && (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              {filteredSubmissions.length > 0 ? (
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem' }}>Học Viên</th>
                      <th style={{ padding: '1rem' }}>Lớp</th>
                      <th style={{ padding: '1rem' }}>Giáo Viên</th>
                      <th style={{ padding: '1rem' }}>Bài Học</th>
                      <th style={{ padding: '1rem' }}>Tên Tệp Tin</th>
                      <th style={{ padding: '1rem' }}>Ngày Nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr 
                        key={sub._id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)', 
                          fontSize: '0.875rem', 
                          color: 'var(--text-secondary)',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td data-label="Học Viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{sub.fullName}</td>
                        <td data-label="Lớp" style={{ padding: '1rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {sub.className}
                          </span>
                        </td>
                        <td data-label="Giáo Viên" style={{ padding: '1rem' }}>{sub.teacher}</td>
                        <td data-label="Bài Học" style={{ padding: '1rem' }}>{sub.stage} ({sub.session})</td>
                        <td data-label="Tên Tệp Tin" style={{ padding: '1rem' }}>
                          <a 
                            href={sub.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              color: 'var(--secondary)', 
                              textDecoration: 'none', 
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sub.fileName}
                            </span>
                          </a>
                        </td>
                        <td data-label="Ngày Nộp" style={{ padding: '1rem' }}>{formatDate(sub.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Không tìm thấy bài nộp nào phù hợp.
                </div>
              )}
            </div>
          )}

          {/* Initial state placeholder */}
          {!hasQueried && !isLoading && !error && (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--text-muted)',
              border: '1px dashed rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.1)',
              marginTop: '1rem'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.3 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Tra Cứu Lịch Sử Nộp Bài
              </h3>
              <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto', color: 'var(--text-muted)' }}>
                Vui lòng nhập Mã tra cứu học viên hoặc Mã quản trị ở form bên trên để tra cứu danh sách lịch sử bài nộp của bạn.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
