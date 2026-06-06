import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/date';
import ComboBox from '../components/ComboBox';
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, AlertTriangle, Info, Calendar, Trash2, X } from 'lucide-react';

interface UploadResponseFile {
  originalName: string;
  filename: string;
  size: number;
  path: string;
}

interface UploadResponse {
  message: string;
  files: UploadResponseFile[];
}

// Fallback static data for offline/disconnected database scenarios
const TEACHERS_FALLBACK = ['Huỳnh Nhật Anh', 'Nguyễn Văn A', 'Trần Thị B'];

const TEACHER_CLASSES_MAP_FALLBACK: Record<string, string[]> = {
  'Huỳnh Nhật Anh': ['HCM4', 'HCM1'],
  'Nguyễn Văn A': ['HCM2'],
  'Trần Thị B': ['HCM3']
};

const CLASS_STUDENTS_MAP_FALLBACK: Record<string, string[]> = {
  'HCM4': ['Nguyễn Văn Nam', 'Trần Thị Mai'],
  'HCM1': ['Lê Hoàng Long', 'Phạm Minh Đức'],
  'HCM2': ['Hoàng Văn C', 'Trần Thị D'],
  'HCM3': ['Phan Văn E', 'Đỗ Thị F']
};

interface StudentDetail {
  name: string;
  maxUploadSize: number;
}

