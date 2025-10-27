// Drill Set 4 — Mock data with constraints¶
// Why: Realistic data respects constraints and avoids false confidence in tests.

import initSqlJs from "sql.js";
import { drizzle, SQLJsDatabase } from "drizzle-orm/sql-js";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import {faker} from '@faker-js/faker/locale/en';


const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),  // will enforce length constraint
  content: text("content"),
  authorId: integer("author_id").notNull(), // FK to users.id
});

const schema = { users, notes };

// Build TypeScript factories for user, note.
type User = { name: string; email: string };
type Note = { title: string; content: string; authorId: number };

function createUsers(count: number): User[] {
  const users: User[] = [];
  const emails = new Set<string>();

  while (users.length < count) {
    const name = faker.person.fullName();
    const email = faker.internet.email();
    if (!emails.has(email)) {
      emails.add(email);
      users.push({ name, email });
    }
  }
  return users;
}

function createNotes(userIds: number[], notesPerUser = 5): Note[] {
  const notes: Note[] = [];
  for (const userId of userIds) {
    for (let i = 0; i < notesPerUser; i++) {
      let title = faker.lorem.words(5);
// Add a CHECK constraint (e.g., title length) and hit it.
      if (title.length > 50) title = title.slice(0, 50); // enforce CHECK constraint
      const content = faker.lorem.paragraph();
      notes.push({ title, content, authorId: userId });
    }
  }
  return notes;
}

// Seed function
async function seed() {
  const SQL = await initSqlJs();
  const sqljsDB = new SQL.Database();
  const db: SQLJsDatabase<typeof schema> = drizzle(sqljsDB, { schema });

  // Create tables with constraints
  sqljsDB.run(`
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS users;
  `);

  sqljsDB.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `);

  sqljsDB.run(`
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(title) <= 50),
      content TEXT,
      author_id INTEGER NOT NULL REFERENCES users(id)
    );
  `);

  // Generate and insert users
// Generate 100 users; ensure UNIQUE(email) holds.
  const userData = createUsers(100);
  userData.forEach(u => sqljsDB.run(
    `INSERT INTO users (name, email) VALUES (?, ?)`, [u.name, u.email]
  ));

  // Generate and insert notes
// Generate notes tied to valid user_ids (FK).
  const userIds = userData.map((_, idx) => idx + 1); // IDs start at 1
  const noteData = createNotes(userIds, 5);
  noteData.forEach(n => sqljsDB.run(
    `INSERT INTO notes (title, content, author_id) VALUES (?, ?, ?)`,
    [n.title, n.content, n.authorId]
  ));

  console.log("Seeded 100 users and notes successfully.");

const res = sqljsDB.exec("SELECT id, name, email FROM users LIMIT 10");
  if (res.length > 0) {
    console.log("\nFirst 10 users:");
    const columns = res[0].columns;
    const values = res[0].values;
    values.forEach(row => {
      const obj: any = {};
      row.forEach((val, idx) => obj[columns[idx]] = val);
      console.log(obj);
    });
  }

  sqljsDB.close();
}

// Run seeding
seed().catch(err => {
  console.error("Error seeding data:", err);
  process.exit(1);
});
