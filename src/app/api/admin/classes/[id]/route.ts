import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("classes")
      .update({
        name: body.name,
        teacher_name: body.teacherName,
        start_date: body.startDate || null,
        end_date: body.endDate || null,
        start_time: body.startTime,
        end_time: body.endTime,
        checkpoint1_start_date: body.checkpoint1StartDate || null,
        checkpoint1_deadline: body.checkpoint1Deadline || null,
        checkpoint1_late_type: body.checkpoint1LateType,
        checkpoint1_late_deadline: body.checkpoint1LateDeadline || null,
        checkpoint2_start_date: body.checkpoint2StartDate || null,
        checkpoint2_deadline: body.checkpoint2Deadline || null,
        checkpoint2_late_type: body.checkpoint2LateType,
        checkpoint2_late_deadline: body.checkpoint2LateDeadline || null,
        final_project_start_date: body.finalProjectStartDate || null,
        final_project_deadline: body.finalProjectDeadline || null,
        final_project_late_type: body.finalProjectLateType,
        final_project_late_deadline: body.finalProjectLateDeadline || null,
        presentation_start_date: body.presentationStartDate || null,
        presentation_deadline: body.presentationDeadline || null,
        presentation_late_type: body.presentationLateType,
        presentation_late_deadline: body.presentationLateDeadline || null,
        allow_late_upload: body.allowLateUpload,
        is_force_ended: body.isForceEnded,
      })
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
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
