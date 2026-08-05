import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      description,
      allowed_subjects,
      allowed_levels,
      allowed_subject_levels,
      duration_minutes,
      total_sessions,
      theory_sessions,
      cp1_sessions,
      cp2_sessions,
      final_project_sessions,
      presentation_sessions,
    } = body;

    if (!name) return NextResponse.json({ error: "Tên khối học không được để trống" }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: name.trim(),
        code: code ? code.trim() : name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        description: description ? description.trim() : null,
        allowed_subjects: allowed_subjects ? allowed_subjects.trim() : null,
        allowed_levels: allowed_levels ? allowed_levels.trim() : null,
        allowed_subject_levels: allowed_subject_levels
          ? typeof allowed_subject_levels === "string"
            ? allowed_subject_levels
            : JSON.stringify(allowed_subject_levels)
          : null,
        duration_minutes: duration_minutes ? Number(duration_minutes) : 120,
        total_sessions: total_sessions ? Number(total_sessions) : 14,
        theory_sessions: theory_sessions !== undefined ? String(theory_sessions).trim() : "1-4, 6-8",
        cp1_sessions: cp1_sessions !== undefined ? String(cp1_sessions).trim() : "5",
        cp2_sessions: cp2_sessions !== undefined ? String(cp2_sessions).trim() : "9",
        final_project_sessions: final_project_sessions !== undefined ? String(final_project_sessions).trim() : "10-14",
        presentation_sessions: presentation_sessions !== undefined ? String(presentation_sessions).trim() : "14",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
