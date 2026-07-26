import { MongoClient } from "mongodb";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const mongoClient = new MongoClient(MONGODB_URI);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrateUsers() {
  await mongoClient.connect();
  const db = mongoClient.db();

  const users = await db.collection("users").find({}).toArray();
  console.log(`Found ${users.length} users in MongoDB.`);

  for (const u of users) {
    const email = u.email || `${u.username.toLowerCase()}@namindx.hub`;
    // Set password to Nh@t@nh12@8 for admin or requested password
    const password = u.username === "admin" ? "Nh@t@nh12@8" : "Mindx@2026";

    console.log(`Creating user: ${u.username} (${email})...`);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: u.username,
          display_name: u.displayName || u.username,
          role: u.role || "admin",
        },
      },
    });

    if (error) {
      console.log(`User ${u.username} already exists or error:`, error.message);
    } else {
      console.log(`✅ User ${u.username} created successfully in Supabase Auth!`);
    }
  }

  await mongoClient.close();
}

migrateUsers();
