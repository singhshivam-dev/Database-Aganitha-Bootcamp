// Drill Set 5 — Schemaless JSON Columns¶
// What you’ll learn:
// Postgres supports JSONB columns, letting you store schemaless data.
// This is useful when you don’t know all the fields ahead of time.

import { Client } from "pg";

async function main() {
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "dbDrills",
    password: "postgres@132k4",
    port: 5432,
  });

  await client.connect();

  await client.query(`DROP TABLE IF EXISTS profiles CASCADE;`);

// Alter profiles table, add metadata JSONB.
  await client.query(`
    CREATE TABLE profiles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      metadata JSONB
    );
  `);

// Insert a row with metadata: { "twitter": "@alice", "hobbies": ["reading", "cycling"] }
  await client.query(`
    INSERT INTO profiles (name, metadata)
    VALUES
      ('Alice', '{"twitter": "@alice", "hobbies": ["reading", "cycling"]}'),
      ('Bob', '{"linkedin": "bob-linkedin", "skills": ["SQL", "TypeScript"], "active": true}');
  `);

  const res = await client.query(`SELECT * FROM profiles;`);

  console.log("\n Profiles with JSONB metadata:");
  res.rows.forEach((row) => {
    console.log({
      id: row.id,
      name: row.name,
      metadata: row.metadata, // JSONB auto-parsed into JS object
    });
  });

// Fetch and print metadata as a JS object.
// Add another row with a different structure (different keys).
  const resTwitter = await client.query(`
    SELECT name, metadata->>'twitter' AS twitter_handle
    FROM profiles
    WHERE metadata ? 'twitter';
  `);

  console.log("\n Users with Twitter handles:");
  console.table(resTwitter.rows);

  
  await client.end();
}

main().catch(console.error);


// Discuss: Why use JSONB instead of new columns? When not to?

  // When to use JSONB:
  // - Data shape varies per user or record.
  // - You want flexibility without altering the table schema.
  // - Good for metadata, logs, or semi-structured data.
  
  // When NOT to use JSONB:
  // - When you need to frequently query or join on specific fields.
  // - When structure is stable — use proper columns instead.