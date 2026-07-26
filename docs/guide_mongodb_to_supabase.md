# Hướng Dẫn Chuyển Đổi Dữ Liệu Từ MongoDB Sang Supabase

Tài liệu này hướng dẫn cách thực hiện việc đổ dữ liệu từ cơ sở dữ liệu MongoDB cũ sang Supabase PostgreSQL của dự án NA MindX Hub.

---

## Cách 1: Sử dụng Script Tự Động (Khuyên dùng ⚡)

Dự án đã được trang bị sẵn script tự động kết nối MongoDB và Supabase để đẩy toàn bộ collections (`teachers`, `classes`, `students`, `submissions`) sang Postgres.

### Các bước thực hiện:

1. Mở file `.env` ở thư mục gốc dự án và kiểm tra biến `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.c52ajhf.mongodb.net/?appName=Cluster0
   NEXT_PUBLIC_SUPABASE_URL=https://lgcddlwzlqxofvjyumtb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

2. Chạy lệnh migration sau trong Terminal:
   ```bash
   node scripts/migrate-mongo-to-supabase.mjs
   ```

3. Script sẽ tự động:
   - Kết nối tới MongoDB Atlas
   - Đồng bộ danh sách Giáo viên (`teachers`)
   - Đồng bộ danh sách Lớp học (`classes`)
   - Đồng bộ danh sách Học viên (`students`)
   - Đồng bộ danh sách Bài tập đã nộp (`submissions`)

---

## Cách 2: Export JSON từ MongoDB & Import thủ công qua SQL Query

Nếu muốn kiểm tra dữ liệu trước khi chuyển:

1. Dùng **MongoDB Compass** hoặc **mongodump** để export collection ra file `.json`.
2. Truy cập [Supabase SQL Editor](https://supabase.com/dashboard/project/lgcddlwzlqxofvjyumtb/sql/new).
3. Sử dụng cú pháp `INSERT INTO public.tablename ...` để chèn dữ liệu.
