import { NextResponse, type NextRequest } from "next/server";
import { uploadToTeacherDrive } from "@/lib/googleDriveHelper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacher, className, fullName, studentCode, stage, session, fileUrl, notes } = body;

    if (!teacher || !className || !fullName || !stage || !session || !fileUrl) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ các thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const result = await uploadToTeacherDrive({
      teacherName: teacher,
      className,
      fullName,
      studentCode,
      stage,
      session,
      fileUrl,
      notes,
    });

    return NextResponse.json({
      message: "Nộp bài bằng đường liên kết thành công!",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi nộp bài tập" }, { status: 500 });
  }
}
