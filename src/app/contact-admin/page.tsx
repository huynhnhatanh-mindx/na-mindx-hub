"use client";

import React, { useState } from "react";
import { Mail, User, MessageSquare, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export default function ContactAdminPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      showToast("Yêu cầu hỗ trợ đã được gửi!", "success");
    }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold font-heading text-gradient-primary mb-2">
          Liên Hệ Quản Trị Viên
        </h1>
        <p className="text-sm text-muted-foreground">
          Gửi tin nhắn hỗ trợ cấp tài khoản, cấp lại mật khẩu hoặc báo lỗi kỹ thuật
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
        {isSent ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Tin Nhắn Đã Được Gửi!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quản trị viên hệ thống sẽ tiếp nhận và phản hồi tới email của bạn trong thời gian sớm nhất.
            </p>
            <button
              onClick={() => {
                setIsSent(false);
                setMessage("");
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all pt-2"
            >
              Gửi tin nhắn khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Họ và Tên</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ tên của bạn..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Địa chỉ Email liên hệ</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nội dung yêu cầu</label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mô tả chi tiết yêu cầu hỗ trợ của bạn..."
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-input/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi tin nhắn...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi tin nhắn cho Admin</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
