import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("full_name, class_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, { fullName: string; className: string; count: number }> = {};

    (submissions || []).forEach((sub) => {
      const key = `${sub.full_name}-${sub.class_name}`;
      if (!counts[key]) {
        counts[key] = {
          fullName: sub.full_name,
          className: sub.class_name,
          count: 0,
        };
      }
      counts[key].count += 1;
    });

    const leaderboard = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json(leaderboard);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
