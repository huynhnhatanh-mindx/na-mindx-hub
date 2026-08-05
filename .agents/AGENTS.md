# Project Rules — NA MindX Hub

## 1. Không tự ý thêm, sửa, xóa dữ liệu (Bảo vệ dữ liệu nghiêm ngặt)
- Được phép đọc/lấy dữ liệu (SELECT, GET, fetch) xuống để kiểm tra, phân tích và chuẩn đoán lỗi.
- **TUYỆT ĐỐI KHÔNG** tự ý thêm, sửa, hoặc xóa dữ liệu (UPDATE, DELETE, INSERT, DROP, ALTER) khi chưa được người dùng phê duyệt rõ ràng.
- Nếu cần thay đổi hoặc bổ sung dữ liệu, phải liệt kê cụ thể vào Kế hoạch (`implementation_plan.md`) và chờ người dùng phê duyệt trước khi thực hiện.

## 2. Liệt kê kế hoạch trước khi thực hiện
- Trước khi thực hiện bất kỳ công việc nào, **luôn tạo file `.md`** (implementation plan) liệt kê chi tiết những gì sẽ làm.
- Chờ người dùng đọc và phê duyệt trước khi bắt tay vào code.

## 3. Đọc skill trước khi làm việc
- Trước khi thực hiện công việc đã được duyệt, **bắt buộc đọc các skill liên quan** trong `.agents/skills/` để đảm bảo tuân thủ đúng quy trình và best practices.

## 4. Hỏi khi chưa rõ hoặc không chắc chắn
- Nếu có bất kỳ điều gì **chưa chắc chắn**, không rõ yêu cầu, hoặc chưa biết câu trả lời, **bắt buộc phải hỏi ý kiến người dùng ngay** để nhận câu trả lời chắc chắn trước khi quyết định hoặc thực hiện.

## 5. Được phép sử dụng trình duyệt tự động để giả lập người dùng kiểm tra chức năng
- **CHỈ** sử dụng `browser_subagent` để giả lập người dùng **khi người dùng yêu cầu test thử chức năng giao diện**. Không tự ý giả lập nếu người dùng không yêu cầu.
- Khi giả lập, **bắt buộc nhập đúng dữ liệu thực** lấy từ kho Supabase (bảng `profiles`, `submissions`, v.v.), **TUYỆT ĐỐI KHÔNG nhập dữ liệu bừa** hoặc tự bịa thông tin.
- Nếu qua kiểm tra trình duyệt phát hiện bất kỳ lỗi nào hoặc chưa đúng ý người dùng, chủ động sửa đổi và hoàn thiện lại ngay lập tức.

## 6. Thiết kế giao diện luôn luôn Responsive 100%
- Mọi trang, giao diện, bảng dữ liệu, form và Modal Popup phải luôn được thiết kế responsive chuẩn chỉnh, hiển thị đẹp mắt và tương thích hoàn hảo với tất cả kích thước thiết bị (Mobile, Tablet, Laptop, Desktop).
- Sử dụng các lớp responsive linh hoạt (Tailwind/CSS breakpoint `sm:`, `md:`, `lg:`), thanh cuộn ngang cho bảng dữ liệu lớn trên mobile, và tùy chỉnh padding/margin/font-size phù hợp trên từng loại màn hình.

## 7. Sử dụng Icon / Hình ảnh có sẵn trong dự án (Bảo vệ tài nguyên nghiêm ngặt)
- **CHỈ** sử dụng các icon và hình ảnh đã có sẵn trong hệ thống dự án (như thư viện `lucide-react`, icon SVG local hoặc tài nguyên có sẵn).
- **TUYỆT ĐỐI KHÔNG** được tự ý sử dụng bất kỳ liên kết icon, hình ảnh hoặc tài nguyên bên ngoài nào khác khi chưa có sự cho phép từ người dùng.

## 8. Quy tắc Trình bày Văn bản & Giao diện (Layout & Typography)
- Khi trình bày dữ liệu cùng nhóm/loại, ưu tiên sắp xếp các thành phần trên cùng **1 hàng** (`flex-row`, `grid`).
- Nếu văn bản buộc phải xuống hàng, **TUYỆT ĐỐI KHÔNG** để rơi lẻ 1 từ đơn độc ở hàng dưới (xuống hàng phải từ **2 từ trở lên** bằng cách áp dụng `text-balance`, `whitespace-nowrap` hoặc ngắt dòng hợp lý).
