import { NextResponse, type NextRequest } from "next/server";
import { uploadToTeacherDrive } from "@/lib/googleDriveHelper";

export const maxDuration = 60; // Allow up to 60 seconds for large file uploads
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherFromQuery = searchParams.get("teacher");

    let teacher = "";
    let className = "";
    let fullName = "";
    let studentCode = "";
    let stage = "";
    let session = "";
    let notes = "";
    let files: File[] = [];

    if (teacherFromQuery) {
      // 1. Direct Binary Stream Upload (Supports large files 50MB+ without FormData parsing errors)
      teacher = teacherFromQuery;
      className = searchParams.get("className") || "";
      fullName = searchParams.get("fullName") || "";
      studentCode = searchParams.get("studentCode") || "";
      stage = searchParams.get("stage") || "";
      session = searchParams.get("session") || "";
      notes = searchParams.get("notes") || "";
      const fileName = searchParams.get("fileName") || "file_bai_tap";

      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { error: "Tệp tải lên rỗng hoặc không thể đọc dữ liệu." },
          { status: 400 }
        );
      }

      const contentType = request.headers.get("content-type") || "application/octet-stream";
      const fileBlob = new Blob([arrayBuffer], { type: contentType });
      const uploadedFile = new File([fileBlob], fileName, { type: contentType });
      files = [uploadedFile];
    } else {
      // 2. Legacy FormData parsing fallback
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (parseErr: any) {
        console.error("FormData parse error:", parseErr);
        return NextResponse.json(
          { error: "Không thể đọc dữ liệu tệp tải lên. Tệp có thể vượt quá dung lượng cho phép của hệ thống." },
          { status: 400 }
        );
      }

      teacher = (formData.get("teacher") as string) || "";
      className = (formData.get("className") as string) || "";
      fullName = (formData.get("fullName") as string) || "";
      studentCode = (formData.get("studentCode") as string) || "";
      stage = (formData.get("stage") as string) || "";
      session = (formData.get("session") as string) || "";
      notes = (formData.get("notes") as string) || "";
      files = formData.getAll("files") as File[];
    }

    if (!teacher || !className || !fullName || !stage || !session || !files || files.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn đầy đủ thông tin và ít nhất 1 tệp nộp bài." },
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
      files,
      notes,
    });

    return NextResponse.json({
      message: "Nộp bài bằng tệp đính kèm thành công!",
      ...result,
    });
  } catch (err: any) {
    console.error("Upload POST error:", err);
    return NextResponse.json({ error: err.message || "Lỗi nộp tệp bài tập" }, { status: 500 });
  }
}
