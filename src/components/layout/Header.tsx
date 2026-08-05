"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Eye, Sun, Moon, UserCheck, LogIn } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export default function Header({
  isCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [visitCount, setVisitCount] = useState<number>(0);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<string>("admin");
  const [simulatedTeacher, setSimulatedTeacher] = useState<string>("");
  const [teachersList, setTeachersList] = useState<any[]>([]);

  useEffect(() => {
    const recordVisit = async () => {
      try {
        const res = await fetch("/api/visits", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.count === "number") {
            setVisitCount(data.count);
          }
        }
      } catch (err) {
        console.error("Failed to record visit:", err);
      }
    };

    const loadTeachers = async () => {
      try {
        const res = await fetch("/api/teachers");
        if (res.ok) {
          const data = await res.json();
          setTeachersList(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    recordVisit();
    loadTeachers();
  }, []);

  const syncUserAndMode = async () => {
    if (typeof window !== "undefined") {
      const localUserStr = localStorage.getItem("user");
      if (localUserStr) {
        try {
          const u = JSON.parse(localUserStr);
          setUser(u);

          let savedMode = localStorage.getItem("activeViewMode") || (u.role === "admin" ? "admin" : "teacher");
          if (u.role !== "admin" && savedMode === "admin") {
            savedMode = "teacher";
            localStorage.setItem("activeViewMode", "teacher");
          }
          setViewMode(savedMode);

          const savedSimulated = localStorage.getItem("simulatedTeacher") || "";
          setSimulatedTeacher(savedSimulated);
        } catch {}
      } else {
        setUser(null);
      }
    }
  };

  useEffect(() => {
    syncUserAndMode();
    window.addEventListener("storage", syncUserAndMode);
    window.addEventListener("focus", syncUserAndMode);
    return () => {
      window.removeEventListener("storage", syncUserAndMode);
      window.removeEventListener("focus", syncUserAndMode);
    };
  }, []);

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
    localStorage.setItem("activeViewMode", mode);
    window.dispatchEvent(new Event("storage"));
    showToast(
      `Đã chuyển sang ${
        mode === "admin"
          ? "Giao diện Admin System"
          : mode === "teacher"
          ? "Giao diện Giáo Viên"
          : "Giao diện Học Viên (Khách)"
      }`,
      "info"
    );

    // Auto-redirect to /upload when switching to Student mode on staff-only pages
    const staffOnlyPaths = ["/admin", "/presentation-arranger", "/group-arranger"];
    if (mode === "student" && staffOnlyPaths.includes(pathname)) {
      router.push("/upload");
    }
  };

  const handleTeacherSimulationChange = (teacherNameVal: string) => {
    setSimulatedTeacher(teacherNameVal);
    localStorage.setItem("simulatedTeacher", teacherNameVal);
    window.dispatchEvent(new Event("storage"));
    showToast(`Đã chọn mô phỏng Giáo viên: ${teacherNameVal}`, "info");
  };

  const getBreadcrumbTitle = (path: string) => {
    switch (path) {
      case "/":
        return "Trang chủ";
      case "/features":
        return "Chức năng hệ thống";
      case "/upload":
        return "Nộp bài tập học viên";
      case "/submissions":
        return "Lịch sử nộp bài";
      case "/contact-admin":
        return "Liên hệ Quản trị viên";
      case "/login":
        return "Đăng nhập hệ thống";
      case "/admin":
        return "Bảng quản trị";
      case "/settings":
        return "Cài đặt cá nhân";
      case "/presentation-arranger":
        return "Xếp lịch thuyết trình";
      case "/group-arranger":
        return "Chia nhóm học tập";
      default:
        if (path.startsWith("/reset-password")) return "Khôi phục mật khẩu";
        if (path.startsWith("/forgot-password")) return "Quên mật khẩu";
        return "MindX Hub";
    }
  };

  const isTeacherOrAdmin = user && (user.role === "admin" || user.role === "teacher");

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/50 transition-colors gap-2">
      {/* Left Area: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Button Desktop */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 hover:bg-accent hover:text-accent-foreground text-foreground transition-all shrink-0"
          title={isCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Toggle Button Mobile */}
        <button
          onClick={onToggleMobileSidebar}
          className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 hover:bg-accent text-foreground transition-all shrink-0"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <span className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5 min-w-0">
          <span className="hidden lg:inline">MindX Hub</span>
          <span className="hidden lg:inline text-border">&gt;</span>{" "}
          <strong className="text-foreground font-semibold truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
            {getBreadcrumbTitle(pathname)}
          </strong>
        </span>
      </div>

      {/* Right Area: View Mode Selector, Login Button, Theme Toggle, Visitor Counter */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* If Not Logged In (Guest User): Show Login Button & Hide Role Simulation */}
        {!user ? (
          <button
            onClick={() => router.push("/login")}
            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập</span>
          </button>
        ) : (
          /* Logged In Staff (Admin / Teacher): Show View Mode Selector ONLY when in Staff Mode */
          isTeacherOrAdmin && (
            <div className="flex items-center gap-1.5">
              {viewMode === "student" ? (
                /* When in Student (Guest) Mode: Hide simulation buttons, show simple return button for Staff */
                <button
                  onClick={() => handleViewModeChange(user.role === "admin" ? "admin" : "teacher")}
                  className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold text-xs transition-all flex items-center gap-1.5"
                  title="Trở lại giao diện quản trị"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Về Giao Diện Staff ({user.role === "admin" ? "Admin" : "Giáo Viên"})</span>
                </button>
              ) : (
                /* When in Staff Mode: Render View Mode Selector Buttons */
                <>
                  {user.role === "admin" && viewMode === "teacher" && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-input/40 border border-border">
                      <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      <select
                        value={simulatedTeacher}
                        onChange={(e) => handleTeacherSimulationChange(e.target.value)}
                        className="bg-transparent text-foreground text-xs font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
                      >
                        <option value="">-- Giả lập GV --</option>
                        {teachersList.map((t: any) => (
                          <option key={t.id || t._id} value={t.name || t.displayName}>
                            👨‍🏫 {t.name || t.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="inline-flex rounded-xl p-1 bg-input/40 border border-border gap-0.5 text-xs">
                    {user.role === "admin" && (
                      <button
                        onClick={() => handleViewModeChange("admin")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          viewMode === "admin"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="Giao diện Admin System"
                      >
                        <span className="hidden sm:inline">👑 Admin</span>
                        <span className="sm:hidden">👑</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleViewModeChange("teacher")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        viewMode === "teacher"
                          ? "bg-success text-success-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Giao diện Giáo Viên"
                    >
                      <span className="hidden sm:inline">🟢 Giáo Viên</span>
                      <span className="sm:hidden">🟢</span>
                    </button>

                    <button
                      onClick={() => handleViewModeChange("student")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        viewMode === "student"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Chuyển sang Giao diện Học Viên (Khách)"
                    >
                      <span className="hidden sm:inline">🔵 Học Viên</span>
                      <span className="sm:hidden">🔵</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 hover:bg-accent hover:text-accent-foreground text-foreground transition-all shrink-0"
          title={theme === "dark" ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        {/* Visitor Counter */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 shadow-sm shrink-0">
          <div className="relative flex items-center">
            <Eye className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-foreground font-mono">
              {visitCount.toLocaleString("vi-VN")}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium hidden lg:inline">
              lượt xem
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
