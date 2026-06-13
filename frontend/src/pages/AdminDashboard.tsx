import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/date';
import { Search, Plus } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useSSE } from '../hooks/useSSE';
import { preventOrphan } from '../utils/text';

interface UserData {
  _id: string;
  username: string;
  role: string;
  displayName: string;
  email?: string;
  status?: string;
  createdAt: string;
}

interface ClassData {
  _id: string;
  name: string;
  teacherName: string;
  studentCount?: number;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  checkpoint1StartDate?: string;
  checkpoint1Deadline?: string;
  checkpoint2StartDate?: string;
  checkpoint2Deadline?: string;
  finalProjectStartDate?: string;
  finalProjectDeadline?: string;
  presentationStartDate?: string;
  presentationDeadline?: string;
  allowLateUpload?: boolean;
}

interface TeacherData {
  _id: string;
  name: string;
}

interface StudentData {
  _id: string;
  name: string;
  className: string;
  studentCode: string;
  status?: string;
  maxUploadSize?: number;
  submissionCount?: number;
}

interface SubmissionData {
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

const DateInput = ({ value, onChange, className, style }: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  if (isFocused) {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsFocused(false)}
        className={className}
        style={style}
        ref={(el) => {
          if (el) {
            el.focus();
            try {
              el.showPicker();
            } catch (e) {}
          }
        }}
      />
    );
  }

  let displayValue = '';
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      displayValue = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
  }

  return (
    <input
      type="text"
      value={displayValue}
      placeholder="Chọn ngày..."
      onFocus={() => setIsFocused(true)}
      onClick={() => setIsFocused(true)}
      className={className}
      style={style}
      readOnly
    />
  );
};

