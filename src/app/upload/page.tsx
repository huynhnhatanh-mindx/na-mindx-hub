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
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export default function UploadPage() {
  const { showToast } = useToast();

  // Dropdown options from DB
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [fullClassesData, setFullClassesData] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<string[]>([]);

  // Selected values
  const [teacher, setTeacher] = useState("");
  const [className, setClassName] = useState("");
  const [fullName, setFullName] = useState("");
  const [stage, setStage] = useState("");
  const [session, setSession] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // Upload/Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Link validation
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Fetch teachers on mount
  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await fetch("/api/teachers");
        if (res.ok) {
          const data = await res.json();
          setTeachersList(data.map((t: any) => t.name));
        }
      } catch (err) {
        console.error("Failed to load teachers", err);
      }
    }
    loadTeachers();
  }, []);

  // Fetch classes when teacher changes
  useEffect(() => {
    if (!teacher) {
      setClassesList([]);
      setClassName("");
      return;
    }
    async function loadClasses() {
      try {
        const res = await fetch(`/api/classes?teacher=${encodeURIComponent(teacher)}`);
        if (res.ok) {
          const data = await res.json();
          setFullClassesData(data);
          setClassesList(data.map((c: any) => c.name));
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    }
    loadClasses();
  }, [teacher]);

  // Fetch students when class changes
  useEffect(() => {
    if (!className) {
      setStudentsList([]);
      setFullName("");
      return;
    }
    async function loadStudents() {
      try {
        const res = await fetch(`/api/students?class=${encodeURIComponent(className)}`);
        if (res.ok) {
          const data = await res.json();
          setStudentsList(data.map((s: any) => s.name));
        }
      } catch (err) {
        console.error("Failed to load students", err);
      }
    }
    loadStudents();
  }, [className]);

  // Validate Link
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
        showToast("Đường liên kết hợp lệ!", "success");
      } else {
        setLinkError(data.error || "Liên kết không thể truy cập công khai.");
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

    if (!teacher || !className || !fullName || !stage || !session || !fileUrl) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    if (!isValidated) {
      setError("Vui lòng kiểm tra và xác thực đường liên kết trước khi nộp.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/upload-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher,
          className,
          fullName,
          stage,
          session,
          fileUrl,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nộp bài thất bại.");
      }

      setIsSuccess(true);
      showToast("Nộp bài tập thành công!", "success");
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra trong quá trình nộp bài.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <UploadCloud className="w-3.5 h-3.5" /> Portal Nộp Bài Tập
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Nộp Bài Tập Học Viên
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hệ thống lưu trữ và quản lý bài tập trực tiếp trên Google Drive / Canva
        </p>
      </div>

      {isSuccess ? (
        <div className="p-8 rounded-2xl bg-card border border-success/30 shadow-xl text-center space-y-4 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-success/10 text-success border border-success/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Nộp Bài Thành Công!</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Bài tập của học viên <strong className="text-foreground">{fullName}</strong> (Lớp {className}) đã được lưu lại thành công.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => {
                setIsSuccess(false);
                setFileUrl("");
                setIsValidated(false);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all"
            >
              Nộp bài khác
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Teacher Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Giáo viên phụ trách <span className="text-primary">*</span>
              </label>
              <select
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              >
                <option value="">-- Chọn Giáo viên --</option>
                {teachersList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Lớp học <span className="text-primary">*</span>
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
                disabled={!teacher}
              >
                <option value="">-- Chọn Lớp --</option>
                {classesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Họ và Tên học viên <span className="text-primary">*</span>
              </label>
              {studentsList.length > 0 ? (
                <select
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                >
                  <option value="">-- Chọn Học viên --</option>
                  {studentsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ tên học viên..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                  disabled={!className}
                />
              )}
            </div>

            {/* Stage Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Giai đoạn (Checkpoint / Sản phẩm) <span className="text-primary">*</span>
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              >
                <option value="">-- Chọn Giai đoạn --</option>
                <option value="Bài tập Lý thuyết">Bài tập Lý thuyết</option>
                <option value="Checkpoint 1">Checkpoint 1</option>
                <option value="Checkpoint 2">Checkpoint 2</option>
                <option value="Sản phẩm cuối khóa">Sản phẩm cuối khóa</option>
                <option value="Thuyết trình đề tài">Thuyết trình đề tài</option>
              </select>
            </div>

            {/* Session Select */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Buổi học <span className="text-primary">*</span>
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              >
                <option value="">-- Chọn Buổi học --</option>
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={`Buổi ${i + 1}`}>
                    Buổi {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submission URL Input */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Liên kết Google Drive / Canva <span className="text-primary">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => {
                  setFileUrl(e.target.value);
                  setIsValidated(false);
                  setLinkError("");
                }}
                placeholder="https://drive.google.com/file/... hoặc https://canva.com/..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={handleValidateLink}
                disabled={!fileUrl.trim() || isValidating}
                className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isValidated ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <span>Kiểm tra</span>
                )}
              </button>
            </div>

            {isValidated && (
              <p className="text-xs text-success flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đường liên kết công khai hợp lệ!
              </p>
            )}

            {linkError && (
              <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> {linkError}
              </p>
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
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang gửi bài tập...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                <span>Xác nhận Nộp bài tập</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
