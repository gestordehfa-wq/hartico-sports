import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");

const migrations = [
  ["apps/racing/supabase/migrations/001_core_identity.sql", "20260918000100_racing_001_core_identity.sql"],
  ["apps/racing/supabase/migrations/002_seasons.sql", "20260918000200_racing_002_seasons.sql"],
  ["apps/racing/supabase/migrations/003_drivers_teams.sql", "20260918000300_racing_003_drivers_teams.sql"],
  ["apps/racing/supabase/migrations/004_driver_entries.sql", "20260918000400_racing_004_driver_entries.sql"],
  ["apps/racing/supabase/migrations/005_circuits_grand_prix.sql", "20260918000500_racing_005_circuits_grand_prix.sql"],
  ["apps/racing/supabase/migrations/006_rbac_rls.sql", "20260918000600_racing_006_rbac_rls.sql"],
  ["apps/racing/supabase/migrations/007_audit.sql", "20260918000700_racing_007_audit.sql"],
  ["apps/racing/supabase/migrations/008_qualifying_race_results.sql", "20260919000800_racing_008_qualifying_race_results.sql"],
  ["apps/football-lite/supabase/migrations/001_identity_seasons.sql", "20260918010100_football_001_identity_seasons.sql"],
  ["apps/football-lite/supabase/migrations/002_competition_people.sql", "20260918010200_football_002_competition_people.sql"],
  ["apps/football-lite/supabase/migrations/003_matches_events.sql", "20260918010300_football_003_matches_events.sql"],
  ["apps/football-lite/supabase/migrations/004_awards_projections.sql", "20260918010400_football_004_awards_projections.sql"],
  ["apps/football-lite/supabase/migrations/005_audit.sql", "20260918010500_football_005_audit.sql"],
  ["apps/tennis/supabase/migrations/001_identity_catalogs.sql", "20260918020100_tennis_001_identity_catalogs.sql"],
  ["apps/tennis/supabase/migrations/002_competition.sql", "20260918020200_tennis_002_competition.sql"],
  ["apps/tennis/supabase/migrations/003_draw_results.sql", "20260918020300_tennis_003_draw_results.sql"],
  ["apps/tennis/supabase/migrations/004_audit.sql", "20260918020400_tennis_004_audit.sql"],
  ["apps/tennis/supabase/migrations/005_games_scoring_ranking.sql", "20260919020500_tennis_005_games_scoring_ranking.sql"],
];

const tests = [
  ["apps/racing/supabase/tests/001_domain_constraints.sql", "001_racing_domain_constraints.sql"],
  ["apps/racing/supabase/tests/002_rls_audit.sql", "002_racing_rls_audit.sql"],
  ["apps/racing/supabase/tests/003_qualifying_race_results.sql", "008_racing_v02_results.sql"],
  ["apps/football-lite/supabase/tests/001_domain_constraints.sql", "003_football_domain_constraints.sql"],
  ["apps/football-lite/supabase/tests/002_rls_audit.sql", "004_football_rls_audit.sql"],
  ["apps/tennis/supabase/tests/001_domain_constraints.sql", "005_tennis_domain_constraints.sql"],
  ["apps/tennis/supabase/tests/002_rls_audit.sql", "006_tennis_rls_audit.sql"],
  ["apps/tennis/supabase/tests/003_games_scoring_ranking.sql", "009_tennis_v02_games_ranking.sql"],
];

const generatedHeader = (source) =>
  `-- Generated from ${source} by tooling/assemble-supabase.mjs. Do not edit this copy.\n`;

async function expectedFiles(entries) {
  return Promise.all(
    entries.map(async ([source, target]) => {
      const content = await readFile(resolve(root, source), "utf8");
      const schema = source.includes("/racing/")
        ? "racing"
        : source.includes("/football-lite/")
          ? "football"
          : "tennis";
      if (content.includes("public.")) {
        throw new Error(`${source} contains a forbidden public schema reference`);
      }
      for (const otherSchema of ["racing", "football", "tennis"].filter(
        (candidate) => candidate !== schema,
      )) {
        if (content.includes(`${otherSchema}.`)) {
          throw new Error(`${source} crosses the ${schema}/${otherSchema} domain boundary`);
        }
      }
      return [target, `${generatedHeader(source)}${content}`];
    }),
  );
}

async function writeEntries(directory, entries) {
  await mkdir(directory, { recursive: true });
  for (const [name, content] of entries) {
    await writeFile(resolve(directory, name), content, "utf8");
  }
}

async function checkEntries(directory, entries, allowedExtra = []) {
  const expectedNames = new Set(entries.map(([name]) => name));
  const allowed = new Set(allowedExtra);
  const actualNames = (await readdir(directory)).filter((name) => name.endsWith(".sql"));
  const unexpected = actualNames.filter((name) => !expectedNames.has(name) && !allowed.has(name));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected SQL in ${directory}: ${unexpected.join(", ")}`);
  }
  const missingRequired = allowedExtra.filter((name) => !actualNames.includes(name));
  if (missingRequired.length > 0) {
    throw new Error(`Missing required SQL in ${directory}: ${missingRequired.join(", ")}`);
  }

  for (const [name, expected] of entries) {
    const actual = await readFile(resolve(directory, name), "utf8");
    if (actual !== expected) throw new Error(`${name} is not synchronized with its domain source`);
  }
}

const migrationDirectory = resolve(root, "supabase/migrations");
const testDirectory = resolve(root, "supabase/tests");
const expectedMigrations = await expectedFiles(migrations);
const expectedTests = await expectedFiles(tests);

if (process.argv.includes("--write")) {
  await writeEntries(migrationDirectory, expectedMigrations);
  await writeEntries(testDirectory, expectedTests);
}

await checkEntries(migrationDirectory, expectedMigrations);
await checkEntries(testDirectory, expectedTests, ["007_product_isolation.sql"]);
console.log(`Supabase assembly verified: ${migrations.length} migrations and ${tests.length} domain tests.`);
