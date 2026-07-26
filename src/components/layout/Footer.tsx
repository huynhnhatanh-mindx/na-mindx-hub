export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/50 bg-background/80 backdrop-blur-md py-6 px-4 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <p className="text-sm font-semibold text-foreground tracking-wide">
            NA-MINDX-HUB &copy; {currentYear} &bull; <span className="text-primary font-bold">Mentor Huỳnh Nhật Anh - HCM4</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Hệ thống được thiết kế và lưu hành phục vụ công tác quản lý nội bộ. 
            Vui lòng không sao chép, biên dịch ngược, hoặc phát tán tài liệu và mã nguồn dưới mọi hình thức 
            khi chưa được sự đồng ý bằng văn bản từ Ban điều hành dự án.
          </p>
        </div>
      </div>
    </footer>
  );
}
