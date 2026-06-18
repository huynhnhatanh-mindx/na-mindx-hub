import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, ArrowLeft, Download, RefreshCw, Lock, Unlock } from 'lucide-react';
import { useToast } from '../components/Toast';

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

interface GroupConfig {
  name: string;
  size: number;
}

interface GroupSlot {
  id: string; // "group-{groupIndex}-slot-{slotIndex}"
  groupIndex: number; // 0-indexed group number
  slotIndex: number; // 0-indexed position inside this group
  volunteers: string[];
  lockedUser: string | null;
}

export default function GroupArranger() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Class & Students selection states
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Phase state: 'config' | 'arrange'
  const [phase, setPhase] = useState<'config' | 'arrange'>('config');
  
  // Group configurations state
  const [numGroups, setNumGroups] = useState<number>(3);
  const [groupConfigs, setGroupConfigs] = useState<GroupConfig[]>([]);
  
  // Arrange states
  const [slots, setSlots] = useState<GroupSlot[]>([]);
  const [round, setRound] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

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
    // Redirect if teacher needs to link Google
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'teacher' && (user.requiresGoogleAuth || !user.email)) {
          navigate('/google-setup');
          return;
        }
      } catch (e) {}
    }

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
    setPhase('config');
    if (!className) {
      setStudentsList([]);
      setGroupConfigs([]);
      setSlots([]);
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
      
      // Setup initial groups based on N
      initializeGroupConfigs(names.length, 3);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách học viên.');
      setStudentsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize group sizes and names
  const initializeGroupConfigs = (studentCount: number, count: number) => {
    const groupsCount = Math.max(1, count);
    setNumGroups(groupsCount);
    
    const baseSize = Math.floor(studentCount / groupsCount);
    const remainder = studentCount % groupsCount;
    
    const configs = Array.from({ length: groupsCount }, (_, i) => ({
      name: `Nhóm ${i + 1}`,
      size: baseSize + (i < remainder ? 1 : 0)
    }));
    setGroupConfigs(configs);
  };

  // Handle number of groups change
  const handleNumGroupsChange = (val: number) => {
    const count = Math.max(1, val);
    initializeGroupConfigs(studentsList.length, count);
  };

  // Update specific group size
  const updateGroupSize = (index: number, size: number) => {
    setGroupConfigs(prev => prev.map((g, i) => i === index ? { ...g, size: Math.max(0, size) } : g));
  };

  // Update specific group name
  const updateGroupName = (index: number, name: string) => {
    setGroupConfigs(prev => prev.map((g, i) => i === index ? { ...g, name } : g));
  };

  // Add a new empty group
  const addGroup = () => {
    setGroupConfigs(prev => [
      ...prev,
      { name: `Nhóm ${prev.length + 1}`, size: 0 }
    ]);
    setNumGroups(n => n + 1);
  };

  // Remove a group
  const removeGroup = (index: number) => {
    if (groupConfigs.length <= 1) return;
    setGroupConfigs(prev => prev.filter((_, i) => i !== index));
    setNumGroups(n => n - 1);
  };

  // Derived state: total size in configuration
  const totalConfiguredSize = groupConfigs.reduce((acc, g) => acc + g.size, 0);
  const isValidConfig = totalConfiguredSize === studentsList.length && studentsList.length > 0;

  // Start arranging phase
  const handleStartArranging = () => {
    if (!isValidConfig) return;
    
    // Generate slots
    const initialSlots: GroupSlot[] = [];
    groupConfigs.forEach((group, gIdx) => {
      for (let sIdx = 0; sIdx < group.size; sIdx++) {
        initialSlots.push({
          id: `group-${gIdx}-slot-${sIdx}`,
          groupIndex: gIdx,
          slotIndex: sIdx,
          volunteers: [],
          lockedUser: null
        });
      }
    });

    setSlots(initialSlots);
    setRound(1);
    setIsLocked(false);
    setIsCompleted(false);
    setPhase('arrange');
    showToast('Bắt đầu chia nhóm! Vui lòng chọn học sinh vào các vị trí.', 'info');
  };

  // Derived state: waitingList updates in real-time
  const waitingList = studentsList.filter(name => {
    const isLocked = slots.some(slot => slot.lockedUser === name);
    const isVolunteering = slots.some(slot => slot.volunteers.includes(name));
    return !isLocked && !isVolunteering;
  });

  // Assign a student to a slot's volunteer list
  const addVolunteer = (slotId: string, studentName: string) => {
    if (isLocked || isCompleted) return;
    setSlots(prev => prev.map(slot => {
      if (slot.id === slotId) {
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
  const removeVolunteer = (slotId: string, studentName: string) => {
    if (isLocked || isCompleted) return;
    setSlots(prev => prev.map(slot => {
      if (slot.id === slotId) {
        return {
          ...slot,
          volunteers: slot.volunteers.filter(v => v !== studentName)
        };
      }
      return slot;
    }));
  };

  // Toggle Lock
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

    const currentlyLocked = newSlots.map(s => s.lockedUser).filter(Boolean) as string[];
    const remainingStudents = studentsList.filter(name => !currentlyLocked.includes(name));
    const totalVolunteersCount = slots.reduce((acc, s) => acc + s.volunteers.length, 0);

    // If no one volunteered and there are still unassigned students -> AUTO-ASSIGN ALL
    if (totalVolunteersCount === 0 && remainingStudents.length > 0) {
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
      showToast('Đã tự động phân bổ ngẫu nhiên các vị trí trống còn lại!', 'success');
      return;
    }

    setSlots(newSlots);

    const nextLocked = newSlots.map(s => s.lockedUser).filter(Boolean) as string[];
    const nextWaiting = studentsList.filter(name => !nextLocked.includes(name));

    if (nextWaiting.length === 0) {
      setIsCompleted(true);
      showToast('Chúc mừng! Đã phân chia đầy đủ các nhóm.', 'success');
    } else {
      setRound(r => r + 1);
      setIsLocked(false);
      showToast(`Chuyển sang Vòng ${round + 1}.`, 'info');
    }
  };

  // Reset to configuration screen
  const handleBackToConfig = () => {
    setPhase('config');
  };

  // Reset slots volunteer and lock states
  const handleResetArrangement = () => {
    setSlots(prev => prev.map(s => ({ ...s, volunteers: [], lockedUser: null })));
    setRound(1);
    setIsLocked(false);
    setIsCompleted(false);
  };

  // Draw and export groups to image
  const handleExportImage = () => {
    if (groupConfigs.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Design layout sizes
    const groupCardWidth = 320;
    const groupCardPadding = 20;
    const columns = Math.min(3, groupConfigs.length);
    const rows = Math.ceil(groupConfigs.length / columns);
    
    // Calculate max elements inside a group to set group card height
    const maxGroupSize = Math.max(...groupConfigs.map(g => g.size), 1);
    const slotHeight = 44;
    const groupHeaderHeight = 60;
    const groupCardHeight = groupHeaderHeight + maxGroupSize * slotHeight + 20;

    const paddingX = 40;
    const paddingY = 40;
    const headerHeight = 140;
    
    const width = paddingX * 2 + columns * groupCardWidth + (columns - 1) * groupCardPadding;
    const height = headerHeight + rows * groupCardHeight + (rows - 1) * groupCardPadding + paddingY;

    canvas.width = width;
    canvas.height = height;

    // Background gradient (Red/Black themed)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#310d0d'); // Dark crimson charcoal
    gradient.addColorStop(0.5, '#111827'); // Charcoal background
    gradient.addColorStop(1, '#0b0f19'); // Rich black
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative glows
    ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
    ctx.beginPath();
    ctx.arc(width - 150, 150, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(224, 36, 36, 0.04)';
    ctx.beginPath();
    ctx.arc(150, height - 150, 300, 0, Math.PI * 2);
    ctx.fill();

    // Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DANH SÁCH CHIA NHÓM HỌC TẬP', width / 2, 55);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(`Lớp học: ${selectedClass} | Sĩ số: ${studentsList.length} học viên | Tổng: ${groupConfigs.length} nhóm`, width / 2, 95);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, 120);
    ctx.lineTo(width - paddingX, 120);
    ctx.stroke();

    // Draw group cards
    groupConfigs.forEach((group, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const cardX = paddingX + col * (groupCardWidth + groupCardPadding);
      const cardY = headerHeight + row * (groupCardHeight + groupCardPadding);

      // Card Background
      ctx.fillStyle = 'rgba(31, 41, 55, 0.6)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX, cardY, groupCardWidth, groupCardHeight, 12);
      } else {
        ctx.rect(cardX, cardY, groupCardWidth, groupCardHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Card Header Banner (Reddish accent border top)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX, cardY, groupCardWidth, 8, [12, 12, 0, 0]);
      } else {
        ctx.rect(cardX, cardY, groupCardWidth, 8);
      }
      ctx.fill();

      // Group Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(group.name, cardX + 16, cardY + 32);

      // Group Size Badge
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 1;
      const badgeW = 60;
      const badgeH = 22;
      const badgeX = cardX + groupCardWidth - badgeW - 16;
      const badgeY = cardY + 21;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${group.size} học sinh`, badgeX + badgeW / 2, badgeY + badgeH / 2);

      // Draw Slots / Students
      const groupSlots = slots.filter(s => s.groupIndex === index);
      groupSlots.forEach((slot, sIdx) => {
        const slotY = cardY + groupHeaderHeight + sIdx * slotHeight;
        
        // Slot background
        ctx.fillStyle = sIdx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.005)';
        ctx.fillRect(cardX + 12, slotY, groupCardWidth - 24, slotHeight - 6);

        // STT number circle
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.arc(cardX + 28, slotY + (slotHeight - 6) / 2, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((sIdx + 1).toString(), cardX + 28, slotY + (slotHeight - 6) / 2 + 1);

        // Student name
        ctx.fillStyle = slot.lockedUser ? '#f1f5f9' : 'rgba(255, 255, 255, 0.15)';
        ctx.font = slot.lockedUser ? 'bold 14px Outfit, sans-serif' : 'italic 13px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(slot.lockedUser || '(Trống)', cardX + 48, slotY + (slotHeight - 6) / 2);
      });
    });

    // Download trigger
    const link = document.createElement('a');
    link.download = `danh-sach-nhom-${selectedClass.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Tải ảnh danh sách nhóm thành công!', 'success');
  };

  return (
    <main className="main-content">
      {/* Header Back & Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/')}
          className="back-link"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            width: 'fit-content',
            padding: 0
          }}
        >
          <ArrowLeft size={16} /> Quay lại trang chủ
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              fontFamily: 'var(--font-heading)',
              background: 'var(--title-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>
              Chia Nhóm Học Tập
            </h2>
            <p className="subtitle" style={{ fontSize: '0.95rem' }}>
              Chia nhóm ngẫu nhiên hoặc đăng ký tự nguyện học viên theo sĩ số.
            </p>
          </div>

          {/* Class Selector */}
          <div style={{ width: '260px' }}>
            <label className="form-label" style={{ marginBottom: '0.35rem', display: 'block' }}>Lớp học mục tiêu</label>
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
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          Đang tải thông tin lớp học và học sinh...
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--error-glow)',
          border: '1px solid var(--error-glow)',
          color: 'var(--error)',
          padding: '1rem',
          borderRadius: '10px',
          marginBottom: '2rem',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {!isLoading && !error && selectedClass && (
        <div style={{ width: '100%' }}>
          {/* ==========================================
              PHASE 1: CONFIGURATION SCREEN
              ========================================== */}
          {phase === 'config' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Sĩ số info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Tổng sĩ số học viên lớp: <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{studentsList.length}</strong>
                </span>
                
                {/* Group size verification message */}
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  background: isValidConfig ? 'var(--success-glow)' : 'var(--error-glow)',
                  color: isValidConfig ? 'var(--success)' : 'var(--error)',
                  border: `1px solid ${isValidConfig ? 'rgba(16,185,129,0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {isValidConfig ? (
                    <span>✓ Phân chia sĩ số hợp lệ ({totalConfiguredSize}/{studentsList.length})</span>
                  ) : (
                    <span>⚠️ Sai lệch sĩ số: Tổng phân chia {totalConfiguredSize}/{studentsList.length} ({totalConfiguredSize > studentsList.length ? `thừa ${totalConfiguredSize - studentsList.length}` : `thiếu ${studentsList.length - totalConfiguredSize}`})</span>
                  )}
                </div>
              </div>

              {/* Group inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '350px' }}>
                  <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Số lượng nhóm:</label>
                  <input
                    type="number"
                    min="1"
                    max={studentsList.length || 1}
                    value={numGroups}
                    onChange={(e) => handleNumGroupsChange(parseInt(e.target.value) || 1)}
                    className="form-input-field"
                    style={{ width: '80px', textAlign: 'center' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
                  {groupConfigs.map((group, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        background: 'rgba(255,255,255,0.01)',
                        border: '1.5px solid var(--card-border)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>NHÓM #{index + 1}</span>
                        {groupConfigs.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeGroup(index)}
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            title="Xóa nhóm này"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Group Name input */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Tên nhóm</label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroupName(index, e.target.value)}
                          placeholder="Ví dụ: Nhóm Coder..."
                          className="form-input-field"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        />
                      </div>

                      {/* Group Size input */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Số lượng thành viên</label>
                        <input
                          type="number"
                          min="0"
                          max={studentsList.length}
                          value={group.size}
                          onChange={(e) => updateGroupSize(index, parseInt(e.target.value) || 0)}
                          className="form-input-field"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add Group Card */}
                  <div 
                    onClick={addGroup}
                    style={{ 
                      border: '2px dashed var(--card-border)',
                      borderRadius: '12px',
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.005)',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
                  >
                    <Plus size={24} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Thêm nhóm mới</span>
                  </div>
                </div>
              </div>

              {/* Start Action */}
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleStartArranging}
                  disabled={!isValidConfig}
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.75rem 2rem' }}
                >
                  <Check size={18} strokeWidth={2.5} /> Bắt đầu chia nhóm
                </button>
              </div>

            </div>
          )}

          {/* ==========================================
              PHASE 2: ARRANGE SCREEN (ROUND GAMEPLAY)
              ========================================== */}
          {phase === 'arrange' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Gameplay toolbar */}
              <div style={{
                background: isCompleted ? 'var(--success-glow)' : 'var(--primary-glow)',
                border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : 'var(--primary-glow)'}`,
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
                    {isCompleted ? '🎉 Đã hoàn thành chia nhóm!' : `Vòng ${round}: ${isLocked ? 'Đang quyết định kết quả' : 'Đăng ký tự nguyện'}`}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
                    {isCompleted 
                      ? 'Tất cả học viên đã được chốt vào nhóm. Bạn có thể xuất và tải file ảnh danh sách nhóm.' 
                      : isLocked 
                        ? 'Nhấn nút Quyết Định để chốt kết quả và chuyển sang vòng tiếp theo.' 
                        : 'Chọn học sinh đăng ký vào các slot trống bên dưới. Nhấn Khóa khi đã đăng ký xong.'
                    }
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {isCompleted ? (
                    <>
                      <button className="btn btn-primary" onClick={handleExportImage} style={{ width: 'auto' }}>
                        <Download size={16} /> Tải ảnh nhóm
                      </button>
                      <button className="btn btn-neutral" onClick={handleResetArrangement} style={{ width: 'auto' }}>
                        <RefreshCw size={16} /> Chia lại vòng này
                      </button>
                      <button className="btn btn-neutral" onClick={handleBackToConfig} style={{ width: 'auto' }}>
                        ⚙️ Cấu hình lại
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className={`btn ${isLocked ? 'btn-danger' : 'btn-primary'}`} 
                        onClick={handleToggleLock} 
                        style={{ width: 'auto' }}
                      >
                        {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                        {isLocked ? 'Mở khóa nhập' : 'Khóa để quyết định'}
                      </button>
                      {isLocked && (
                        <button className="btn" style={{ background: 'var(--success)', color: '#ffffff', width: 'auto' }} onClick={handleResolveRound}>
                          ⚡ Quyết định
                        </button>
                      )}
                      <button className="btn btn-neutral" onClick={handleResetArrangement} style={{ width: 'auto' }}>
                        <RefreshCw size={16} /> Reset
                      </button>
                      <button className="btn btn-neutral" onClick={handleBackToConfig} style={{ width: 'auto' }}>
                        ⚙️ Cấu hình lại
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Arranger Grid layout */}
              <div className="arranger-grid">
                
                {/* 1. Group Cards Listing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.5rem' }}>
                    {groupConfigs.map((group, gIdx) => {
                      const groupSlots = slots.filter(s => s.groupIndex === gIdx);
                      return (
                        <div 
                          key={gIdx} 
                          className="glass-card" 
                          style={{ 
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            border: '1px solid var(--card-border)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                              {group.name}
                            </h4>
                            <span className="status-pill online" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                              {group.size} Thành viên
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {groupSlots.map((slot, sIdx) => (
                              <div 
                                key={slot.id}
                                style={{
                                  background: slot.lockedUser ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                  border: `1px solid ${slot.lockedUser ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                  borderRadius: '8px',
                                  padding: '0.5rem 0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '1rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                  {/* Badge STT */}
                                  <div style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    background: slot.lockedUser ? 'var(--success-glow)' : 'var(--primary-glow)',
                                    border: `1px solid ${slot.lockedUser ? 'var(--success)' : 'var(--primary)'}`,
                                    color: slot.lockedUser ? 'var(--success)' : 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    fontSize: '0.8rem',
                                    flexShrink: 0
                                  }}>
                                    {sIdx + 1}
                                  </div>

                                  {/* Details */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    {slot.lockedUser ? (
                                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                        {slot.lockedUser} <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 'normal' }}>(🔒 Chốt)</span>
                                      </span>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {slot.volunteers.length === 0 ? (
                                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Trống</span>
                                        ) : (
                                          slot.volunteers.map((vol) => (
                                            <span 
                                              key={vol} 
                                              style={{
                                                background: slot.volunteers.length > 1 ? 'var(--error-glow)' : 'var(--primary-glow)',
                                                color: slot.volunteers.length > 1 ? 'var(--error)' : 'var(--primary)',
                                                border: `1px solid ${slot.volunteers.length > 1 ? 'rgba(239, 68, 68, 0.3)' : 'var(--primary-glow)'}`,
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                              }}
                                            >
                                              {vol}
                                              {!isLocked && !isCompleted && (
                                                <button 
                                                  onClick={() => removeVolunteer(slot.id, vol)}
                                                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', padding: '0 1px' }}
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

                                {/* Select Volunteer Dropdown */}
                                {!slot.lockedUser && !isLocked && !isCompleted && (
                                  <div style={{ width: '120px', flexShrink: 0 }}>
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          addVolunteer(slot.id, e.target.value);
                                        }
                                      }}
                                      className="form-select-field"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '1.8rem' }}
                                    >
                                      <option value="">+ Đăng ký</option>
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Waiting List Sidebar */}
                <div style={{ width: '100%' }}>
                  <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.01)', position: 'sticky', top: '90px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.85rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      Chưa chia nhóm ({waitingList.length})
                    </h4>
                    
                    {waitingList.length === 0 ? (
                      <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontStyle: 'italic', fontWeight: '600' }}>
                        🎉 Đã xếp hết học viên!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                          Danh sách học viên chưa chọn nhóm:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
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
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {!selectedClass && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Vui lòng chọn lớp học ở góc trên bên phải để bắt đầu thiết lập chia nhóm.
        </div>
      )}
    </main>
  );
}
