// Drill Set 6 — SQLite vs Postgres¶
// What you’ll learn:
// Good ORMs let you run the same schema in multiple databases.

import initSqlJs from "sql.js"; // using sql.js instead
// pnpm add drizzle-orm sql.js
// pnpm add -D typescript ts-node @types/node
import { drizzle, SQLJsDatabase } from "drizzle-orm/sql-js";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { eq, relations } from "drizzle-orm";

// Point Drizzle schema at SQLite in-memory DB.
// Define Schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
});

// Define Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

// Combine schema for drizzle()
const schema = { users, posts, usersRelations, postsRelations };

const MIGRATION_SQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION
  );

  CREATE UNIQUE INDEX users_email_unique ON users (email);
`;

async function main() {
  // Point Drizzle schema at SQLite in-memory DB.

  const SQL = await initSqlJs();
  const sqljsDB = new SQL.Database(); // In-memory DB
  const db: SQLJsDatabase<typeof schema> = drizzle(sqljsDB, { schema });

  console.log("In-memory SQL.js DB connected.");

  // Re-run migrations.
  console.log("Applying schema (running 'migration')...");
  sqljsDB.run(MIGRATION_SQL);
  console.log("Schema applied.");

  // Insert and fetch rows.
  console.log("\nInserting sample users...");
  await db.insert(users).values([
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
  ]);

  // Confirm queries still compile and run.
  const allUsers = await db.select().from(users);
  console.log("Users:", allUsers);

  // Insert related post
  console.log("\nInserting a related post for Alice...");
  await db.insert(posts).values({
    title: "My First Post (via sql.js)",
    authorId: allUsers[0].id,
  });

  // Query posts with their author relation
  console.log("\nFetching posts with authors...");
  const joined = await db
  .select({
    postTitle: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(users.id, posts.authorId))
  .all();

  console.log("Posts with authors:", joined);

  sqljsDB.close();
}

main().catch((err) => {
  console.error("Error running drill:", err);
  process.exit(1);
});

// Reflect: why SQLite is useful for testing.

// SQLite (especially in-memory via sql.js) is perfect for testing because:
// - It requires no server setup or credentials.
// - Tests run entirely in memory and reset automatically.
// - Schema + query logic can be tested identically to Postgres or MySQL.
// - Fast startup and teardown times.
