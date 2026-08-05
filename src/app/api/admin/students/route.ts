import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");

    const supabase = await createClient();
    let query = supabase.from("students").select("*").order("name", { ascending: true });

    if (className) query = query.eq("class_name", className);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (data || []).map((s) => ({
      _id: s.id,
      id: s.id,
      name: s.name,
      className: s.class_name || "Lớp Học Ngoại Lai",
      studentCode: s.student_code,
      maxUploadSize: s.max_upload_size,
      status: s.status,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const assignedClassName = body.className && body.className.trim()
      ? body.className.trim()
      : "Lớp Học Ngoại Lai";

    const { data, error } = await supabase
      .from("students")
      .insert({
        name: body.name,
        class_name: assignedClassName,
        student_code: body.studentCode,
        max_upload_size: body.maxUploadSize || 20,
        status: body.status || "active",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      _id: data.id,
      id: data.id,
      name: data.name,
      className: data.class_name,
      studentCode: data.student_code,
      maxUploadSize: data.max_upload_size,
      status: data.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
