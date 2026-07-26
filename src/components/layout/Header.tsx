"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Eye, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

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
  const { theme, toggleTheme } = useTheme();
  const [visitCount, setVisitCount] = useState<number>(0);

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
    recordVisit();
  }, []);

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
        return "NA MindX Hub";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Toggle Button Desktop */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 hover:bg-accent hover:text-accent-foreground text-foreground transition-all"
          title={isCollapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Toggle Button Mobile */}
        <button
          onClick={onToggleMobileSidebar}
          className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 hover:bg-accent text-foreground transition-all"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
          NA MindX Hub <span className="text-border">&gt;</span>{" "}
          <strong className="text-foreground font-semibold">
            {getBreadcrumbTitle(pathname)}
          </strong>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button (Red-Black-White / Light-Dark) */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-secondary/50 hover:bg-accent hover:text-accent-foreground text-foreground transition-all"
          title={theme === "dark" ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        {/* Visitor Counter */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 shadow-sm">
          <div className="relative flex items-center">
            <Eye className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-foreground font-mono">
              {visitCount.toLocaleString("vi-VN")}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
              lượt truy cập
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
