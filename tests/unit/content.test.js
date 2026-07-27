import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../../js/content.js");
await import("../../js/progression.js");

const content = globalThis.OttiskContent;
const progression = globalThis.OttiskProgression;

test("shipped content is valid, frozen, and matches the editable catalog", async () => {
  const diskCatalog = JSON.parse(
    await readFile(new URL("../../content/catalog.json", import.meta.url), "utf8"),
  );

  assert.deepEqual(diskCatalog, content.DEFAULT_CATALOG);
  assert.deepEqual(content.validate(content.DEFAULT_CATALOG), { valid: true, errors: [] });
  assert.ok(Object.isFrozen(content.DEFAULT_CATALOG));
  assert.ok(Object.isFrozen(content.DEFAULT_CATALOG.biomes[0].palette));
  assert.equal(content.byId("biomes", "midnight-trench").name, "Полуночный разлом");
  assert.equal(content.byId("enemies", "missing"), undefined);
});

test("catalog validation reports structural and cross-reference errors", () => {
  const catalog = content.clone(content.DEFAULT_CATALOG);
  catalog.biomes[1].id = catalog.biomes[0].id;
  catalog.waves[0].spawns[0].enemyId = "not-real";
  catalog.events[0].weight = -1;

  const result = content.validate(catalog);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => item.message.includes("duplicate id")));
  assert.ok(result.errors.some((item) => item.message.includes('unknown enemy "not-real"')));
  assert.ok(result.errors.some((item) => item.path === "$.events[0].weight"));
});

test("catalog parser handles valid and malformed JSON without throwing", () => {
  const valid = content.parse(JSON.stringify(content.DEFAULT_CATALOG));
  assert.equal(valid.valid, true);
  assert.equal(valid.catalog.schemaVersion, content.SCHEMA_VERSION);

  const malformed = content.parse("{ nope");
  assert.equal(malformed.valid, false);
  assert.match(malformed.errors[0].message, /invalid JSON/);

  const wrongShape = content.validate({ schemaVersion: 1, biomes: {} });
  assert.equal(wrongShape.valid, false);
  assert.ok(wrongShape.errors.some((item) => item.path === "$.biomes"));
});

test("progression earns and spends points immutably with prerequisites", () => {
  const empty = progression.createState();
  const funded = progression.earn(empty, 8);

  assert.equal(empty.available, 0);
  assert.equal(funded.available, 8);
  assert.deepEqual(progression.canSpend(funded, "bright-core"), {
    ok: false,
    reason: "missing-prerequisite",
    prerequisite: { id: "steady-touch", rank: 1 },
  });

  const first = progression.spend(funded, "steady-touch");
  assert.equal(first.ok, true);
  const bright = progression.spend(first.state, "bright-core");
  assert.equal(bright.ok, true);
  assert.deepEqual(bright.state.spent, { "steady-touch": 1, "bright-core": 1 });
  assert.equal(bright.state.available, 6);
  assert.deepEqual(progression.effects(bright.state), {
    maxHunger: 8,
    lightMultiplier: 1.1,
  });
  assert.deepEqual(funded.spent, {});
});

test("progression enforces rank, cost, and prerequisite rules", () => {
  let state = progression.earn(progression.createState(), 20);
  state = progression.spend(state, "steady-touch").state;
  state = progression.spend(state, "steady-touch").state;
  assert.equal(progression.canSpend(state, "quick-current").ok, true);

  state = progression.spend(state, "quick-current").state;
  state = progression.spend(state, "quick-current").state;
  assert.equal(progression.canSpend(state, "quick-current").reason, "max-rank");

  const broke = progression.createState();
  assert.equal(progression.spend(broke, "steady-touch").reason, "insufficient-points");
  assert.equal(progression.spend(broke, "unknown").reason, "unknown-skill");
});

test("progression state serializes safely and rejects tampering", () => {
  const purchased = progression.spend(
    progression.earn(progression.createState(), 3),
    "steady-touch",
  ).state;
  const encoded = progression.serialize(purchased);
  assert.deepEqual(progression.deserialize(encoded), purchased);
  assert.deepEqual(progression.validateState(purchased), { valid: true, errors: [] });
  assert.ok(Object.isFrozen(progression.SKILL_TREE));
  assert.ok(Object.isFrozen(progression.SKILL_TREE[0].effects));

  assert.throws(
    () => progression.deserialize('{"version":1,"available":9,"totalEarned":1,"spent":{}}'),
    /available points plus spent costs/,
  );
  assert.throws(() => progression.earn(purchased, -1), /non-negative safe integer/);
});
