import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const mongoClient = new MongoClient(MONGODB_URI);

async function generateSQL() {
  await mongoClient.connect();
  const db = mongoClient.db();

  const sqlStatements = [];

  // 1. Teachers
  const teachers = await db.collection("teachers").find({}).toArray();
  for (const t of teachers) {
    const nameEscaped = (t.name || "").replace(/'/g, "''");
    sqlStatements.push(
      `INSERT INTO public.teachers (name) VALUES ('${nameEscaped}') ON CONFLICT (name) DO NOTHING;`
    );
  }

  // 2. Classes
  const classes = await db.collection("classes").find({}).toArray();
  for (const c of classes) {
    const nameEscaped = (c.name || "").replace(/'/g, "''");
    const teacherEscaped = (c.teacherName || "").replace(/'/g, "''");
    const startDate = c.startDate ? `'${new Date(c.startDate).toISOString()}'` : "NULL";
    const endDate = c.endDate ? `'${new Date(c.endDate).toISOString()}'` : "NULL";
    const startTime = c.startTime ? `'${c.startTime.replace(/'/g, "''")}'` : "'08:00'";
    const endTime = c.endTime ? `'${c.endTime.replace(/'/g, "''")}'` : "'10:00'";

    sqlStatements.push(
      `INSERT INTO public.classes (name, teacher_name, start_date, end_date, start_time, end_time, allow_late_upload, is_force_ended) VALUES ('${nameEscaped}', '${teacherEscaped}', ${startDate}, ${endDate}, ${startTime}, ${endTime}, ${c.allowLateUpload ? true : false}, ${c.isForceEnded ? true : false}) ON CONFLICT (name) DO NOTHING;`
    );
  }

  // 3. Students
  const students = await db.collection("students").find({}).toArray();
  for (const s of students) {
    const nameEscaped = (s.name || "").replace(/'/g, "''");
    const classEscaped = (s.className || "").replace(/'/g, "''");
    const codeEscaped = (s.studentCode || "").replace(/'/g, "''");
    const maxUploadSize = s.maxUploadSize || 20;
    const status = s.status || "active";

    sqlStatements.push(
      `INSERT INTO public.students (name, class_name, student_code, max_upload_size, status) VALUES ('${nameEscaped}', '${classEscaped}', '${codeEscaped}', ${maxUploadSize}, '${status}') ON CONFLICT (student_code) DO NOTHING;`
    );
  }

  fs.writeFileSync("scripts/migration.sql", sqlStatements.join("\n"));
  console.log(`Generated ${sqlStatements.length} SQL statements in scripts/migration.sql`);
  await mongoClient.close();
}

generateSQL();
