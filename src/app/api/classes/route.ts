import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherName = searchParams.get("teacher");

    const supabase = await createClient();
    const { data, error } = await supabase.from("classes").select("*").order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = data || [];
    if (teacherName) {
      filtered = filtered.filter((cls) => {
        const rawTeacherStr = cls.teacher_names || cls.teacher_name || "";
        const isExternal = cls.is_external || false;

        if (isExternal) {
          return cls.name === `Lớp Không Xác Định - GV ${teacherName}` || rawTeacherStr.includes(teacherName);
        }

        if (rawTeacherStr.startsWith("ALL_ACTIVE")) {
          if (rawTeacherStr.startsWith("ALL_ACTIVE_EXCEPT:")) {
            const excPart = rawTeacherStr.replace("ALL_ACTIVE_EXCEPT:", "");
            const excludedList = excPart.split(",").map((s: string) => s.trim().toLowerCase());
            return !excludedList.includes(teacherName.toLowerCase());
          }
          return true;
        }

        const tList = rawTeacherStr.split(",").map((s: string) => s.trim().toLowerCase());
        return tList.includes(teacherName.toLowerCase());
      });
    }

    // Map column names to camelCase for frontend compatibility
    const mapped = filtered.map((cls) => ({
      _id: cls.id,
      id: cls.id,
      name: cls.name,
      teacherName: cls.teacher_names || cls.teacher_name,
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
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
