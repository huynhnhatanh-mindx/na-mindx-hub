"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, CheckCircle2, AlertTriangle, Loader2, ArrowRight, LogOut } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const OAUTH_CHANNEL_NAME = "mindx-google-oauth";

function GoogleSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLinking, setIsLinking] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const { showToast } = useToast();

  const statusParam = searchParams.get("status");
  const emailParam = searchParams.get("email");
  const messageParam = searchParams.get("message");

  useEffect(() => {
    if (statusParam === "success") {
      setStatus("success");
      if (emailParam) setGoogleEmail(emailParam);
      showToast("Liên kết tài khoản Google thành công!", "success");

      const timer = setTimeout(() => {
        router.push("/admin");
      }, 2500);
      return () => clearTimeout(timer);
    } else if (statusParam === "error") {
      setStatus("error");
      if (messageParam) setErrorMessage(messageParam);
    }
  }, [statusParam, emailParam, messageParam, router, showToast]);

  // Listen for OAuth completion from the new tab via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel(OAUTH_CHANNEL_NAME);
    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === "oauth-success") {
        setStatus("success");
        setGoogleEmail(data.email || "");
        setIsLinking(false);
        showToast("Liên kết tài khoản Google thành công!", "success");
        setTimeout(() => {
          router.push("/admin");
        }, 2500);
      } else if (data?.type === "oauth-error") {
        setStatus("error");
        setErrorMessage(data.message || "Có lỗi xảy ra khi liên kết Google Drive.");
        setIsLinking(false);
      }
    };
    return () => channel.close();
  }, [router, showToast]);

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/auth/google/url?token=${encodeURIComponent(token || "")}`);
      if (!res.ok) throw new Error("Không lấy được link đăng nhập từ server.");
      const data = await res.json();
      if (data.url) {
        // Open OAuth in a new tab
        window.open(data.url, "_blank", "noopener");
      } else {
        throw new Error("Link OAuth không hợp lệ.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Có lỗi xảy ra khi liên kết tài khoản Google.");
      setIsLinking(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast("Đã đăng xuất tài khoản", "info");
    router.push("/login");
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary mb-2">
          Liên Kết Google Drive Bắt Buộc
        </h1>
        <p className="text-sm text-muted-foreground">
          Tài khoản của bạn chưa kết nối Google Drive. Vui lòng hoàn tất liên kết để tiếp tục sử dụng hệ thống.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-card border border-border shadow-xl text-center space-y-6">
        {status === "success" ? (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Liên Kết Thành Công!</h3>
            <p className="text-sm text-muted-foreground">
              Đã liên kết với email: <strong className="text-foreground">{googleEmail}</strong>
            </p>
            <p className="text-xs text-muted-foreground">Đang chuyển hướng về Bảng quản trị...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto animate-bounce">
              <Cloud className="w-8 h-8" />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Nhấp nút bên dưới để ủy quyền truy cập Google Drive nhằm tạo thư mục lưu trữ cho lớp học của bạn.
            </p>

            {isLinking && status !== "error" && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Đang chờ bạn hoàn tất ủy quyền trong tab mới...</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-left space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Lỗi phản hồi từ Google OAuth:</span>
                </div>
                <p className="text-xs opacity-90">{errorMessage}</p>
                {errorMessage.includes("redirect_uri_mismatch") && (
                  <div className="mt-2 pt-2 border-t border-destructive/20 text-[11px] leading-relaxed">
                    💡 <strong>Hướng dẫn sửa:</strong> Trong Google Cloud Console ➔ mục Credentials ➔ Thêm URI sau vào phần <strong>Authorized redirect URIs</strong>:
                    <code className="block mt-1 p-1 bg-black/40 rounded text-foreground font-mono text-[10px] select-all">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/auth/google/callback` : "http://localhost:3000/api/auth/google/callback"}
                    </code>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleLinkGoogle}
              disabled={isLinking}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối Google...</span>
                </>
              ) : (
                <>
                  <span>Ủy quyền với Google OAuth</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-secondary/50 hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-medium text-sm border border-border transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleSetupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>}>
      <GoogleSetupContent />
    </Suspense>
  );
}
