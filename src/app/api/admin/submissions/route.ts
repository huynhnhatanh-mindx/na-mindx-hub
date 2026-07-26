import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacher = searchParams.get("teacher");

    const supabase = await createClient();
    let query = supabase.from("submissions").select("*").order("created_at", { ascending: false });

    if (teacher) query = query.eq("teacher", teacher);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (data || []).map((sub) => ({
      _id: sub.id,
      id: sub.id,
      teacher: sub.teacher,
      className: sub.class_name,
      fullName: sub.full_name,
      stage: sub.stage,
      session: sub.session,
      attemptNumber: sub.attempt_number,
      fileName: sub.file_name,
      fileUrl: sub.file_url,
      notes: sub.notes,
      createdAt: sub.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Bulk delete handler
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Danh sách ID không hợp lệ" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("submissions").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, count: ids.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
