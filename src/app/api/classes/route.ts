import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherName = searchParams.get("teacher");

    const supabase = await createClient();
    let query = supabase.from("classes").select("*").order("name", { ascending: true });

    if (teacherName) {
      query = query.eq("teacher_name", teacherName);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map column names to camelCase for frontend compatibility
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
