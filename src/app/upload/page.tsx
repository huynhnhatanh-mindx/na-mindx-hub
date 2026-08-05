"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Lock,
  Clock,
  Link2,
  Loader2,
  User,
  School,
  GraduationCap,
  Sparkles,
  Layers,
  BookOpen,
  X,
  File,
  Paperclip,
  Check,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

// Helper to parse session range string like "1-4, 6-8" into array of numbers
function parseSessionRanges(rangeStr: string): number[] {
  if (!rangeStr || rangeStr.trim() === "0") return [];
  const result: number[] = [];
  const parts = rangeStr.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        for (let i = start; i <= end; i++) {
          if (!result.includes(i)) result.push(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0 && !result.includes(num)) {
        result.push(num);
      }
    }
  }
  return result.sort((a, b) => a - b);
}

export default function UploadPage() {
  const { showToast } = useToast();

  // Dropdown options from DB
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Selected Class details for dynamic parsing
  const [selectedClassObj, setSelectedClassObj] = useState<any>(null);
  const [categoryObj, setCategoryObj] = useState<any>(null);

  // Cascading Selected Values: Teacher ➔ Class ➔ Student ➔ Stage ➔ Session
  const [teacher, setTeacher] = useState("");
  const [className, setClassName] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [stage, setStage] = useState("");
  const [session, setSession] = useState("");
  const [notes, setNotes] = useState("");

  // Submission Mode: "file" | "link"
  const [submissionMode, setSubmissionMode] = useState<"file" | "link">("file");

  // File Upload State (Multi-file)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState<number>(50 * 1024 * 1024); // Default 50MB

  // Link Submission State
  const [fileUrl, setFileUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Upload/Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Loading indicators
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // 1. Fetch OAuth-connected teachers on mount
  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await fetch("/api/teachers?oauthOnly=true");
        if (res.ok) {
          const data = await res.json();
          setTeachersList(data);
        }
      } catch (err) {
        console.error("Failed to load teachers", err);
      }
    }
    loadTeachers();
  }, []);

  // 2. Cascading Step 1: Teacher Change
  const handleTeacherChange = (newTeacher: string) => {
    setTeacher(newTeacher);
    // Reset all downstream fields
    setClassName("");
    setFullName("");
    setStage("");
    setSession("");
    setSelectedClassObj(null);
    setCategoryObj(null);
    setClassesList([]);
    setStudentsList([]);

    if (newTeacher) {
      loadClassesForTeacher(newTeacher);
    }
  };

  const loadClassesForTeacher = async (teacherName: string) => {
    setIsLoadingClasses(true);
    try {
      const res = await fetch(`/api/classes?teacher=${encodeURIComponent(teacherName)}`);
      if (res.ok) {
        const data = await res.json();
        setClassesList(data);
      }
    } catch (err) {
      console.error("Failed to load classes", err);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // 3. Cascading Step 2: Class Change
  const handleClassChange = (newClass: string) => {
    setClassName(newClass);
    // Reset downstream fields
    setFullName("");
    setStage("");
    setSession("");
    setStudentsList([]);

    const foundClass = classesList.find((c) => c.name === newClass);
    setSelectedClassObj(foundClass || null);

    if (foundClass && foundClass.category) {
      loadCategoryInfo(foundClass.category);
    } else {
      setCategoryObj(null);
    }

    if (newClass) {
      loadStudentsForClass(newClass);
    }
  };

  const loadCategoryInfo = async (catNameOrCode: string) => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        const found = data.find(
          (cat: any) =>
            cat.name.toLowerCase() === catNameOrCode.toLowerCase() ||
            cat.code.toLowerCase() === catNameOrCode.toLowerCase()
        );
        setCategoryObj(found || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStudentsForClass = async (clsName: string) => {
    setIsLoadingStudents(true);
    try {
      const res = await fetch(`/api/students?class=${encodeURIComponent(clsName)}`);
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data);
      }
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // 4. Cascading Step 3: Student Change
  const handleStudentChange = (newStudent: string) => {
    setFullName(newStudent);
    setStage("");
    setSession("");

    // Read student custom maxUploadSize & studentCode
    const stObj = studentsList.find((s) => (s.displayName || s.name) === newStudent);
    if (stObj) {
      setStudentCode(stObj.studentCode || stObj.student_code || "");
      if (stObj.maxUploadSize && typeof stObj.maxUploadSize === "number") {
        setMaxUploadSizeBytes(stObj.maxUploadSize * 1024 * 1024);
      } else {
        setMaxUploadSizeBytes(50 * 1024 * 1024);
      }
    } else {
      setStudentCode("");
      setMaxUploadSizeBytes(50 * 1024 * 1024);
    }
  };

  // 5. Cascading Step 4: Stage Change
  const handleStageChange = (newStage: string) => {
    setStage(newStage);
    setSession("");
  };

  // Compute dynamic sessions for selected Stage from category config
  const getDynamicSessionsForStage = (currentStage: string) => {
    if (!currentStage) return [];

    let sessionNums: number[] = [];
    if (categoryObj) {
      if (currentStage === "Buổi học lý thuyết") {
        sessionNums = parseSessionRanges(categoryObj.theory_sessions || "1-4, 6-8");
      } else if (currentStage === "Checkpoint 1") {
        sessionNums = parseSessionRanges(categoryObj.cp1_sessions || "5");
      } else if (currentStage === "Checkpoint 2") {
        sessionNums = parseSessionRanges(categoryObj.cp2_sessions || "9");
      } else if (currentStage === "Sản phẩm cuối khóa") {
        sessionNums = parseSessionRanges(categoryObj.final_project_sessions || "10-14");
      } else if (currentStage === "Thuyết trình đề tài") {
        sessionNums = parseSessionRanges(categoryObj.presentation_sessions || "14");
      }
    }

    if (sessionNums.length === 0) {
      if (currentStage === "Buổi học lý thuyết") sessionNums = [1, 2, 3, 4, 6, 7, 8];
      else if (currentStage === "Checkpoint 1") sessionNums = [5];
      else if (currentStage === "Checkpoint 2") sessionNums = [9];
      else if (currentStage === "Sản phẩm cuối khóa") sessionNums = [10, 11, 12, 13, 14];
      else if (currentStage === "Thuyết trình đề tài") sessionNums = [14];
      else sessionNums = Array.from({ length: 14 }, (_, i) => i + 1);
    }

    return sessionNums.map((num) => {
      if (currentStage === "Checkpoint 1") return `Buổi ${num} (Checkpoint 1)`;
      if (currentStage === "Checkpoint 2") return `Buổi ${num} (Checkpoint 2)`;
      if (currentStage === "Sản phẩm cuối khóa") return `Buổi ${num} (Sản phẩm cuối khóa)`;
      if (currentStage === "Thuyết trình đề tài") return `Buổi ${num} (Thuyết trình)`;
      return `Buổi ${num}`;
    });
  };

  // Real-time ticker for countdown clock
  const [nowDate, setNowDate] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format remaining time
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / (24 * 3600));
    const hours = Math.floor((totalSecs % (24 * 3600)) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return days > 0 ? `${days} ngày ${timeStr}` : timeStr;
  };

  // Helper to compute exact start and deadline dates for a stage based on class startDate & session numbers
  const getStageDateRange = (currentStage: string, classObj: any) => {
    if (!currentStage || !classObj) return { startDate: null, deadline: null };

    // 1. Check custom overrides from class configuration
    let customStartStr = "";
    let customDeadlineStr = "";

    if (currentStage === "Checkpoint 1") {
      customStartStr = classObj.checkpoint1StartDate;
      customDeadlineStr = classObj.checkpoint1Deadline;
    } else if (currentStage === "Checkpoint 2") {
      customStartStr = classObj.checkpoint2StartDate;
      customDeadlineStr = classObj.checkpoint2Deadline;
    } else if (currentStage === "Sản phẩm cuối khóa") {
      customStartStr = classObj.finalProjectStartDate;
      customDeadlineStr = classObj.finalProjectDeadline;
    } else if (currentStage === "Thuyết trình đề tài") {
      customStartStr = classObj.presentationStartDate;
      customDeadlineStr = classObj.presentationDeadline;
    }

    // If explicit custom start and deadline are set, return them directly
    if (customStartStr && customDeadlineStr) {
      return {
        startDate: new Date(customStartStr),
        deadline: new Date(customDeadlineStr),
      };
    }

    // 2. Compute dynamic dates from session numbers of this specific stage
    let defaultRangeStr = "1-4, 6-8";
    if (currentStage === "Checkpoint 1") defaultRangeStr = "5";
    else if (currentStage === "Checkpoint 2") defaultRangeStr = "9";
    else if (currentStage === "Sản phẩm cuối khóa") defaultRangeStr = "10-14";
    else if (currentStage === "Thuyết trình đề tài") defaultRangeStr = "14";

    const sessionNums = parseSessionRanges(
      categoryObj?.[
        currentStage === "Buổi học lý thuyết" ? "theory_sessions" :
        currentStage === "Checkpoint 1" ? "cp1_sessions" :
        currentStage === "Checkpoint 2" ? "cp2_sessions" :
        currentStage === "Sản phẩm cuối khóa" ? "final_project_sessions" :
        "presentation_sessions"
      ] || defaultRangeStr
    );

    const sortedNums = Array.from(sessionNums).sort((a, b) => a - b);
    const firstNum = sortedNums[0] || 1;
    const lastNum = sortedNums[sortedNums.length - 1] || firstNum;

    const baseStartDate = classObj.startDate ? new Date(classObj.startDate) : new Date();
    const startTimeStr = classObj.startTime || "18:00";
    const endTimeStr = classObj.endTime || "20:00";

    // Date of first session of stage
    const firstSessDate = new Date(baseStartDate.getTime() + (firstNum - 1) * 7 * 24 * 60 * 60 * 1000);
    const firstSessDateStr = firstSessDate.toISOString().split("T")[0];
    const calculatedStart = new Date(`${firstSessDateStr}T${startTimeStr}:00`);

    // Date of last session of stage
    const lastSessDate = new Date(baseStartDate.getTime() + (lastNum - 1) * 7 * 24 * 60 * 60 * 1000);
    const lastSessDateStr = lastSessDate.toISOString().split("T")[0];
    const calculatedDeadline = new Date(`${lastSessDateStr}T${endTimeStr}:00`);

    return {
      startDate: customStartStr ? new Date(customStartStr) : calculatedStart,
      deadline: customDeadlineStr ? new Date(customDeadlineStr) : calculatedDeadline,
    };
  };

  // Calculate Real-time Deadline Box Status for ALL stages
  const getDeadlineStatus = () => {
    // Require ALL 5 cascading selection fields to be filled before calculating deadline
    if (!teacher || !className || !fullName || !stage || !session || !selectedClassObj) {
      return null;
    }

    // 0. External Class Check: External classes have NO deadlines at all for any stage
    const isExternal = Boolean(
      selectedClassObj.isExternalClass ||
      selectedClassObj.is_external ||
      selectedClassObj.name?.startsWith("Lớp Không Xác Định")
    );

    if (isExternal) {
      return {
        type: "green",
        title: "🟢 Cổng nộp bài luôn mở (Lớp Học Ngoại Lai)",
        message: "Lớp học ngoại lai không áp dụng giới hạn hạn nộp bài ở tất cả các giai đoạn. Học viên có thể nộp bài tập bất kỳ lúc nào.",
        isBlocked: false,
        isExternal: true,
      };
    }

    if (selectedClassObj.isForceEnded) {
      return {
        type: "red",
        title: "🔴 Lớp học đã kết thúc!",
        message: "Cổng nộp bài cho giai đoạn này đã được đóng hoàn toàn.",
        isBlocked: true,
      };
    }

    const { startDate, deadline } = getStageDateRange(stage, selectedClassObj);

    let lateType = "none";
    let lateDeadlineStr = "";
    if (stage === "Checkpoint 1") {
      lateType = selectedClassObj.checkpoint1LateType || "none";
      lateDeadlineStr = selectedClassObj.checkpoint1LateDeadline;
    } else if (stage === "Checkpoint 2") {
      lateType = selectedClassObj.checkpoint2LateType || "none";
      lateDeadlineStr = selectedClassObj.checkpoint2LateDeadline;
    } else if (stage === "Sản phẩm cuối khóa") {
      lateType = selectedClassObj.finalProjectLateType || "none";
      lateDeadlineStr = selectedClassObj.finalProjectLateDeadline;
    } else if (stage === "Thuyết trình đề tài") {
      lateType = selectedClassObj.presentationLateType || "none";
      lateDeadlineStr = selectedClassObj.presentationLateDeadline;
    }

    // Check if Gate Not Open Yet
    if (startDate && nowDate < startDate) {
      const msUntilOpen = startDate.getTime() - nowDate.getTime();
      return {
        type: "red",
        title: "🔴 Cổng nộp bài chưa đến giờ mở!",
        message: `Thời gian mở cổng sau: ${formatCountdown(msUntilOpen)} (Mở lúc: ${startDate.toLocaleString("vi-VN")})`,
        isBlocked: true,
      };
    }

    // Check Normal Deadline
    if (deadline && nowDate <= deadline) {
      const msRemaining = deadline.getTime() - nowDate.getTime();
      return {
        type: "green",
        title: "🟢 Cổng nộp bài đang mở (Đang nhận bài tập)",
        message: `Thời gian còn lại: ${formatCountdown(msRemaining)} (Hạn chót: ${deadline.toLocaleString("vi-VN")})`,
        isBlocked: false,
      };
    }

    // Normal Deadline Passed -> Check Late Submission
    if (selectedClassObj.allowLateUpload) {
      if (lateType === "until_class_end") {
        return {
          type: "yellow",
          title: "🟡 Đã hết hạn chính thức — Đang trong thời gian nộp muộn (Cho đến khi kết thúc lớp)",
          message: `Hạn chính thức (${deadline ? deadline.toLocaleString("vi-VN") : "Đã qua"}) đã hết. Hệ thống tiếp tục nhận bài nộp muộn.`,
          isBlocked: false,
        };
      } else if (lateType === "until_deadline" && lateDeadlineStr) {
        const lateDeadline = new Date(lateDeadlineStr);
        if (nowDate <= lateDeadline) {
          const msRemainingLate = lateDeadline.getTime() - nowDate.getTime();
          return {
            type: "yellow",
            title: "🟡 Đã hết hạn chính thức — Đang trong hạn nộp muộn",
            message: `Thời gian nộp muộn còn lại: ${formatCountdown(msRemainingLate)} (Hạn muộn đến: ${lateDeadline.toLocaleString("vi-VN")})`,
            isBlocked: false,
          };
        }
      }
    }

  };

  const deadlineStatus = getDeadlineStatus();

  // Multi-file Drag & Drop Handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSelectedSizeBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const isOverSizeLimit = totalSelectedSizeBytes > maxUploadSizeBytes;

  // Format Bytes to KB / MB
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Validate Link Submission
  const handleValidateLink = async () => {
    if (!fileUrl.trim()) return;
    setIsValidating(true);
    setLinkError("");
    setIsValidated(false);

    try {
      const res = await fetch("/api/upload/validate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fileUrl }),
      });
      const data = await res.json();

      if (data.isAccessible) {
        setIsValidated(true);
        showToast("Đường liên kết hợp lệ và công khai!", "success");
      } else {
        setLinkError(
          data.error ||
            "Liên kết không thể truy cập công khai. Vui lòng bật chế độ 'Bất kỳ ai có liên kết đều có thể xem' trên Google Drive / Canva!"
        );
      }
    } catch {
      setLinkError("Không thể xác thực đường liên kết.");
    } finally {
      setIsValidating(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!teacher || !className || !fullName || !stage || !session) {
      setError("Vui lòng chọn đầy đủ các thông tin theo đúng thứ tự.");
      return;
    }

    if (deadlineStatus && deadlineStatus.isBlocked) {
      setError("Cổng nộp bài cho giai đoạn này hiện đang khóa.");
      return;
    }

    if (submissionMode === "file") {
      if (selectedFiles.length === 0) {
        setError("Vui lòng chọn ít nhất 1 tệp bài tập để nộp.");
        return;
      }
      if (isOverSizeLimit) {
        setError("Tổng dung lượng các tệp vượt quá giới hạn tối đa cho phép.");
        return;
      }
    } else {
      if (!fileUrl.trim()) {
        setError("Vui lòng dán đường liên kết bài tập.");
        return;
      }
      if (!isValidated) {
        setError("Vui lòng kiểm tra và xác thực đường liên kết công khai trước khi nộp.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let lastRes: Response | undefined;
      if (submissionMode === "file") {
        // Direct Binary Stream Upload for large file support (50MB+)
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const query = new URLSearchParams({
            teacher,
            className,
            fullName,
            studentCode,
            stage,
            session,
            notes,
            fileName: file.name,
            fileIndex: String(i + 1),
            totalFiles: String(selectedFiles.length),
          });

          const res = await fetch(`/api/upload-file?${query.toString()}`, {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `Nộp tệp '${file.name}' thất bại.`);
          }
          lastRes = res;
        }
      } else {
        // Link submission
        lastRes = await fetch("/api/upload-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacher,
            className,
            fullName,
            studentCode,
            stage,
            session,
            fileUrl,
            notes,
          }),
        });

        if (!lastRes.ok) {
          const data = await lastRes.json();
          throw new Error(data.error || "Nộp bài thất bại.");
        }
      }

      if (!lastRes) {
        throw new Error("Không thể xử lý bài nộp.");
      }

      setIsSuccess(true);
      showToast("Nộp bài tập thành công!", "success");
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra trong quá trình nộp bài.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicSessions = getDynamicSessionsForStage(stage);

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-1">
          <UploadCloud className="w-3.5 h-3.5" /> Portal Nộp Bài Tập Học Viên
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Cổng Nộp Bài Tập Trực Tiếp
        </h1>
        <p className="text-sm text-muted-foreground">
          Bài tập sẽ được lưu trữ tự động vào đúng thư mục trên Google Drive của Giáo viên phụ trách
        </p>
      </div>

      {isSuccess ? (
        <div className="p-8 rounded-2xl bg-card border border-success/30 shadow-xl text-center space-y-4 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-success/10 text-success border border-success/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Nộp Bài Tập Thành Công!</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Bài tập của học viên <strong className="text-foreground">{fullName}</strong> (Lớp {className}) cho <strong className="text-foreground">{stage} - {session}</strong> đã được lưu thành công trên Google Drive Giáo viên {teacher}.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => {
                setIsSuccess(false);
                setFileUrl("");
                setSelectedFiles([]);
                setIsValidated(false);
                handleTeacherChange("");
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all"
            >
              Nộp bài tập khác
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
          {/* Cascading Dependent Selection Chain */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-border text-xs font-bold text-primary uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Chuỗi Thông Tin Phụ Thuộc Tầng (Bắt buộc chọn theo thứ tự)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Step 1: Teacher Select (OAuth Teachers Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>1. Chọn Giáo Viên Phụ Trách *</span>
                </label>
                <select
                  value={teacher}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                >
                  <option value="">-- Step 1: Chọn Giáo viên --</option>
                  {teachersList.map((t) => (
                    <option key={t.id || t._id} value={t.displayName || t.name}>
                      {t.displayName || t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Class Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-primary" />
                  <span>2. Chọn Lớp Học *</span>
                </label>
                <select
                  value={className}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    !teacher
                      ? "bg-input/20 border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
                      : "bg-input/50 border-border"
                  }`}
                  required
                  disabled={!teacher || isLoadingClasses}
                >
                  <option value="">
                    {!teacher
                      ? "🔒 Vui lòng chọn Giáo viên ở bước 1"
                      : isLoadingClasses
                      ? "⏳ Đang tải lớp học..."
                      : "-- Step 2: Chọn Lớp học --"}
                  </option>
                  {classesList.map((c) => (
                    <option key={c.id || c._id} value={c.name}>
                      🏫 {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Student Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span>3. Chọn Họ và Tên Học Viên *</span>
                </label>
                <select
                  value={fullName}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    !className
                      ? "bg-input/20 border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
                      : "bg-input/50 border-border"
                  }`}
                  required
                  disabled={!className || isLoadingStudents}
                >
                  <option value="">
                    {!className
                      ? "🔒 Vui lòng chọn Lớp học ở bước 2"
                      : isLoadingStudents
                      ? "⏳ Đang tải danh sách học viên..."
                      : "-- Step 3: Chọn Học viên --"}
                  </option>
                  {studentsList.map((s) => {
                    const stName = s.displayName || s.name;
                    return (
                      <option key={s.id || s._id} value={stName}>
                        👨‍🎓 {stName} {s.studentCode ? `(${s.studentCode})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 4: Stage Select (DB Real Stages) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>4. Chọn Giai Đoạn *</span>
                </label>
                <select
                  value={stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    !fullName
                      ? "bg-input/20 border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
                      : "bg-input/50 border-border"
                  }`}
                  required
                  disabled={!fullName}
                >
                  <option value="">
                    {!fullName ? "🔒 Vui lòng chọn Học viên ở bước 3" : "-- Step 4: Chọn Giai đoạn --"}
                  </option>
                  <option value="Buổi học lý thuyết">📖 Buổi học lý thuyết</option>
                  <option value="Checkpoint 1">🎯 Checkpoint 1</option>
                  <option value="Checkpoint 2">🎯 Checkpoint 2</option>
                  <option value="Sản phẩm cuối khóa">🏆 Sản phẩm cuối khóa</option>
                  <option value="Thuyết trình đề tài">🎤 Thuyết trình đề tài</option>
                </select>
              </div>

              {/* Step 5: Session Select */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>5. Chọn Buổi Học *</span>
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    !stage
                      ? "bg-input/20 border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
                      : "bg-input/50 border-border"
                  }`}
                  required
                  disabled={!stage}
                >
                  <option value="">
                    {!stage ? "🔒 Vui lòng chọn Giai đoạn ở bước 4" : "-- Step 5: Chọn Buổi học tương ứng --"}
                  </option>
                  {dynamicSessions.map((sess) => (
                    <option key={sess} value={sess}>
                      📅 {sess}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Real-time 3-Color Deadline Status Box */}
          {deadlineStatus && (
            <div
              className={`p-4 rounded-xl border text-sm font-medium space-y-1 animate-fade-in ${
                deadlineStatus.type === "red"
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : deadlineStatus.type === "yellow"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-success/10 border-success/30 text-success"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base">
                <Clock className="w-5 h-5 shrink-0" />
                <span>{deadlineStatus.title}</span>
              </div>
              <p className="text-xs opacity-90">{deadlineStatus.message}</p>
            </div>
          )}

          {/* Submission Method Selection Tabs */}
          <div className="space-y-4 pt-3 border-t border-border">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Phương Thức Nộp Bài Tập *
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-input/40 border border-border">
              <button
                type="button"
                onClick={() => setSubmissionMode("file")}
                className={`py-2.5 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  submissionMode === "file"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Paperclip className="w-4 h-4" />
                <span>Dạng 1: Kéo Thả Tải Tệp lên</span>
              </button>
              <button
                type="button"
                onClick={() => setSubmissionMode("link")}
                className={`py-2.5 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  submissionMode === "link"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Dạng 2: Dán Đường Liên Kết</span>
              </button>
            </div>

            {/* DẠNG 1: MULTI-FILE DRAG & DROP */}
            {submissionMode === "file" && (
              <div className={`space-y-4 animate-fade-in ${deadlineStatus?.isBlocked ? "opacity-50 pointer-events-none" : ""}`}>
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => !deadlineStatus?.isBlocked && e.preventDefault()}
                  onDrop={(e) => !deadlineStatus?.isBlocked && handleFileDrop(e)}
                  className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all hover:bg-primary/10 relative"
                >
                  <input
                    type="file"
                    multiple
                    disabled={Boolean(deadlineStatus?.isBlocked)}
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                  />
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Kéo thả nhiều tệp vào đây hoặc <span className="text-primary underline">Bấm để duyệt tệp</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hỗ trợ tệp bài tập PDF, ZIP, RAR, DOCX, PNG, JPG, v.v.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">
                    <Lock className="w-3 h-3 text-primary" />
                    <span>Giới hạn dung lượng tối đa cho phép: {formatBytes(maxUploadSizeBytes)}</span>
                  </div>
                </div>

                {/* Selected Files List & Total Size */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3 p-4 rounded-xl bg-input/20 border border-border">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">Danh sách tệp đang chọn ({selectedFiles.length} tệp):</span>
                      <span className={isOverSizeLimit ? "text-destructive font-mono" : "text-primary font-mono"}>
                        Tổng dung lượng: {formatBytes(totalSelectedSizeBytes)} / {formatBytes(maxUploadSizeBytes)}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <File className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-foreground truncate">{file.name}</span>
                            <span className="text-muted-foreground font-mono">({formatBytes(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            disabled={Boolean(deadlineStatus?.isBlocked)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
                            title="Xóa tệp này"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {isOverSizeLimit && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>CẢNH BÁO: Tổng dung lượng các tệp ({formatBytes(totalSelectedSizeBytes)}) đã vượt quá giới hạn tối đa cho phép ({formatBytes(maxUploadSizeBytes)}). Vui lòng bớt file hoặc giảm dung lượng trước khi nộp!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DẠNG 2: DROP LINK SUBMISSION */}
            {submissionMode === "link" && (
              <div className={`space-y-3 animate-fade-in ${deadlineStatus?.isBlocked ? "opacity-50 pointer-events-none" : ""}`}>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" /> Đường Liên Kết Google Drive / Canva <span className="text-primary">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    disabled={Boolean(deadlineStatus?.isBlocked)}
                    value={fileUrl}
                    onChange={(e) => {
                      setFileUrl(e.target.value);
                      setIsValidated(false);
                      setLinkError("");
                    }}
                    placeholder="https://drive.google.com/file/... hoặc https://canva.com/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleValidateLink}
                    disabled={!fileUrl.trim() || isValidating || Boolean(deadlineStatus?.isBlocked)}
                    className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isValidated ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <span>Kiểm tra liên kết</span>
                    )}
                  </button>
                </div>

                {isValidated && (
                  <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>🟢 Đường liên kết hợp lệ và công khai! Giáo viên có thể truy cập thành công.</span>
                  </div>
                )}

                {linkError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>🔴 {linkError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Ghi chú thêm (không bắt buộc)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú cho giáo viên (nếu có)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (deadlineStatus && deadlineStatus.isBlocked) ||
              (submissionMode === "file" && (selectedFiles.length === 0 || isOverSizeLimit)) ||
              (submissionMode === "link" && !isValidated)
            }
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang lưu vào Google Drive Giáo Viên...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>Xác Nhận Nộp Bài Tập</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
