import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/date';
import { ArrowLeft, Search, Link2 } from 'lucide-react';
import { useSSE } from '../hooks/useSSE';
import { preventOrphan } from '../utils/text';

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
  notes?: string;
  createdAt: string;
}

export default function Submissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotesContent, setSelectedNotesContent] = useState('');
  const [selectedNotesStudent, setSelectedNotesStudent] = useState('');

  const handleShowNotes = (notes: string, studentName: string) => {
    setSelectedNotesContent(notes);
    setSelectedNotesStudent(studentName);
    setShowNotesModal(true);
  };
  
  // Filter dropdown states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);

  // Register SSE for submissions
  useSSE({
    'submission-update': () => {
      console.log('[SSE] Submissions updated, reloading...');
      if (user) {
        fetchLoggedSubmissions();
      }
    },
    'force-logout': (data) => {
      console.log('[SSE] Force logout event received:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      alert(data?.reason || 'Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa.');
      navigate('/login');
    }
  });

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

  // Dynamically extract class and teacher list from fetched submissions
  useEffect(() => {
    const classes = Array.from(new Set(submissions.map((sub) => sub.className).filter(Boolean)));
    setClassOptions(classes);
    const teachers = Array.from(new Set(submissions.map((sub) => sub.teacher).filter(Boolean)));
    setTeacherOptions(teachers);
  }, [submissions]);

  // Filter submissions when search term, class, teacher, or stage changes
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

    // Teacher filter
    if (selectedTeacher) {
      filtered = filtered.filter(
        (sub) => sub.teacher === selectedTeacher
      );
    }

    // Stage filter
    if (selectedStage) {
      filtered = filtered.filter(
        (sub) => sub.stage.toLowerCase() === selectedStage.toLowerCase()
      );
    }

    setFilteredSubmissions(filtered);
  }, [searchTerm, selectedClass, selectedTeacher, selectedStage, submissions]);

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
              <ArrowLeft size={18} strokeWidth={2.5} />
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
                  <Search 
                    size={16}
                    color="var(--text-secondary)"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
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

                {/* Teacher Filter Dropdown */}
                <div style={{ flex: '1 1 150px', maxWidth: '200px' }}>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="form-select-field"
                  >
                    <option value="">Tất cả giáo viên</option>
                    {teacherOptions.map((teacher) => (
                      <option key={teacher} value={teacher}>{teacher}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Search/Query Panel */}
          {user ? (
            <div style={{
              background: 'var(--primary-glow)',
              border: '1px solid var(--primary-glow)',
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
                <Search size={16} strokeWidth={2.5} />
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
                      <th style={{ padding: '1rem' }}>Ghi chú</th>
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
                         <td data-label="Học Viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{preventOrphan(sub.fullName)}</td>
                        <td data-label="Lớp" style={{ padding: '1rem' }}>
                          <span style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {preventOrphan(sub.className)}
                          </span>
                        </td>
                        <td data-label="Giáo Viên" style={{ padding: '1rem' }}>{preventOrphan(sub.teacher)}</td>
                        <td data-label="Bài Học" style={{ padding: '1rem' }}>{preventOrphan(`${sub.stage} (${sub.session})`)}</td>
                        <td data-label="Tên Tệp Tin/Liên kết" style={{ padding: '1rem' }}>
                          {sub.fileUrl ? (
                            (() => {
                              const isCanva = sub.fileUrl.includes('canva.com') || sub.fileUrl.includes('canva.link');
                              const isDrive = sub.fileUrl.includes('drive.google.com') || sub.fileUrl.includes('docs.google.com');
                              const isMega = sub.fileUrl.includes('mega.nz') || sub.fileUrl.includes('mega.co.nz');
                              
                              let badgeColor = 'var(--primary)';
                              let badgeBg = 'var(--primary-glow)';
                              let badgeBorder = '1px solid var(--primary-glow)';
                              let dotColor = 'var(--primary)';
                              let labelText = 'Xem liên kết';
                              let isDot = false;

                              if (isCanva) {
                                badgeColor = '#38bdf8';
                                badgeBg = 'rgba(56, 189, 248, 0.08)';
                                badgeBorder = '1px solid rgba(56, 189, 248, 0.2)';
                                dotColor = '#00c4cc';
                                labelText = 'Canva Link';
                                isDot = true;
                              } else if (isDrive) {
                                badgeColor = '#34d399';
                                badgeBg = 'rgba(16, 185, 129, 0.08)';
                                badgeBorder = '1px solid rgba(16, 185, 129, 0.2)';
                                dotColor = '#10b981';
                                labelText = sub.fileUrl.includes('presentation') ? 'Google Slides' : 'Google Drive';
                                isDot = true;
                              } else if (isMega) {
                                badgeColor = '#f87171';
                                badgeBg = 'rgba(239, 68, 68, 0.08)';
                                badgeBorder = '1px solid rgba(239, 68, 68, 0.2)';
                                dotColor = '#ef4444';
                                labelText = 'MEGA Link';
                                isDot = true;
                              }

                              return (
                                <a 
                                  href={sub.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title={sub.fileName}
                                  style={{
                                    color: badgeColor,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontWeight: '600',
                                    padding: '6px 12px',
                                    background: badgeBg,
                                    border: badgeBorder,
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    transition: 'all 0.2s',
                                    maxWidth: '180px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  className="submission-link-badge"
                                >
                                  {isDot ? (
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }}></span>
                                  ) : (
                                    <Link2 size={13} style={{ verticalAlign: 'middle', flexShrink: 0 }} />
                                  )}
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelText}</span>
                                </a>
                              );
                            })()
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Không có tệp</span>
                          )}
                        </td>
                        <td data-label="Ghi chú" style={{ padding: '1rem' }}>
                          {sub.notes ? (
                            <button
                              type="button"
                              className="btn btn-neutral"
                              style={{
                                padding: '4px 10px',
                                height: 'auto',
                                fontSize: '0.8rem',
                                border: '1px solid var(--card-border)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => handleShowNotes(sub.notes || '', sub.fullName)}
                            >
                              Xem chi tiết
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Không có ghi chú</span>
                          )}
                        </td>
                        <td data-label="Ngày Nộp" style={{ padding: '1rem' }}>{preventOrphan(formatDate(sub.createdAt))}</td>
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
              <Search size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
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

      {/* Modal Xem Chi Tiết Ghi Chú */}
      {showNotesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            padding: '2rem', 
            animation: 'scaleUp 0.3s ease-out', 
            maxHeight: '90vh', 
            overflowY: 'auto' 
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>
              Chi Tiết Ghi Chú
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Học viên: <strong style={{ color: 'var(--primary)' }}>{selectedNotesStudent}</strong>
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '1rem',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              marginBottom: '1.5rem',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {selectedNotesContent}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-neutral" 
                style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}
                onClick={() => setShowNotesModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
