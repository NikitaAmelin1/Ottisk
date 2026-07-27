/**
 * Standalone metaprogression skill tree.
 * All state operations are immutable and available through globalThis.OttiskProgression.
 */
(function attachOttiskProgression(root) {
  "use strict";

  const STATE_VERSION = 1;
  const SKILL_TREE = [
    {
      id: "steady-touch",
      name: "Верный след",
      description: "Запас сытости растёт на 8 за ранг.",
      cost: 1,
      maxRank: 3,
      prerequisites: [],
      effects: { maxHunger: 8 },
    },
    {
      id: "bright-core",
      name: "Яркое ядро",
      description: "Собранный свет ценнее на 10% за ранг.",
      cost: 1,
      maxRank: 3,
      prerequisites: [{ id: "steady-touch", rank: 1 }],
      effects: { lightMultiplier: 1.1 },
    },
    {
      id: "quick-current",
      name: "Быстрое течение",
      description: "Скорость движения растёт на 5% за ранг.",
      cost: 2,
      maxRank: 2,
      prerequisites: [{ id: "steady-touch", rank: 2 }],
      effects: { speedMultiplier: 1.05 },
    },
    {
      id: "second-pulse",
      name: "Второй импульс",
      description: "Один раз за забег предотвращает гибель.",
      cost: 3,
      maxRank: 1,
      prerequisites: [
        { id: "bright-core", rank: 2 },
        { id: "quick-current", rank: 1 },
      ],
      effects: { revives: 1 },
    },
    {
      id: "deep-memory",
      name: "Память глубины",
      description: "Награды за завершённые волны растут на 20%.",
      cost: 3,
      maxRank: 1,
      prerequisites: [{ id: "bright-core", rank: 3 }],
      effects: { waveRewardMultiplier: 1.2 },
    },
  ];

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function skillById(id) {
    return SKILL_TREE.find((skill) => skill.id === id);
  }

  function createState() {
    return {
      version: STATE_VERSION,
      available: 0,
      totalEarned: 0,
      spent: {},
    };
  }

  function validateState(state) {
    const errors = [];
    const error = (path, message) => errors.push({ path, message });
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return { valid: false, errors: [{ path: "$", message: "must be an object" }] };
    }
    if (state.version !== STATE_VERSION) error("$.version", `must equal ${STATE_VERSION}`);
    for (const key of ["available", "totalEarned"]) {
      if (!Number.isSafeInteger(state[key]) || state[key] < 0) {
        error(`$.${key}`, "must be a non-negative safe integer");
      }
    }
    if (!state.spent || typeof state.spent !== "object" || Array.isArray(state.spent)) {
      error("$.spent", "must be an object");
    } else {
      Object.entries(state.spent).forEach(([id, rank]) => {
        const skill = skillById(id);
        if (!skill) error(`$.spent.${id}`, "is not a known skill");
        if (!Number.isSafeInteger(rank) || rank < 1 || (skill && rank > skill.maxRank)) {
          error(`$.spent.${id}`, `must be an integer from 1 to ${skill?.maxRank ?? 1}`);
        }
      });
      for (const skill of SKILL_TREE) {
        const rank = state.spent[skill.id] || 0;
        if (!rank) continue;
        skill.prerequisites.forEach((requirement) => {
          if ((state.spent[requirement.id] || 0) < requirement.rank) {
            error(
              `$.spent.${skill.id}`,
              `requires ${requirement.id} rank ${requirement.rank}`,
            );
          }
        });
      }
    }
    if (Number.isSafeInteger(state.available) && Number.isSafeInteger(state.totalEarned)) {
      const used = SKILL_TREE.reduce(
        (sum, skill) => sum + (state.spent?.[skill.id] || 0) * skill.cost,
        0,
      );
      if (state.available + used !== state.totalEarned) {
        error("$", "available points plus spent costs must equal totalEarned");
      }
    }
    return { valid: errors.length === 0, errors };
  }

  function assertState(state) {
    const result = validateState(state);
    if (!result.valid) {
      throw new TypeError(result.errors.map((item) => `${item.path} ${item.message}`).join("; "));
    }
  }

  function earn(state, amount = 1) {
    assertState(state);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError("amount must be a non-negative safe integer");
    }
    return {
      version: STATE_VERSION,
      available: state.available + amount,
      totalEarned: state.totalEarned + amount,
      spent: { ...state.spent },
    };
  }

  function canSpend(state, skillId) {
    const validation = validateState(state);
    if (!validation.valid) return { ok: false, reason: "invalid-state" };
    const skill = skillById(skillId);
    if (!skill) return { ok: false, reason: "unknown-skill" };
    const currentRank = state.spent[skillId] || 0;
    if (currentRank >= skill.maxRank) return { ok: false, reason: "max-rank" };
    if (state.available < skill.cost) return { ok: false, reason: "insufficient-points" };
    const missing = skill.prerequisites.find(
      (requirement) => (state.spent[requirement.id] || 0) < requirement.rank,
    );
    if (missing) return { ok: false, reason: "missing-prerequisite", prerequisite: missing };
    return { ok: true, skill, nextRank: currentRank + 1 };
  }

  function spend(state, skillId) {
    const eligibility = canSpend(state, skillId);
    if (!eligibility.ok) return { ...eligibility, state };
    const skill = eligibility.skill;
    return {
      ok: true,
      state: {
        version: STATE_VERSION,
        available: state.available - skill.cost,
        totalEarned: state.totalEarned,
        spent: {
          ...state.spent,
          [skillId]: eligibility.nextRank,
        },
      },
    };
  }

  function effects(state) {
    assertState(state);
    const result = {};
    for (const skill of SKILL_TREE) {
      const rank = state.spent[skill.id] || 0;
      if (!rank) continue;
      Object.entries(skill.effects).forEach(([key, value]) => {
        if (key.endsWith("Multiplier")) {
          result[key] = (result[key] ?? 1) * (value ** rank);
        } else {
          result[key] = (result[key] ?? 0) + value * rank;
        }
      });
    }
    return result;
  }

  function serialize(state) {
    assertState(state);
    return JSON.stringify({
      version: STATE_VERSION,
      available: state.available,
      totalEarned: state.totalEarned,
      spent: Object.fromEntries(
        Object.entries(state.spent).sort(([left], [right]) => left.localeCompare(right)),
      ),
    });
  }

  function deserialize(serialized) {
    let value;
    try {
      value = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
    } catch (cause) {
      throw new TypeError(`Invalid progression JSON: ${cause.message}`);
    }
    const state = {
      version: value?.version,
      available: value?.available,
      totalEarned: value?.totalEarned,
      spent: value?.spent && typeof value.spent === "object" ? { ...value.spent } : value?.spent,
    };
    assertState(state);
    return state;
  }

  deepFreeze(SKILL_TREE);
  root.OttiskProgression = Object.freeze({
    STATE_VERSION,
    SKILL_TREE,
    createState,
    validateState,
    skillById,
    earn,
    canSpend,
    spend,
    effects,
    serialize,
    deserialize,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
