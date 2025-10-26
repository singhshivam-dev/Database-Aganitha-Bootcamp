// Drill Set 4 — Joins & Aggregates¶
// What you’ll learn:
// Beyond CRUD, ORMs help with joins and aggregates, keeping types safe.

import { drizzle } from "drizzle-orm/postgres-js";
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { eq, sql, desc } from "drizzle-orm";
import postgres from "postgres";
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Connect DB
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Define schemas
const users333 = pgTable("users333", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email").notNull(),
});

const posts333 = pgTable("posts333", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users333.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

async function main() {
  await client`SET client_min_messages TO WARNING;`;

  // Ensure timestamp column exists, beause it may not in older setups
  await client`
    ALTER TABLE posts333 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now() NOT NULL;
  `;

  // Setup readline
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log("\nChoose a user to view their posts:");
  const allUsers = await db.select().from(users333);

  allUsers.forEach((u, i) => console.log(`${i + 1}. ${u.name} (id: ${u.id})`));

  const choice = await rl.question(
    "\nEnter the user name or ID to see their posts: "
  );

  // Identify the user by name or id
  let selectedUser = allUsers.find(
    (u) => u.name.toLowerCase() === choice.toLowerCase()
  );
  if (!selectedUser) {
    const idNum = Number(choice);
    if (!isNaN(idNum)) selectedUser = allUsers.find((u) => u.id === idNum);
  }

  if (!selectedUser) {
    console.log("No matching user found.");
    rl.close();
    await client.end();
    return;
  }

// Fetch posts with author names.
  const userPosts = await db
    .select({
      title: posts333.title,
      content: posts333.content,
      createdAt: posts333.createdAt,
      userName: users333.name,
    })
    .from(posts333)
    .innerJoin(users333, eq(posts333.userId, users333.id))
    .where(eq(posts333.userId, selectedUser.id))
    .orderBy(desc(posts333.createdAt));
// Order posts by newest first.

  if (userPosts.length === 0) {
    console.log(`\n${selectedUser.name} has no posts yet.`);
  } else {
    console.log(`\nPosts by ${selectedUser.name}:`);
    userPosts.forEach((p) =>
      console.log(
        `- ${p.title} (${p.createdAt?.toISOString().split("T")[0]})\n  ${p.content}`
      )
    );
  }

// Use aggregate COUNT with type inference.
  const counts = await db
    .select({
      userName: users333.name,
      postCount: sql<number>`COUNT(${posts333.id})`.as("post_count"),
    })
    .from(users333)
    .leftJoin(posts333, eq(users333.id, posts333.userId))
    .groupBy(users333.id, users333.name);

// Confirm TypeScript types match returned fields.
// Query all users and their post counts.
  console.log("\nUsers with post counts:");
  counts.forEach((row) =>
    console.log(`- ${row.userName}: ${row.postCount} posts`)
  );

  rl.close();
  await client.end();
}

main().catch(console.error);
