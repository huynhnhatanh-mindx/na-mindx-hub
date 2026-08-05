"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Moon, Sun, Save, CheckCircle2, AlertCircle, Loader2, Unlink, Eye, EyeOff, HardDrive } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [defaultStudentMaxUploadSize, setDefaultStudentMaxUploadSize] = useState<number>(50);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      let localUser: any = null;
      if (typeof window !== "undefined") {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr) {
          try {
            localUser = JSON.parse(localUserStr);
            setUsername(localUser.username || "");
            setDisplayName(localUser.displayName || localUser.display_name || localUser.full_name || "");
            setEmail(localUser.email || "");
          } catch {}
        }
      }

      try {
        const res = await fetch("/api/auth/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.username) setUsername(data.username);
          if (data.displayName && data.displayName !== data.username) {
            setDisplayName(data.displayName);
          }
          if (data.email !== undefined) setEmail(data.email || "");
          setEmailNotificationsEnabled(data.emailNotificationsEnabled || false);
          if (data.defaultStudentMaxUploadSize !== undefined) {
            setDefaultStudentMaxUploadSize(data.defaultStudentMaxUploadSize || 50);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProfile();
  }, []);

  const handleUnlinkEmail = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy liên kết Email hiện tại không?")) return;
    setIsUnlinking(true);
    try {
      const res = await fetch("/api/auth/unlink-email", { method: "POST" });
      if (res.ok) {
        setEmail("");
        showToast("Hủy liên kết Email thành công!", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Hủy liên kết thất bại", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra khi hủy liên kết", "error");
    } finally {
      setIsUnlinking(false);
    }
  };

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
          emailNotificationsEnabled,
          defaultStudentMaxUploadSize: Number(defaultStudentMaxUploadSize) || 50,
          password: password || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cập nhật thất bại.");
      }

      // Sync updated name back to localStorage
      if (typeof window !== "undefined") {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            localUser.displayName = displayName;
            localUser.display_name = displayName;
            localUser.defaultStudentMaxUploadSize = Number(defaultStudentMaxUploadSize) || 50;
            localStorage.setItem("user", JSON.stringify(localUser));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("focus"));
          } catch {}
        }
      }

      setSuccess("Cập nhật thông tin cá nhân thành công!");
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
          Quản lý thông tin tài khoản, dung lượng bài nộp mặc định cho học viên, thông báo email và giao diện
        </p>
      </div>

      <form onSubmit={handleSave} className="p-4 sm:p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {/* Theme Settings */}
        <div className="space-y-3 pb-6 border-b border-border">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            Giao diện hiển thị
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-center gap-3 font-semibold text-sm transition-all ${
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
              className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-center gap-3 font-semibold text-sm transition-all ${
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
          {/* Username (Read-Only) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Tên đăng nhập</span>
              <span className="text-xs text-muted-foreground font-normal">(chỉ đọc)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                readOnly
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border/70 text-muted-foreground text-sm cursor-not-allowed font-mono"
              />
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60" />
            </div>
          </div>

          {/* Display Name */}
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

          {/* Cấu Hình Dung Lượng Nộp Bài Mặc Định Cho Học Viên Mới */}
          <div className="space-y-1.5 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span>Dung lượng nộp bài mặc định cho học viên mới (MB)</span>
              </span>
              <span className="text-xs text-primary font-mono font-bold">{defaultStudentMaxUploadSize} MB</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={5}
                max={500}
                value={defaultStudentMaxUploadSize}
                onChange={(e) => setDefaultStudentMaxUploadSize(Number(e.target.value))}
                placeholder="50"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono font-bold text-primary"
                required
              />
              <HardDrive className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary opacity-70" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-balance">
              Mức dung lượng này sẽ tự động áp dụng khi bạn thêm Học viên mới. Bạn vẫn có thể tùy chỉnh lại dung lượng riêng cho từng cá nhân học viên khi tạo hoặc chỉnh sửa.
            </p>
          </div>

          {/* Email (Read-Only + Unlink button) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Email liên kết</span>
              <span className="text-xs text-muted-foreground font-normal">(chỉ đọc)</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={email || "Chưa liên kết email"}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border/70 text-muted-foreground text-sm cursor-not-allowed font-mono"
                />
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60" />
              </div>

              {email && (
                <button
                  type="button"
                  onClick={handleUnlinkEmail}
                  disabled={isUnlinking}
                  className="px-4 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive text-sm font-semibold border border-destructive/30 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                  title="Hủy liên kết Email / Google OAuth"
                >
                  {isUnlinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unlink className="w-4 h-4" />
                      <span>Hủy liên kết</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-input/30 border border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Thông báo qua Email</p>
              <p className="text-xs text-muted-foreground">
                Nhận email thông báo tự động khi học viên nộp bài mới
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
            Thay đổi mật khẩu (bỏ qua nếu không đổi)
          </label>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
              <span>Đang lưu cài đặt...</span>
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
