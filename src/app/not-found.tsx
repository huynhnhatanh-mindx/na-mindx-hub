import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
      <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
        <AlertCircle className="w-10 h-10" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-5xl font-extrabold font-heading text-gradient-primary">404</h1>
        <h2 className="text-xl font-bold text-foreground">Trang Không Tồn Tại</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển sang địa chỉ mới.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Quay về Trang chủ
      </Link>
    </div>
  );
}
