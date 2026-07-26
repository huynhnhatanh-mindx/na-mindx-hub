import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
  const email = "admin@namindx.com";
  const password = "Nh@t@nh12@8";

  console.log(`Creating Admin user: ${email} with password: ${password}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: "admin",
        display_name: "Quản trị viên",
        role: "admin",
      },
    },
  });

  if (error) {
    console.error("Error creating admin:", error.message);
  } else {
    console.log("✅ Admin user created successfully in Supabase Auth!");
    console.log("User ID:", data.user?.id);
  }
}

createAdmin();
