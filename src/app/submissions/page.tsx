"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Tag,
  ShieldAlert,
  ArrowRight,
  Info,
  GraduationCap,
  Layers,
  School,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/ui/Pagination";

export default function SubmissionsPage() {
  const { showToast } = useToast();

  // Search & Lookup State
  const [searchStudentCode, setSearchStudentCode] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters for Search Results
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedStage, setSelectedStage] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Handle Search Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const code = searchStudentCode.trim();
    if (!code) {
      showToast("Vui lòng nhập Mã học viên để tra cứu", "info");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setStudentInfo(null);
    setSubmissions([]);
    setCurrentPage(1);

    try {
      // 1. Fetch Submissions by studentCode
      const subRes = await fetch(`/api/submissions?studentCode=${encodeURIComponent(code)}`);
      let fetchedSubmissions: any[] = [];
      if (subRes.ok) {
        fetchedSubmissions = await subRes.json();
      }

      // 2. Fetch Student Profile Info
      const stRes = await fetch(`/api/students?studentCode=${encodeURIComponent(code)}`);
      let foundStudent = null;
      if (stRes.ok) {
        const stData = await stRes.json();
        if (Array.isArray(stData) && stData.length > 0) {
          foundStudent = stData[0];
        }
      }

      // Fallback: If student profile wasn't found in students table but submissions exist, build profile card from submission
      if (!foundStudent && fetchedSubmissions.length > 0) {
        const topSub = fetchedSubmissions[0];
        foundStudent = {
          name: topSub.fullName,
          studentCode: topSub.studentCode || code,
          className: topSub.className,
        };
      }

      if (!foundStudent && fetchedSubmissions.length === 0) {
        showToast(`Không tìm thấy thông tin hoặc bài nộp nào cho Mã '${code}'. Vui lòng kiểm tra lại.`, "error");
        setStudentInfo(null);
        setSubmissions([]);
        return;
      }

      setStudentInfo(foundStudent);
      setSubmissions(fetchedSubmissions);
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi tra cứu bài nộp", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Search Results
  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedClass !== "ALL") {
      const clsName = sub.className || sub.class_name;
      if (clsName !== selectedClass) return false;
    }

    if (selectedStage !== "ALL" && sub.stage !== selectedStage) {
      return false;
    }

    return true;
  });

  // Unique Classes and Stages for Filters
  const uniqueClasses = Array.from(
    new Set(submissions.map((s) => s.className || s.class_name).filter(Boolean))
  );
  const uniqueStages = Array.from(new Set(submissions.map((s) => s.stage).filter(Boolean)));

  // Pagination Logic
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, startIndex + pageSize);

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-1">
          <GraduationCap className="w-3.5 h-3.5" /> Portal Học Viên
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Tra Cứu Lịch Sử Nộp Bài Tập
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Nhập Mã học viên chính xác để xem thông tin cá nhân và toàn bộ lịch sử các lần nộp bài tập
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchStudentCode}
              onChange={(e) => setSearchStudentCode(e.target.value)}
              placeholder="Nhập chính xác Mã học viên (VD: hocvien01)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-input/50 border border-border text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Tra Cứu Bài Nộp</span>
          </button>
        </form>
      </div>

      {/* Initial Prompt State (Before User Searches) */}
      {!hasSearched && (
        <div className="p-12 rounded-2xl bg-card/60 border border-border/80 text-center space-y-4 shadow-lg animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Sẵn Sàng Tra Cứu Lịch Sử</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Vui lòng nhập <strong className="text-foreground">Mã học viên</strong> vào ô tìm kiếm ở trên để xem thông tin và toàn bộ kết quả nộp bài của bạn.
          </p>
        </div>
      )}

      {/* Search Results State */}
      {hasSearched && (
        <div className="space-y-6 animate-fade-in">
          {/* Student Info Card */}
          {studentInfo ? (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-foreground">{studentInfo.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-bold">
                      {studentInfo.studentCode}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <School className="w-3.5 h-3.5 text-primary" />
                    <span>Lớp học: <strong className="text-foreground">{studentInfo.className || "Chưa xếp lớp"}</strong></span>
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold text-foreground shrink-0">
                Lịch sử nộp: <strong className="text-primary font-mono text-sm">{submissions.length}</strong> bài nộp
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Chưa tìm thấy thông tin hồ sơ cho Mã học viên &quot;{searchStudentCode}&quot;. Dưới đây là danh sách bài nộp ghi nhận trên hệ thống.</span>
            </div>
          )}

          {/* Results Summary & Filter Controls */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>
                Tìm thấy <strong className="text-primary">{submissions.length}</strong> lần nộp bài
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Filter */}
              <div className="flex items-center gap-1.5 bg-input/40 px-3 py-1.5 rounded-xl border border-border text-xs">
                <School className="w-3.5 h-3.5 text-primary shrink-0" />
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">-- Tất cả Lớp học --</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      🏫 Lớp {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-1.5 bg-input/40 px-3 py-1.5 rounded-xl border border-border text-xs">
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                <select
                  value={selectedStage}
                  onChange={(e) => {
                    setSelectedStage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">-- Tất cả Giai đoạn --</option>
                  {uniqueStages.map((stg) => (
                    <option key={stg} value={stg}>
                      🎯 {stg}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedClass !== "ALL" || selectedStage !== "ALL") && (
                <button
                  onClick={() => {
                    setSelectedClass("ALL");
                    setSelectedStage("ALL");
                    setCurrentPage(1);
                  }}
                  className="p-1.5 rounded-lg bg-secondary hover:bg-accent text-xs font-semibold text-foreground"
                  title="Đặt lại bộ lọc"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Submissions List / Table */}
          {paginatedSubmissions.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {paginatedSubmissions.map((sub, idx) => {
                  const subDate = sub.createdAt || sub.created_at;
                  const isDriveLink = (sub.file_url || sub.fileUrl || "").includes("drive.google.com");
                  const isCanvaLink = (sub.file_url || sub.fileUrl || "").includes("canva.com");

                  return (
                    <div
                      key={sub.id || sub._id || idx}
                      className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-md hover:shadow-xl transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-extrabold text-xs">
                            Lần {sub.attempt_number || sub.attemptNumber || 1}
                          </span>
                          <h3 className="font-bold text-base text-foreground">
                            {sub.full_name || sub.fullName || sub.studentName}
                          </h3>
                          {sub.studentCode && (
                            <span className="text-xs font-mono text-muted-foreground">({sub.studentCode})</span>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {subDate ? formatDate(subDate) : "Vừa xong"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <span className="text-muted-foreground block">Lớp học</span>
                            <span className="font-semibold text-foreground">{sub.class_name || sub.className}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <span className="text-muted-foreground block">Giai đoạn & Buổi</span>
                            <span className="font-semibold text-foreground">{sub.stage} - {sub.session}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <span className="text-muted-foreground block">Giáo viên phụ trách</span>
                            <span className="font-semibold text-foreground">{sub.teacher}</span>
                          </div>
                        </div>
                      </div>

                      {/* File / Link Action */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/40">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground truncate max-w-md">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{sub.file_name || sub.fileName || "Bài tập đính kèm"}</span>
                        </div>

                        {(sub.file_url || sub.fileUrl) && (
                          <a
                            href={sub.file_url || sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 shrink-0"
                          >
                            <span>Xem bài nộp</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-bold text-base text-foreground">Chưa ghi nhận bài nộp từ học viên</p>
              <p className="text-xs text-muted-foreground">
                Học viên chưa từng thực hiện nộp bài hoặc chưa chọn đúng bộ lọc Lớp học / Giai đoạn.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
