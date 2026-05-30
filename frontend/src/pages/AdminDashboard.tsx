import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserData {
  _id: string;
  username: string;
  role: string;
  displayName: string;
  email?: string;
  createdAt: string;
}

interface ClassData {
  _id: string;
  name: string;
  teacherName: string;
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
  const [activeTab, setActiveTab] = useState<'users' | 'teachers' | 'classes' | 'students' | 'submissions'>('users');
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

  // Student form states
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [isNewClass, setIsNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

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
    fetchData();
  }, [activeTab]);

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
      if (activeTab === 'users') {
        const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách tài khoản.');
        const data = await res.json();
        setUsers(data);
      } else if (activeTab === 'teachers') {
        const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách giáo viên.');
        const data = await res.json();
        setTeachersDataList(data);
      } else if (activeTab === 'classes') {
        const res = await fetch(`${API_BASE_URL}/api/admin/classes`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách lớp học.');
        const data = await res.json();
        setClasses(data);

        // Fetch teachers list to populate the dropdown
        const teacherRes = await fetch(`${API_BASE_URL}/api/teachers`);
        if (teacherRes.ok) {
          const teacherData = await teacherRes.json();
          setTeachers(teacherData);
        }
      } else if (activeTab === 'students') {
        const res = await fetch(`${API_BASE_URL}/api/admin/students`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách học viên.');
        const data = await res.json();
        setStudents(data);

        // Fetch classes to populate the dropdown
        const classRes = await fetch(`${API_BASE_URL}/api/admin/classes`, { headers: getHeaders() });
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(classData);
        }
      } else if (activeTab === 'submissions') {
        const res = await fetch(`${API_BASE_URL}/api/admin/submissions`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách bài nộp.');
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setUserUsername('');
    setUserPassword('');
    setUserRole('admin');
    setUserDisplayName('');
    setUserEmail('');
    setTeacherNameInput('');
    setNewTeacherUsername('');
    setNewTeacherPassword('');
    setClassName('');
    setClassTeacher('');
    setStudentName('');
    setStudentClass('');
    setStudentCode('');
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
    } else if (activeTab === 'teachers') {
      setTeacherNameInput(item.name);
      setNewTeacherUsername('');
      setNewTeacherPassword('');
    } else if (activeTab === 'classes') {
      setClassName(item.name);
      
      const teacherExists = teachers.includes(item.teacherName);
      if (teacherExists || !item.teacherName) {
        setClassTeacher(item.teacherName || '');
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
        email: userEmail
      };
    } else if (activeTab === 'teachers') {
      url = `${API_BASE_URL}/api/admin/teachers${editingId ? `/${editingId}` : ''}`;
      body = {
        name: teacherNameInput.trim(),
        username: !editingId ? newTeacherUsername.trim() : undefined,
        password: newTeacherPassword // Mật khẩu (mới) khi tạo hoặc cập nhật giáo viên
      };
    } else if (activeTab === 'classes') {
      url = `${API_BASE_URL}/api/admin/classes${editingId ? `/${editingId}` : ''}`;
      body = {
        name: className,
        teacherName: isNewTeacher ? newTeacherName.trim() : classTeacher,
        newTeacherUsername: isNewTeacher ? newTeacherUsername.trim() : undefined,
        newTeacherPassword: isNewTeacher ? newTeacherPassword.trim() : undefined
      };
    } else if (activeTab === 'students') {
      url = `${API_BASE_URL}/api/admin/students${editingId ? `/${editingId}` : ''}`;
      body = {
        name: studentName,
        className: isNewClass ? newClassName.trim() : studentClass,
        studentCode: studentCode
      };
    }

    try {
      const res = await fetch(url, {
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
            if (currentUser.username === userUsername.trim().toLowerCase()) {
              const updatedUser = {
                ...currentUser,
                displayName: userDisplayName,
                role: userRole,
                email: userEmail
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
      const res = await fetch(url, {
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
            { id: 'users', label: 'Quản lý Tài khoản' },
            { id: 'classes', label: 'Quản lý Lớp học' },
            { id: 'students', label: 'Quản lý Học viên' },
            { id: 'submissions', label: 'Quản lý Bài nộp' }
          ].filter(tab => currentUser?.role === 'admin' || (tab.id !== 'users' && tab.id !== 'submissions')).map((tab) => (
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
          {activeTab !== 'submissions' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleOpenCreateModal}
                style={{
                  maxWidth: '180px',
                  height: '2.5rem',
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Thêm mới
              </button>
            </div>
          )}

          {/* Loader */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
              Đang tải dữ liệu...
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              
              {/* --- BẢNG TÀI KHOẢN --- */}
              {activeTab === 'users' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem' }}>Tên đăng nhập</th>
                      <th style={{ padding: '1rem' }}>Tên hiển thị</th>
                      <th style={{ padding: '1rem' }}>Email</th>
                      <th style={{ padding: '1rem' }}>Quyền hạn</th>
                      <th style={{ padding: '1rem' }}>Ngày tạo</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td data-label="Tên đăng nhập" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.username}</td>
                        <td data-label="Tên hiển thị" style={{ padding: '1rem' }}>{item.displayName}</td>
                        <td data-label="Email" style={{ padding: '1rem' }}>{item.email || '-'}</td>
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
                          {item.username !== 'admin' && (
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
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem' }}>Tên lớp học</th>
                      <th style={{ padding: '1rem' }}>Giáo viên phụ trách</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td data-label="Tên lớp học" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</td>
                        <td data-label="Giáo viên phụ trách" style={{ padding: '1rem' }}>{item.teacherName}</td>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
                      <th style={{ padding: '1rem' }}>Tên học viên</th>
                      <th style={{ padding: '1rem' }}>Mã lớp học</th>
                      <th style={{ padding: '1rem' }}>Mã tra cứu học viên</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((item) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.875rem' }}>
                        <td data-label="Tên học viên" style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</td>
                        <td data-label="Mã lớp học" style={{ padding: '1rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                            {item.className}
                          </span>
                        </td>
                        <td data-label="Mã tra cứu" style={{ padding: '1rem', color: 'var(--success)', fontWeight: '600' }}>{item.studentCode}</td>
                        <td data-label="Thao tác" style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-neutral" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleOpenEditModal(item)}>Sửa</button>
                          <button className="btn btn-danger" style={{ padding: '4px 10px', height: 'auto', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(item._id)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* --- BẢNG BÀI NỘP --- */}
              {activeTab === 'submissions' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', animation: 'scaleUp 0.3s ease-out' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>
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
                      disabled={!!editingId}
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
                    >
                      <option value="">-- Chọn giáo viên --</option>
                      {teachers.map((tName, index) => (
                        <option key={`${tName}-${index}`} value={tName}>
                          {tName}
                        </option>
                      ))}
                      <option value="__NEW_TEACHER__">+ Thêm giáo viên mới...</option>
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
                          placeholder="Để trống nếu lấy mặc định là 123456..."
                          className="form-input-field"
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}
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
                      placeholder="Ví dụ: HV001"
                      className="form-input-field"
                      required
                      autoComplete="off"
                    />
                  </div>
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
