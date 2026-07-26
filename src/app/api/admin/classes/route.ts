import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const mapped = (data || []).map((cls) => ({
      _id: cls.id,
      id: cls.id,
      name: cls.name,
      teacherName: cls.teacher_name,
      startDate: cls.start_date,
      endDate: cls.end_date,
      startTime: cls.start_time,
      endTime: cls.end_time,
      checkpoint1StartDate: cls.checkpoint1_start_date,
      checkpoint1Deadline: cls.checkpoint1_deadline,
      checkpoint1LateType: cls.checkpoint1_late_type,
      checkpoint1LateDeadline: cls.checkpoint1_late_deadline,
      checkpoint2StartDate: cls.checkpoint2_start_date,
      checkpoint2Deadline: cls.checkpoint2_deadline,
      checkpoint2LateType: cls.checkpoint2_late_type,
      checkpoint2LateDeadline: cls.checkpoint2_late_deadline,
      finalProjectStartDate: cls.final_project_start_date,
      finalProjectDeadline: cls.final_project_deadline,
      finalProjectLateType: cls.final_project_late_type,
      finalProjectLateDeadline: cls.final_project_late_deadline,
      presentationStartDate: cls.presentation_start_date,
      presentationDeadline: cls.presentation_deadline,
      presentationLateType: cls.presentation_late_type,
      presentationLateDeadline: cls.presentation_late_deadline,
      allowLateUpload: cls.allow_late_upload,
      isForceEnded: cls.is_force_ended,
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

    const { data, error } = await supabase
      .from("classes")
      .insert({
        name: body.name,
        teacher_name: body.teacherName,
        start_date: body.startDate || null,
        end_date: body.endDate || null,
        start_time: body.startTime || "08:00",
        end_time: body.endTime || "10:00",
        checkpoint1_start_date: body.checkpoint1StartDate || null,
        checkpoint1_deadline: body.checkpoint1Deadline || null,
        checkpoint1_late_type: body.checkpoint1LateType || "none",
        checkpoint1_late_deadline: body.checkpoint1LateDeadline || null,
        checkpoint2_start_date: body.checkpoint2StartDate || null,
        checkpoint2_deadline: body.checkpoint2Deadline || null,
        checkpoint2_late_type: body.checkpoint2LateType || "none",
        checkpoint2_late_deadline: body.checkpoint2LateDeadline || null,
        final_project_start_date: body.finalProjectStartDate || null,
        final_project_deadline: body.finalProjectDeadline || null,
        final_project_late_type: body.finalProjectLateType || "none",
        final_project_late_deadline: body.finalProjectLateDeadline || null,
        presentation_start_date: body.presentationStartDate || null,
        presentation_deadline: body.presentationDeadline || null,
        presentation_late_type: body.presentationLateType || "none",
        presentation_late_deadline: body.presentationLateDeadline || null,
        allow_late_upload: body.allowLateUpload || false,
        is_force_ended: body.isForceEnded || false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
