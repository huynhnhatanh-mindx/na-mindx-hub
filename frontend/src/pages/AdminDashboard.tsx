import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

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
  checkpoint1Deadline?: string;
  checkpoint2Deadline?: string;
  finalProjectDeadline?: string;
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
  createdAt: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teachers' | 'classes' | 'students' | 'submissions' | 'audit_logs'>('overview');
  
  // Pagination & Bulk
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
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

  const [classAllowLateUpload, setClassAllowLateUpload] = useState(false);
  // Late upload override deadlines (only used when allowLateUpload is checked)
  const [lateOverrideCp1, setLateOverrideCp1] = useState('');
  const [lateOverrideCp2, setLateOverrideCp2] = useState('');
  const [lateOverrideSpck, setLateOverrideSpck] = useState('');

  // Student form states
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [isNewClass, setIsNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [studentMaxUploadSize, setStudentMaxUploadSize] = useState<number>(20);
  const [studentStatus, setStudentStatus] = useState('active');

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
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchQuery]);

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
      } else if (activeTab === 'audit_logs') {
        const auditParams = new URLSearchParams({ page: currentPage.toString(), limit: '15' });
        if (searchQuery) auditParams.append('search', searchQuery);
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/audit-logs?${auditParams}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải nhật ký hoạt động.');
        const { data, totalPages } = await res.json();
        setAuditLogs(data);
        setTotalPages(totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGroupedAuditLogs = () => {
    if (!auditLogs || auditLogs.length === 0) return [];
    const grouped: any[][] = [];
    let currentGroup: any[] = [];
    
    for (let i = 0; i < auditLogs.length; i++) {
      const log = auditLogs[i];
      if (currentGroup.length === 0) {
        currentGroup.push(log);
      } else {
        const lastLog = currentGroup[currentGroup.length - 1];
        const timeDiff = Math.abs(new Date(log.createdAt).getTime() - new Date(lastLog.createdAt).getTime());
        // Group if same user and within 15 seconds
        if (log.user === lastLog.user && timeDiff <= 15000) {
          currentGroup.push(log);
        } else {
          grouped.push(currentGroup);
          currentGroup = [log];
        }
      }
    }
    if (currentGroup.length > 0) {
      grouped.push(currentGroup);
    }
    return grouped;
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
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
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} mục này?`)) return;
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
      fetchData();
    } catch (err: any) {
      alert(err.message);
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
      fetchData();
    } catch (err: any) {
      alert(err.message);
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

  // Computed auto-deadline strings (recalculated on every render from state)
  const autoCp1 = calcAutoDeadline(classStartDate, 28, classEndTime);
  const autoCp2 = calcAutoDeadline(classStartDate, 56, classEndTime);
  const autoSpck = calcAutoDeadline(classStartDate, 85, classEndTime);

  // Format a datetime-local string for Vietnamese display
  const formatDeadlineDisplay = (dtStr: string): string => {
    if (!dtStr) return 'Chưa xác định (chọn ngày bắt đầu & giờ kết thúc)';
    try {
      const d = new Date(`${dtStr}:00+07:00`);
      if (isNaN(d.getTime())) return dtStr;
      return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dtStr;
    }
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
    setClassAllowLateUpload(false);
    setLateOverrideCp1('');
    setLateOverrideCp2('');
    setLateOverrideSpck('');
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
      setClassAllowLateUpload(!!item.allowLateUpload);
      // If allowLateUpload is on, check if there were manual overrides stored
      // We compare stored deadlines with auto-computed to detect overrides
      const sd = toLocalYYYYMMDD(item.startDate);
      const et = item.endTime || '10:00';
      const autoC1 = calcAutoDeadline(sd, 28, et);
      const autoC2 = calcAutoDeadline(sd, 56, et);
      const autoSp = calcAutoDeadline(sd, 85, et);
      const storedC1 = toLocalYYYYMMDDTHHMM(item.checkpoint1Deadline);
      const storedC2 = toLocalYYYYMMDDTHHMM(item.checkpoint2Deadline);
      const storedSp = toLocalYYYYMMDDTHHMM(item.finalProjectDeadline);
      // If stored deadline differs from auto, it's an override
      setLateOverrideCp1(storedC1 && storedC1 !== autoC1 ? storedC1 : '');
      setLateOverrideCp2(storedC2 && storedC2 !== autoC2 ? storedC2 : '');
      setLateOverrideSpck(storedSp && storedSp !== autoSp ? storedSp : '');
      
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
      // Determine the effective deadlines to send:
      // If allowLateUpload is ON and an override is set, use the override.
      // Otherwise, send null so the backend will auto-compute from startDate + offset.
      let effectiveCp1: string | null = null;
      let effectiveCp2: string | null = null;
      let effectiveSpck: string | null = null;

      if (classAllowLateUpload) {
        // Validate overrides: must be > auto-calculated deadline
        if (lateOverrideCp1) {
          if (autoCp1 && lateOverrideCp1 <= autoCp1) {
            setError('Hạn gia hạn CP1 phải lớn hơn hạn chót tự động.');
            return;
          }
          effectiveCp1 = lateOverrideCp1;
        }
        if (lateOverrideCp2) {
          if (autoCp2 && lateOverrideCp2 <= autoCp2) {
            setError('Hạn gia hạn CP2 phải lớn hơn hạn chót tự động.');
            return;
          }
          effectiveCp2 = lateOverrideCp2;
        }
        if (lateOverrideSpck) {
          if (autoSpck && lateOverrideSpck <= autoSpck) {
            setError('Hạn gia hạn SPCK phải lớn hơn hạn chót tự động.');
            return;
          }
          effectiveSpck = lateOverrideSpck;
        }
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
        checkpoint1Deadline: effectiveCp1,
        checkpoint2Deadline: effectiveCp2,
        finalProjectDeadline: effectiveSpck,
        allowLateUpload: classAllowLateUpload
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
                alert('Tên đăng nhập của bạn đã thay đổi. Vui lòng đăng nhập lại.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
              }
              if (userRole !== currentUser.role) {
                alert('Quyền của bạn đã bị thay đổi (xuống cấp). Vui lòng đăng nhập lại.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
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

      alert(editingId ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
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

      alert('Xóa thành công!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Đã xảy ra lỗi khi xóa.');
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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('vi-VN');
    } catch (e) {
      return dateStr;
    }
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
            { id: 'submissions', label: 'Quản lý Bài nộp', adminOnly: false },
            { id: 'audit_logs', label: 'Nhật ký Hoạt động', adminOnly: false }
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
          
          {/* Header Controls for CRUD (Users, Classes, Students) */}
          {/* Audit_logs tab: không có nút thêm/xóa — đây là thiết kế cố ý để bảo toàn tính bất biến của nhật ký */}
          {activeTab !== 'overview' && activeTab !== 'audit_logs' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Search */}
              <div className="search-wrapper-container">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: 'var(--text-muted)',
                    opacity: 0.7,
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedIds.length > 0 && activeTab !== 'submissions' && (
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
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
              
              {/* --- NHẬT KÝ HOẠT ĐỘNG --- */}
              {activeTab === 'audit_logs' && (
                <div>
                  {/* Info banner */}
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.06)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '10px',
                    padding: '0.85rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>Nhật ký chỉ đọc</strong> —
                      {currentUser?.role === 'admin'
                        ? ' Hiển thị toàn bộ hoạt động hệ thống. Nhật ký được bảo vệ và không thể xóa.'
                        : ' Hiển thị hoạt động của tài khoản bạn. Nhật ký được bảo vệ và không thể xóa.'}
                    </span>
                  </div>

                  <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                        <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Thời gian</th>
                        <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Người thực hiện</th>
                        <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Hành động</th>
                        <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Loại đối tượng</th>
                        <th style={{ padding: '1rem' }}>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chưa có nhật ký hoạt động nào.
                          </td>
                        </tr>
                      ) : getGroupedAuditLogs().map((group: any[]) => {
                        const firstLog = group[0];
                        const groupKey = firstLog._id;
                        const isExpanded = !!expandedGroups[groupKey];
                        
                        const actionColors: Record<string, string> = {
                          'CREATE': '#10b981',
                          'UPDATE': '#6366f1',
                          'PROFILE_UPDATE': '#6366f1',
                          'DELETE': '#ef4444',
                          'BULK_DELETE': '#ef4444',
                          'BULK_UPDATE_STATUS': '#f59e0b',
                          'UPLOAD': '#06b6d4',
                          'BULK_UPDATE': '#f59e0b'
                        };
                        const roleBadgeColor: Record<string, {bg: string, color: string}> = {
                          'admin': { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },
                          'teacher': { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' },
                          'student': { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
                        };
                        const roleBadge = roleBadgeColor[firstLog.role] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' };

                        if (group.length === 1) {
                          const log = firstLog;
                          const actionColor = actionColors[log.action] || 'var(--text-secondary)';
                          return (
                            <tr
                              key={log._id}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <td data-label="Thời gian" style={{ padding: '1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(log.createdAt).toLocaleString('vi-VN')}
                              </td>
                              <td data-label="Người thực hiện" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.user}</span>
                                  {log.role && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      padding: '1px 6px',
                                      borderRadius: '99px',
                                      background: roleBadge.bg,
                                      color: roleBadge.color
                                    }}>
                                      {log.role}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td data-label="Hành động" style={{ padding: '1rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  background: `${actionColor}20`,
                                  color: actionColor,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {log.action}
                                </span>
                              </td>
                              <td data-label="Loại đối tượng" style={{ padding: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{log.resource}</span>
                              </td>
                              <td data-label="Chi tiết" style={{ padding: '1rem', color: 'var(--text-secondary)', maxWidth: '350px', wordBreak: 'break-word' }}>
                                {log.details}
                              </td>
                            </tr>
                          );
                        }

                        // Group of multiple logs
                        const uniqueActions = Array.from(new Set(group.map(l => l.action)));
                        const uniqueResources = Array.from(new Set(group.map(l => l.resource)));

                        return (
                          <Fragment key={groupKey}>
                            <tr
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                fontSize: '0.875rem',
                                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                                cursor: 'pointer'
                              }}
                              onClick={() => toggleGroup(groupKey)}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)')}
                            >
                              <td data-label="Thời gian" style={{ padding: '1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                <span style={{ marginRight: '0.5rem', display: 'inline-block', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                {new Date(firstLog.createdAt).toLocaleString('vi-VN')}
                              </td>
                              <td data-label="Người thực hiện" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{firstLog.user}</span>
                                  {firstLog.role && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      padding: '1px 6px',
                                      borderRadius: '99px',
                                      background: roleBadge.bg,
                                      color: roleBadge.color
                                    }}>
                                      {firstLog.role}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td data-label="Hành động" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  {uniqueActions.map(action => {
                                    const actionColor = actionColors[action] || 'var(--text-secondary)';
                                    return (
                                      <span key={action} style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        background: `${actionColor}20`,
                                        color: actionColor,
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {action}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td data-label="Loại đối tượng" style={{ padding: '1rem' }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                  {uniqueResources.join(', ')}
                                </span>
                              </td>
                              <td data-label="Chi tiết" style={{ padding: '1rem', maxWidth: '350px', wordBreak: 'break-word' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.85rem' }}>
                                    {`[Gộp ${group.length} thao tác bởi ${firstLog.user}]:`}
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'normal', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                    {group.map((l, i) => `${i + 1}. ${l.details}`).join('\n')}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem', fontWeight: '700' }}>
                                    {isExpanded ? '▲ Thu gọn chi tiết' : '▼ Mở rộng chi tiết'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && group.map((log: any) => {
                              const actionColor = actionColors[log.action] || 'var(--text-secondary)';
                              return (
                                <tr
                                  key={log._id}
                                  style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255, 255, 255, 0.015)'
                                  }}
                                >
                                  <td data-label="Thời gian" style={{ padding: '0.75rem 1rem 0.75rem 2rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: '0.5rem' }}>└─</span>
                                    {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                                  </td>
                                  <td data-label="Người thực hiện" style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                                    <span style={{ opacity: 0.5 }}>{log.user}</span>
                                  </td>
                                  <td data-label="Hành động" style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      background: `${actionColor}15`,
                                      color: actionColor,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {log.action}
                                    </span>
                                  </td>
                                  <td data-label="Loại đối tượng" style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{log.resource}</span>
                                  </td>
                                  <td data-label="Chi tiết" style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', maxWidth: '350px', wordBreak: 'break-word' }}>
                                    {log.details}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
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
                        <td data-label="Tên đăng nhập" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.username}</td>
                        <td data-label="Tên hiển thị" style={{ padding: '1rem' }}>{item.displayName}</td>
                        <td data-label="Email" style={{ padding: '1rem' }}>{item.email || '-'}</td>
                        <td data-label="Trạng thái" style={{ padding: '1rem' }}>
                          <span style={{ color: item.status === 'inactive' ? '#ff8a8a' : 'var(--success)', fontWeight: '600' }}>
                            {item.status === 'inactive' ? 'Đã khóa' : 'Hoạt động'}
                          </span>
                        </td>
                        <td data-label="Quyền hạn" style={{ padding: '1rem' }}>
                          <span style={{
                            background: item.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: item.role === 'admin' ? 'var(--secondary)' : 'var(--primary)',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600'
                          }}>
                            {item.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}
                          </span>
                        </td>
                        <td data-label="Ngày tạo" style={{ padding: '1rem' }}>{formatDate(item.createdAt)}</td>
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
                        <td data-label="Tên lớp học" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</td>
                        <td data-label="Giáo viên phụ trách" style={{ padding: '1rem' }}>{item.teacherName}</td>
                        <td data-label="Lịch học & Cài đặt" style={{ padding: '1rem', fontSize: '0.825rem', lineHeight: '1.4' }}>
                          <div><strong style={{ color: '#ccc' }}>Bắt đầu:</strong> {item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : 'Chưa đặt'}</div>
                          <div><strong style={{ color: '#ccc' }}>Giờ học:</strong> {item.startTime || '08:00'} - {item.endTime || '10:00'}</div>
                          <div style={{ color: item.allowLateUpload ? 'var(--success)' : '#ff8a8a', fontWeight: '600', marginTop: '2px' }}>
                            {item.allowLateUpload ? '✓ Cho phép nộp muộn' : '✗ Chặn nộp muộn'}
                          </div>
                        </td>
                        <td data-label="Hạn chót các cổng nộp" style={{ padding: '1rem', fontSize: '0.825rem', lineHeight: '1.4' }}>
                          <div>
                            <strong style={{ color: '#ccc' }}>CP1:</strong>{' '}
                            {item.checkpoint1Deadline ? (
                              <span style={{ color: 'var(--success)', fontWeight: '600' }}>{formatDate(item.checkpoint1Deadline)}</span>
                            ) : item.startDate ? (
                              (() => {
                                const d = new Date(item.startDate);
                                d.setDate(d.getDate() + 28);
                                const [h, m] = (item.endTime || '10:00').split(':');
                                d.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
                                return <span style={{ color: '#aaa' }}>{formatDate(d.toISOString())} (Tự động)</span>;
                              })()
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Chưa cấu hình</span>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: '#ccc' }}>CP2:</strong>{' '}
                            {item.checkpoint2Deadline ? (
                              <span style={{ color: 'var(--success)', fontWeight: '600' }}>{formatDate(item.checkpoint2Deadline)}</span>
                            ) : item.startDate ? (
                              (() => {
                                const d = new Date(item.startDate);
                                d.setDate(d.getDate() + 56);
                                const [h, m] = (item.endTime || '10:00').split(':');
                                d.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
                                return <span style={{ color: '#aaa' }}>{formatDate(d.toISOString())} (Tự động)</span>;
                              })()
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Chưa cấu hình</span>
                            )}
                          </div>
                          <div>
                            <strong style={{ color: '#ccc' }}>SPCK:</strong>{' '}
                            {item.finalProjectDeadline ? (
                              <span style={{ color: 'var(--success)', fontWeight: '600' }}>{formatDate(item.finalProjectDeadline)}</span>
                            ) : item.startDate ? (
                              (() => {
                                const d = new Date(item.startDate);
                                d.setDate(d.getDate() + 85);
                                const [h, m] = (item.endTime || '10:00').split(':');
                                d.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
                                return <span style={{ color: '#aaa' }}>{formatDate(d.toISOString())} (Tự động)</span>;
                              })()
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Chưa cấu hình</span>
                            )}
                          </div>
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
                        <td data-label="Tên học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</td>
                        <td data-label="Mã lớp học" style={{ padding: '1rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {item.className}
                          </span>
                        </td>
                        <td data-label="Mã tra cứu" style={{ padding: '1rem', color: 'var(--success)', fontWeight: '600' }}>{item.studentCode}</td>
                        <td data-label="Số bài nộp" style={{ padding: '1rem' }}>
                          <span style={{ color: item.submissionCount && item.submissionCount > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600' }}>
                            {item.submissionCount || 0}
                          </span>
                        </td>
                        <td data-label="Trạng thái" style={{ padding: '1rem' }}>
                          <span style={{ color: item.status === 'inactive' ? '#ff8a8a' : 'var(--success)', fontWeight: '600' }}>
                            {item.status === 'inactive' ? 'Đã khóa' : 'Hoạt động'}
                          </span>
                        </td>
                        <td data-label="Giới hạn tải lên" style={{ padding: '1rem', fontWeight: '500' }}>{item.maxUploadSize || 20} MB</td>
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
                      <th style={{ padding: '1rem' }}>Ngày nộp</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td style={{ padding: '1rem' }}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                        <td data-label="Học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.fullName}</td>
                        <td data-label="Lớp" style={{ padding: '1rem' }}>{item.className}</td>
                        <td data-label="Giai đoạn/Buổi" style={{ padding: '1rem' }}>{item.stage} ({item.session})</td>
                        <td data-label="File" style={{ padding: '1rem' }}>
                          <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>
                            {item.fileName}
                          </a>
                        </td>
                        <td data-label="Ngày nộp" style={{ padding: '1rem' }}>{formatDate(item.createdAt)}</td>
                        <td data-label="Thao tác" style={{ padding: '1rem', textAlign: 'center' }}>
                          {currentUser?.role === 'admin' ? (
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
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="Ví dụ: giaovien@gmail.com"
                      className="form-input-field"
                      autoComplete="off"
                    />
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
                  
                  {/* === Read-only auto-calculated deadlines (shown FIRST) === */}
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📅 Hạn chót tự động (chỉ xem)
                    </div>
                    {[{ label: 'Checkpoint 1 (Buổi 5)', value: autoCp1, offset: '+28 ngày' },
                      { label: 'Checkpoint 2 (Buổi 9)', value: autoCp2, offset: '+56 ngày' },
                      { label: 'SPCK (Buổi 10-14)', value: autoSpck, offset: '+85 ngày' }
                    ].map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.75rem', marginBottom: idx < 2 ? '0.5rem' : 0,
                        borderRadius: '8px',
                        background: item.value ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${item.value ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`
                      }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>{item.label}</span>
                          <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '0.5rem' }}>({item.offset})</span>
                        </div>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: '600',
                          color: item.value ? '#a5b4fc' : '#666',
                          fontFamily: 'monospace'
                        }}>
                          {formatDeadlineDisplay(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* === Date & time inputs === */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Ngày bắt đầu lớp học</label>
                      <input
                        type="date"
                        value={classStartDate}
                        onChange={(e) => setClassStartDate(e.target.value)}
                        className="form-input-field"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Cổng nộp muộn</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '100%' }}>
                        <input
                          type="checkbox"
                          checked={classAllowLateUpload}
                          onChange={(e) => {
                            setClassAllowLateUpload(e.target.checked);
                            if (!e.target.checked) {
                              setLateOverrideCp1('');
                              setLateOverrideCp2('');
                              setLateOverrideSpck('');
                            }
                          }}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#ccc' }}>Cho phép nộp sau hạn chót</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Giờ học bắt đầu</label>
                      <input
                        type="time"
                        value={classStartTime}
                        onChange={(e) => setClassStartTime(e.target.value)}
                        className="form-input-field"
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label">Giờ học kết thúc</label>
                      <input
                        type="time"
                        value={classEndTime}
                        onChange={(e) => setClassEndTime(e.target.value)}
                        className="form-input-field"
                        required
                      />
                    </div>
                  </div>

                  {/* === Allow Late Upload: Override Deadline fields === */}
                  {classAllowLateUpload && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(251, 191, 36, 0.05)',
                      border: '1px solid rgba(251, 191, 36, 0.15)'
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fbbf24', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        ⚠️ Gia hạn nộp muộn
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                        Để trống = không giới hạn thời gian nộp muộn. Nếu đặt ngày giờ, hạn gia hạn phải lớn hơn hạn chót tự động.
                      </p>
                      {[{ label: 'Gia hạn CP1', value: lateOverrideCp1, setter: setLateOverrideCp1, auto: autoCp1 },
                        { label: 'Gia hạn CP2', value: lateOverrideCp2, setter: setLateOverrideCp2, auto: autoCp2 },
                        { label: 'Gia hạn SPCK', value: lateOverrideSpck, setter: setLateOverrideSpck, auto: autoSpck }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: idx < 2 ? '0.5rem' : 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>
                            {item.label}
                            {!item.value && <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '0.5rem' }}>(Không giới hạn)</span>}
                          </label>
                          <input
                            type="datetime-local"
                            value={item.value}
                            onChange={(e) => item.setter(e.target.value)}
                            min={item.auto || undefined}
                            className="form-input-field"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
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
                  {currentUser?.role === 'admin' ? (
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
                      <label className="form-label">Giới hạn tải lên (MB) - Chỉ Admin được sửa</label>
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
    </>
  );
}
