"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export const dynamic = "force-dynamic";

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
      }, 3000);
      return () => clearTimeout(timer);
    } else if (statusParam === "error") {
      setStatus("error");
      if (messageParam) setErrorMessage(messageParam);
    }
  }, [statusParam, emailParam, messageParam, router, showToast]);

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/auth/google/url?token=${encodeURIComponent(token || "")}`);
      if (!res.ok) throw new Error("Không lấy được link đăng nhập từ server.");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Link OAuth không hợp lệ.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Có lỗi xảy ra khi liên kết tài khoản Google.");
      setIsLinking(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary mb-2">
          Liên Kết Google Drive
        </h1>
        <p className="text-sm text-muted-foreground">
          Cần thiết lập liên kết Google OAuth để quản lý thư mục lưu trữ bài tập
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
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
              <Cloud className="w-8 h-8" />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Vui lòng nhấp nút bên dưới để ủy quyền truy cập Google Drive nhằm tạo thư mục lưu trữ cho lớp học của bạn.
            </p>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
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
