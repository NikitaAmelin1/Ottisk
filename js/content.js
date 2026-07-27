/**
 * Data-only gameplay catalog and validation helpers.
 * Browser: globalThis.OttiskContent. Node: import the file, then use the same global.
 */
(function attachOttiskContent(root) {
  "use strict";

  const SCHEMA_VERSION = 1;
  const ID_PATTERN = /^[a-z][a-z0-9_-]*$/;
  const TYPES = ["biomes", "chapters", "enemies", "waves", "events"];

  const DEFAULT_CATALOG = {
    "schemaVersion": 1,
    "biomes": [
      {
        "id": "sunlit-reef",
        "name": "Светлый риф",
        "description": "Тёплое мелководье, где след впервые обретает форму.",
        "palette": {
          "background": "#123b5d",
          "accent": "#7affd4",
          "hazard": "#ffbd66"
        },
        "depth": [
          0,
          180
        ],
        "ambience": "reef"
      },
      {
        "id": "kelp-cathedral",
        "name": "Собор водорослей",
        "description": "Тесные зелёные проходы скрывают быстрых охотников.",
        "palette": {
          "background": "#092f35",
          "accent": "#6edc8c",
          "hazard": "#ff7b72"
        },
        "depth": [
          180,
          520
        ],
        "ambience": "kelp"
      },
      {
        "id": "midnight-trench",
        "name": "Полуночный разлом",
        "description": "Бездна отвечает на свет древним эхом.",
        "palette": {
          "background": "#050b21",
          "accent": "#a48cff",
          "hazard": "#ff4f75"
        },
        "depth": [
          520,
          1200
        ],
        "ambience": "trench"
      },
      {
        "id": "glass-shoals",
        "name": "Стеклянные отмели",
        "description": "Зеркальная вода отражает чужие следы и путает путь.",
        "palette": {
          "background": "#0a2a40",
          "accent": "#9be7ff",
          "hazard": "#ff9ad4"
        },
        "depth": [
          120,
          360
        ],
        "ambience": "reef"
      },
      {
        "id": "ember-vents",
        "name": "Тлеющие жерла",
        "description": "Тёплые выбросы несут угольки света и жёстких крабов.",
        "palette": {
          "background": "#1a1420",
          "accent": "#ff9a62",
          "hazard": "#ff5a4a"
        },
        "depth": [
          300,
          780
        ],
        "ambience": "trench"
      }
    ],
    "chapters": [
      {
        "id": "first-imprint",
        "name": "Первый отпечаток",
        "order": 1,
        "biomeIds": [
          "sunlit-reef"
        ],
        "synopsis": "Существо учится держаться за свет и оставлять след.",
        "unlock": {
          "score": 0
        }
      },
      {
        "id": "green-choir",
        "name": "Зелёный хор",
        "order": 2,
        "biomeIds": [
          "kelp-cathedral",
          "glass-shoals"
        ],
        "synopsis": "След проходит сквозь живой лабиринт и слышит чужой зов.",
        "unlock": {
          "score": 240,
          "chapterId": "first-imprint"
        }
      },
      {
        "id": "voice-below",
        "name": "Голос снизу",
        "order": 3,
        "biomeIds": [
          "midnight-trench",
          "ember-vents"
        ],
        "synopsis": "В глубине выясняется, кто оставил первый свет.",
        "unlock": {
          "score": 650,
          "chapterId": "green-choir"
        }
      }
    ],
    "enemies": [
      {
        "id": "dartfish",
        "name": "Игла",
        "archetype": "chaser",
        "health": 1,
        "speed": 1.25,
        "damage": 18,
        "behavior": {
          "tracking": 0.55,
          "telegraphMs": 500
        },
        "tags": [
          "swarm",
          "mobile"
        ]
      },
      {
        "id": "lantern-jelly",
        "name": "Ложный фонарь",
        "archetype": "zoning",
        "health": 2,
        "speed": 0.55,
        "damage": 24,
        "behavior": {
          "tracking": 0.15,
          "telegraphMs": 900
        },
        "tags": [
          "pulse",
          "hazard"
        ]
      },
      {
        "id": "trench-maw",
        "name": "Пасть разлома",
        "archetype": "boss",
        "health": 24,
        "speed": 0.7,
        "damage": 40,
        "behavior": {
          "tracking": 0.8,
          "telegraphMs": 1300
        },
        "tags": [
          "boss",
          "armored"
        ]
      },
      {
        "id": "vent-crab",
        "name": "Краб жерла",
        "archetype": "chaser",
        "health": 2,
        "speed": 0.7,
        "damage": 22,
        "behavior": {
          "tracking": 0.4,
          "telegraphMs": 700
        },
        "tags": [
          "armored",
          "sideways"
        ]
      },
      {
        "id": "glass-urchin",
        "name": "Стеклянный ёж",
        "archetype": "zoning",
        "health": 3,
        "speed": 0.35,
        "damage": 28,
        "behavior": {
          "tracking": 0.1,
          "telegraphMs": 1100
        },
        "tags": [
          "pulse",
          "hazard",
          "spiny"
        ]
      },
      {
        "id": "mirror-fish",
        "name": "Рыба-отражение",
        "archetype": "chaser",
        "health": 1,
        "speed": 1.1,
        "damage": 16,
        "behavior": {
          "tracking": 0.65,
          "telegraphMs": 450
        },
        "tags": [
          "swarm",
          "mirror"
        ]
      }
    ],
    "waves": [
      {
        "id": "reef-awakening",
        "name": "Пробуждение рифа",
        "biomeId": "sunlit-reef",
        "duration": 30,
        "spawns": [
          {
            "enemyId": "dartfish",
            "count": 5,
            "interval": 2.8,
            "start": 3
          }
        ],
        "eventIds": [
          "warm-current"
        ],
        "reward": {
          "light": 30,
          "points": 1
        }
      },
      {
        "id": "kelp-ambush",
        "name": "Засада в хоре",
        "biomeId": "kelp-cathedral",
        "duration": 45,
        "spawns": [
          {
            "enemyId": "dartfish",
            "count": 8,
            "interval": 2.1,
            "start": 2
          },
          {
            "enemyId": "lantern-jelly",
            "count": 3,
            "interval": 9,
            "start": 8
          }
        ],
        "eventIds": [
          "tangled-path",
          "light-bloom"
        ],
        "reward": {
          "light": 55,
          "points": 1
        }
      },
      {
        "id": "glass-chase",
        "name": "Погоня в отмелях",
        "biomeId": "glass-shoals",
        "duration": 40,
        "spawns": [
          {
            "enemyId": "mirror-fish",
            "count": 6,
            "interval": 2.4,
            "start": 2
          },
          {
            "enemyId": "glass-urchin",
            "count": 2,
            "interval": 12,
            "start": 10
          }
        ],
        "eventIds": [
          "mirror-tide",
          "light-bloom"
        ],
        "reward": {
          "light": 70,
          "points": 1
        }
      },
      {
        "id": "ember-crawl",
        "name": "Ползучий жар",
        "biomeId": "ember-vents",
        "duration": 50,
        "spawns": [
          {
            "enemyId": "vent-crab",
            "count": 5,
            "interval": 3.2,
            "start": 4
          },
          {
            "enemyId": "lantern-jelly",
            "count": 2,
            "interval": 11,
            "start": 12
          }
        ],
        "eventIds": [
          "ember-rain",
          "warm-current"
        ],
        "reward": {
          "light": 90,
          "points": 2
        }
      },
      {
        "id": "maw-of-midnight",
        "name": "Пасть полуночи",
        "biomeId": "midnight-trench",
        "duration": 70,
        "spawns": [
          {
            "enemyId": "lantern-jelly",
            "count": 4,
            "interval": 10,
            "start": 3
          },
          {
            "enemyId": "trench-maw",
            "count": 1,
            "interval": 1,
            "start": 15
          }
        ],
        "eventIds": [
          "blackout",
          "light-bloom"
        ],
        "reward": {
          "light": 120,
          "points": 2
        }
      }
    ],
    "events": [
      {
        "id": "warm-current",
        "name": "Тёплое течение",
        "kind": "modifier",
        "weight": 5,
        "duration": 10,
        "effects": {
          "speedMultiplier": 1.15
        }
      },
      {
        "id": "tangled-path",
        "name": "Сплетение",
        "kind": "hazard",
        "weight": 3,
        "duration": 12,
        "effects": {
          "speedMultiplier": 0.8,
          "enemyRateMultiplier": 1.2
        }
      },
      {
        "id": "light-bloom",
        "name": "Цветение света",
        "kind": "reward",
        "weight": 2,
        "duration": 8,
        "effects": {
          "lightMultiplier": 1.5
        }
      },
      {
        "id": "blackout",
        "name": "Гашение",
        "kind": "hazard",
        "weight": 2,
        "duration": 9,
        "effects": {
          "visibilityMultiplier": 0.45,
          "enemyRateMultiplier": 1.3
        }
      },
      {
        "id": "mirror-tide",
        "name": "Зеркальный прилив",
        "kind": "modifier",
        "weight": 3,
        "duration": 11,
        "effects": {
          "speedMultiplier": 1.08,
          "enemyRateMultiplier": 1.15
        }
      },
      {
        "id": "ember-rain",
        "name": "Дождь углей",
        "kind": "reward",
        "weight": 2,
        "duration": 9,
        "effects": {
          "lightMultiplier": 1.35,
          "speedMultiplier": 1.05
        }
      }
    ]
  };
  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    Object.values(value).forEach((child) => deepFreeze(child, seen));
    return Object.freeze(value);
  }

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function validate(catalog) {
    const errors = [];
    const error = (path, message) => errors.push({ path, message });
    const objectAt = (value, path) => {
      if (!isObject(value)) {
        error(path, "must be an object");
        return false;
      }
      return true;
    };
    const stringAt = (value, path, allowEmpty = false) => {
      if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
        error(path, "must be a non-empty string");
        return false;
      }
      return true;
    };
    const numberAt = (value, path, minimum = 0) => {
      if (!Number.isFinite(value) || value < minimum) {
        error(path, `must be a finite number >= ${minimum}`);
        return false;
      }
      return true;
    };
    const idAt = (value, path) => {
      if (!stringAt(value, path)) return false;
      if (!ID_PATTERN.test(value)) {
        error(path, "must use lowercase letters, numbers, hyphens, or underscores");
        return false;
      }
      return true;
    };

    if (!objectAt(catalog, "$")) return { valid: false, errors };
    if (catalog.schemaVersion !== SCHEMA_VERSION) {
      error("$.schemaVersion", `must equal ${SCHEMA_VERSION}`);
    }

    const ids = Object.create(null);
    for (const type of TYPES) {
      ids[type] = new Set();
      const entries = catalog[type];
      if (!Array.isArray(entries) || entries.length === 0) {
        error(`$.${type}`, "must be a non-empty array");
        continue;
      }
      entries.forEach((entry, index) => {
        const path = `$.${type}[${index}]`;
        if (!objectAt(entry, path)) return;
        if (idAt(entry.id, `${path}.id`)) {
          if (ids[type].has(entry.id)) error(`${path}.id`, `duplicate id "${entry.id}"`);
          ids[type].add(entry.id);
        }
        stringAt(entry.name, `${path}.name`);
      });
    }

    (Array.isArray(catalog.biomes) ? catalog.biomes : []).forEach((item, index) => {
      if (!isObject(item)) return;
      const path = `$.biomes[${index}]`;
      stringAt(item.description, `${path}.description`);
      stringAt(item.ambience, `${path}.ambience`);
      if (!Array.isArray(item.depth) || item.depth.length !== 2) {
        error(`${path}.depth`, "must be [minimum, maximum]");
      } else {
        numberAt(item.depth[0], `${path}.depth[0]`);
        numberAt(item.depth[1], `${path}.depth[1]`);
        if (item.depth[1] <= item.depth[0]) error(`${path}.depth`, "maximum must exceed minimum");
      }
      if (objectAt(item.palette, `${path}.palette`)) {
        ["background", "accent", "hazard"].forEach((key) =>
          stringAt(item.palette[key], `${path}.palette.${key}`));
      }
    });

    (Array.isArray(catalog.chapters) ? catalog.chapters : []).forEach((item, index) => {
      if (!isObject(item)) return;
      const path = `$.chapters[${index}]`;
      numberAt(item.order, `${path}.order`, 1);
      stringAt(item.synopsis, `${path}.synopsis`);
      if (!Array.isArray(item.biomeIds) || item.biomeIds.length === 0) {
        error(`${path}.biomeIds`, "must be a non-empty array");
      } else {
        item.biomeIds.forEach((id, i) => {
          if (!ids.biomes.has(id)) error(`${path}.biomeIds[${i}]`, `unknown biome "${id}"`);
        });
      }
      if (objectAt(item.unlock, `${path}.unlock`)) {
        numberAt(item.unlock.score, `${path}.unlock.score`);
        if (item.unlock.chapterId !== undefined && !ids.chapters.has(item.unlock.chapterId)) {
          error(`${path}.unlock.chapterId`, `unknown chapter "${item.unlock.chapterId}"`);
        }
        if (item.unlock.chapterId === item.id) error(`${path}.unlock.chapterId`, "cannot reference itself");
      }
    });

    (Array.isArray(catalog.enemies) ? catalog.enemies : []).forEach((item, index) => {
      if (!isObject(item)) return;
      const path = `$.enemies[${index}]`;
      stringAt(item.archetype, `${path}.archetype`);
      numberAt(item.health, `${path}.health`, 0.01);
      numberAt(item.speed, `${path}.speed`);
      numberAt(item.damage, `${path}.damage`);
      if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== "string")) {
        error(`${path}.tags`, "must be an array of strings");
      }
      if (objectAt(item.behavior, `${path}.behavior`)) {
        numberAt(item.behavior.tracking, `${path}.behavior.tracking`);
        if (item.behavior.tracking > 1) error(`${path}.behavior.tracking`, "must be <= 1");
        numberAt(item.behavior.telegraphMs, `${path}.behavior.telegraphMs`);
      }
    });

    (Array.isArray(catalog.events) ? catalog.events : []).forEach((item, index) => {
      if (!isObject(item)) return;
      const path = `$.events[${index}]`;
      if (!["modifier", "hazard", "reward"].includes(item.kind)) {
        error(`${path}.kind`, "must be modifier, hazard, or reward");
      }
      numberAt(item.weight, `${path}.weight`, 0.01);
      numberAt(item.duration, `${path}.duration`, 0.01);
      if (objectAt(item.effects, `${path}.effects`)) {
        Object.entries(item.effects).forEach(([key, value]) =>
          numberAt(value, `${path}.effects.${key}`));
      }
    });

    (Array.isArray(catalog.waves) ? catalog.waves : []).forEach((item, index) => {
      if (!isObject(item)) return;
      const path = `$.waves[${index}]`;
      if (!ids.biomes.has(item.biomeId)) error(`${path}.biomeId`, `unknown biome "${item.biomeId}"`);
      numberAt(item.duration, `${path}.duration`, 0.01);
      if (!Array.isArray(item.spawns) || item.spawns.length === 0) {
        error(`${path}.spawns`, "must be a non-empty array");
      } else {
        item.spawns.forEach((spawn, spawnIndex) => {
          const spawnPath = `${path}.spawns[${spawnIndex}]`;
          if (!objectAt(spawn, spawnPath)) return;
          if (!ids.enemies.has(spawn.enemyId)) {
            error(`${spawnPath}.enemyId`, `unknown enemy "${spawn.enemyId}"`);
          }
          numberAt(spawn.count, `${spawnPath}.count`, 1);
          if (!Number.isInteger(spawn.count)) error(`${spawnPath}.count`, "must be an integer");
          numberAt(spawn.interval, `${spawnPath}.interval`, 0.01);
          numberAt(spawn.start, `${spawnPath}.start`);
        });
      }
      if (!Array.isArray(item.eventIds)) {
        error(`${path}.eventIds`, "must be an array");
      } else {
        item.eventIds.forEach((id, i) => {
          if (!ids.events.has(id)) error(`${path}.eventIds[${i}]`, `unknown event "${id}"`);
        });
      }
      if (objectAt(item.reward, `${path}.reward`)) {
        numberAt(item.reward.light, `${path}.reward.light`);
        numberAt(item.reward.points, `${path}.reward.points`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  function parse(text) {
    try {
      const catalog = JSON.parse(text);
      const result = validate(catalog);
      return { ...result, catalog: result.valid ? catalog : undefined };
    } catch (cause) {
      return {
        valid: false,
        errors: [{ path: "$", message: `invalid JSON: ${cause.message}` }],
      };
    }
  }

  function byId(type, id, catalog = DEFAULT_CATALOG) {
    if (!TYPES.includes(type) || !Array.isArray(catalog[type])) return undefined;
    return catalog[type].find((entry) => entry.id === id);
  }

  deepFreeze(DEFAULT_CATALOG);
  root.OttiskContent = Object.freeze({
    SCHEMA_VERSION,
    TYPES: Object.freeze([...TYPES]),
    DEFAULT_CATALOG,
    validate,
    parse,
    clone,
    byId,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