function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadResponseFile[]>([]);
  const [cooldownTime, setCooldownTime] = useState<number>(0);

  // Link validation & type selection states
  const [submissionType, setSubmissionType] = useState<'file' | 'link'>('file');
  const [presentationLink, setPresentationLink] = useState<string>('');
  const [isValidatingLink, setIsValidatingLink] = useState<boolean>(false);
  const [linkValidationError, setLinkValidationError] = useState<string>('');
  const [isLinkValidatedSuccessfully, setIsLinkValidatedSuccessfully] = useState<boolean>(false);

  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setInterval(() => {
      setCooldownTime((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime]);

  // States for file preview
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Hook to handle file preview URL/content generation
  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      setPreviewContent(null);
      return;
    }

    const type = previewFile.type;
    const name = previewFile.name.toLowerCase();
    let url: string | null = null;

    if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || type === 'application/pdf') {
      url = URL.createObjectURL(previewFile);
      setPreviewUrl(url);
    } else if (
      type.startsWith('text/') ||
      name.endsWith('.txt') ||
      name.endsWith('.js') ||
      name.endsWith('.jsx') ||
      name.endsWith('.ts') ||
      name.endsWith('.tsx') ||
      name.endsWith('.json') ||
      name.endsWith('.css') ||
      name.endsWith('.html')
    ) {
      setPreviewLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewContent(e.target?.result as string);
        setPreviewLoading(false);
      };
      reader.onerror = () => {
        setPreviewContent('Không thể đọc nội dung tệp tin.');
        setPreviewLoading(false);
      };
      reader.readAsText(previewFile);
    } else {
      setPreviewUrl(null);
      setPreviewContent(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewFile]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'Bạn có chắc chắn muốn rời khỏi trang? Quá trình tải bài lên sẽ bị hủy.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // States for metadata dropdown options, dynamically loaded from backend/database
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [fullClassesData, setFullClassesData] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([]);
  const stagesList = ['Checkpoint 1', 'Checkpoint 2', 'Sản phẩm cuối khóa', 'Bài thuyết trình', 'Buổi học lý thuyết'];

  const sessionsMap: Record<string, string[]> = {
    'Checkpoint 1': ['Buổi 5'],
    'Checkpoint 2': ['Buổi 9'],
    'Sản phẩm cuối khóa': [
      'Buổi 10',
      'Buổi 11',
      'Buổi 12',
      'Buổi 13',
      'Buổi 14'
    ],
    'Bài thuyết trình': ['Buổi tự do'],
    'Buổi học lý thuyết': [
      'Buổi 1',
      'Buổi 2',
      'Buổi 3',
      'Buổi 4',
      'Buổi 6',
      'Buổi 7',
      'Buổi 8'
    ]
  };


  // State for metadata fields
  const [teacher, setTeacher] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [stage, setStage] = useState<string>('');
  const [session, setSession] = useState<string>('');

  // Fetch teachers on component mount
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/teachers`);
        if (!res.ok) throw new Error('Failed to fetch teachers');
        const data = await res.json();
        setTeachersList(data);
      } catch (err) {
        console.warn('Using offline fallback for teachers list due to error:', err);
        setTeachersList(TEACHERS_FALLBACK);
      }
    };
    fetchTeachers();
  }, []);

  // Fetch classes when selected teacher changes
  useEffect(() => {
    if (!teacher.trim()) {
      setClassesList([]);
      setFullClassesData([]);
      return;
    }
    const fetchClasses = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/classes?teacherName=${encodeURIComponent(teacher.trim())}&full=true`);
        if (!res.ok) throw new Error('Failed to fetch classes');
        const data = await res.json();
        setFullClassesData(data);
        setClassesList(data.map((c: any) => c.name));
      } catch (err) {
        console.warn('Using offline fallback for classes list due to error:', err);
        const trimmedTeacher = teacher.trim();
        const fallbackClasses = TEACHER_CLASSES_MAP_FALLBACK[trimmedTeacher] || [];
        setClassesList(fallbackClasses);
        setFullClassesData(fallbackClasses.map(name => ({ name, teacherName: teacher })));
      }
    };
    fetchClasses();
  }, [teacher]);

  // Fetch students when selected class changes
  useEffect(() => {
    if (!className.trim()) {
      setStudentsList([]);
      setStudentDetails([]);
      return;
    }
    const fetchStudents = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/students?className=${encodeURIComponent(className.trim())}`);
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();

        if (data.length > 0 && typeof data[0] === 'object') {
          setStudentDetails(data);
          setStudentsList(data.map((s: any) => s.name));
        } else {
          setStudentDetails(data.map((name: string) => ({ name, maxUploadSize: 20 })));
          setStudentsList(data);
        }
      } catch (err) {
        console.warn('Using offline fallback for students list due to error:', err);
        const trimmedClass = className.trim();
        const fallbackStudents = CLASS_STUDENTS_MAP_FALLBACK[trimmedClass] || [];
        setStudentDetails(fallbackStudents.map(name => ({ name, maxUploadSize: 20 })));
        setStudentsList(fallbackStudents);
      }
    };
    fetchStudents();
  }, [className]);

  // Handle teacher change to reset dependent fields
  const handleTeacherChange = (newTeacher: string) => {
    setTeacher(newTeacher);
    setClassName('');
    setFullName('');
  };

  // Handle class change to reset dependent fields
  const handleClassNameChange = (newClass: string) => {
    setClassName(newClass);
    setFullName('');
  };

  // Handle stage change and adjust session selection
  const handleStageChange = (newStage: string) => {
    setStage(newStage);
    const isLinkAllowed = 
      newStage === 'Bài thuyết trình' || 
      newStage === 'Sản phẩm cuối khóa' || 
      newStage === 'Checkpoint 1' || 
      newStage === 'Checkpoint 2';
    if (!isLinkAllowed) {
      setSubmissionType('file');
    }
    setPresentationLink('');
    setLinkValidationError('');
    setIsLinkValidatedSuccessfully(false);
    if (newStage && sessionsMap[newStage]) {
      const compatibleSessions = sessionsMap[newStage];
      if (!compatibleSessions.includes(session)) {
        setSession(compatibleSessions[0]);
      }
    } else {
      setSession('');
    }
  };

  const handleValidateLinkOnly = async () => {
    if (!presentationLink.trim()) return;
    setIsValidatingLink(true);
    setLinkValidationError('');
    setIsLinkValidatedSuccessfully(false);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE_URL}/api/upload/validate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ link: presentationLink.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.isAccessible) {
        setLinkValidationError(data.error || 'Đường liên kết chưa được chia sẻ công khai hoặc không thể truy cập.');
      } else {
        setIsLinkValidatedSuccessfully(true);
      }
    } catch (err: any) {
      setLinkValidationError('Lỗi kết nối kiểm tra đường dẫn: ' + err.message);
    } finally {
      setIsValidatingLink(false);
    }
  };

  // Handle session change and adjust stage selection
  const handleSessionChange = (newSession: string) => {
    setSession(newSession);
    for (const [stg, sessList] of Object.entries(sessionsMap)) {
      if (sessList.includes(newSession)) {
        setStage(stg);
        break;
      }
    }
  };

  const currentSessionOptions = stage && sessionsMap[stage] ? sessionsMap[stage] : [];

  // Format bytes to readable size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Drag over handler
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Drag leave handler
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const getSelectedStudentLimit = () => {
    if (!fullName) return 20; // default 20MB
    const found = studentDetails.find(s => s.name.trim().toLowerCase() === fullName.trim().toLowerCase());
    return found && found.maxUploadSize ? found.maxUploadSize : 20;
  };

  const getSelectedClassDeadline = (): string | null => {
    if (!className || !stage || !fullClassesData.length) return null;
    const cls = fullClassesData.find((c: any) => c.name.toLowerCase() === className.toLowerCase());
    if (!cls) return null;

    const stageLower = stage.toLowerCase();
    const isTheory = stageLower.includes('ly thuyet') || stageLower.includes('lý thuyết') || stageLower.includes('theory');
    if (isTheory) return 'Không áp dụng hạn chót (luôn được phép nộp)';

    const parseSafeDate = (dtStr: string): Date => {
      const hasTimezone = dtStr.includes('Z') || /([+-]\d{2}:\d{2}|[+-]\d{2})$/.test(dtStr);
      return new Date(hasTimezone ? dtStr : `${dtStr}:00+07:00`);
    };

    let startDate: Date | null = null;
    let deadlineDate: Date | null = null;
    let isManual = false;

    if (stageLower.includes('checkpoint 1')) {
      if (cls.checkpoint1StartDate) {
        startDate = parseSafeDate(cls.checkpoint1StartDate);
        isManual = true;
      } else if (cls.startDate) {
        startDate = parseSafeDate(cls.startDate);
        startDate.setDate(startDate.getDate() + 28);
        const [h, m] = (cls.startTime || "08:00").split(":");
        startDate.setHours(parseInt(h) || 8, parseInt(m) || 0, 0, 0);
      }

      if (cls.checkpoint1Deadline) {
        deadlineDate = parseSafeDate(cls.checkpoint1Deadline);
        isManual = true;
      } else if (cls.startDate) {
        deadlineDate = parseSafeDate(cls.startDate);
        deadlineDate.setDate(deadlineDate.getDate() + 28);
        const [h, m] = (cls.endTime || "10:00").split(":");
        deadlineDate.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
      }
    } else if (stageLower.includes('checkpoint 2')) {
      if (cls.checkpoint2StartDate) {
        startDate = parseSafeDate(cls.checkpoint2StartDate);
        isManual = true;
      } else if (cls.startDate) {
        startDate = parseSafeDate(cls.startDate);
        startDate.setDate(startDate.getDate() + 56);
        const [h, m] = (cls.startTime || "08:00").split(":");
        startDate.setHours(parseInt(h) || 8, parseInt(m) || 0, 0, 0);
      }

      if (cls.checkpoint2Deadline) {
        deadlineDate = parseSafeDate(cls.checkpoint2Deadline);
        isManual = true;
      } else if (cls.startDate) {
        deadlineDate = parseSafeDate(cls.startDate);
        deadlineDate.setDate(deadlineDate.getDate() + 56);
        const [h, m] = (cls.endTime || "10:00").split(":");
        deadlineDate.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
      }
    } else if (stageLower.includes('san pham cuoi khoa') || stageLower.includes('sản phẩm cuối khóa')) {
      if (cls.finalProjectStartDate) {
        startDate = parseSafeDate(cls.finalProjectStartDate);
        isManual = true;
      } else if (cls.startDate) {
        startDate = parseSafeDate(cls.startDate);
        // Start date is class start date at start time (0 days offset)
        const [h, m] = (cls.startTime || "08:00").split(":");
        startDate.setHours(parseInt(h) || 8, parseInt(m) || 0, 0, 0);
      }

      if (cls.finalProjectDeadline) {
        deadlineDate = parseSafeDate(cls.finalProjectDeadline);
        isManual = true;
      } else if (cls.startDate) {
        deadlineDate = parseSafeDate(cls.startDate);
        // End date is session 13 end time + 24 hours (85 days offset)
        deadlineDate.setDate(deadlineDate.getDate() + 85);
        const [h, m] = (cls.endTime || "10:00").split(":");
        deadlineDate.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
      }
    } else if (stageLower.includes('thuyet trinh') || stageLower.includes('thuyết trình') || stageLower.includes('presentation')) {
      if (cls.presentationStartDate) {
        startDate = parseSafeDate(cls.presentationStartDate);
        isManual = true;
      } else if (cls.startDate) {
        startDate = parseSafeDate(cls.startDate);
        // Start date is class start date at start time (0 days offset)
        const [h, m] = (cls.startTime || "08:00").split(":");
        startDate.setHours(parseInt(h) || 8, parseInt(m) || 0, 0, 0);
      }

      if (cls.presentationDeadline) {
        deadlineDate = parseSafeDate(cls.presentationDeadline);
        isManual = true;
      } else if (cls.startDate) {
        deadlineDate = parseSafeDate(cls.startDate);
        // End date is session 14 end time (91 days offset)
        deadlineDate.setDate(deadlineDate.getDate() + 91);
        const [h, m] = (cls.endTime || "10:00").split(":");
        deadlineDate.setHours(parseInt(h) || 10, parseInt(m) || 0, 0, 0);
      }
    }

    if (!startDate || isNaN(startDate.getTime()) || !deadlineDate || isNaN(deadlineDate.getTime())) {
      return 'Chưa cấu hình lịch học hoặc hạn chót cho lớp này';
    }

    const formatDt = (d: Date) => formatDateTime(d);

    return `Từ ${formatDt(startDate)} đến ${formatDt(deadlineDate)}${isManual ? ' (Thủ công)' : ''}${cls.allowLateUpload ? ' (Cho phép nộp muộn)' : ''}`;
  };

  // Re-validate selected files when files list or student name changes
  useEffect(() => {
    if (fullName) {
      const maxMB = getSelectedStudentLimit();
      const currentLimitBytes = maxMB * 1024 * 1024;
      const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
      if (totalSize > currentLimitBytes) {
        setUploadStatus('error');
        setErrorMessage(`Tổng dung lượng các tệp tin đã chọn (${formatBytes(totalSize)}) vượt quá giới hạn tải lên của bạn (tối đa ${maxMB}MB).`);
      } else {
        // Clear size limit errors if they are resolved now
        if (errorMessage && (errorMessage.includes('giới hạn tải lên') || errorMessage.includes('vượt quá kích thước') || errorMessage.includes('vượt quá cho phép'))) {
          setUploadStatus('idle');
          setErrorMessage('');
        }
      }
    }
  }, [selectedFiles, fullName]);

  // Drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const maxMB = getSelectedStudentLimit();
      const currentLimitBytes = maxMB * 1024 * 1024;
      const newTotalSize = [...selectedFiles, ...filesArray].reduce((acc, f) => acc + f.size, 0);

      if (newTotalSize > currentLimitBytes) {
        setUploadStatus('error');
        setErrorMessage(`Tổng dung lượng các tệp tin đã chọn (${formatBytes(newTotalSize)}) vượt quá giới hạn tải lên cho phép (tối đa ${maxMB}MB).`);
      } else {
        setUploadStatus('idle');
        setErrorMessage('');
      }
      setSelectedFiles((prevFiles) => [...prevFiles, ...filesArray]);
    }
  };

  // Trigger file dialog
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const maxMB = getSelectedStudentLimit();
      const currentLimitBytes = maxMB * 1024 * 1024;
      const newTotalSize = [...selectedFiles, ...filesArray].reduce((acc, f) => acc + f.size, 0);

      if (newTotalSize > currentLimitBytes) {
        setUploadStatus('error');
        setErrorMessage(`Tổng dung lượng các tệp tin đã chọn (${formatBytes(newTotalSize)}) vượt quá giới hạn tải lên cho phép (tối đa ${maxMB}MB).`);
      } else {
        setUploadStatus('idle');
        setErrorMessage('');
      }
      setSelectedFiles((prevFiles) => [...prevFiles, ...filesArray]);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove file from selection list
  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit files to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submissionType === 'file') {
      if (selectedFiles.length === 0) return;
    } else {
      if (!presentationLink.trim()) return;
    }

    if (!teacher.trim() || !className.trim() || !fullName.trim() || !stage.trim() || !session.trim()) {
      setUploadStatus('error');
      setErrorMessage('Vui lòng nhập đầy đủ các thông tin: Giáo viên, Lớp học, Họ tên, Giai đoạn và Buổi học.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    if (submissionType === 'link') {
      setUploadProgress(20);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        setUploadProgress(50);

        const response = await fetch(`${API_BASE_URL}/api/upload-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            teacher: teacher.trim(),
            className: className.trim(),
            fullName: fullName.trim(),
            stage: stage.trim(),
            session: session.trim(),
            link: presentationLink.trim()
          })
        });

        if (!response.ok) {
          let errMsg = 'Đã xảy ra lỗi trong quá trình gửi liên kết.';
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (e) { }
          setUploadStatus('error');
          setErrorMessage(errMsg);
          return;
        }

        const data = await response.json();
        setUploadProgress(100);
        setUploadStatus('success');
        setUploadedFiles(data.files);
        setPresentationLink('');
        setIsLinkValidatedSuccessfully(false);
        setCooldownTime(15);
      } catch (error: any) {
        setUploadStatus('error');
        setErrorMessage(error.message || 'Lỗi kết nối đến server backend.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    setUploadProgress(5); // Bắt đầu ở mức 5% để hiển thị tiến trình đang chạy

    // Prepare Form Data - metadata fields appended FIRST for Multer parsing order
    const formData = new FormData();
    formData.append('teacher', teacher.trim());
    formData.append('className', className.trim());
    formData.append('fullName', fullName.trim());
    formData.append('stage', stage.trim());
    formData.append('session', session.trim());

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      if (!response.ok) {
        let errMsg = 'Đã xảy ra lỗi trong quá trình tải lên.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) { }
        setUploadStatus('error');
        setErrorMessage(errMsg);
        return;
      }

      // Đọc luồng dữ liệu Server-Sent Events (SSE) để theo dõi tiến trình thực tế
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Không thể đọc luồng phản hồi từ máy chủ.');
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Giữ lại dòng chưa hoàn chỉnh cuối cùng vào bộ đệm
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data: ')) {
              try {
                const sseData = JSON.parse(cleanLine.slice(6));
                if (sseData.status === 'uploading') {
                  setUploadProgress(sseData.progress);
                } else if (sseData.status === 'success') {
                  setUploadProgress(100);
                  setUploadStatus('success');
                  setUploadedFiles(sseData.files);
                  setSelectedFiles([]); // Reset danh sách chọn
                  setCooldownTime(15); // Kích hoạt 15 giây cooldown
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                } else if (sseData.status === 'error') {
                  setUploadStatus('error');
                  setErrorMessage(sseData.error || 'Lỗi tải lên từ máy chủ.');
                }
              } catch (err) {
                console.error('Lỗi phân tích cú pháp dữ liệu SSE:', err);
              }
            }
          }
        }
      } else {
        // Fallback trong trường hợp phản hồi không phải là stream
        const data: UploadResponse = await response.json();
        setUploadProgress(100);
        setUploadStatus('success');
        setUploadedFiles(data.files);
        setSelectedFiles([]);
        setCooldownTime(15); // Kích hoạt 15 giây cooldown
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setUploadStatus('error');
        setErrorMessage('Quá trình tải lên đã bị hủy.');
        return;
      }
      setUploadStatus('error');
      setErrorMessage(error.message || 'Không thể kết nối đến server backend. Vui lòng kiểm tra xem server đã chạy chưa.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const isMetadataIncomplete = !teacher.trim() || !className.trim() || !fullName.trim() || !stage.trim() || !session.trim();

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
          Nộp Bài / Tải Lên Tệp Tin
        </h2>
        <p className="subtitle">Tải các tài liệu hoặc bài tập của bạn lên máy chủ</p>
      </div>

      <main style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>

          {/* Header Controls */}
          <div style={{ marginBottom: '2rem' }}>
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
              <ArrowLeft size={18} />
              Quay lại
            </Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* Metadata Fields Grid */}
            <div className="form-grid">
              <ComboBox
                label="Giáo viên"
                options={teachersList}
                value={teacher}
                onChange={handleTeacherChange}
                placeholder="Chọn hoặc nhập tên giáo viên..."
                required
              />
              <ComboBox
                label="Lớp học"
                options={classesList}
                value={className}
                onChange={handleClassNameChange}
                placeholder={teacher ? "Chọn hoặc nhập mã lớp..." : "Vui lòng chọn giáo viên trước..."}
                required
                disabled={!teacher}
              />
              <ComboBox
                label="Họ tên học viên"
                options={studentsList}
                value={fullName}
                onChange={setFullName}
                placeholder={className ? "Chọn hoặc nhập họ tên của bạn..." : "Vui lòng chọn lớp học trước..."}
                required
                disabled={!className}
              />
            </div>

            <div className="form-grid-2">
              <ComboBox
                label="Giai đoạn"
                options={stagesList}
                value={stage}
                onChange={handleStageChange}
                placeholder="Chọn giai đoạn học tập..."
                required
              />
              <ComboBox
                label="Buổi học"
                options={currentSessionOptions}
                value={session}
                onChange={handleSessionChange}
                placeholder={stage ? "Chọn buổi học tương ứng..." : "Vui lòng chọn giai đoạn trước..."}
                required
                disabled={!stage}
              />
            </div>

            {(stage === 'Bài thuyết trình' || stage === 'Sản phẩm cuối khóa' || stage === 'Checkpoint 1' || stage === 'Checkpoint 2') && !isMetadataIncomplete && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <label className="form-label">Hình thức nộp bài</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  padding: '4px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px'
                }}>
                  <button
                    type="button"
                    onClick={() => { setSubmissionType('file'); setErrorMessage(''); }}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: submissionType === 'file' ? 'var(--primary)' : 'transparent',
                      color: submissionType === 'file' ? '#fff' : 'var(--text-secondary)',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Nộp file báo cáo
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSubmissionType('link'); setErrorMessage(''); }}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: submissionType === 'link' ? 'var(--primary)' : 'transparent',
                      color: submissionType === 'link' ? '#fff' : 'var(--text-secondary)',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Nộp link trình duyệt (Canva, Slides...)
                  </button>
                </div>
              </div>
            )}

            {submissionType === 'link' && !isMetadataIncomplete ? (
              <div style={{
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '2rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Đường dẫn liên kết (Canva, Google Slides,...)</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ví dụ: canva.com/design/...</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="url"
                      value={presentationLink}
                      onChange={(e) => {
                        setPresentationLink(e.target.value);
                        setLinkValidationError('');
                        setIsLinkValidatedSuccessfully(false);
                        if (uploadStatus === 'error') {
                          setUploadStatus('idle');
                          setErrorMessage('');
                        }
                      }}
                      placeholder="Dán link Canva hoặc bài thuyết trình của bạn vào đây..."
                      className="form-input-field"
                      style={{ 
                        width: '100%', 
                        height: '3rem', 
                        padding: '0.75rem 1rem', 
                        fontSize: '0.95rem',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        color: 'var(--text-primary)',
                        marginBottom: 0
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleValidateLinkOnly}
                      disabled={isValidatingLink || !presentationLink.trim()}
                      className="btn btn-neutral"
                      style={{
                        alignSelf: 'flex-start',
                        padding: '0.5rem 1.25rem',
                        height: 'auto',
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        borderRadius: '6px'
                      }}
                    >
                      {isValidatingLink ? 'Đang kiểm tra...' : 'Kiểm tra quyền truy cập'}
                    </button>
                  </div>
                </div>

                {linkValidationError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    color: '#fce8e6',
                    fontSize: '0.85rem'
                  }}>
                    <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                    <span>{linkValidationError}</span>
                  </div>
                )}

                {isLinkValidatedSuccessfully && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    color: 'var(--success)',
                    fontSize: '0.85rem'
                  }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <span>Kiểm tra quyền truy cập thành công! Bạn có thể nhấn nút <b>Nộp bài</b> bên dưới.</span>
                  </div>
                )}

                {!linkValidationError && !isLinkValidatedSuccessfully && presentationLink.trim() && !isValidatingLink && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(234, 179, 8, 0.06)',
                    border: '1px solid rgba(234, 179, 8, 0.2)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    color: '#fef08a',
                    fontSize: '0.85rem'
                  }}>
                    <AlertTriangle size={16} style={{ color: '#eab308', flexShrink: 0 }} />
                    <span>Lưu ý: Hãy chắc chắn đã bấm <b>Chia sẻ</b> và chọn quyền <b>"Bất kỳ ai có liên kết đều có thể xem"</b>, sau đó click <b>Kiểm tra quyền truy cập</b> bên trên trước khi nộp.</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(56, 189, 248, 0.1)',
                    color: '#38bdf8',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}>
                    <Info size={14} />
                    Phương thức nộp link không tính giới hạn dung lượng tải lên
                  </div>
                  {getSelectedClassDeadline() && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                      <Calendar size={14} />
                      Hạn nộp bài: {getSelectedClassDeadline()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`dropzone ${isDragging && !isMetadataIncomplete ? 'dragging' : ''}`}
                onDragOver={isMetadataIncomplete ? (e) => e.preventDefault() : handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={isMetadataIncomplete ? (e) => e.preventDefault() : handleDrop}
                onClick={isMetadataIncomplete ? undefined : handleBrowseClick}
                style={{
                  border: '2px dashed var(--card-border)',
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: isMetadataIncomplete ? 'not-allowed' : 'pointer',
                  backgroundColor: isDragging && !isMetadataIncomplete ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                  borderColor: isDragging && !isMetadataIncomplete ? 'var(--primary)' : 'var(--card-border)',
                  transition: 'var(--transition-smooth)',
                  marginBottom: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  opacity: isMetadataIncomplete ? 0.4 : 1
                }}
              >
                <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                disabled={isMetadataIncomplete}
                style={{ display: 'none' }}
              />

              {/* Upload Icon */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDragging && !isMetadataIncomplete ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDragging && !isMetadataIncomplete ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'var(--transition-smooth)'
              }}>
                <UploadCloud size={32} />
              </div>

              {isMetadataIncomplete ? (
                <div>
                  <p style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Khu vực tải lên đang khóa
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Vui lòng điền đầy đủ thông tin bên trên để nộp bài
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    Kéo thả file vào đây hoặc <span style={{ color: 'var(--primary)' }}>chọn file từ máy</span>
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    Hỗ trợ tải lên nhiều file cùng lúc
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--success)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      <Info size={14} />
                      Giới hạn dung lượng bài nộp: {getSelectedStudentLimit()} MB
                    </div>
                    {getSelectedClassDeadline() && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}>
                        <Calendar size={14} />
                        Hạn nộp bài: {getSelectedClassDeadline()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>)}

            {/* List of Selected Files */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: '600' }}>
                  Danh sách file đang chọn ({selectedFiles.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <FileText size={18} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                        <span style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: '500'
                        }}>
                          {file.name}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
                          ({formatBytes(file.size)})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                        >
                          Xem trước
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          disabled={isUploading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'var(--transition-fast)'
                          }}
                          className="btn-delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress Bar */}
            {(isUploading || uploadProgress > 0) && uploadStatus === 'idle' && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  <span>Đang tải tệp tin lên máy chủ...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '99px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                    borderRadius: '99px',
                    transition: 'width 0.2s ease'
                  }}></div>
                </div>
              </div>
            )}

            {/* Response Notifications */}
            {uploadStatus === 'success' && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '1.25rem',
                borderRadius: '10px',
                marginBottom: '2rem',
                color: '#e6f4ea'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--success)' }}>
                  <CheckCircle2 size={20} strokeWidth={2.5} />
                  <strong style={{ fontSize: '1rem' }}>Nộp bài thành công!</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Đã lưu trữ {uploadedFiles.length} tệp tin lên hệ thống.
                </p>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {uploadedFiles.map((f, i) => (
                    <li key={i}>{f.originalName}</li>
                  ))}
                </ul>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '1.25rem',
                borderRadius: '10px',
                marginBottom: '2rem',
                color: '#fce8e6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--error)' }}>
                  <AlertTriangle size={20} strokeWidth={2.5} />
                  <strong style={{ fontSize: '1rem' }}>Lỗi tải lên!</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={(submissionType === 'file' ? selectedFiles.length === 0 : (!presentationLink.trim() || !isLinkValidatedSuccessfully)) || isUploading || uploadStatus === 'error' || cooldownTime > 0}
              style={{
                height: '3rem',
                fontSize: '1rem'
              }}
            >
              {isUploading ? 'Đang gửi bài...' : cooldownTime > 0 ? `Đợi ${cooldownTime}s để nộp tiếp...` : 'Nộp bài'}
            </button>
          </form>
        </div>
      </main>

      {/* Modal Xem Trước Tệp Tin */}
      {previewFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(2, 6, 23, 0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '2rem'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            gap: '1.5rem',
            animation: 'scaleUp 0.3s ease-out',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--card-border)',
              paddingBottom: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Xem trước tệp tin
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {previewFile.name} ({formatBytes(previewFile.size)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition-fast)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              padding: '1rem',
              minHeight: '300px'
            }}>
              {previewLoading ? (
                <div style={{ color: 'var(--text-secondary)' }}>Đang đọc nội dung...</div>
              ) : previewUrl && previewFile.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '55vh',
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                />
              ) : previewUrl && previewFile.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '55vh',
                    borderRadius: '4px'
                  }}
                />
              ) : previewUrl && previewFile.type.startsWith('audio/') ? (
                <audio
                  src={previewUrl}
                  controls
                  style={{ width: '100%', maxWidth: '500px' }}
                />
              ) : previewUrl && previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  style={{
                    width: '100%',
                    height: '55vh',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                />
              ) : previewContent !== null ? (
                <pre style={{
                  width: '100%',
                  height: '55vh',
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto'
                }}>
                  {previewContent}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    marginBottom: '1rem'
                  }}>
                    <FileText size={32} />
                  </div>
                  <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Không hỗ trợ xem trước trực tiếp
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Định dạng tệp tin này ({previewFile.name.split('.').pop()?.toUpperCase()}) không thể xem trước trực tiếp. Bạn vẫn có thể tải lên tệp tin này bình thường.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Upload;
