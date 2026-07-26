"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  ExternalLink,
  Calendar,
  User,
  BookOpen,
  Clock,
  Loader2,
  Filter,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [searchName, setSearchName] = useState("");

  // Options
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await fetch("/api/teachers");
        if (res.ok) {
          const data = await res.json();
          setTeachersList(data.map((t: any) => t.name));
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    async function loadSubmissions() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedTeacher) params.set("teacher", selectedTeacher);
        if (selectedClass) params.set("className", selectedClass);
        if (searchName) params.set("fullName", searchName);

        const res = await fetch(`/api/submissions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSubmissions();
  }, [selectedTeacher, selectedClass, searchName]);

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <FileText className="w-3.5 h-3.5" /> Tra Cứu Bài Tập
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Lịch Sử Bài Nộp Học Viên
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tra cứu toàn bộ danh sách bài tập đã nộp của các lớp học trên hệ thống NA MindX Hub
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
            Lọc theo Giáo viên
          </label>
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tất cả Giáo viên</option>
            {teachersList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
            Tìm tên Học viên
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Nhập tên học viên..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setSelectedTeacher("");
              setSelectedClass("");
              setSearchName("");
            }}
            className="w-full py-2 px-4 rounded-xl bg-secondary hover:bg-accent text-foreground text-sm font-semibold border border-border transition-all flex items-center justify-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" /> Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* Submissions Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium">Đang tải lịch sử bài nộp...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <p className="text-base font-semibold text-foreground">Không tìm thấy bài nộp nào</p>
          <p className="text-xs text-muted-foreground">Thử điều chỉnh bộ lọc tìm kiếm của bạn</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm hover:shadow-primary/10 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                    Lớp {sub.className}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" /> {formatDate(sub.createdAt)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{sub.fullName}</span>
                </h3>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                    <strong>{sub.stage}</strong> &bull; {sub.session}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" /> GV: {sub.teacher}
                  </p>
                </div>

                {sub.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 italic">
                    "{sub.notes}"
                  </p>
                )}
              </div>

              <a
                href={sub.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-semibold border border-border transition-all"
              >
                <span>Xem tệp / liên kết nộp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
