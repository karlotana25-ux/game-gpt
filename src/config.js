export const SAVE_KEY = "echoes_tavern_star_save_v1";
export const FINAL_BOSS_COUNT = 3;
export const STAT_KEYS = ["strength", "agility", "dexterity", "vitality", "intelligence"];

export const STAT_LABELS = {
  strength: "Strength",
  agility: "Agility",
  dexterity: "Dexterity",
  vitality: "Vitality",
  intelligence: "Intelligence"
};

export const STAT_DESCRIPTIONS = {
  strength: "Physical power and a small HP bonus.",
  agility: "Dodge chance and initiative order.",
  dexterity: "Crit chance and accuracy.",
  vitality: "HP and physical defense.",
  intelligence: "Magic damage, healing power, and mana."
};

export const GAME_PHASE = Object.freeze({
  MAIN_MENU: "main_menu",
  CHARACTER_CREATION: "character_creation",
  HUB: "hub",
  SHOP: "shop",
  EXPLORATION: "exploration",
  BATTLE: "battle",
  SETTINGS: "settings",
  LOAD: "load",
  ENDING: "ending"
});

export const GAME_CONFIG = Object.freeze({
  pointBuy: {
    pool: 10,
    min: 3,
    max: 18
  },
  world: {
    mapHalfExtent: 24,
    moveSpeed: 7,
    encounterDistance: 6
  },
  encounters: {
    baseChance: 0.18,
    scalePerBoss: 0.03
  },
  classes: {
    Warrior: {
      focus: "Str/Vit focus",
      description: "Frontline bruiser with sturdy HP and physical burst.",
      color: ["#d8b684", "#9b6f43", "#4f3624"],
      baseStats: { strength: 8, agility: 5, dexterity: 5, vitality: 8, intelligence: 4 }
    },
    Hunter: {
      focus: "Agi/Dex focus",
      description: "Fast striker with crit-heavy precision attacks.",
      color: ["#9ad0ab", "#4f8f6c", "#315542"],
      baseStats: { strength: 5, agility: 8, dexterity: 8, vitality: 5, intelligence: 4 }
    },
    Mage: {
      focus: "Int/Vit focus",
      description: "Arcane artillery with high mana scaling.",
      color: ["#9eb6ff", "#526cd6", "#283683"],
      baseStats: { strength: 4, agility: 5, dexterity: 5, vitality: 6, intelligence: 10 }
    },
    Healer: {
      focus: "Int/Vit focus",
      description: "Support caster with durable healing throughput.",
      color: ["#ffb9c9", "#d7688a", "#7d2f52"],
      baseStats: { strength: 4, agility: 5, dexterity: 4, vitality: 7, intelligence: 10 }
    }
  },
  tavernRooms: [
    { id: "budget", name: "Budget Room", cost: 16, hpRecover: 0.45, mpRecover: 0.30 },
    { id: "standard", name: "Standard Room", cost: 36, hpRecover: 0.75, mpRecover: 0.60 },
    { id: "luxury", name: "Luxury Suite", cost: 74, hpRecover: 1.00, mpRecover: 1.00 }
  ],
  shop: {
    weapons: [
      {
        id: "bronze_blade",
        name: "Bronze Blade",
        cost: 28,
        bonuses: { strength: 2, dexterity: 1 },
        description: "Reliable steel for close combat classes."
      },
      {
        id: "falcon_bow",
        name: "Falcon Bow",
        cost: 34,
        bonuses: { strength: 1, dexterity: 3 },
        description: "Lightweight bow tuned for precision."
      },
      {
        id: "storm_lance",
        name: "Storm Lance",
        cost: 48,
        bonuses: { strength: 3, dexterity: 2 },
        description: "Heavy thrusting weapon with crit support."
      }
    ],
    spells: [
      {
        id: "firebolt",
        name: "Firebolt",
        cost: 24,
        mpCost: 6,
        requiresInt: 8,
        type: "damage",
        power: 1.00,
        description: "Core arcane projectile."
      },
      {
        id: "luminous_heal",
        name: "Luminous Heal",
        cost: 30,
        mpCost: 7,
        requiresInt: 9,
        type: "heal",
        power: 1.10,
        description: "A stable healing incantation."
      },
      {
        id: "meteor_sigil",
        name: "Meteor Sigil",
        cost: 54,
        mpCost: 11,
        requiresInt: 12,
        type: "damage",
        power: 1.45,
        description: "High-tier spell for INT specialists."
      },
      {
        id: "seraphic_restoration",
        name: "Seraphic Restoration",
        cost: 60,
        mpCost: 12,
        requiresInt: 12,
        type: "heal",
        power: 1.55,
        description: "Top-tier restorative magic."
      }
    ]
  },
  heroNames: [
    "Eldrin",
    "Garrick",
    "Liora",
    "Kael",
    "Nyra",
    "Thorne",
    "Mira",
    "Darius",
    "Selene",
    "Riven",
    "Iris",
    "Corin"
  ],
  enemies: {
    regular: [
      "Mossfang Wolf",
      "Ash Wisp",
      "Skarn Beetle",
      "Bone Raptor",
      "Dusk Imp",
      "Gloom Mantis"
    ],
    bosses: [
      "Mawlord Grendel",
      "Oracle Vyris",
      "Final Boss: Astral Tyrant"
    ]
  }
});
