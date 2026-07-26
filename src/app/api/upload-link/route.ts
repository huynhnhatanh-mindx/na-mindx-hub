import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacher, className, fullName, stage, session, fileUrl, notes } = body;

    if (!teacher || !className || !fullName || !stage || !session || !fileUrl) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ các thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check existing attempts
    const { data: existing } = await supabase
      .from("submissions")
      .select("attempt_number")
      .eq("teacher", teacher)
      .eq("class_name", className)
      .eq("full_name", fullName)
      .eq("stage", stage)
      .eq("session", session);

    const attemptNumber = (existing?.length || 0) + 1;
    const fileName = fileUrl.toLowerCase().includes("canva") ? "Canva Design Link" : "Google Drive Link";

    const { data: inserted, error } = await supabase
      .from("submissions")
      .insert({
        teacher,
        class_name: className,
        full_name: fullName,
        stage,
        session,
        attempt_number: attemptNumber,
        file_name: fileName,
        file_url: fileUrl,
        notes: notes || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Nộp bài bằng đường liên kết thành công!",
      submission: inserted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
