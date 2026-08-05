import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const [
      { count: totalStudents },
      { count: totalClasses },
      { count: totalTeachers },
      { count: totalSubmissions },
      { data: visitorData },
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      supabase.from("visitors").select("count").limit(1).single(),
    ]);

    return NextResponse.json({
      totalStudents: totalStudents || 0,
      totalClasses: totalClasses || 0,
      totalTeachers: totalTeachers || 0,
      totalSubmissions: totalSubmissions || 0,
      totalVisits: visitorData?.count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
