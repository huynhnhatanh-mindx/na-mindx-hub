"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [user, setUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      const realDisplayName = profile?.display_name || authUser.user_metadata?.display_name || authUser.email;

      setUser({
        id: authUser.id,
        email: authUser.email,
        displayName: realDisplayName,
        role: profile?.role || "admin",
      });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUser();

    const handleOutsideClick = () => {
      setShowProfileMenu(false);
    };
    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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

  const navLinks = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/upload", label: "Nộp bài tập", icon: UploadCloud },
    { href: "/submissions", label: "Lịch sử nộp", icon: History },
    { href: "/features", label: "Chức năng", icon: Info },
    {
      href: "/admin",
      label: user?.role === "admin" ? "Quản trị hệ thống" : "Quản lý bài nộp",
      icon: Shield,
      authRequired: true,
    },
    { href: "/presentation-arranger", label: "Lịch thuyết trình", icon: Calendar, authRequired: true },
    { href: "/group-arranger", label: "Chia nhóm", icon: Users, authRequired: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div
          onClick={() => {
            router.push("/");
            onCloseMobile();
          }}
          className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 glow-primary">
            <span className="text-primary font-extrabold text-lg font-mono">MX</span>
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <span className="font-extrabold text-lg tracking-tight text-foreground font-mono">
              NA MindX Hub
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            if (link.authRequired && !user) return null;

            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
                title={isCollapsed && !isMobileOpen ? link.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate">{link.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-sidebar-border relative">
          {user ? (
            <div className="relative">
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-card border border-border rounded-xl shadow-xl p-1.5 space-y-1 z-50 animate-scale-in">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onCloseMobile();
                      router.push("/settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Thông tin cá nhân</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((prev) => !prev);
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {getInitials(user.displayName || user.email)}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role === "admin" ? "Admin" : "Giáo viên"}
                    </p>
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-input/30 border border-border/50">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0">
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">Khách</p>
                    <p className="text-[10px] text-muted-foreground">Chưa đăng nhập</p>
                  </div>
                </div>
              )}
              <Link
                href="/login"
                onClick={onCloseMobile}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <LogIn className="w-4 h-4" />
                {(!isCollapsed || isMobileOpen) && <span>Đăng nhập</span>}
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
