"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Shield,
  Calendar,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BackendStatus = "checking" | "online" | "offline";

export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [user, setUser] = useState<any>(null);

  const checkUser = async () => {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email,
        displayName: profile?.display_name || authUser.email,
        role: profile?.role || "admin",
      });
    } else {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
  };

  useEffect(() => {
    checkUser();

    const checkConnection = async () => {
      try {
        const res = await fetch("/api/visits");
        if (res.ok) setBackendStatus("online");
        else setBackendStatus("offline");
      } catch {
        setBackendStatus("offline");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-12 py-4">
      {/* Hero Welcome Section */}
      <section className="text-center relative overflow-hidden py-10 px-4 rounded-3xl bg-gradient-to-b from-primary/10 via-background to-background border border-primary/20 hero-glow">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" /> MindX HCM4 Learning Hub
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-heading mb-4 text-gradient-primary">
          MINDX-HUB
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Nền tảng nộp bài tập, quản lý học viên, chia nhóm và sắp xếp lịch thuyết trình cho các lớp học MindX HCM4.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          {user ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all group"
            >
              <span>Quản lý ngay</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all group"
              >
                <span>Nộp bài ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/submissions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground border border-border font-semibold hover:bg-accent transition-all"
              >
                <span>Xem lịch sử</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user && (user.role === "admin" || user.role === "teacher") ? (
          <>
            {/* Admin Dashboard */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {user.role === "admin" ? "Quản Trị Hệ Thống" : "Quản Lý Bài Nộp"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Xem danh sách bài nộp, cập nhật học viên, lớp học và quản lý cấu hình hệ thống.
                </p>
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-sm transition-all"
              >
                <span>Quản lý ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Presentation Arranger */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Xếp Lịch Thuyết Trình</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Sắp xếp lịch báo cáo bài tập lớn hoặc thuyết trình đề tài ngẫu nhiên, công bằng.
                </p>
              </div>
              <Link
                href="/presentation-arranger"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-sm transition-all"
              >
                <span>Xếp lịch ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Group Arranger */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Chia Nhóm Học Tập</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Chia nhóm học viên tự nguyện hoặc ngẫu nhiên với giới hạn thành viên linh hoạt.
                </p>
              </div>
              <Link
                href="/group-arranger"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-sm transition-all"
              >
                <span>Chia nhóm ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Upload */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Nộp Bài Tập</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Khu vực nộp bài tập học viên trực tiếp lên Google Drive hoặc Canva link.
                </p>
              </div>
              <Link
                href="/upload"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground font-semibold text-sm transition-all border border-border"
              >
                <span>Nộp bài ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* History */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Lịch Sử Bài Nộp</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Tra cứu và xem lại danh sách bài tập của các lớp học đã nộp.
                </p>
              </div>
              <Link
                href="/submissions"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground font-semibold text-sm transition-all border border-border"
              >
                <span>Xem lịch sử</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Upload */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Nộp Bài Tập</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Gửi liên kết Google Drive hoặc Canva bài tập cá nhân/nhóm nhanh chóng và chính xác.
                </p>
              </div>
              <Link
                href="/upload"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all"
              >
                <span>Nộp bài ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* History */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Lịch Sử Bài Nộp</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Xem lại toàn bộ lịch sử nộp bài của bạn và kiểm tra trạng thái bài tập đã tải lên.
                </p>
              </div>
              <Link
                href="/submissions"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-foreground font-semibold text-sm transition-all border border-border"
              >
                <span>Xem lịch sử</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Backend Connection Status Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium pt-4">
        <span>Trạng thái kết nối máy chủ Supabase:</span>
        {backendStatus === "online" ? (
          <span className="inline-flex items-center gap-1.5 text-success font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Online (Supabase Realtime)
          </span>
        ) : backendStatus === "checking" ? (
          <span className="inline-flex items-center gap-1.5 text-warning font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang kiểm tra...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-destructive font-semibold">
            <XCircle className="w-3.5 h-3.5" /> Offline
          </span>
        )}
      </div>
    </div>
  );
}
