// Drill Set 5 — Validate before you write¶
// Why: The DB enforces some rules, but JSON shapes must be validated in the app.

// pnpm add zod
// src/testing/validateProfile.ts
import { z } from "zod";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Create a Zod schema for ProfileMetadata.
const ProfileMetadataSchema = z.object({
  bio: z.string().max(160).optional(),
  website: z.string().url().optional(),
  birthdate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), { message: "Invalid date" })
    .optional(),
  interests: z.array(z.string()).optional(),
});

type ProfileMetadata = z.infer<typeof ProfileMetadataSchema>;

const client = new Client({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
  database: process.env.PG_DATABASE || "dbDrills",
});

async function initDB() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS profiles25 (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL,
      metadata JSONB NOT NULL
    );
  `);
}

// Insert profile function
async function insertProfile(userId: number, metadata: any) {
  // Validate JSON
  const parsed = ProfileMetadataSchema.safeParse(metadata);
  if (!parsed.success) {
    return {
      error: "Invalid profile metadata",
      issues: parsed.error.format(),
    };
  }

  try {
   // Add an app-level uniqueness check with a friendly error.
    const exists = await client.query(
      `SELECT id FROM profiles25 WHERE user_id = $1`,
      [userId]
    );
    const { rowCount } = await client.query(
  `SELECT id FROM profiles25 WHERE user_id = $1`,
  [userId]
);
if (rowCount && rowCount > 0) {
  return { error: "Profile already exists for this user" };
}
    // Insert only validated JSONB.
    await client.query(
      `INSERT INTO profiles25 (user_id, metadata) VALUES ($1, $2)`,
      [userId, parsed.data]
    );

    return { success: true };
  } catch (err: any) {
    // Friendly error for DB constraints
// Ensure DB constraint error is translated to problem+json.
    if (err.code === "23505") {
      return { error: "Unique constraint violated", detail: err.detail };
    }
    return { error: "Database error", detail: err.message };
  }
}

// Example
async function main() {
  await initDB();

  const metadata = {
    bio: "Hello, I code full-stack apps",
    website: "https://example.com",
    birthdate: "2000-01-01",
    interests: ["coding", "music"],
  };

  const result = await insertProfile(1, metadata);
  console.log(result);

  // Reject invalid payloads; unit test the validator.
  const invalidMetadata = { bio: "a".repeat(200), website: "not-a-url" };
  const invalidResult = await insertProfile(2, invalidMetadata);
  console.log(invalidResult);

  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
