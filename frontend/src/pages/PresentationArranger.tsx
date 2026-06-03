import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ClassData {
  _id: string;
  name: string;
  teacherName: string;
}

interface StudentData {
  _id: string;
  name: string;
  className: string;
}

interface Slot {
  index: number;
  volunteers: string[];
  lockedUser: string | null;
}

export default function PresentationArranger() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentsList, setStudentsList] = useState<string[]>([]); // list of all student names in selected class
  
  // Game state
  const [slots, setSlots] = useState<Slot[]>([]);
  const [round, setRound] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Derived state: waitingList updates in real-time as volunteers are added or removed
  const waitingList = studentsList.filter(name => {
    const isLocked = slots.some(slot => slot.lockedUser === name);
    const isVolunteering = slots.some(slot => slot.volunteers.includes(name));
    return !isLocked && !isVolunteering;
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      navigate('/login');
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    return res;
  };

  // Load classes list
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/classes?limit=1000`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách lớp học.');
        const result = await res.json();
        const classData = result.data || result;
        setClasses(classData);
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tải lớp học.');
      } finally {
        setIsLoading(false);
      }
    };
    loadClasses();
  }, []);

  // Handle class selection
  const handleClassChange = async (className: string) => {
    setSelectedClass(className);
    if (!className) {
      setStudentsList([]);
      setSlots([]);
      setRound(1);
      setIsLocked(false);
      setIsCompleted(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/students?limit=1000&className=${encodeURIComponent(className)}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Không thể tải danh sách học viên lớp này.');
      const result = await res.json();
      const studentData = result.data || result;
      
      const names = studentData.map((s: StudentData) => s.name);
      setStudentsList(names);
      
      // Initialize slots (1 to N)
      const N = names.length;
      const initialSlots = Array.from({ length: N }, (_, i) => ({
        index: i + 1,
        volunteers: [],
        lockedUser: null
      }));
      
      setSlots(initialSlots);
      setRound(1);
      setIsLocked(false);
      setIsCompleted(false);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách học viên.');
    } finally {
      setIsLoading(false);
    }
  };

  // Assign a student to a slot's volunteer list
  const addVolunteer = (slotIndex: number, studentName: string) => {
    if (isLocked || isCompleted) return;
    setSlots(prev => prev.map(slot => {
      if (slot.index === slotIndex) {
        if (slot.volunteers.includes(studentName)) return slot;
        return {
          ...slot,
          volunteers: [...slot.volunteers, studentName]
        };
      }
      return slot;
    }));
  };

  // Remove a volunteer from a slot
  const removeVolunteer = (slotIndex: number, studentName: string) => {
    if (isLocked || isCompleted) return;
    setSlots(prev => prev.map(slot => {
      if (slot.index === slotIndex) {
        return {
          ...slot,
          volunteers: slot.volunteers.filter(v => v !== studentName)
        };
      }
      return slot;
    }));
  };

  // Toggle Lock state
  const handleToggleLock = () => {
    if (isCompleted) return;
    setIsLocked(!isLocked);
  };

  // Resolve current round decisions
  const handleResolveRound = () => {
    if (!isLocked || isCompleted) return;
    
    const newSlots = slots.map(slot => {
      if (slot.lockedUser) return slot;
      
      if (slot.volunteers.length === 1) {
        return {
          ...slot,
          lockedUser: slot.volunteers[0],
          volunteers: []
        };
      } else if (slot.volunteers.length > 1) {
        // Select 1 winner randomly
        const winner = slot.volunteers[Math.floor(Math.random() * slot.volunteers.length)];
        return {
          ...slot,
          lockedUser: winner,
          volunteers: []
        };
      }
      return slot;
    });

    // Get list of remaining unassigned students
    const currentlyLocked = newSlots.map(s => s.lockedUser).filter(Boolean) as string[];
    const remainingStudents = studentsList.filter(name => !currentlyLocked.includes(name));

    // Calculate total volunteers registered in this round
    const totalVolunteersCount = slots.reduce((acc, s) => acc + s.volunteers.length, 0);

    // If no one volunteered and there are still unassigned students -> AUTO-ASSIGN ALL
    if (totalVolunteersCount === 0 && remainingStudents.length > 0) {
      // Shuffle remaining students
      const shuffledStudents = [...remainingStudents].sort(() => Math.random() - 0.5);
      
      let studentIndex = 0;
      const finalSlots = newSlots.map(slot => {
        if (slot.lockedUser) return slot;
        const assignedStudent = shuffledStudents[studentIndex++];
        return {
          ...slot,
          lockedUser: assignedStudent || null,
          volunteers: []
        };
      });

      setSlots(finalSlots);
      setIsCompleted(true);
      setIsLocked(true);
      return;
    }

    setSlots(newSlots);

    const nextLocked = newSlots.map(s => s.lockedUser).filter(Boolean) as string[];
    const nextWaiting = studentsList.filter(name => !nextLocked.includes(name));

    if (nextWaiting.length === 0) {
      setIsCompleted(true);
    } else {
      setRound(r => r + 1);
      setIsLocked(false);
    }
  };

  // Reset arranger state to start over
  const handleReset = () => {
    const initialSlots = Array.from({ length: studentsList.length }, (_, i) => ({
      index: i + 1,
      volunteers: [],
      lockedUser: null
    }));
    setSlots(initialSlots);
    setRound(1);
    setIsLocked(false);
    setIsCompleted(false);
  };

  // Drawing and exporting final list to PNG image
  const handleExportImage = () => {
    if (slots.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rowHeight = 60;
    const padding = 50;
    const headerHeight = 160;
    const footerHeight = 80;
    const width = 800;
    const height = headerHeight + slots.length * rowHeight + padding + footerHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw premium background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1e1b4b'); // Deep indigo
    gradient.addColorStop(0.5, '#0f172a'); // Slate 900
    gradient.addColorStop(1, '#020617'); // Darkest blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Accent glows
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.beginPath();
    ctx.arc(width - 100, 100, 200, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(168, 85, 247, 0.06)';
    ctx.beginPath();
    ctx.arc(100, height - 100, 250, 0, Math.PI * 2);
    ctx.fill();

    // Draw header title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DANH SÁCH THỨ TỰ THUYẾT TRÌNH', width / 2, 60);
    
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`Lớp học: ${selectedClass} | Sĩ số: ${studentsList.length} học viên`, width / 2, 100);
    
    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 135);
    ctx.lineTo(width - padding, 135);
    ctx.stroke();
    
    // Draw rows
    let y = headerHeight;
    slots.forEach((slot, index) => {
      ctx.fillStyle = index % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      
      const rowX = padding;
      const rowY = y + 5;
      const rowW = width - padding * 2;
      const rowH = rowHeight - 10;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rowX, rowY, rowW, rowH, 8);
      } else {
        ctx.rect(rowX, rowY, rowW, rowH);
      }
      ctx.fill();
      ctx.stroke();
      
      // STT badge
      const badgeSize = 34;
      const badgeX = padding + 20;
      const badgeY = rowY + (rowH - badgeSize) / 2;
      
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 6);
      } else {
        ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
      }
      ctx.fill();
      ctx.stroke();
      
      // STT number
      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.index.toString(), badgeX + badgeSize / 2, badgeY + badgeSize / 2);
      
      // Student name
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 18px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(slot.lockedUser || 'Chưa phân công', badgeX + badgeSize + 25, rowY + rowH / 2);
      
      y += rowHeight;
    });
    
    // Draw footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y + 20);
    ctx.lineTo(width - padding, y + 20);
    ctx.stroke();
    
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Xuất bản từ hệ thống NA MindX Hub • Ngày ${new Date().toLocaleDateString('vi-VN')}`, width / 2, y + 45);
    
    // Export PNG download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Thu-Tu-Thuyet-Trinh-${selectedClass}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem', marginBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-heading)',
          background: 'var(--title-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Sắp Xếp Thứ Tự Thuyết Trình
        </h2>
        <p className="subtitle">Phân bổ lịch thuyết trình công bằng cho học viên trong lớp học</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Class Select Dropdown */}
          <div className="form-group" style={{ maxWidth: '400px' }}>
            <label className="form-label">Chọn lớp học</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="form-select-field"
              disabled={isLoading}
            >
              <option value="">-- Chọn lớp học --</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ color: 'var(--error)', background: 'var(--error-glow)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              Đang tải dữ liệu...
            </div>
          )}

          {/* Arranger Game Screen */}
          {!isLoading && selectedClass && studentsList.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Game Status Banner */}
              <div style={{
                background: isCompleted ? 'var(--success-glow)' : 'rgba(99, 102, 241, 0.05)',
                border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.2)'}`,
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {isCompleted ? '🎉 Đã hoàn thành xếp lịch!' : `Vòng ${round}: ${isLocked ? 'Đang quyết định kết quả' : 'Đăng ký tự nguyện'}`}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {isCompleted 
                      ? 'Tất cả học viên đã được phân bổ vào các vị trí thuyết trình. Bạn có thể xuất và tải file ảnh ngay bây giờ.' 
                      : isLocked 
                        ? 'Nhấn nút Quyết Định để chốt kết quả và chuyển sang vòng tiếp theo.' 
                        : 'Chọn học sinh tự nguyện vào các slot trống bên dưới. Nhấn Khóa khi đã đăng ký xong.'
                    }
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {isCompleted ? (
                    <>
                      <button className="btn btn-primary" onClick={handleExportImage} style={{ width: 'auto' }}>
                        📥 Tải ảnh kết quả
                      </button>
                      <button className="btn btn-neutral" onClick={handleReset} style={{ width: 'auto' }}>
                        🔄 Làm lại từ đầu
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className={`btn ${isLocked ? 'btn-danger' : 'btn-primary'}`} 
                        onClick={handleToggleLock} 
                        style={{ width: 'auto' }}
                      >
                        {isLocked ? '🔓 Mở khóa nhập' : '🔒 Khóa để quyết định'}
                      </button>
                      {isLocked && (
                        <button className="btn" style={{ background: 'var(--success)', color: '#ffffff', width: 'auto' }} onClick={handleResolveRound}>
                          ⚡ Quyết định
                        </button>
                      )}
                      <button className="btn btn-neutral" onClick={handleReset} style={{ width: 'auto' }}>
                        🔄 Reset
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Layout grid containing List and Waiting list */}
              <div className="arranger-grid">
                
                {/* 1. Presentation Slots List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Danh sách thứ tự thuyết trình
                  </h4>
                  
                  {slots.map((slot) => (
                    <div 
                      key={slot.index} 
                      style={{
                        background: slot.lockedUser ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1.5px solid ${slot.lockedUser ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1.5rem',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* STT badge */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: slot.lockedUser ? 'var(--success-glow)' : 'rgba(99, 102, 241, 0.1)',
                          border: `1px solid ${slot.lockedUser ? 'var(--success)' : 'var(--primary)'}`,
                          color: slot.lockedUser ? 'var(--success)' : 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.9rem'
                        }}>
                          {slot.index}
                        </div>

                        {/* Assignee Details */}
                        <div>
                          {slot.lockedUser ? (
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {slot.lockedUser} <span style={{ color: 'var(--success)', fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: 'normal' }}>(🔒 Đã chốt)</span>
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              {slot.volunteers.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                  Trống (Chưa có ai đăng ký)
                                </span>
                              ) : (
                                slot.volunteers.map((vol) => (
                                  <span 
                                    key={vol} 
                                    style={{
                                      background: slot.volunteers.length > 1 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                      color: slot.volunteers.length > 1 ? '#ff8a8a' : '#818cf8',
                                      border: `1.5px solid ${slot.volunteers.length > 1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.4rem'
                                    }}
                                  >
                                    {vol}
                                    {!isLocked && !isCompleted && (
                                      <button 
                                        onClick={() => removeVolunteer(slot.index, vol)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', padding: '0 2px' }}
                                        title="Xóa"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Add Volunteer Selector */}
                      {!slot.lockedUser && !isLocked && !isCompleted && (
                        <div style={{ maxWidth: '200px', width: '100%' }}>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addVolunteer(slot.index, e.target.value);
                              }
                            }}
                            className="form-select-field"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          >
                            <option value="">+ Đăng ký học sinh</option>
                            {waitingList
                              .filter(name => !slot.volunteers.includes(name))
                              .map(name => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 2. Waiting List Sidebar */}
                <div>
                  <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.01)', position: 'sticky', top: '90px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.85rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      Hàng chờ ({waitingList.length})
                    </h4>
                    {waitingList.length === 0 ? (
                      <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontStyle: 'italic', fontWeight: '600' }}>
                        🎉 Hàng chờ trống! Tất cả học viên đã được chốt.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem', lineHeight: '1.4' }}>
                          Học sinh chưa được xếp vị trí:
                        </p>
                        {waitingList.map((name) => (
                          <div 
                            key={name}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1.5px solid rgba(255,255,255,0.05)',
                              borderRadius: '8px',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {!selectedClass && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Vui lòng chọn lớp học để khởi đầu bảng thứ tự thuyết trình.
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
