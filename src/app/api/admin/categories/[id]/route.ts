import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const supabase = await createClient();
    const updates: any = {};
    if (name) updates.name = name.trim();
    if (code) updates.code = code.trim();
    if (description !== undefined) updates.description = description;
    if (allowed_subjects !== undefined) updates.allowed_subjects = allowed_subjects;
    if (allowed_levels !== undefined) updates.allowed_levels = allowed_levels;
    if (allowed_subject_levels !== undefined) {
      updates.allowed_subject_levels = typeof allowed_subject_levels === "string"
        ? allowed_subject_levels
        : JSON.stringify(allowed_subject_levels);
    }
    if (duration_minutes !== undefined) updates.duration_minutes = Number(duration_minutes) || 120;
    if (total_sessions !== undefined) updates.total_sessions = Number(total_sessions) || 14;
    if (theory_sessions !== undefined) updates.theory_sessions = String(theory_sessions).trim();
    if (cp1_sessions !== undefined) updates.cp1_sessions = String(cp1_sessions).trim();
    if (cp2_sessions !== undefined) updates.cp2_sessions = String(cp2_sessions).trim();
    if (final_project_sessions !== undefined) updates.final_project_sessions = String(final_project_sessions).trim();
    if (presentation_sessions !== undefined) updates.presentation_sessions = String(presentation_sessions).trim();

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
