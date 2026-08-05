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

    let teacherNamesStr = "";
    if (body.isAllActiveTeachers || body.isExternalClass) {
      if (Array.isArray(body.excludedTeacherNames) && body.excludedTeacherNames.length > 0) {
        teacherNamesStr = `ALL_ACTIVE_EXCEPT:${body.excludedTeacherNames.join(",")}`;
      } else {
        teacherNamesStr = "ALL_ACTIVE";
      }
    } else if (Array.isArray(body.teacherNames)) {
      teacherNamesStr = body.teacherNames.join(", ");
    } else if (typeof body.teacherNames === "string") {
      teacherNamesStr = body.teacherNames;
    } else if (body.teacherName) {
      teacherNamesStr = body.teacherName;
    }

    const { data, error } = await supabase
      .from("classes")
      .update({
        name: body.name,
        teacher_name: teacherNamesStr,
        teacher_names: teacherNamesStr,
        is_external: body.isExternalClass || false,
        category: body.category,
        subject_name: body.subjectName,
        level: body.level,
        start_date: body.isExternalClass ? null : (body.startDate || null),
        end_date: body.isExternalClass ? null : (body.endDate || null),
        start_time: body.isExternalClass ? "00:00" : body.startTime,
        end_time: body.isExternalClass ? "23:59" : body.endTime,
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

    if (Array.isArray(body.assignedStudentIds) && body.assignedStudentIds.length > 0) {
      await supabase
        .from("students")
        .update({ class_name: body.name })
        .in("id", body.assignedStudentIds);
    }

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

    // Get target class name before deleting
    const { data: targetClass } = await supabase.from("classes").select("name").eq("id", id).maybeSingle();

    if (targetClass?.name) {
      // Reassign students belonging to this class to 'Lớp Học Ngoại Lai'
      await supabase
        .from("students")
        .update({ class_name: "Lớp Học Ngoại Lai" })
        .eq("class_name", targetClass.name);
    }

    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
