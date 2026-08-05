"use client";

import {
  UploadCloud,
  Shield,
  Calendar,
  Users,
  Database,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";

export default function FeaturesPage() {
  const features = [
    {
      icon: UploadCloud,
      title: "Nộp Bài Tập Thông Minh",
      description:
        "Tự động lưu trữ bài tập học viên trực tiếp lên Google Drive hoặc Canva. Kiểm tra quyền truy cập liên kết công khai thời gian thực.",
    },
    {
      icon: Shield,
      title: "Quản Trị Hệ Thống Phân Quyền",
      description:
        "Phân quyền bảo mật cao cho Giáo viên và Admin. Quản lý danh sách lớp học, học viên, bài tập và lịch sử chỉnh sửa.",
    },
    {
      icon: Calendar,
      title: "Xếp Lịch Thuyết Trình Thuật Toán",
      description:
        "Tự động sắp xếp thứ tự báo cáo thuyết trình dự án công bằng, trực quan với hiệu ứng chọn vòng quay may mắn.",
    },
    {
      icon: Users,
      title: "Chia Nhóm Tự Động & Linh Hoạt",
      description:
        "Hỗ trợ chia nhóm học tập ngẫu nhiên hoặc đăng ký tự nguyện với giới hạn thành viên linh hoạt cho từng nhóm.",
    },
    {
      icon: Database,
      title: "Supabase Realtime Database",
      description:
        "Cơ sở dữ liệu PostgreSQL cao cấp với cơ chế bảo mật RLS và đồng bộ dữ liệu thời gian thực cho toàn bộ lớp học.",
    },
    {
      icon: Lock,
      title: "Bảo Mật & Chuẩn Hóa",
      description:
        "Xác thực tài khoản với mã hóa cao cấp, chống truy cập trái phép và bảo vệ dữ liệu nội bộ dự án MindX HCM4.",
    },
  ];

  return (
    <div className="space-y-10 py-6">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" /> Kiến Trúc & Tính Năng
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-gradient-primary">
          Tính Năng Nổi Bật MindX Hub
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Giải pháp toàn diện hỗ trợ tối ưu công tác giảng dạy, quản lý lớp học và bài tập tại MindX
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-md hover:shadow-primary/10 transition-all space-y-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