const DateTimeInput = ({ value, onChange, className, style }: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  if (isFocused) {
    return (
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsFocused(false)}
        className={className}
        style={style}
        ref={(el) => {
          if (el) {
            el.focus();
            try {
              el.showPicker();
            } catch (e) {}
          }
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ? formatDateTime(value) : ''}
      placeholder="Chọn ngày và giờ..."
      onFocus={() => setIsFocused(true)}
      onClick={() => setIsFocused(true)}
      className={className}
      style={style}
      readOnly
    />
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teachers' | 'classes' | 'students' | 'submissions'>('overview');
  
  // Pagination & Bulk
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data lists
  const [users, setUsers] = useState<UserData[]>([]);
  const [teachersDataList, setTeachersDataList] = useState<TeacherData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotesContent, setSelectedNotesContent] = useState('');
  const [selectedNotesStudent, setSelectedNotesStudent] = useState('');

  const handleShowNotes = (notes: string, studentName: string) => {
    setSelectedNotesContent(notes);
    setSelectedNotesStudent(studentName);
    setShowNotesModal(true);
  };

  // User form states
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('admin');
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userStatus, setUserStatus] = useState('active');

  // Teacher form states
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  // Class form states
  const [className, setClassName] = useState('');
  const [classTeacher, setClassTeacher] = useState('');
  const [teachers, setTeachers] = useState<string[]>([]);
  const [isNewTeacher, setIsNewTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [classStartDate, setClassStartDate] = useState('');
  const [classStartTime, setClassStartTime] = useState('08:00');
  const [classEndTime, setClassEndTime] = useState('10:00');

  // Milestone deadlines (start and end times)
  const [classCp1StartDate, setClassCp1StartDate] = useState('');
  const [classCp1Deadline, setClassCp1Deadline] = useState('');
  const [classCp2StartDate, setClassCp2StartDate] = useState('');
  const [classCp2Deadline, setClassCp2Deadline] = useState('');
  const [classSpckStartDate, setClassSpckStartDate] = useState('');
  const [classSpckDeadline, setClassSpckDeadline] = useState('');
  const [classPresentationStartDate, setClassPresentationStartDate] = useState('');
  const [classPresentationDeadline, setClassPresentationDeadline] = useState('');

  const [classCp1LateType, setClassCp1LateType] = useState('none');
  const [classCp1LateDeadline, setClassCp1LateDeadline] = useState('');
  const [classCp2LateType, setClassCp2LateType] = useState('none');
  const [classCp2LateDeadline, setClassCp2LateDeadline] = useState('');
  const [classSpckLateType, setClassSpckLateType] = useState('none');
  const [classSpckLateDeadline, setClassSpckLateDeadline] = useState('');
  const [classPresentationLateType, setClassPresentationLateType] = useState('none');
  const [classPresentationLateDeadline, setClassPresentationLateDeadline] = useState('');

  // Student form states
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [isNewClass, setIsNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [studentMaxUploadSize, setStudentMaxUploadSize] = useState<number>(20);
  const [studentStatus, setStudentStatus] = useState('active');

  // Filter dropdown states
  const [filterClass, setFilterClass] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Register EventSource (SSE) for real-time updates and immediate logout
  useSSE({
    'class-update': () => {
      console.log('[SSE] Class update received, reloading...');
      fetchData();
    },
    'student-update': () => {
      console.log('[SSE] Student update received, reloading...');
      fetchData();
    },
    'teacher-update': () => {
      console.log('[SSE] Teacher update received, reloading...');
      fetchData();
    },
    'user-update': () => {
      console.log('[SSE] User update received, reloading...');
      fetchData();
    },
    'submission-update': () => {
      console.log('[SSE] Submission update received, reloading...');
      fetchData();
    },
    'force-logout': (data) => {
      console.log('[SSE] Force logout event received:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      alert(data?.reason || 'Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa bởi Admin.');
      navigate('/login');
    }
  });

  // Check login on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin' && user.role !== 'teacher') {
        navigate('/');
        return;
      }
      
      // Nếu là giáo viên chưa liên kết Google, bắt buộc chuyển hướng sang google-setup
      if (user.role === 'teacher' && (user.requiresGoogleAuth || !user.email)) {
        navigate('/google-setup');
        return;
      }

      setCurrentUser(user);
      if (user.role === 'teacher') {
        setActiveTab('classes');
      }
    } catch (e) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch data depending on active tab
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setSearchInput('');
    setSelectedIds([]);
    // Reset filters
    setFilterClass('');
    setFilterStage('');
    setFilterTeacher('');
    setFilterRole('');
    setFilterStatus('');
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchQuery, filterClass, filterStage, filterTeacher, filterRole, filterStatus]);

  // Load classes and teachers for dropdown filters
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const loadDropdownData = async () => {
      try {
        const classRes = await fetchWithAuth(`${API_BASE_URL}/api/admin/classes?limit=1000`, { headers: getHeaders() });
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(classData.data || classData);
        }
        const teacherRes = await fetchWithAuth(`${API_BASE_URL}/api/teachers`);
        if (teacherRes.ok) {
          const teacherData = await teacherRes.json();
          setTeachers(teacherData);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách lớp/giáo viên:', err);
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      loadDropdownData();
    }
  }, [activeTab]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput);
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

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

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    try {
      const queryParams = new URLSearchParams({ page: currentPage.toString(), limit: '10' });
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterClass) queryParams.append('className', filterClass);
      if (filterStage) queryParams.append('stage', filterStage);
      if (filterTeacher) {
        if (activeTab === 'classes') {
          queryParams.append('teacherName', filterTeacher);
        } else {
          queryParams.append('teacher', filterTeacher);
        }
      }
      if (filterRole) queryParams.append('role', filterRole);
      if (filterStatus) queryParams.append('status', filterStatus);

      if (activeTab === 'overview') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/dashboard-stats`, { headers: getHeaders() });
        if (res.ok) setDashboardStats(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/users?${queryParams}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách tài khoản.');
        const { data, totalPages } = await res.json();
        setUsers(data);
        setTotalPages(totalPages);
      } else if (activeTab === 'teachers') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/teachers?${queryParams}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách giáo viên.');
        const { data, totalPages } = await res.json();
        setTeachersDataList(data);
        setTotalPages(totalPages);
      } else if (activeTab === 'classes') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/classes?${queryParams}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách lớp học.');
        const { data, totalPages } = await res.json();
        setClasses(data);
        setTotalPages(totalPages);

        // Fetch teachers list to populate the dropdown
        const teacherRes = await fetchWithAuth(`${API_BASE_URL}/api/teachers`);
        if (teacherRes.ok) {
          const teacherData = await teacherRes.json();
          setTeachers(teacherData);
        }
      } else if (activeTab === 'students') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/students?${queryParams}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách học viên.');
        const { data, totalPages } = await res.json();
        setStudents(data);
        setTotalPages(totalPages);

        // Fetch classes to populate the dropdown
        const classRes = await fetchWithAuth(`${API_BASE_URL}/api/admin/classes?limit=1000`, { headers: getHeaders() });
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(classData.data || classData);
        }
      } else if (activeTab === 'submissions') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/submissions?${queryParams}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách bài nộp.');
        const { data, totalPages } = await res.json();
        setSubmissions(data);
        setTotalPages(totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi kết nối.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleAdminUnlinkGoogle = async () => {
    if (!editingId) return;
    const ok = await showConfirm("Bạn có chắc chắn muốn hủy liên kết tài khoản Google của giáo viên này?");
    if (!ok) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${editingId}/unlink`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Hủy liên kết thất bại.');
      }
      
      setUserEmail('');
      showToast('Đã hủy liên kết Google của giáo viên thành công!', 'success');
      fetchData(); // Tải lại danh sách
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi hủy liên kết.', 'error');
    } finally {
      setIsLoading(false);
    }
  };



  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, data: any[]) => {
    if (e.target.checked) {
      setSelectedIds(data.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    const ok = await showConfirm(`Bạn có chắc muốn xóa ${selectedIds.length} mục này?`);
    if (!ok) return;
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/${activeTab}/bulk-delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids: selectedIds })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Thao tác thất bại');
      }
      setSelectedIds([]);
      showToast('Xóa thành công!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/${activeTab}/bulk-update-status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids: selectedIds, status })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Thao tác thất bại');
      }
      setSelectedIds([]);
      showToast('Cập nhật trạng thái thành công!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Helper: calculate auto deadline on the frontend (mirrors backend logic)
  const calcAutoDeadline = (startDateStr: string, daysOffset: number, endTimeStr: string): string => {
    if (!startDateStr) return '';
    // Parse the date as Vietnam time (the input is a YYYY-MM-DD string from the date picker)
    const baseDate = new Date(`${startDateStr}T00:00:00+07:00`);
    if (isNaN(baseDate.getTime())) return '';
    const targetDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    // Format in Vietnam timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatter.formatToParts(targetDate);
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const [h, m] = (endTimeStr || '10:00').split(':');
    return `${year}-${month}-${day}T${(h || '10').padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
  };

  const getMilestoneRangeDisplay = (item: ClassData, type: 'cp1' | 'cp2' | 'spck' | 'presentation') => {
    let startVal = '';
    let endVal = '';
    let isAuto = false;
    let lateType = 'none';
    let lateDeadline = '';

    const sd = toLocalYYYYMMDD(item.startDate);
    const st = item.startTime || '08:00';
    const et = item.endTime || '10:00';

    if (type === 'cp1') {
      startVal = item.checkpoint1StartDate || calcAutoDeadline(sd, 28, st);
      endVal = item.checkpoint1Deadline || calcAutoDeadline(sd, 28, et);
      isAuto = !item.checkpoint1StartDate && !item.checkpoint1Deadline;
      lateType = (item as any).checkpoint1LateType || 'none';
      lateDeadline = (item as any).checkpoint1LateDeadline || '';
    } else if (type === 'cp2') {
      startVal = item.checkpoint2StartDate || calcAutoDeadline(sd, 56, st);
      endVal = item.checkpoint2Deadline || calcAutoDeadline(sd, 56, et);
      isAuto = !item.checkpoint2StartDate && !item.checkpoint2Deadline;
      lateType = (item as any).checkpoint2LateType || 'none';
      lateDeadline = (item as any).checkpoint2LateDeadline || '';
    } else if (type === 'spck') {
      startVal = item.finalProjectStartDate || calcAutoDeadline(sd, 0, st);
      endVal = item.finalProjectDeadline || calcAutoDeadline(sd, 85, et);
      isAuto = !item.finalProjectStartDate && !item.finalProjectDeadline;
      lateType = (item as any).finalProjectLateType || 'none';
      lateDeadline = (item as any).finalProjectLateDeadline || '';
    } else {
      startVal = item.presentationStartDate || calcAutoDeadline(sd, 0, st);
      endVal = item.presentationDeadline || calcAutoDeadline(sd, 91, et);
      isAuto = !item.presentationStartDate && !item.presentationDeadline;
      lateType = (item as any).presentationLateType || 'none';
      lateDeadline = (item as any).presentationLateDeadline || '';
    }

    if (!startVal || !endVal) return 'Chưa cấu hình';

    const formatDt = (dtStr: string) => formatDateTime(dtStr);

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: isAuto ? '#aaa' : 'var(--success)', fontWeight: isAuto ? '400' : '600' }}>
          {preventOrphan(`${formatDt(startVal)} - ${formatDt(endVal)}${isAuto ? ' (Tự động)' : ''}`)}
        </span>
        {lateType !== 'none' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)' }}></span>
            {lateType === 'unlimited' ? 'Nộp muộn: Vô thời hạn' : `Nộp muộn hạn chót: ${formatDt(lateDeadline)}`}
          </span>
        )}
      </div>
    );
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setUserUsername('');
    setUserPassword('');
    setUserRole('admin');
    setUserDisplayName('');
    setUserEmail('');
    setUserStatus('active');
    setTeacherNameInput('');
    setNewTeacherUsername('');
    setNewTeacherPassword('');
    setClassName('');
    setClassTeacher(currentUser?.role === 'teacher' ? currentUser.displayName : '');
    setClassStartDate('');
    setClassStartTime('08:00');
    setClassEndTime('10:00');
    setClassCp1StartDate('');
    setClassCp1Deadline('');
    setClassCp2StartDate('');
    setClassCp2Deadline('');
    setClassSpckStartDate('');
    setClassSpckDeadline('');
    setClassPresentationStartDate('');
    setClassPresentationDeadline('');
    setClassCp1LateType('none');
    setClassCp1LateDeadline('');
    setClassCp2LateType('none');
    setClassCp2LateDeadline('');
    setClassSpckLateType('none');
    setClassSpckLateDeadline('');
    setClassPresentationLateType('none');
    setClassPresentationLateDeadline('');
    setStudentName('');
    setStudentClass('');
    setStudentCode('');
    setStudentMaxUploadSize(20);
    setStudentStatus('active');
    setIsNewClass(false);
    setNewClassName('');
    setIsNewTeacher(false);
    setNewTeacherName('');
    setShowModal(true);
    setError('');
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item._id);
    setError('');
    
    if (activeTab === 'users') {
      setUserUsername(item.username);
      setUserPassword(''); // Leave blank to not change password
      setUserRole(item.role);
      setUserDisplayName(item.displayName);
      setUserEmail(item.email || '');
      setUserStatus(item.status || 'active');
    } else if (activeTab === 'teachers') {
      setTeacherNameInput(item.name);
      setNewTeacherUsername('');
      setNewTeacherPassword('');
    } else if (activeTab === 'classes') {
      setClassName(item.name);
      setClassStartDate(toLocalYYYYMMDD(item.startDate));
      setClassStartTime(item.startTime || '08:00');
      setClassEndTime(item.endTime || '10:00');
      const sd = toLocalYYYYMMDD(item.startDate);
      const st = item.startTime || '08:00';
      const et = item.endTime || '10:00';
      setClassCp1StartDate(toLocalYYYYMMDDTHHMM(item.checkpoint1StartDate) || calcAutoDeadline(sd, 28, st));
      setClassCp1Deadline(toLocalYYYYMMDDTHHMM(item.checkpoint1Deadline) || calcAutoDeadline(sd, 28, et));
      setClassCp2StartDate(toLocalYYYYMMDDTHHMM(item.checkpoint2StartDate) || calcAutoDeadline(sd, 56, st));
      setClassCp2Deadline(toLocalYYYYMMDDTHHMM(item.checkpoint2Deadline) || calcAutoDeadline(sd, 56, et));
      setClassSpckStartDate(toLocalYYYYMMDDTHHMM(item.finalProjectStartDate) || calcAutoDeadline(sd, 0, st));
      setClassSpckDeadline(toLocalYYYYMMDDTHHMM(item.finalProjectDeadline) || calcAutoDeadline(sd, 85, et));
      setClassPresentationStartDate(toLocalYYYYMMDDTHHMM(item.presentationStartDate) || calcAutoDeadline(sd, 0, st));
      setClassPresentationDeadline(toLocalYYYYMMDDTHHMM(item.presentationDeadline) || calcAutoDeadline(sd, 91, et));
      
      setClassCp1LateType(item.checkpoint1LateType || 'none');
      setClassCp1LateDeadline(toLocalYYYYMMDDTHHMM(item.checkpoint1LateDeadline));
      setClassCp2LateType(item.checkpoint2LateType || 'none');
      setClassCp2LateDeadline(toLocalYYYYMMDDTHHMM(item.checkpoint2LateDeadline));
      setClassSpckLateType(item.finalProjectLateType || 'none');
      setClassSpckLateDeadline(toLocalYYYYMMDDTHHMM(item.finalProjectLateDeadline));
      setClassPresentationLateType(item.presentationLateType || 'none');
      setClassPresentationLateDeadline(toLocalYYYYMMDDTHHMM(item.presentationLateDeadline));
      
      const teacherExists = teachers.includes(item.teacherName);
      if (teacherExists || !item.teacherName) {
        setClassTeacher(item.teacherName || (currentUser?.role === 'teacher' ? currentUser.displayName : ''));
        setIsNewTeacher(false);
        setNewTeacherName('');
        setNewTeacherUsername('');
        setNewTeacherPassword('');
      } else {
        setClassTeacher('__NEW_TEACHER__');
        setIsNewTeacher(true);
        setNewTeacherName(item.teacherName);
        setNewTeacherUsername('');
        setNewTeacherPassword('');
      }
    } else if (activeTab === 'students') {
      setStudentName(item.name);
      setStudentCode(item.studentCode);
      setStudentStatus(item.status || 'active');
      setStudentMaxUploadSize(item.maxUploadSize !== undefined ? item.maxUploadSize : 20);

      const classExists = classes.some(c => c.name === item.className);
      if (classExists || !item.className) {
        setStudentClass(item.className || '');
        setIsNewClass(false);
        setNewClassName('');
      } else {
        setStudentClass('__NEW_CLASS__');
        setIsNewClass(true);
        setNewClassName(item.className);
      }
    }
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    if (activeTab === 'teachers' && !teacherNameInput.trim()) {
      setError('Vui lòng nhập tên giáo viên.');
      return;
    }

    if (activeTab === 'teachers' && !editingId && !newTeacherUsername.trim()) {
      setError('Vui lòng nhập tên đăng nhập cho tài khoản giáo viên.');
      return;
    }

    if (activeTab === 'students' && isNewClass && !newClassName.trim()) {
      setError('Vui lòng nhập tên lớp học mới.');
      return;
    }

    if (activeTab === 'classes' && isNewTeacher && !newTeacherName.trim()) {
      setError('Vui lòng nhập tên giáo viên mới.');
      return;
    }

    if (activeTab === 'classes' && isNewTeacher && !newTeacherUsername.trim()) {
      setError('Vui lòng nhập tên đăng nhập cho giáo viên mới.');
      return;
    }

    let body = {};
    let url = '';
    let method = editingId ? 'PUT' : 'POST';

    if (activeTab === 'users') {
      url = `${API_BASE_URL}/api/admin/users${editingId ? `/${editingId}` : ''}`;
      body = {
        username: userUsername,
        password: userPassword,
        role: userRole,
        displayName: userDisplayName,
        email: userEmail,
        status: userStatus
      };
    } else if (activeTab === 'teachers') {
      url = `${API_BASE_URL}/api/admin/teachers${editingId ? `/${editingId}` : ''}`;
      body = {
        name: teacherNameInput.trim(),
        username: !editingId ? newTeacherUsername.trim() : undefined,
        password: newTeacherPassword // Mật khẩu (mới) khi tạo hoặc cập nhật giáo viên
      };
    } else if (activeTab === 'classes') {
      if (classCp1StartDate && classCp1Deadline && classCp1Deadline <= classCp1StartDate) {
        setError('Hạn chót CP1 phải lớn hơn thời gian mở nộp CP1.');
        return;
      }
      if (classCp2StartDate && classCp2Deadline && classCp2Deadline <= classCp2StartDate) {
        setError('Hạn chót CP2 phải lớn hơn thời gian mở nộp CP2.');
        return;
      }
      if (classSpckStartDate && classSpckDeadline && classSpckDeadline <= classSpckStartDate) {
        setError('Hạn chót SPCK phải lớn hơn thời gian mở nộp SPCK.');
        return;
      }
      if (classPresentationStartDate && classPresentationDeadline && classPresentationDeadline <= classPresentationStartDate) {
        setError('Hạn chót Thuyết trình phải lớn hơn thời gian mở nộp Thuyết trình.');
        return;
      }

      if (classCp1LateType === 'limited' && (!classCp1LateDeadline || (classCp1Deadline && classCp1LateDeadline <= classCp1Deadline))) {
        setError('Hạn chót nộp muộn Checkpoint 1 phải lớn hơn hạn chót chính thức.');
        return;
      }
      if (classCp2LateType === 'limited' && (!classCp2LateDeadline || (classCp2Deadline && classCp2LateDeadline <= classCp2Deadline))) {
        setError('Hạn chót nộp muộn Checkpoint 2 phải lớn hơn hạn chót chính thức.');
        return;
      }
      if (classSpckLateType === 'limited' && (!classSpckLateDeadline || (classSpckDeadline && classSpckLateDeadline <= classSpckDeadline))) {
        setError('Hạn chót nộp muộn SPCK phải lớn hơn hạn chót chính thức.');
        return;
      }
      if (classPresentationLateType === 'limited' && (!classPresentationLateDeadline || (classPresentationDeadline && classPresentationLateDeadline <= classPresentationDeadline))) {
        setError('Hạn chót nộp muộn Thuyết trình phải lớn hơn hạn chót chính thức.');
        return;
      }

      url = `${API_BASE_URL}/api/admin/classes${editingId ? `/${editingId}` : ''}`;
      body = {
        name: className,
        teacherName: isNewTeacher ? newTeacherName.trim() : classTeacher,
        newTeacherUsername: isNewTeacher ? newTeacherUsername.trim() : undefined,
        newTeacherPassword: isNewTeacher ? newTeacherPassword.trim() : undefined,
        startDate: classStartDate || null,
        startTime: classStartTime || "08:00",
        endTime: classEndTime || "10:00",
        checkpoint1StartDate: classCp1StartDate || null,
        checkpoint1Deadline: classCp1Deadline || null,
        checkpoint1LateType: classCp1LateType,
        checkpoint1LateDeadline: classCp1LateDeadline || null,
        checkpoint2StartDate: classCp2StartDate || null,
        checkpoint2Deadline: classCp2Deadline || null,
        checkpoint2LateType: classCp2LateType,
        checkpoint2LateDeadline: classCp2LateDeadline || null,
        finalProjectStartDate: classSpckStartDate || null,
        finalProjectDeadline: classSpckDeadline || null,
        finalProjectLateType: classSpckLateType,
        finalProjectLateDeadline: classSpckLateDeadline || null,
        presentationStartDate: classPresentationStartDate || null,
        presentationDeadline: classPresentationDeadline || null,
        presentationLateType: classPresentationLateType,
        presentationLateDeadline: classPresentationLateDeadline || null,
        allowLateUpload: false
      };
    } else if (activeTab === 'students') {
      url = `${API_BASE_URL}/api/admin/students${editingId ? `/${editingId}` : ''}`;
      body = {
        name: studentName,
        className: isNewClass ? newClassName.trim() : studentClass,
        studentCode: studentCode,
        maxUploadSize: studentMaxUploadSize,
        status: studentStatus
      };
    }

    try {
      const res = await fetchWithAuth(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Thao tác thất bại.');
      }

      // Sync display name and role in localStorage if the edited user is the current logged-in user
      if (activeTab === 'users') {
        const currentUserStr = localStorage.getItem('user');
        if (currentUserStr) {
          try {
            const currentUser = JSON.parse(currentUserStr);
            const originalUser = users.find(u => u._id === editingId);
            const isSelf = originalUser && originalUser.username === currentUser.username;
            
            if (isSelf) {
              if (userUsername.trim().toLowerCase() !== originalUser.username) {
                showToast('Tên đăng nhập của bạn đã thay đổi. Vui lòng đăng nhập lại.', 'warning');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setTimeout(() => {
                  window.location.href = '/login';
                }, 1500);
                return;
              }
              if (userRole !== currentUser.role) {
                showToast('Quyền của bạn đã bị thay đổi (xuống cấp). Vui lòng đăng nhập lại.', 'warning');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setTimeout(() => {
                  window.location.href = '/login';
                }, 1500);
                return;
              }

              const updatedUser = {
                ...currentUser,
                displayName: userDisplayName,
                role: userRole,
                email: userEmail,
                status: userStatus
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              // Dispatch event to update Header component greeting immediately
              window.dispatchEvent(new Event('storage'));
            }
          } catch (e) {}
        }
      }

      showToast(editingId ? 'Cập nhật thành công!' : 'Tạo mới thành công!', 'success');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const ok = await showConfirm('Bạn có chắc chắn muốn xóa bản ghi này?');
    if (!ok) return;
    setError('');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    let url = '';
    if (activeTab === 'users') url = `${API_BASE_URL}/api/admin/users/${id}`;
    else if (activeTab === 'teachers') url = `${API_BASE_URL}/api/admin/teachers/${id}`;
    else if (activeTab === 'classes') url = `${API_BASE_URL}/api/admin/classes/${id}`;
    else if (activeTab === 'students') url = `${API_BASE_URL}/api/admin/students/${id}`;
    else if (activeTab === 'submissions') url = `${API_BASE_URL}/api/admin/submissions/${id}`;

    try {
      const res = await fetchWithAuth(url, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Xóa thất bại.');
      }

      showToast('Xóa thành công!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Đã xảy ra lỗi khi xóa.', 'error');
    }
  };

  const toLocalYYYYMMDD = (dateStr: string | Date | undefined | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const toLocalYYYYMMDDTHHMM = (dateStr: string | Date | undefined | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatDate = (dateStr: string) => formatDateTime(dateStr);

  const renderFilters = () => {
    const selectStyle = {
      padding: '0.5rem 2rem 0.5rem 1rem',
      borderRadius: '8px',
      background: 'var(--input-bg)',
      border: '1px solid var(--input-border)',
      color: 'var(--text-primary)',
      outline: 'none',
      fontSize: '0.875rem',
      cursor: 'pointer',
      minWidth: '130px',
      appearance: 'none' as const,
      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center',
      backgroundSize: '16px'
    };

    if (activeTab === 'submissions') {
      return (
        <>
          <select
            value={filterClass}
            onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
            style={selectStyle}
          >
            <option value="">Tất cả Lớp</option>
            {classes.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterStage}
            onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
            style={selectStyle}
          >
            <option value="">Tất cả Giai đoạn</option>
            <option value="Lý thuyết">Lý thuyết</option>
            <option value="Checkpoint 1">Checkpoint 1</option>
            <option value="Checkpoint 2">Checkpoint 2</option>
            <option value="Sản phẩm cuối khóa">Sản phẩm cuối khóa</option>
            <option value="Thuyết trình">Thuyết trình</option>
          </select>

          {currentUser?.role === 'admin' && (
            <select
              value={filterTeacher}
              onChange={(e) => { setFilterTeacher(e.target.value); setCurrentPage(1); }}
              style={selectStyle}
            >
              <option value="">Tất cả Giáo viên</option>
              {teachers.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          )}
        </>
      );
    }

    if (activeTab === 'students') {
      return (
        <>
          <select
            value={filterClass}
            onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
            style={selectStyle}
          >
            <option value="">Tất cả Lớp</option>
            {classes.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={selectStyle}
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Bị khóa</option>
          </select>
        </>
      );
    }

    if (activeTab === 'classes' && currentUser?.role === 'admin') {
      return (
        <select
          value={filterTeacher}
          onChange={(e) => { setFilterTeacher(e.target.value); setCurrentPage(1); }}
          style={selectStyle}
        >
          <option value="">Tất cả Giáo viên</option>
          {teachers.map((t, idx) => (
            <option key={idx} value={t}>{t}</option>
          ))}
        </select>
      );
    }

    if (activeTab === 'users' && currentUser?.role === 'admin') {
      return (
        <>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
            style={selectStyle}
          >
            <option value="">Tất cả Vai trò</option>
            <option value="admin">Quản trị viên</option>
            <option value="teacher">Giáo viên</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={selectStyle}
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Bị khóa</option>
          </select>
        </>
      );
    }

    return null;
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
          Trang Quản Trị Hệ Thống
        </h2>
        <p className="subtitle">Quản lý toàn bộ tài khoản, lớp học, học viên và bài nộp</p>
      </div>

      <main style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', marginBottom: '4rem' }}>
        
        {/* Tabs Control */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'overview', label: 'Tổng quan', adminOnly: false },
            { id: 'users', label: 'Quản lý Tài khoản', adminOnly: true },
            { id: 'classes', label: 'Quản lý Lớp học', adminOnly: false },
            { id: 'students', label: 'Quản lý Học viên', adminOnly: false },
            { id: 'submissions', label: 'Quản lý Bài nộp', adminOnly: false }
          ].filter(tab => currentUser?.role === 'admin' || !tab.adminOnly).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setError('');
              }}
              className="admin-tab-btn"
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '1.05rem',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                position: 'relative',
                transition: 'var(--transition-fast)'
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2.5px', background: 'var(--primary)', borderRadius: '2px' }}></div>
              )}
            </button>
          ))}
        </div>

        {/* Feedback Messages */}

        {/* Dashboard Card */}
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          
          {/* Header Controls for CRUD */}
          {activeTab !== 'overview' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Search & Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 auto', minWidth: '280px' }}>
                <div className="search-wrapper-container">
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      color: 'var(--text-muted)',
                      opacity: 0.7,
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="form-input-field"
                    style={{
                      paddingLeft: '36px',
                      paddingRight: searchInput ? '36px' : '12px',
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      boxShadow: 'none'
                    }}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="clear-search-btn"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {renderFilters()}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedIds.length > 0 && (activeTab !== 'submissions' || currentUser?.role === 'admin' || currentUser?.role === 'teacher') && (
                   <button className="btn btn-danger" onClick={handleBulkDelete} style={{ height: 'auto', padding: '0 1rem' }}>Xóa {selectedIds.length} mục</button>
                )}
                {selectedIds.length > 0 && (activeTab === 'users' || activeTab === 'students') && (
                   <>
                     <button className="btn btn-neutral" onClick={() => handleBulkUpdateStatus('active')} style={{ height: 'auto', padding: '0 1rem' }}>Mở khóa</button>
                     <button className="btn btn-neutral" onClick={() => handleBulkUpdateStatus('inactive')} style={{ height: 'auto', padding: '0 1rem' }}>Khóa</button>
                   </>
                )}
                {activeTab !== 'submissions' && (
                  <button
                    className="btn btn-primary"
                    onClick={handleOpenCreateModal}
                    style={{
                      height: 'auto',
                      padding: '0 1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    Thêm mới
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loader */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              Đang tải dữ liệu...
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              
              {/* --- TỔNG QUAN --- */}
              {activeTab === 'overview' && dashboardStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {currentUser?.role === 'admin' && (
                    <>
                      <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <h3>Tài khoản</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.users}</h1>
                      </div>
                      <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <h3>Giáo viên</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.teachers}</h1>
                      </div>
                    </>
                  )}
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Lớp học</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.classes}</h1>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Học viên</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.students}</h1>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h3>Bài nộp</h3><h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '0.5rem 0' }}>{dashboardStats.submissions}</h1>
                  </div>
                </div>
              )}
              

              {/* --- BẢNG TÀI KHOẢN --- */}
              {activeTab === 'users' && (
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, users)} checked={users.length > 0 && selectedIds.length === users.length} /></th>
                      <th style={{ padding: '1rem' }}>Tên đăng nhập</th>
                      <th style={{ padding: '1rem' }}>Tên hiển thị</th>
                      <th style={{ padding: '1rem' }}>Email</th>
                      <th style={{ padding: '1rem' }}>Trạng thái</th>
                      <th style={{ padding: '1rem' }}>Quyền hạn</th>
                      <th style={{ padding: '1rem' }}>Ngày tạo</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Tên đăng nhập" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{preventOrphan(item.username)}</td>
                        <td data-label="Tên hiển thị" style={{ padding: '1rem' }}>{preventOrphan(item.displayName)}</td>
                        <td data-label="Email" style={{ padding: '1rem' }}>{preventOrphan(item.email || '-')}</td>
                        <td data-label="Trạng thái" style={{ padding: '1rem' }}>
                          <span style={{ color: item.status === 'inactive' ? '#ff8a8a' : 'var(--success)', fontWeight: '600' }}>
                            {preventOrphan(item.status === 'inactive' ? 'Đã khóa' : 'Hoạt động')}
                          </span>
                        </td>
                        <td data-label="Quyền hạn" style={{ padding: '1rem' }}>
                          <span style={{
                            background: item.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: item.role === 'admin' ? 'var(--secondary)' : 'var(--primary)',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600'
                          }}>
                            {preventOrphan(item.role === 'admin' ? 'Quản trị viên' : 'Giáo viên')}
                          </span>
                        </td>
                        <td data-label="Ngày tạo" style={{ padding: '1rem' }}>{preventOrphan(formatDate(item.createdAt))}</td>
                        <td data-label="Thao tác" style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-neutral" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleOpenEditModal(item)}>Sửa</button>
                          {item.username !== 'admin' && item.username !== currentUser?.username && item.role !== currentUser?.role && (
                            <button className="btn btn-danger" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(item._id)}>Xóa</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* --- BẢNG LỚP HỌC --- */}
              {activeTab === 'classes' && (
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, classes)} checked={classes.length > 0 && selectedIds.length === classes.length} /></th>
                      <th style={{ padding: '1rem' }}>Tên lớp học</th>
                      <th style={{ padding: '1rem' }}>Giáo viên phụ trách</th>
                      <th style={{ padding: '1rem' }}>Lịch học & Cài đặt</th>
                      <th style={{ padding: '1rem' }}>Hạn chót các cổng nộp</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Sĩ số</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Tên lớp học" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{preventOrphan(item.name)}</td>
                        <td data-label="Giáo viên phụ trách" style={{ padding: '1rem' }}>{preventOrphan(item.teacherName)}</td>
                        <td data-label="Lịch học & Cài đặt" style={{ padding: '1rem', fontSize: '0.825rem', lineHeight: '1.4' }}>
                          <div><strong style={{ color: '#ccc' }}>{preventOrphan('Bắt đầu:')}</strong> {preventOrphan(item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : 'Chưa đặt')}</div>
                          <div><strong style={{ color: '#ccc' }}>{preventOrphan('Giờ học:')}</strong> {preventOrphan(`${item.startTime || '08:00'} - ${item.endTime || '10:00'}`)}</div>
                        </td>
                        <td data-label="Thời gian nộp các cổng nộp" style={{ padding: '1rem', fontSize: '0.825rem', lineHeight: '1.4' }}>
                          <div><strong style={{ color: '#ccc' }}>{preventOrphan('CP1:')}</strong> {getMilestoneRangeDisplay(item, 'cp1')}</div>
                          <div><strong style={{ color: '#ccc' }}>{preventOrphan('CP2:')}</strong> {getMilestoneRangeDisplay(item, 'cp2')}</div>
                          <div><strong style={{ color: '#ccc' }}>{preventOrphan('SPCK:')}</strong> {getMilestoneRangeDisplay(item, 'spck')}</div>
                          <div><strong style={{ color: '#ccc' }}>{preventOrphan('Thuyết trình:')}</strong> {getMilestoneRangeDisplay(item, 'presentation')}</div>
                        </td>
                        <td data-label="Sĩ số" style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            color: 'var(--primary)', 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.85rem', 
                            fontWeight: '700' 
                          }}>
                            {item.studentCount ?? 0} học viên
                          </span>
                        </td>
                        <td data-label="Thao tác" style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-neutral" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleOpenEditModal(item)}>Sửa</button>
                          <button className="btn btn-danger" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(item._id)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* --- BẢNG HỌC VIÊN --- */}
              {activeTab === 'students' && (
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, students)} checked={students.length > 0 && selectedIds.length === students.length} /></th>
                      <th style={{ padding: '1rem' }}>Tên học viên</th>
                      <th style={{ padding: '1rem' }}>Mã lớp học</th>
                      <th style={{ padding: '1rem' }}>Mã tra cứu học viên</th>
                      <th style={{ padding: '1rem' }}>Số bài nộp</th>
                      <th style={{ padding: '1rem' }}>Trạng thái</th>
                      <th style={{ padding: '1rem' }}>Giới hạn tải lên</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Tên học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{preventOrphan(item.name)}</td>
                        <td data-label="Mã lớp học" style={{ padding: '1rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {preventOrphan(item.className)}
                          </span>
                        </td>
                        <td data-label="Mã tra cứu" style={{ padding: '1rem', color: 'var(--success)', fontWeight: '600' }}>{preventOrphan(item.studentCode)}</td>
                        <td data-label="Số bài nộp" style={{ padding: '1rem' }}>
                          <span style={{ color: item.submissionCount && item.submissionCount > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600' }}>
                            {preventOrphan(item.submissionCount || 0)}
                          </span>
                        </td>
                        <td data-label="Trạng thái" style={{ padding: '1rem' }}>
                          <span style={{ color: item.status === 'inactive' ? '#ff8a8a' : 'var(--success)', fontWeight: '600' }}>
                            {preventOrphan(item.status === 'inactive' ? 'Đã khóa' : 'Hoạt động')}
                          </span>
                        </td>
                        <td data-label="Giới hạn tải lên" style={{ padding: '1rem', fontWeight: '500' }}>{preventOrphan(`${item.maxUploadSize || 20} MB`)}</td>
                        <td data-label="Thao tác" style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-neutral" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleOpenEditModal(item)}>Sửa</button>
                          <button className="btn btn-danger" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(item._id)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {activeTab !== 'overview' && totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="btn btn-neutral">Trước</button>
                  <span style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>Trang {currentPage} / {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="btn btn-neutral">Sau</button>
                </div>
              )}

              {/* --- BẢNG BÀI NỘP --- */}
              {activeTab === 'submissions' && (
                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" onChange={(e) => handleSelectAll(e, submissions)} checked={submissions.length > 0 && selectedIds.length === submissions.length} /></th>
                      <th style={{ padding: '1rem' }}>Học viên</th>
                      <th style={{ padding: '1rem' }}>Lớp</th>
                      <th style={{ padding: '1rem' }}>Giai đoạn/Buổi</th>
                      <th style={{ padding: '1rem' }}>File</th>
                      <th style={{ padding: '1rem' }}>Ghi chú</th>
                      <th style={{ padding: '1rem' }}>Ngày nộp</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{preventOrphan(item.fullName)}</td>
                        <td data-label="Lớp" style={{ padding: '1rem' }}>{preventOrphan(item.className)}</td>
                        <td data-label="Giai đoạn/Buổi" style={{ padding: '1rem' }}>{preventOrphan(`${item.stage} (${item.session})`)}</td>
                        <td data-label="File/Liên kết" style={{ padding: '1rem' }}>
                          {item.fileUrl ? (
                            (() => {
                              const isCanva = item.fileUrl.includes('canva.com') || item.fileUrl.includes('canva.link');
                              const isDrive = item.fileUrl.includes('drive.google.com') || item.fileUrl.includes('docs.google.com');
                              const isMega = item.fileUrl.includes('mega.nz') || item.fileUrl.includes('mega.co.nz');
                              
                              let badgeColor = '#818cf8';
                              let badgeBg = 'rgba(99, 102, 241, 0.08)';
                              let badgeBorder = '1px solid rgba(99, 102, 241, 0.2)';
                              let dotColor = '#6366f1';
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
                                labelText = item.fileUrl.includes('presentation') ? 'Google Slides' : 'Google Drive';
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
                                  href={item.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title={item.fileName}
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
                                    transition: 'all 0.2s'
                                  }}
                                  className="submission-link-badge"
                                >
                                  {isDot ? (
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }}></span>
                                  ) : (
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                    </svg>
                                  )}
                                  <span>{labelText}</span>
                                </a>
                              );
                            })()
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Không có tệp</span>
                          )}
                        </td>
                        <td data-label="Ghi chú" style={{ padding: '1rem' }}>
                          {item.notes ? (
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
                              onClick={() => handleShowNotes(item.notes || '', item.fullName)}
                            >
                              Xem chi tiết
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Không có ghi chú</span>
                          )}
                        </td>
                        <td data-label="Ngày nộp" style={{ padding: '1rem' }}>{preventOrphan(formatDate(item.createdAt))}</td>
                        <td data-label="Thao tác" style={{ padding: '1rem', textAlign: 'center' }}>
                          {currentUser?.role === 'admin' || currentUser?.role === 'teacher' ? (
                            <button className="btn btn-danger" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(item._id)}>Xóa</button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Không có quyền xóa</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!isLoading && (
                (activeTab === 'users' && users.length === 0) ||
                (activeTab === 'teachers' && teachersDataList.length === 0) ||
                (activeTab === 'classes' && classes.length === 0) ||
                (activeTab === 'students' && students.length === 0) ||
                (activeTab === 'submissions' && submissions.length === 0)
              ) && (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Không có bản ghi nào.
                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* --- FORM MODAL CRUD --- */}
      {showModal && (
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
            padding: 'max(1.5rem, 5vw)', 
            animation: 'scaleUp 0.3s ease-out', 
            maxHeight: '90vh', 
            overflowY: 'auto' 
          }}>
            <h3 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: '700', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>
              {editingId ? 'Cập Nhật Thông Tin' : 'Tạo Bản Ghi Mới'}
            </h3>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} autoComplete="off">
              
              {/* --- User Form Fields --- */}
              {activeTab === 'users' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Tên đăng nhập</label>
                    <input
                      type="text"
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value)}
                      placeholder="Ví dụ: giaovien1"
                      className="form-input-field"
                      required
                      disabled={editingId ? (users.find(u => u._id === editingId)?.username === 'admin') : false}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">{editingId ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Mật khẩu bí mật..."
                      className="form-input-field"
                      required={!editingId}
                      autoComplete="new-password"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Tên hiển thị</label>
                    <input
                      type="text"
                      value={userDisplayName}
                      onChange={(e) => setUserDisplayName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="form-input-field"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Vai trò</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="form-select-field"
                      required
                    >
                      <option value="admin">Quản trị viên</option>
                      <option value="teacher">Giáo viên</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Trạng thái hoạt động</label>
                    <select
                      value={userStatus}
                      onChange={(e) => setUserStatus(e.target.value)}
                      className="form-select-field"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Không hoạt động (Khóa)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Email</label>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="Nhập email nhận thông báo..."
                        className="form-input-field"
                        style={{ flex: 1 }}
                      />
                      {editingId && userRole === 'teacher' && userEmail && (
                        <button
                          type="button"
                          onClick={handleAdminUnlinkGoogle}
                          className="btn btn-danger"
                          style={{
                            height: '2.7rem',
                            padding: '0 1rem',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ff8a8a',
                            cursor: 'pointer'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" style={{ flexShrink: 0 }}>
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          Hủy liên kết Google
                        </button>
                      )}
                    </div>
                    <small style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                      💡 Email này được liên kết tự động sau khi Giáo viên đăng nhập bằng Google lần đầu tiên. Email này dùng để nhận thông báo nộp bài và khôi phục mật khẩu.
                    </small>
                  </div>
                </>
              )}

              {/* --- Class Form Fields --- */}
              {activeTab === 'classes' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Tên lớp học</label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="Ví dụ: HCM4"
                      className="form-input-field"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Tên giáo viên phụ trách</label>
                    <select
                      value={classTeacher}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClassTeacher(val);
                        if (val === '__NEW_TEACHER__') {
                          setIsNewTeacher(true);
                        } else {
                          setIsNewTeacher(false);
                        }
                      }}
                      className="form-select-field"
                      required
                      disabled={currentUser?.role === 'teacher'}
                    >
                      {currentUser?.role === 'teacher' ? (
                        <option value={currentUser.displayName}>{currentUser.displayName}</option>
                      ) : (
                        <>
                          <option value="">-- Chọn giáo viên --</option>
                          {teachers.map((tName, index) => (
                            <option key={`${tName}-${index}`} value={tName}>
                              {tName}
                            </option>
                          ))}
                          <option value="__NEW_TEACHER__">+ Thêm giáo viên mới...</option>
                        </>
                      )}
                    </select>
                  </div>
                  {isNewTeacher && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <label className="form-label">Tên giáo viên mới</label>
                        <input
                          type="text"
                          value={newTeacherName}
                          onChange={(e) => setNewTeacherName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="form-input-field"
                          required
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <label className="form-label">Tên đăng nhập giáo viên mới</label>
                        <input
                          type="text"
                          value={newTeacherUsername}
                          onChange={(e) => setNewTeacherUsername(e.target.value)}
                          placeholder="Ví dụ: giaovien1"
                          className="form-input-field"
                          required
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <label className="form-label">Mật khẩu giáo viên mới</label>
                        <input
                          type="password"
                          value={newTeacherPassword}
                          onChange={(e) => setNewTeacherPassword(e.target.value)}
                          placeholder={`Để trống nếu lấy mặc định là Mindx@${new Date().getFullYear()}...`}
                          className="form-input-field"
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* === Date & time inputs === */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Ngày bắt đầu lớp học</label>
                      <DateInput
                        value={classStartDate}
                        onChange={(val) => {
                          setClassStartDate(val);
                          if (val) {
                            setClassCp1StartDate(calcAutoDeadline(val, 28, classStartTime));
                            setClassCp1Deadline(calcAutoDeadline(val, 28, classEndTime));
                            setClassCp2StartDate(calcAutoDeadline(val, 56, classStartTime));
                            setClassCp2Deadline(calcAutoDeadline(val, 56, classEndTime));
                            setClassSpckStartDate(calcAutoDeadline(val, 0, classStartTime));
                            setClassSpckDeadline(calcAutoDeadline(val, 85, classEndTime));
                            setClassPresentationStartDate(calcAutoDeadline(val, 0, classStartTime));
                            setClassPresentationDeadline(calcAutoDeadline(val, 91, classEndTime));
                          } else {
                            setClassCp1StartDate('');
                            setClassCp1Deadline('');
                            setClassCp2StartDate('');
                            setClassCp2Deadline('');
                            setClassSpckStartDate('');
                            setClassSpckDeadline('');
                            setClassPresentationStartDate('');
                            setClassPresentationDeadline('');
                          }
                        }}
                        className="form-input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Giờ học bắt đầu</label>
                      <input
                        type="time"
                        value={classStartTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClassStartTime(val);
                          if (classStartDate) {
                            setClassCp1StartDate(calcAutoDeadline(classStartDate, 28, val));
                            setClassCp2StartDate(calcAutoDeadline(classStartDate, 56, val));
                            setClassSpckStartDate(calcAutoDeadline(classStartDate, 0, val));
                            setClassPresentationStartDate(calcAutoDeadline(classStartDate, 0, val));
                          }
                        }}
                        className="form-input-field"
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Giờ học kết thúc</label>
                      <input
                        type="time"
                        value={classEndTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClassEndTime(val);
                          if (classStartDate) {
                            setClassCp1Deadline(calcAutoDeadline(classStartDate, 28, val));
                            setClassCp2Deadline(calcAutoDeadline(classStartDate, 56, val));
                            setClassSpckDeadline(calcAutoDeadline(classStartDate, 85, val));
                            setClassPresentationDeadline(calcAutoDeadline(classStartDate, 91, val));
                          }
                        }}
                        className="form-input-field"
                        required
                      />
                    </div>
                  </div>

                  {/* === Milestones deadlines configuration === */}
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📅 Thời gian mở và hạn chót nộp bài
                    </div>
                    
                    {[
                      { 
                        title: 'Checkpoint 1 (Buổi 5)', 
                        startVal: classCp1StartDate, 
                        startSetter: setClassCp1StartDate,
                        endVal: classCp1Deadline, 
                        endSetter: setClassCp1Deadline,
                        lateType: classCp1LateType,
                        lateTypeSetter: setClassCp1LateType,
                        lateDeadline: classCp1LateDeadline,
                        lateDeadlineSetter: setClassCp1LateDeadline,
                        color: 'rgba(99, 102, 241, 0.08)',
                        borderColor: 'rgba(99, 102, 241, 0.2)',
                        titleColor: '#a5b4fc'
                      },
                      { 
                        title: 'Checkpoint 2 (Buổi 9)', 
                        startVal: classCp2StartDate, 
                        startSetter: setClassCp2StartDate,
                        endVal: classCp2Deadline, 
                        endSetter: setClassCp2Deadline,
                        lateType: classCp2LateType,
                        lateTypeSetter: setClassCp2LateType,
                        lateDeadline: classCp2LateDeadline,
                        lateDeadlineSetter: setClassCp2LateDeadline,
                        color: 'rgba(16, 185, 129, 0.08)',
                        borderColor: 'rgba(16, 185, 129, 0.2)',
                        titleColor: '#a7f3d0'
                      },
                      { 
                        title: 'Sản phẩm cuối khóa (Buổi 10-14)', 
                        startVal: classSpckStartDate, 
                        startSetter: setClassSpckStartDate,
                        endVal: classSpckDeadline, 
                        endSetter: setClassSpckDeadline,
                        lateType: classSpckLateType,
                        lateTypeSetter: setClassSpckLateType,
                        lateDeadline: classSpckLateDeadline,
                        lateDeadlineSetter: setClassSpckLateDeadline,
                        color: 'rgba(236, 72, 153, 0.08)',
                        borderColor: 'rgba(236, 72, 153, 0.2)',
                        titleColor: '#fbcfe8'
                      },
                      { 
                        title: 'Bài thuyết trình (Buổi tự do)', 
                        startVal: classPresentationStartDate, 
                        startSetter: setClassPresentationStartDate,
                        endVal: classPresentationDeadline, 
                        endSetter: setClassPresentationDeadline,
                        lateType: classPresentationLateType,
                        lateTypeSetter: setClassPresentationLateType,
                        lateDeadline: classPresentationLateDeadline,
                        lateDeadlineSetter: setClassPresentationLateDeadline,
                        color: 'rgba(59, 130, 246, 0.08)',
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                        titleColor: '#93c5fd'
                      }
                    ].map((cp, idx) => (
                      <div key={idx} style={{
                        padding: '0.85rem',
                        marginBottom: idx < 3 ? '0.75rem' : 0,
                        borderRadius: '10px',
                        background: cp.color,
                        border: `1px solid ${cp.borderColor}`
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: cp.titleColor, marginBottom: '0.6rem' }}>
                          {cp.title}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', color: '#bbb' }}>🟢 Mở nộp bài</label>
                            <DateTimeInput
                              value={cp.startVal}
                              onChange={cp.startSetter}
                              className="form-input-field"
                              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                            />
                          </div>
                          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', color: '#bbb' }}>🔴 Hạn chót nộp</label>
                            <DateTimeInput
                              value={cp.endVal}
                              onChange={cp.endSetter}
                              className="form-input-field"
                              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: cp.lateType === 'limited' ? '1fr 1.2fr' : '1fr', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <label className="form-label" style={{ fontSize: '0.75rem', color: '#bbb' }}>Cho phép nộp muộn</label>
                              <select
                                value={cp.lateType}
                                onChange={(e) => cp.lateTypeSetter(e.target.value)}
                                className="form-select-field"
                                style={{ fontSize: '0.82rem', padding: '6px 24px 6px 10px', height: '2.2rem' }}
                              >
                                <option value="none">Không cho phép</option>
                                <option value="unlimited">Vô thời hạn</option>
                                <option value="limited">Có thời gian</option>
                              </select>
                            </div>
                            {cp.lateType === 'limited' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: '#bbb' }}>Hạn chót nộp muộn</label>
                                <DateTimeInput
                                  value={cp.lateDeadline}
                                  onChange={cp.lateDeadlineSetter}
                                  className="form-input-field"
                                  style={{ fontSize: '0.82rem', padding: '6px 10px', height: '2.2rem' }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* --- Teacher Form Fields --- */}
              {activeTab === 'teachers' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Tên giáo viên</label>
                    <input
                      type="text"
                      value={teacherNameInput}
                      onChange={(e) => setTeacherNameInput(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="form-input-field"
                      required
                      autoComplete="off"
                    />
                  </div>
                  {!editingId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Tên đăng nhập tài khoản giáo viên</label>
                      <input
                        type="text"
                        value={newTeacherUsername}
                        onChange={(e) => setNewTeacherUsername(e.target.value)}
                        placeholder="Ví dụ: nguyenvana"
                        className="form-input-field"
                        required
                        autoComplete="off"
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">
                      {editingId ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu tài khoản giáo viên'}
                    </label>
                    <input
                      type="password"
                      value={newTeacherPassword}
                      onChange={(e) => setNewTeacherPassword(e.target.value)}
                      placeholder={editingId ? 'Mật khẩu mới...' : `Để trống nếu lấy mặc định là Mindx@${new Date().getFullYear()}...`}
                      className="form-input-field"
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}

              {/* --- Student Form Fields --- */}
              {activeTab === 'students' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Tên học viên</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn Nam"
                      className="form-input-field"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Lớp học</label>
                    <select
                      value={studentClass}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentClass(val);
                        if (val === '__NEW_CLASS__') {
                          setIsNewClass(true);
                        } else {
                          setIsNewClass(false);
                        }
                      }}
                      className="form-select-field"
                      required
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls.name}>
                          {cls.name} ({cls.teacherName})
                        </option>
                      ))}
                      <option value="__NEW_CLASS__">+ Thêm lớp mới...</option>
                    </select>
                  </div>
                  {isNewClass && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <label className="form-label">Tên lớp học mới</label>
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="Ví dụ: HCM4"
                        className="form-input-field"
                        required
                        autoComplete="off"
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Mã tra cứu học viên</label>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      placeholder="Để trống để tự động sinh mã (Ví dụ: Nguyễn Văn A -> anv)..."
                      className="form-input-field"
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="form-label">Trạng thái hoạt động</label>
                    <select
                      value={studentStatus}
                      onChange={(e) => setStudentStatus(e.target.value)}
                      className="form-select-field"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Không hoạt động (Khóa)</option>
                    </select>
                  </div>
                  {currentUser?.role === 'admin' || currentUser?.role === 'teacher' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Giới hạn tải lên (MB)</label>
                      <input
                        type="number"
                        value={studentMaxUploadSize}
                        onChange={(e) => setStudentMaxUploadSize(Number(e.target.value))}
                        placeholder="Ví dụ: 200"
                        className="form-input-field"
                        min="1"
                        required
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Giới hạn tải lên (MB) - Chỉ Admin và Giáo viên được sửa</label>
                      <input
                        type="number"
                        value={studentMaxUploadSize}
                        className="form-input-field"
                        disabled
                      />
                    </div>
                  )}
                </>
              )}

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: '#fce8e6',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  marginTop: '0.5rem'
                }}>
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Lưu lại
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

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
