"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Moon, Sun, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.displayName || "");
          setEmail(data.email || "");
          setEmailNotificationsEnabled(data.emailNotificationsEnabled || false);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password && password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          emailNotificationsEnabled,
          password: password || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cập nhật thất bại.");
      }

      setSuccess("Cập nhật thông tin tài khoản thành công!");
      showToast("Đã lưu thông tin cài đặt!", "success");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary">
          Cài Đặt Cá Nhân
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý thông tin tài khoản, mật khẩu và giao diện hiển thị
        </p>
      </div>

      <form onSubmit={handleSave} className="p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {/* Theme Settings */}
        <div className="space-y-3 pb-6 border-b border-border">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            Giao diện hiển thị
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-xl border flex items-center justify-center gap-3 font-semibold text-sm transition-all ${
                theme === "dark"
                  ? "bg-primary/10 border-primary text-primary shadow-md"
                  : "bg-input/30 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-5 h-5" />
              <span>Chế độ Tối (Dark)</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-4 rounded-xl border flex items-center justify-center gap-3 font-semibold text-sm transition-all ${
                theme === "light"
                  ? "bg-primary/10 border-primary text-primary shadow-md"
                  : "bg-input/30 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-5 h-5" />
              <span>Chế độ Sáng (Light)</span>
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tên hiển thị</label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Họ và tên hiển thị..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email nhận thông báo</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Email Notification Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-input/30 border border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Thông báo qua Email</p>
              <p className="text-xs text-muted-foreground">
                Nhận email khi học viên nộp bài tập mới
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotificationsEnabled}
              onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Change Password */}
        <div className="space-y-4 pt-4 border-t border-border">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            Đổi mật khẩu (bỏ qua nếu không đổi)
          </label>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mật khẩu mới</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu thông tin...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu Cài Đặt</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
