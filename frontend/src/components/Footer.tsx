function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <p className="footer-copyright">
          NA-MINDX-HUB &copy; {currentYear} &bull; Phát triển bởi Mentor Huỳnh Nhật Anh - HCM4
        </p>
        <p className="footer-disclaimer">
          Hệ thống được thiết kế và lưu hành phục vụ công tác quản lý nội bộ. 
          Vui lòng không sao chép, biên dịch ngược, hoặc phát tán tài liệu và mã nguồn dưới mọi hình thức 
          khi chưa được sự đồng ý bằng văn bản từ Ban điều hành dự án.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
