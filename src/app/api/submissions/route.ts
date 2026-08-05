import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacher = searchParams.get("teacher");
    const className = searchParams.get("className");
    const fullName = searchParams.get("fullName");
    const studentCode = searchParams.get("studentCode");
    const q = searchParams.get("q") || searchParams.get("query");

    const supabase = await createClient();

    let query = supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (teacher) query = query.eq("teacher", teacher);
    if (className) query = query.eq("class_name", className);
    if (fullName) query = query.ilike("full_name", `%${fullName.trim()}%`);

    if (studentCode) {
      const code = studentCode.trim();

      // Look up student profile in students table to get official full name
      const { data: stList } = await supabase
        .from("students")
        .select("student_code, name, display_name")
        .ilike("student_code", `%${code}%`);

      const conditions: string[] = [`student_code.ilike.*${code}*`];

      if (stList && stList.length > 0) {
        stList.forEach((st) => {
          if (st.name) conditions.push(`full_name.ilike.*${st.name.trim()}*`);
          if (st.display_name) conditions.push(`full_name.ilike.*${st.display_name.trim()}*`);
        });
      }

      const uniqueConditions = Array.from(new Set(conditions));
      query = query.or(uniqueConditions.join(","));
    } else if (q) {
      const qClean = q.trim();
      query = query.or(`student_code.ilike.*${qClean}*,full_name.ilike.*${qClean}*,class_name.ilike.*${qClean}*`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((sub) => ({
      _id: sub.id,
      id: sub.id,
      teacher: sub.teacher,
      className: sub.class_name,
      fullName: sub.full_name,
      studentCode: sub.student_code,
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
