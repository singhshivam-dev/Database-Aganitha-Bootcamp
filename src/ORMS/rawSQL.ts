// Drill Set 5 — Mixing Raw SQL¶
// What you’ll learn:
// Sometimes ORMs can’t express a query. You can safely drop into SQL.

import { drizzle } from "drizzle-orm/postgres-js";
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { eq, desc, sql } from "drizzle-orm";
import postgres from "postgres";
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Connect DB
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Existing schemas
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
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const searchTerm = await rl.question("Enter a keyword to search posts: ");

  // Add type annotations for results.
  type PostResult = {
    id: number;
    title: string;
    content: string;
    user_name: string;
  };

  // Run a raw SQL query for full-text search on posts.
  const rawResults: PostResult[] = await db.execute(sql<PostResult>`
    SELECT p.id, p.title, p.content, u.name AS user_name
    FROM posts333 p
    INNER JOIN users333 u ON p.user_id = u.id
    WHERE p.content ILIKE ${"%" + searchTerm + "%"}
    ORDER BY p.created_at DESC
  `);

  console.log(`\nRaw SQL results for "${searchTerm}":`);
  rawResults.forEach((r) =>
    console.log(`- ${r.title} by ${r.user_name}\n  ${r.content}`)
  );

  // Wrap result mapping with Drizzle --ORM helper methods.
  const ormResults = await db
    .select({
      id: posts333.id,
      title: posts333.title,
      content: posts333.content,
      userName: users333.name,
    })
    .from(posts333)
    .innerJoin(users333, eq(posts333.userId, users333.id))
    .where(sql`${posts333.content} ILIKE ${"%" + searchTerm + "%"}`)
    .orderBy(desc(posts333.createdAt));

  console.log(`\nORM results for "${searchTerm}":`);
  ormResults.forEach((r) => console.log(`- ${r.title} by ${r.userName}`));

  // Compare raw SQL performance vs ORM helper.
  // Document when to use raw SQL vs ORM.

    // Use raw SQL when:
    //   - You need complex queries like full-text search, window functions, or custom joins.
    //   - Performance tuning or database-specific features are required.

    // Use ORM helpers when:
    //   - The query is simple and can be expressed with ORM functions.
    //   - Type safety, maintainability, and readability are important.

  rl.close();
  await client.end();
}

main().catch(console.error);
