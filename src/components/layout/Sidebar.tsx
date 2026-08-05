"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Info,
  UploadCloud,
  History,
  Shield,
  Calendar,
  Users,
  Settings,
  LogOut,
  LogIn,
  ChevronUp,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // View Mode State: 'admin' | 'teacher' | 'student'
  const [viewMode, setViewMode] = useState<string>("admin");

  const checkUser = async () => {
    const supabase = createClient();

    let localUserData: any = null;
    if (typeof window !== "undefined") {
      const localUserStr = localStorage.getItem("user");
      if (localUserStr) {
        try {
          localUserData = JSON.parse(localUserStr);
        } catch (err) {
          console.error("Failed to parse local user:", err);
        }
      }
      const savedViewMode = localStorage.getItem("activeViewMode");
      if (savedViewMode) setViewMode(savedViewMode);
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const searchUsername = localUserData?.username || authUser?.email || "";
      const searchEmail = localUserData?.email || authUser?.email || "";
      const searchId = localUserData?.id || authUser?.id || "";

      let dbProfile: any = null;
      if (searchUsername) {
        const { data: p } = await supabase.from("profiles").select("*").eq("username", searchUsername).maybeSingle();
        dbProfile = p;
      }
      if (!dbProfile && searchId && /^[0-9a-fA-F-]{36}$/.test(searchId)) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", searchId).maybeSingle();
        dbProfile = p;
      }
      if (!dbProfile && searchEmail) {
        const { data: p } = await supabase.from("profiles").select("*").eq("email", searchEmail).maybeSingle();
        dbProfile = p;
      }

      const finalDisplayName =
        dbProfile?.display_name ||
        localUserData?.full_name ||
        localUserData?.display_name ||
        localUserData?.displayName ||
        authUser?.user_metadata?.full_name ||
        authUser?.user_metadata?.display_name ||
        (localUserData?.username && localUserData.username !== "admin" ? localUserData.username : null) ||
        dbProfile?.username ||
        localUserData?.email ||
        authUser?.email ||
        "Người dùng";

      const finalRole =
        dbProfile?.role ||
        localUserData?.role ||
        (searchUsername === "admin" ? "admin" : "teacher");

      if (localUserData || authUser) {
        setUser({
          id: searchId,
          email: searchEmail,
          displayName: finalDisplayName,
          role: finalRole,
        });

        // Set default view mode based on role if not set
        if (!localStorage.getItem("activeViewMode")) {
          const defaultMode = finalRole === "admin" ? "admin" : "teacher";
          setViewMode(defaultMode);
          localStorage.setItem("activeViewMode", defaultMode);
        }

        if (localUserData && localUserData.displayName !== finalDisplayName) {
          localUserData.displayName = finalDisplayName;
          localUserData.display_name = finalDisplayName;
          localStorage.setItem("user", JSON.stringify(localUserData));
        }

        return;
      }
    } catch (err) {
      console.error("Supabase auth check error:", err);
    }

    setUser(null);
  };

  useEffect(() => {
    checkUser();

    const handleOutsideClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    const handleFocusOrStorage = () => {
      checkUser();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("focus", handleFocusOrStorage);
    window.addEventListener("storage", handleFocusOrStorage);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("focus", handleFocusOrStorage);
      window.removeEventListener("storage", handleFocusOrStorage);
    };
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeViewMode");
    localStorage.removeItem("simulatedTeacher");
    setUser(null);
    onCloseMobile();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isTeacherOrAdmin = user && (user.role === "admin" || user.role === "teacher");

  // In Student View mode, students are guest users!
  const isStudentView = viewMode === "student";

  const navLinks = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/upload", label: "Nộp bài tập", icon: UploadCloud, hideForStaff: !isStudentView },
    { href: "/submissions", label: "Lịch sử nộp", icon: History, hideForStaff: !isStudentView },
    { href: "/features", label: "Chức năng", icon: Info },
    {
      href: "/admin",
      label: user?.role === "admin" ? "Quản trị hệ thống" : "Quản lý bài nộp",
      icon: Shield,
      authRequired: true,
      hideInStudentView: true, // Students/Guests do NOT see Admin Dashboard link!
    },
    { href: "/presentation-arranger", label: "Lịch thuyết trình", icon: Calendar, authRequired: true, hideInStudentView: true },
    { href: "/group-arranger", label: "Chia nhóm", icon: Users, authRequired: true, hideInStudentView: true },
    { href: "/login", label: "Đăng nhập Staff", icon: LogIn, hideIfUser: true },
  ];

  const isExpanded = !isCollapsed || isMobileOpen;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
          isExpanded ? "w-64" : "w-20"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* ━━━ Brand Header ━━━ */}
        <div
          onClick={() => router.push("/")}
          className="group h-16 flex items-center gap-3 px-5 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent/50 transition-colors shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:shadow-[0_0_20px_oklch(53%_0.2_25/0.25)] group-hover:scale-105">
            <span className="text-primary font-extrabold text-lg font-mono">MX</span>
          </div>
          {isExpanded && (
            <span
              className="font-extrabold text-lg tracking-tight font-mono whitespace-nowrap"
              style={{
                background: "linear-gradient(90deg, var(--color-foreground) 40%, var(--color-primary) 50%, var(--color-foreground) 60%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer 2.5s linear infinite",
              }}
            >
              MindX Hub
            </span>
          )}
        </div>

        {/* ━━━ Navigation Links ━━━ */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            if (isStudentView && link.hideInStudentView) return null;
            if (link.authRequired && !user) return null;
            if ((link as any).hideIfUser && user) return null;
            if (link.hideForStaff && isTeacherOrAdmin && !isStudentView) return null;

            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onCloseMobile}
                className={`group/nav relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
                title={!isExpanded ? link.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-foreground rounded-r-full" />
                )}

                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                  isActive ? "" : "group-hover/nav:scale-110"
                }`} />

                {isExpanded && (
                  <span className="truncate whitespace-nowrap">{link.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ━━━ User Profile Footer ━━━ */}
        <div className="p-3 border-t border-sidebar-border relative shrink-0">
          {user ? (
            <div ref={profileRef} className="relative">
              {/* Profile Menu Popup */}
              {showProfileMenu && (
                <div
                  className={`absolute z-50 bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl shadow-black/20 p-1.5 space-y-0.5 animate-slide-up-bounce ${
                    isExpanded
                      ? "bottom-full left-0 mb-2 w-full"
                      : "left-full ml-3 bottom-0 w-52 shadow-xl whitespace-nowrap"
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onCloseMobile();
                      router.push("/settings");
                    }}
                    className="group/menu w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-accent rounded-lg transition-all duration-200 whitespace-nowrap"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground group-hover/menu:text-primary group-hover/menu:rotate-90 transition-all duration-300 shrink-0" />
                    <span>Thông tin cá nhân</span>
                  </button>
                  <div className="mx-2 border-t border-border/50" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="group/menu w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 whitespace-nowrap"
                  >
                    <LogOut className="w-4 h-4 group-hover/menu:translate-x-0.5 transition-transform duration-200 shrink-0" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}

              {/* Profile Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((prev) => !prev);
                }}
                className="group/profile w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-all duration-200 text-left"
                title={!isExpanded ? `${user.displayName || user.email} (${user.role === "admin" ? "Admin" : "Giáo viên"})` : undefined}
              >
                <div className={`w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0 transition-all duration-300 ${
                  showProfileMenu ? "animate-glow-ring" : "group-hover/profile:border-primary/50 group-hover/profile:shadow-[0_0_12px_oklch(53%_0.2_25/0.2)]"
                }`}>
                  {getInitials(user.displayName || user.email)}
                </div>

                {isExpanded && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user.displayName || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {user.role === "admin" ? "Admin" : "Giáo viên"}
                      </p>
                    </div>
                    <ChevronUp className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                      showProfileMenu ? "rotate-0" : "rotate-180"
                    }`} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {isExpanded && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-xs shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-500 truncate">Học Viên (Khách)</p>
                    <p className="text-[10px] text-muted-foreground truncate">Nộp bài & Tra cứu bài nộp</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
