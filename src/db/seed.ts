import { config } from "dotenv";

config({ path: ".env.local" });

const DEFAULT_CATEGORIES = [
  "정책",
  "교원",
  "학생생활",
  "교육과정",
  "지역교육",
  "평가",
];

async function main() {
  // dotenv 로드 후에 db를 불러와야 DATABASE_URL을 읽을 수 있다.
  const { db } = await import("./index");
  const { categories } = await import("./schema");

  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing({ target: categories.name });

  const rows = await db.select().from(categories);
  console.log(`categories: ${rows.map((r) => r.name).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
