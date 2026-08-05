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

    const mapped = (data || []).map((cls) => {
      const rawTeacherNamesStr = cls.teacher_names || cls.teacher_name || "";
      let isAllActiveTeachers = false;
      let excludedTeacherNames: string[] = [];
      let teacherNamesArray: string[] = [];

      if (rawTeacherNamesStr.startsWith("ALL_ACTIVE")) {
        isAllActiveTeachers = true;
        if (rawTeacherNamesStr.startsWith("ALL_ACTIVE_EXCEPT:")) {
          const excPart = rawTeacherNamesStr.replace("ALL_ACTIVE_EXCEPT:", "");
          excludedTeacherNames = excPart.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      } else if (rawTeacherNamesStr) {
        teacherNamesArray = rawTeacherNamesStr.split(",").map((s: string) => s.trim()).filter(Boolean);
      }

      return {
        _id: cls.id,
        id: cls.id,
        name: cls.name,
        teacherName: rawTeacherNamesStr,
        teacherNames: teacherNamesArray,
        isAllActiveTeachers,
        excludedTeacherNames,
        isExternalClass: cls.is_external || false,
        category: cls.category || "",
        subjectName: cls.subject_name || "",
        level: cls.level || "",
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
      };
    });

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .insert({
        name: body.name,
        teacher_name: teacherNamesStr,
        teacher_names: teacherNamesStr,
        is_external: body.isExternalClass || false,
        category: body.category || null,
        subject_name: body.subjectName || null,
        level: body.level || null,
        start_date: body.isExternalClass ? null : (body.startDate || null),
        end_date: body.isExternalClass ? null : (body.endDate || null),
        start_time: body.isExternalClass ? "00:00" : (body.startTime || "18:00"),
        end_time: body.isExternalClass ? "23:59" : (body.endTime || "20:00"),
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
