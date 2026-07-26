/**
 * Script tự động chuyển đổi dữ liệu từ MongoDB sang Supabase PostgreSQL
 * Chạy lệnh: node scripts/migrate-mongo-to-supabase.mjs
 */

import { MongoClient } from "mongodb";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Thiếu biến môi trường MONGODB_URI hoặc SUPABASE_URL/SUPABASE_KEY trong file .env");
  process.exit(1);
}

const mongoClient = new MongoClient(MONGODB_URI);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  console.log("🚀 Bắt đầu chuyển đổi dữ liệu từ MongoDB sang Supabase...\n");

  try {
    await mongoClient.connect();
    console.log("✅ Đã kết nối thành công tới MongoDB Atlas!");

    const db = mongoClient.db();

    // 1. Migrate Teachers
    const teachers = await db.collection("teachers").find({}).toArray();
    console.log(`📦 Tìm thấy ${teachers.length} giáo viên từ MongoDB.`);
    for (const t of teachers) {
      await supabase.from("teachers").upsert({ name: t.name }, { onConflict: "name" });
    }
    console.log("✅ Đã đồng bộ danh sách Giáo viên!\n");

    // 2. Migrate Classes
    const classes = await db.collection("classes").find({}).toArray();
    console.log(`📦 Tìm thấy ${classes.length} lớp học từ MongoDB.`);
    for (const c of classes) {
      await supabase.from("classes").upsert(
        {
          name: c.name,
          teacher_name: c.teacherName,
          start_date: c.startDate ? new Date(c.startDate).toISOString() : null,
          end_date: c.endDate ? new Date(c.endDate).toISOString() : null,
          start_time: c.startTime || "08:00",
          end_time: c.endTime || "10:00",
          allow_late_upload: c.allowLateUpload || false,
          is_force_ended: c.isForceEnded || false,
        },
        { onConflict: "name" }
      );
    }
    console.log("✅ Đã đồng bộ danh sách Lớp học!\n");

    // 3. Migrate Students
    const students = await db.collection("students").find({}).toArray();
    console.log(`📦 Tìm thấy ${students.length} học viên từ MongoDB.`);
    for (const s of students) {
      await supabase.from("students").upsert(
        {
          name: s.name,
          class_name: s.className,
          student_code: s.studentCode,
          max_upload_size: s.maxUploadSize || 20,
          status: s.status || "active",
        },
        { onConflict: "student_code" }
      );
    }
    console.log("✅ Đã đồng bộ danh sách Học viên!\n");

    // 4. Migrate Submissions
    const submissions = await db.collection("submissions").find({}).toArray();
    console.log(`📦 Tìm thấy ${submissions.length} bài nộp từ MongoDB.`);
    for (const sub of submissions) {
      await supabase.from("submissions").insert({
        teacher: sub.teacher,
        class_name: sub.className,
        full_name: sub.fullName,
        stage: sub.stage,
        session: sub.session,
        attempt_number: sub.attemptNumber || 1,
        file_name: sub.fileName,
        file_url: sub.fileUrl,
        notes: sub.notes || "",
        created_at: sub.createdAt ? new Date(sub.createdAt).toISOString() : new Date().toISOString(),
      });
    }
    console.log("✅ Đã đồng bộ danh sách Bài nộp!\n");

    console.log("🎉 HOÀN THÀNH CHUYỂN ĐỔI DỮ LIỆU TỪ MONGODB SANG SUPABASE!");
  } catch (err) {
    console.error("❌ Lỗi trong quá trình chuyển đổi:", err);
  } finally {
    await mongoClient.close();
  }
}

migrate();
