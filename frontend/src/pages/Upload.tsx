import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComboBox from '../components/ComboBox';

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

function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadResponseFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for metadata dropdown options, dynamically loaded from backend/database
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const stagesList = ['Checkpoint 1', 'Checkpoint 2', 'Sản phẩm cuối khóa'];

  const sessionsMap: Record<string, string[]> = {
    'Checkpoint 1': ['Buổi 5'],
    'Checkpoint 2': ['Buổi 9'],
    'Sản phẩm cuối khóa': [
      'Buổi 10',
      'Buổi 11',
      'Buổi 12',
      'Buổi 13',
      'Buổi 14'
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
      return;
    }
    const fetchClasses = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/classes?teacherName=${encodeURIComponent(teacher.trim())}`);
        if (!res.ok) throw new Error('Failed to fetch classes');
        const data = await res.json();
        setClassesList(data);
      } catch (err) {
        console.warn('Using offline fallback for classes list due to error:', err);
        const trimmedTeacher = teacher.trim();
        const fallbackClasses = TEACHER_CLASSES_MAP_FALLBACK[trimmedTeacher] || [];
        setClassesList(fallbackClasses);
      }
    };
    fetchClasses();
  }, [teacher]);

  // Fetch students when selected class changes
  useEffect(() => {
    if (!className.trim()) {
      setStudentsList([]);
      return;
    }
    const fetchStudents = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE_URL}/api/students?className=${encodeURIComponent(className.trim())}`);
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        setStudentsList(data);
      } catch (err) {
        console.warn('Using offline fallback for students list due to error:', err);
        const trimmedClass = className.trim();
        const fallbackStudents = CLASS_STUDENTS_MAP_FALLBACK[trimmedClass] || [];
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
    if (newStage && sessionsMap[newStage]) {
      const compatibleSessions = sessionsMap[newStage];
      if (!compatibleSessions.includes(session)) {
        setSession(compatibleSessions[0]);
      }
    } else {
      setSession('');
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

  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

  // Drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const oversizedFiles = filesArray.filter(f => f.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        setUploadStatus('error');
        setErrorMessage(`Tệp tin "${oversizedFiles[0].name}" vượt quá kích thước cho phép (tối đa 200MB).`);
        return;
      }
      setSelectedFiles((prevFiles) => [...prevFiles, ...filesArray]);
      setUploadStatus('idle');
      setErrorMessage('');
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
      const oversizedFiles = filesArray.filter(f => f.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        setUploadStatus('error');
        setErrorMessage(`Tệp tin "${oversizedFiles[0].name}" vượt quá kích thước cho phép (tối đa 200MB).`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFiles((prevFiles) => [...prevFiles, ...filesArray]);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  // Remove file from selection list
  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit files to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    if (!teacher.trim() || !className.trim() || !fullName.trim() || !stage.trim() || !session.trim()) {
      setUploadStatus('error');
      setErrorMessage('Vui lòng nhập đầy đủ các thông tin: Giáo viên, Lớp học, Họ tên, Giai đoạn và Buổi học.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5); // Bắt đầu ở mức 5% để hiển thị tiến trình đang chạy
    setUploadStatus('idle');
    setErrorMessage('');

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

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMsg = 'Đã xảy ra lỗi trong quá trình tải lên.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
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
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || 'Không thể kết nối đến server backend. Vui lòng kiểm tra xem server đã chạy chưa.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

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

          {/* Back button */}
          <Link to="/" style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
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

            {/* Drag & Drop Area */}
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              style={{
                border: '2px dashed var(--card-border)',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                borderColor: isDragging ? 'var(--primary)' : 'var(--card-border)',
                transition: 'var(--transition-smooth)',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                style={{ display: 'none' }}
              />

              {/* Upload Icon */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDragging ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDragging ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'var(--transition-smooth)'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <div>
                <p style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Kéo thả file vào đây hoặc <span style={{ color: 'var(--primary)' }}>chọn file từ máy</span>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Hỗ trợ tải lên nhiều file cùng lúc
                </p>
              </div>
            </div>

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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
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

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
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
              disabled={selectedFiles.length === 0 || isUploading}
              style={{
                height: '3rem',
                fontSize: '1rem'
              }}
            >
              {isUploading ? 'Đang gửi bài...' : 'Nộp bài'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

export default Upload;
