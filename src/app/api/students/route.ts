import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("class");
    const search = searchParams.get("search");

    const supabase = await createClient();
    let query = supabase
      .from("students")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (className) {
      query = query.eq("class_name", className);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,student_code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((std) => ({
      _id: std.id,
      id: std.id,
      name: std.name,
      className: std.class_name,
      studentCode: std.student_code,
      maxUploadSize: std.max_upload_size,
      status: std.status,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
