const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/AdminDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new states
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<'users' \| 'teachers' \| 'classes' \| 'students' \| 'submissions'>\('users'\);/,
  `const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teachers' | 'classes' | 'students' | 'submissions' | 'audit_logs'>('overview');
  
  // Pagination & Bulk
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);`
);

// 2. Update useEffect for activeTab
content = content.replace(
  /useEffect\(\(\) => \{\n    fetchData\(\);\n  \}, \[activeTab\]\);/,
  `useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setSearchInput('');
    setSelectedIds([]);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchQuery]);`
);

// 3. Replace fetchData completely
const newFetchData = `  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    try {
      const queryParams = new URLSearchParams({ page: currentPage.toString(), limit: '10' });
      if (searchQuery) queryParams.append('search', searchQuery);

      if (activeTab === 'overview') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/dashboard-stats\`, { headers: getHeaders() });
        if (res.ok) setDashboardStats(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/users?\${queryParams}\`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách tài khoản.');
        const { data, totalPages } = await res.json();
        setUsers(data);
        setTotalPages(totalPages);
      } else if (activeTab === 'teachers') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/teachers?\${queryParams}\`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách giáo viên.');
        const { data, totalPages } = await res.json();
        setTeachersDataList(data);
        setTotalPages(totalPages);
      } else if (activeTab === 'classes') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/classes?\${queryParams}\`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách lớp học.');
        const { data, totalPages } = await res.json();
        setClasses(data);
        setTotalPages(totalPages);

        // Fetch teachers list to populate the dropdown
        const teacherRes = await fetch(\`\${API_BASE_URL}/api/teachers\`);
        if (teacherRes.ok) {
          const teacherData = await teacherRes.json();
          setTeachers(teacherData);
        }
      } else if (activeTab === 'students') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/students?\${queryParams}\`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách học viên.');
        const { data, totalPages } = await res.json();
        setStudents(data);
        setTotalPages(totalPages);

        // Fetch classes to populate the dropdown
        const classRes = await fetch(\`\${API_BASE_URL}/api/admin/classes?limit=1000\`, { headers: getHeaders() });
        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(classData.data || classData);
        }
      } else if (activeTab === 'submissions') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/submissions?\${queryParams}\`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Không thể tải danh sách bài nộp.');
        const { data, totalPages } = await res.json();
        setSubmissions(data);
        setTotalPages(totalPages);
      } else if (activeTab === 'audit_logs') {
        const res = await fetch(\`\${API_BASE_URL}/api/admin/audit-logs?\${queryParams}\`, { headers: getHeaders() });
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
  };`;

const oldFetchDataRegex = /const fetchData = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n    \}\n  \};/;
content = content.replace(oldFetchDataRegex, newFetchData);

fs.writeFileSync(filePath, content, 'utf8');
console.log('AdminDashboard state and fetch updated successfully');
