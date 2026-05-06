import * as THREE from "https://unpkg.com/three@0.184.0/build/three.module.js";

const SAVE_KEY = "echoes_tavern_star_save_v1";
const FINAL_BOSS_COUNT = 3;
const STAT_KEYS = ["strength", "agility", "dexterity", "vitality", "intelligence"];

const STAT_LABELS = {
  strength: "Strength",
  agility: "Agility",
  dexterity: "Dexterity",
  vitality: "Vitality",
  intelligence: "Intelligence"
};

const STAT_DESCRIPTIONS = {
  strength: "Physical power and a small HP bonus.",
  agility: "Dodge chance and initiative order.",
  dexterity: "Crit chance and accuracy.",
  vitality: "HP and physical defense.",
  intelligence: "Magic damage, healing power, and mana."
};

const GAME_PHASE = Object.freeze({
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

const GAME_CONFIG = Object.freeze({
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

const screenByPhase = {
  [GAME_PHASE.MAIN_MENU]: "screen-main-menu",
  [GAME_PHASE.CHARACTER_CREATION]: "screen-character",
  [GAME_PHASE.HUB]: "screen-hub",
  [GAME_PHASE.SHOP]: "screen-shop",
  [GAME_PHASE.EXPLORATION]: "screen-exploration",
  [GAME_PHASE.BATTLE]: "screen-battle",
  [GAME_PHASE.SETTINGS]: "screen-settings",
  [GAME_PHASE.LOAD]: "screen-load",
  [GAME_PHASE.ENDING]: "screen-ending"
};

const dom = {
  sceneContainer: document.getElementById("scene-container"),
  eventBanner: document.getElementById("event-banner"),
  toast: document.getElementById("toast"),
  screens: {
    menu: document.getElementById("screen-main-menu"),
    character: document.getElementById("screen-character"),
    hub: document.getElementById("screen-hub"),
    shop: document.getElementById("screen-shop"),
    exploration: document.getElementById("screen-exploration"),
    battle: document.getElementById("screen-battle"),
    settings: document.getElementById("screen-settings"),
    load: document.getElementById("screen-load"),
    ending: document.getElementById("screen-ending")
  },
  startGameBtn: document.getElementById("start-game-btn"),
  loadGameBtn: document.getElementById("load-game-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  exitBtn: document.getElementById("exit-btn"),
  playerNameInput: document.getElementById("player-name-input"),
  classOptions: document.getElementById("class-options"),
  classSummary: document.getElementById("class-summary"),
  pointsRemaining: document.getElementById("points-remaining"),
  statPointGrid: document.getElementById("stat-point-grid"),
  confirmCharacterBtn: document.getElementById("confirm-character-btn"),
  backFromCharacterBtn: document.getElementById("back-from-character-btn"),
  hubPlayerName: document.getElementById("hub-player-name"),
  hubGold: document.getElementById("hub-gold"),
  hubBosses: document.getElementById("hub-bosses"),
  hubPartySize: document.getElementById("hub-party-size"),
  hubPartyRoster: document.getElementById("hub-party-roster"),
  tavernRoomButtons: document.getElementById("tavern-room-buttons"),
  exploreBtn: document.getElementById("explore-btn"),
  openShopBtn: document.getElementById("open-shop-btn"),
  saveGameBtn: document.getElementById("save-game-btn"),
  backToMenuBtn: document.getElementById("back-to-menu-btn"),
  shopMemberSelect: document.getElementById("shop-member-select"),
  weaponList: document.getElementById("weapon-list"),
  spellList: document.getElementById("spell-list"),
  backToHubFromShopBtn: document.getElementById("back-to-hub-from-shop-btn"),
  enemyName: document.getElementById("enemy-name"),
  enemyStats: document.getElementById("enemy-stats"),
  enemyHpFill: document.getElementById("enemy-hp-fill"),
  battleLog: document.getElementById("battle-log"),
  battleActionBtns: Array.from(document.querySelectorAll(".battle-action-btn")),
  leaveBattleBtn: document.getElementById("leave-battle-btn"),
  encounterRateSlider: document.getElementById("encounter-rate-slider"),
  encounterRateValue: document.getElementById("encounter-rate-value"),
  backFromSettingsBtn: document.getElementById("back-from-settings-btn"),
  loadInfo: document.getElementById("load-info"),
  loadSlotBtn: document.getElementById("load-slot-btn"),
  backFromLoadBtn: document.getElementById("back-from-load-btn"),
  endingTitle: document.getElementById("ending-title"),
  endingSummary: document.getElementById("ending-summary"),
  restartBtn: document.getElementById("restart-btn"),
  hudLocation: document.getElementById("hud-location"),
  hudEncounter: document.getElementById("hud-encounter"),
  hudGold: document.getElementById("hud-gold"),
  hudBosses: document.getElementById("hud-bosses"),
  returnHubBtn: document.getElementById("return-hub-btn")
};

const keysDown = new Set();

let scene;
let camera;
let renderer;
let clock;
let floorMesh;
let playerMesh;
let activeEnemyMesh;
const billboardMeshes = [];

let idCounter = 1;
let toastTimer = null;
let eventTimer = null;

const partyManager = new PartyManager(4);
const state = {
  phase: GAME_PHASE.MAIN_MENU,
  creation: {
    className: "Warrior",
    baseStats: cloneStats(GAME_CONFIG.classes.Warrior.baseStats),
    allocatedStats: cloneStats(GAME_CONFIG.classes.Warrior.baseStats),
    pointsRemaining: GAME_CONFIG.pointBuy.pool
  },
  gold: 130,
  bossesDefeated: 0,
  monstersDefeatedSinceBoss: 0,
  encounterRateMultiplier: 1,
  distanceSinceEncounter: 0,
  battle: null
};

class PartyManager {
  constructor(maxMembers = 4) {
    this.maxMembers = maxMembers;
    this.members = [];
  }

  reset() {
    this.members.length = 0;
  }

  createMember(name, className, baseStats) {
    const member = {
      id: `member-${idCounter++}`,
      name,
      className,
      level: 1,
      xp: 0,
      baseStats: cloneStats(baseStats),
      stats: cloneStats(baseStats),
      maxHp: 1,
      maxMp: 0,
      hp: 1,
      mp: 0,
      equipment: { weapon: null },
      spells: [],
      guard: false
    };
    this.recalculateMember(member);
    member.hp = member.maxHp;
    member.mp = member.maxMp;
    return member;
  }

  addMember(member) {
    if (!member || this.members.length >= this.maxMembers) {
      return false;
    }
    this.members.push(member);
    return true;
  }

  getMember(memberId) {
    return this.members.find((member) => member.id === memberId) || null;
  }

  getLeader() {
    return this.members[0] || null;
  }

  getAliveMembers() {
    return this.members.filter((member) => member.hp > 0);
  }

  getClassNames() {
    return this.members.map((member) => member.className);
  }

  hasClass(className) {
    return this.members.some((member) => member.className === className);
  }

  recalculateMember(member) {
    const statBonus = {
      strength: 0,
      agility: 0,
      dexterity: 0,
      vitality: 0,
      intelligence: 0
    };

    if (member.equipment.weapon && member.equipment.weapon.bonuses) {
      for (const key of STAT_KEYS) {
        statBonus[key] += member.equipment.weapon.bonuses[key] || 0;
      }
    }

    for (const key of STAT_KEYS) {
      member.stats[key] = (member.baseStats[key] || 0) + statBonus[key];
    }

    member.maxHp = member.stats.vitality * 10 + member.stats.strength * 2;
    member.maxMp = member.stats.intelligence * 5;
    member.hp = clamp(member.hp, 0, member.maxHp);
    member.mp = clamp(member.mp, 0, member.maxMp);
  }

  equipWeapon(memberId, weapon) {
    const member = this.getMember(memberId);
    if (!member) {
      return { ok: false, message: "No valid party member selected." };
    }
    member.equipment.weapon = {
      id: weapon.id,
      name: weapon.name,
      bonuses: { ...weapon.bonuses }
    };
    this.recalculateMember(member);
    return { ok: true, message: `${member.name} equipped ${weapon.name}.` };
  }

  learnSpell(memberId, spell) {
    const member = this.getMember(memberId);
    if (!member) {
      return { ok: false, message: "No valid party member selected." };
    }
    if (member.stats.intelligence < spell.requiresInt) {
      return { ok: false, message: `${member.name} needs INT ${spell.requiresInt} for ${spell.name}.` };
    }
    if (member.spells.some((knownSpell) => knownSpell.id === spell.id)) {
      return { ok: false, message: `${member.name} already knows ${spell.name}.` };
    }
    member.spells.push({
      id: spell.id,
      name: spell.name,
      mpCost: spell.mpCost,
      type: spell.type,
      power: spell.power
    });
    return { ok: true, message: `${member.name} learned ${spell.name}.` };
  }

  healAllByPercent(hpRecover, mpRecover) {
    for (const member of this.members) {
      member.hp = clamp(member.hp + Math.floor(member.maxHp * hpRecover), 0, member.maxHp);
      member.mp = clamp(member.mp + Math.floor(member.maxMp * mpRecover), 0, member.maxMp);
    }
  }

  snapshot() {
    return this.members.map((member) => ({
      id: member.id,
      name: member.name,
      className: member.className,
      level: member.level,
      xp: member.xp,
      baseStats: cloneStats(member.baseStats),
      hp: member.hp,
      mp: member.mp,
      equipment: member.equipment
        ? { weapon: member.equipment.weapon ? { ...member.equipment.weapon, bonuses: { ...member.equipment.weapon.bonuses } } : null }
        : { weapon: null },
      spells: member.spells.map((spell) => ({ ...spell }))
    }));
  }

  loadSnapshot(rawMembers) {
    if (!Array.isArray(rawMembers)) {
      return false;
    }

    this.reset();
    for (const rawMember of rawMembers) {
      if (!rawMember || !rawMember.name || !rawMember.className || !rawMember.baseStats) {
        continue;
      }
      const fallbackClass = GAME_CONFIG.classes[rawMember.className] || GAME_CONFIG.classes.Warrior;
      const normalizedBaseStats = {};
      for (const stat of STAT_KEYS) {
        const sourceValue = rawMember.baseStats[stat] ?? fallbackClass.baseStats[stat];
        normalizedBaseStats[stat] = clamp(Number(sourceValue) || fallbackClass.baseStats[stat], GAME_CONFIG.pointBuy.min, GAME_CONFIG.pointBuy.max);
      }

      const restored = this.createMember(rawMember.name, rawMember.className, normalizedBaseStats);
      restored.id = rawMember.id || `member-${idCounter++}`;
      restored.level = Number(rawMember.level) || 1;
      restored.xp = Number(rawMember.xp) || 0;
      restored.equipment = { weapon: rawMember.equipment?.weapon ? { ...rawMember.equipment.weapon, bonuses: { ...rawMember.equipment.weapon.bonuses } } : null };
      restored.spells = Array.isArray(rawMember.spells) ? rawMember.spells.map((spell) => ({ ...spell })) : [];
      this.recalculateMember(restored);
      restored.hp = clamp(Number(rawMember.hp) || restored.maxHp, 0, restored.maxHp);
      restored.mp = clamp(Number(rawMember.mp) || restored.maxMp, 0, restored.maxMp);
      this.addMember(restored);
    }

    return this.members.length > 0;
  }
}

class CombatEngine {
  static initiative(actor) {
    return actor.stats.agility + randomInt(1, 12);
  }

  static dodgeChance(defender) {
    return clamp(defender.stats.agility / 2, 0, 65);
  }

  static hitChance(attacker, defender) {
    const accuracyFromDex = 66 + attacker.stats.dexterity * 2 + (attacker.accuracyBonus || 0);
    const dodge = CombatEngine.dodgeChance(defender);
    return clamp(accuracyFromDex - dodge, 12, 96);
  }

  static didHit(attacker, defender) {
    return Math.random() * 100 < CombatEngine.hitChance(attacker, defender);
  }

  static critChance(attacker) {
    return clamp(attacker.stats.dexterity / 4 + (attacker.critBonus || 0), 0, 70);
  }

  static didCrit(attacker) {
    return Math.random() * 100 < CombatEngine.critChance(attacker);
  }

  static physicalDamage(attacker, defender, isCrit = false) {
    const baseDamage = attacker.stats.strength * 2 + Math.floor(attacker.stats.dexterity * 0.6);
    const defense = Math.floor(defender.stats.vitality * 0.9);
    const variance = randomInt(-4, 6);
    let damage = Math.max(1, baseDamage + variance - defense);
    if (defender.guard) {
      damage = Math.max(1, Math.floor(damage * 0.5));
    }
    if (isCrit) {
      damage = Math.floor(damage * 1.8);
    }
    return damage;
  }

  static magicDamage(caster, defender) {
    const baseDamage = caster.stats.intelligence * 3 + randomInt(0, 6);
    const mitigation = Math.floor(defender.stats.vitality * 0.4);
    let damage = Math.max(2, baseDamage - mitigation);
    if (defender.guard) {
      damage = Math.max(1, Math.floor(damage * 0.65));
    }
    return damage;
  }

  static healAmount(caster) {
    return caster.stats.intelligence * 2 + Math.floor(caster.stats.vitality * 0.5) + randomInt(4, 10);
  }
}

bootstrap();

function bootstrap() {
  setupThreeScene();
  setupUI();
  resetCreationState("Warrior");
  updateLoadScreen();
  switchPhase(GAME_PHASE.MAIN_MENU);
  animate();
}

function setupThreeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#0a1820");
  scene.fog = new THREE.Fog("#0a1820", 22, 56);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(18, 18, 18);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  dom.sceneContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const ambient = new THREE.AmbientLight("#f1ffe0", 0.75);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#ffe8bf", 1.05);
  sun.position.set(20, 26, 12);
  scene.add(sun);

  buildWorldGeometry();
  createOrReplacePlayerMesh("Warrior");

  window.addEventListener("resize", handleResize);
}

function setupUI() {
  bindMenuButtons();
  buildClassCards();
  buildStatRows();
  buildTavernRoomButtons();
  buildShopLists();
  bindBattleButtons();
  bindKeyboardInput();

  dom.playerNameInput.addEventListener("input", () => {
    const clean = dom.playerNameInput.value.replace(/\s+/g, " ").trimStart();
    if (clean !== dom.playerNameInput.value) {
      dom.playerNameInput.value = clean;
    }
  });

  dom.statPointGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-stat][data-delta]");
    if (!btn) {
      return;
    }
    const stat = btn.dataset.stat;
    const delta = Number(btn.dataset.delta);
    adjustCreationStat(stat, delta);
  });

  dom.classOptions.addEventListener("click", (event) => {
    const classBtn = event.target.closest("button[data-class]");
    if (!classBtn) {
      return;
    }
    resetCreationState(classBtn.dataset.class);
  });

  dom.confirmCharacterBtn.addEventListener("click", () => {
    createNewAdventurer();
  });

  dom.backFromCharacterBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.exploreBtn.addEventListener("click", () => {
    if (!partyManager.getAliveMembers().length) {
      showToast("Your party is wiped out. Rest at the tavern first.");
      return;
    }
    switchPhase(GAME_PHASE.EXPLORATION);
    showToast("Use WASD or arrow keys to explore.");
  });

  dom.openShopBtn.addEventListener("click", () => {
    updateShopMemberSelect();
    switchPhase(GAME_PHASE.SHOP);
  });

  dom.backToHubFromShopBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.HUB);
  });

  dom.shopMemberSelect.addEventListener("change", () => {
    updateShopMemberSelect();
  });

  dom.weaponList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-weapon-id]");
    if (!btn) {
      return;
    }
    purchaseWeapon(btn.dataset.weaponId);
  });

  dom.spellList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-spell-id]");
    if (!btn) {
      return;
    }
    purchaseSpell(btn.dataset.spellId);
  });

  dom.saveGameBtn.addEventListener("click", saveGame);

  dom.backToMenuBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.returnHubBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.HUB);
  });

  dom.encounterRateSlider.addEventListener("input", () => {
    state.encounterRateMultiplier = Number(dom.encounterRateSlider.value) / 100;
    dom.encounterRateValue.textContent = `${state.encounterRateMultiplier.toFixed(2)}x`;
  });

  dom.backFromSettingsBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.loadSlotBtn.addEventListener("click", () => {
    const loaded = loadGame();
    if (loaded) {
      switchPhase(GAME_PHASE.HUB);
    }
  });

  dom.backFromLoadBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.restartBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.leaveBattleBtn.addEventListener("click", () => {
    if (state.phase !== GAME_PHASE.BATTLE) {
      return;
    }
    state.battle = null;
    clearEnemyMesh();
    showToast("Retreat complete.");
    switchPhase(GAME_PHASE.HUB);
  });
}

function bindMenuButtons() {
  dom.startGameBtn.addEventListener("click", () => {
    resetCreationState("Warrior");
    dom.playerNameInput.value = "";
    switchPhase(GAME_PHASE.CHARACTER_CREATION);
  });

  dom.loadGameBtn.addEventListener("click", () => {
    updateLoadScreen();
    switchPhase(GAME_PHASE.LOAD);
  });

  dom.settingsBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.SETTINGS);
  });

  dom.exitBtn.addEventListener("click", () => {
    showToast("Exit requested. Close the browser tab to leave the prototype.");
  });
}

function bindBattleButtons() {
  for (const btn of dom.battleActionBtns) {
    btn.addEventListener("click", () => {
      if (state.phase !== GAME_PHASE.BATTLE || !state.battle) {
        return;
      }
      resolveBattleRound(btn.dataset.action);
    });
  }
}

function bindKeyboardInput() {
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
      return;
    }

    if (event.code === "Escape") {
      if (state.phase === GAME_PHASE.EXPLORATION) {
        switchPhase(GAME_PHASE.HUB);
      }
      return;
    }

    keysDown.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    keysDown.delete(event.code);
  });
}

function buildWorldGeometry() {
  if (floorMesh) {
    scene.remove(floorMesh);
  }

  const floorTexture = createFloorTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(18, 18);

  const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
  const floorSize = GAME_CONFIG.world.mapHalfExtent * 2;
  floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  scene.add(floorMesh);

  const propGroup = new THREE.Group();
  const treeCount = 34;
  for (let i = 0; i < treeCount; i += 1) {
    const treeTexture = createTreeTexture();
    const tree = createBillboardMesh(treeTexture, 2, 3.4);
    tree.position.x = randomInt(-21, 21);
    tree.position.z = randomInt(-21, 21);
    tree.position.y = 1.7;
    propGroup.add(tree);
  }
  scene.add(propGroup);
}

function createOrReplacePlayerMesh(className) {
  if (playerMesh) {
    removeBillboard(playerMesh);
    scene.remove(playerMesh);
  }
  const texture = createCharacterTexture(className);
  playerMesh = createBillboardMesh(texture, 1.8, 2.4);
  playerMesh.position.set(0, 1.2, 0);
  scene.add(playerMesh);
  updateExplorationHud();
}

function createEnemyMesh(isBoss) {
  clearEnemyMesh();
  const enemyTexture = createEnemyTexture(isBoss);
  activeEnemyMesh = createBillboardMesh(enemyTexture, 2.2, 2.8);
  activeEnemyMesh.position.set(
    playerMesh.position.x + randomInt(-3, 3),
    1.4,
    playerMesh.position.z + randomInt(-3, 3)
  );
  scene.add(activeEnemyMesh);
}

function clearEnemyMesh() {
  if (!activeEnemyMesh) {
    return;
  }
  removeBillboard(activeEnemyMesh);
  scene.remove(activeEnemyMesh);
  activeEnemyMesh = null;
}

function createBillboardMesh(texture, width, height) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  billboardMeshes.push(mesh);
  return mesh;
}

function removeBillboard(mesh) {
  const index = billboardMeshes.indexOf(mesh);
  if (index >= 0) {
    billboardMeshes.splice(index, 1);
  }
}

function createFloorTexture() {
  return createPixelTexture(16, 16, (ctx) => {
    ctx.clearRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? "#375b55" : "#2d4844";
        ctx.fillRect(x, y, 1, 1);
      }
    }

    ctx.fillStyle = "#4d756a";
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(i, 0, 1, 16);
      ctx.fillRect(0, i, 16, 1);
    }
  });
}

function createCharacterTexture(className) {
  const classConfig = GAME_CONFIG.classes[className] || GAME_CONFIG.classes.Warrior;
  const [light, mid, dark] = classConfig.color;

  return createPixelTexture(24, 24, (ctx) => {
    ctx.clearRect(0, 0, 24, 24);

    ctx.fillStyle = dark;
    ctx.fillRect(8, 4, 8, 4);
    ctx.fillRect(6, 8, 12, 10);

    ctx.fillStyle = mid;
    ctx.fillRect(7, 9, 10, 8);
    ctx.fillRect(9, 18, 3, 4);
    ctx.fillRect(13, 18, 3, 4);

    ctx.fillStyle = light;
    ctx.fillRect(9, 5, 6, 3);
    ctx.fillRect(10, 11, 2, 2);
    ctx.fillRect(13, 11, 2, 2);
  });
}

function createEnemyTexture(isBoss) {
  const tone = isBoss
    ? { light: "#ffb193", mid: "#d64f45", dark: "#64191f" }
    : { light: "#ffd589", mid: "#d67834", dark: "#663116" };

  return createPixelTexture(24, 24, (ctx) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = tone.dark;
    ctx.fillRect(5, 6, 14, 13);
    ctx.fillRect(3, 14, 4, 6);
    ctx.fillRect(17, 14, 4, 6);
    ctx.fillRect(8, 2, 3, 4);
    ctx.fillRect(13, 2, 3, 4);

    ctx.fillStyle = tone.mid;
    ctx.fillRect(6, 8, 12, 9);
    ctx.fillRect(9, 18, 2, 4);
    ctx.fillRect(13, 18, 2, 4);

    ctx.fillStyle = tone.light;
    ctx.fillRect(9, 10, 2, 2);
    ctx.fillRect(13, 10, 2, 2);
    ctx.fillRect(10, 14, 4, 2);
  });
}

function createTreeTexture() {
  return createPixelTexture(24, 32, (ctx) => {
    ctx.clearRect(0, 0, 24, 32);

    ctx.fillStyle = "#314f2f";
    ctx.fillRect(7, 4, 10, 12);
    ctx.fillRect(4, 10, 16, 8);
    ctx.fillRect(6, 16, 12, 8);

    ctx.fillStyle = "#4f7a49";
    ctx.fillRect(8, 6, 8, 8);
    ctx.fillRect(6, 12, 12, 7);

    ctx.fillStyle = "#5f3a26";
    ctx.fillRect(10, 22, 4, 8);
  });
}

function createPixelTexture(width, height, painter) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  painter(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function buildClassCards() {
  dom.classOptions.innerHTML = "";
  for (const [className, classConfig] of Object.entries(GAME_CONFIG.classes)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-card";
    btn.dataset.class = className;
    btn.innerHTML = `<strong>${className}</strong><span>${classConfig.focus}</span>`;
    dom.classOptions.appendChild(btn);
  }
}

function buildStatRows() {
  dom.statPointGrid.innerHTML = "";
  for (const statKey of STAT_KEYS) {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${STAT_LABELS[statKey]}</span>
      <button type="button" class="stat-btn secondary" data-stat="${statKey}" data-delta="-1">-</button>
      <span class="stat-val" data-stat-value="${statKey}">0</span>
      <button type="button" class="stat-btn" data-stat="${statKey}" data-delta="1">+</button>
    `;
    dom.statPointGrid.appendChild(row);
  }
}

function buildTavernRoomButtons() {
  dom.tavernRoomButtons.innerHTML = "";
  for (const room of GAME_CONFIG.tavernRooms) {
    const wrapper = document.createElement("div");
    wrapper.className = "room-item";
    wrapper.innerHTML = `
      <strong>${room.name}</strong>
      <span>Cost: ${room.cost}g</span>
      <span>Recover: ${Math.round(room.hpRecover * 100)}% HP / ${Math.round(room.mpRecover * 100)}% MP</span>
      <button type="button" data-room-id="${room.id}">Stay Here</button>
    `;
    dom.tavernRoomButtons.appendChild(wrapper);
  }

  dom.tavernRoomButtons.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-room-id]");
    if (!btn) {
      return;
    }
    visitTavernRoom(btn.dataset.roomId);
  });
}

function buildShopLists() {
  dom.weaponList.innerHTML = "";
  for (const weapon of GAME_CONFIG.shop.weapons) {
    const wrapper = document.createElement("div");
    wrapper.className = "shop-item";
    wrapper.innerHTML = `
      <strong>${weapon.name}</strong>
      <span>${weapon.description}</span>
      <span>Bonus: +${weapon.bonuses.strength || 0} STR / +${weapon.bonuses.dexterity || 0} DEX</span>
      <span>Cost: ${weapon.cost}g</span>
      <button type="button" data-weapon-id="${weapon.id}">Buy Weapon</button>
    `;
    dom.weaponList.appendChild(wrapper);
  }

  dom.spellList.innerHTML = "";
  for (const spell of GAME_CONFIG.shop.spells) {
    const wrapper = document.createElement("div");
    wrapper.className = "shop-item";
    wrapper.innerHTML = `
      <strong>${spell.name}</strong>
      <span>${spell.description}</span>
      <span>INT ${spell.requiresInt}+ | MP ${spell.mpCost}</span>
      <span>Cost: ${spell.cost}g</span>
      <button type="button" data-spell-id="${spell.id}">Buy Spell</button>
    `;
    dom.spellList.appendChild(wrapper);
  }
}

function resetCreationState(className) {
  const resolvedClass = GAME_CONFIG.classes[className] ? className : "Warrior";
  const base = cloneStats(GAME_CONFIG.classes[resolvedClass].baseStats);
  state.creation.className = resolvedClass;
  state.creation.baseStats = base;
  state.creation.allocatedStats = cloneStats(base);
  state.creation.pointsRemaining = GAME_CONFIG.pointBuy.pool;
  renderCreationState();
}

function renderCreationState() {
  dom.pointsRemaining.textContent = String(state.creation.pointsRemaining);
  dom.classSummary.textContent = `${GAME_CONFIG.classes[state.creation.className].description}`;

  const classButtons = Array.from(dom.classOptions.querySelectorAll("button[data-class]"));
  for (const btn of classButtons) {
    btn.classList.toggle("selected", btn.dataset.class === state.creation.className);
  }

  for (const statKey of STAT_KEYS) {
    const statNode = dom.statPointGrid.querySelector(`[data-stat-value="${statKey}"]`);
    if (statNode) {
      statNode.textContent = String(state.creation.allocatedStats[statKey]);
    }
  }
}

function adjustCreationStat(statKey, delta) {
  if (!STAT_KEYS.includes(statKey)) {
    return;
  }

  const current = state.creation.allocatedStats[statKey];
  const base = state.creation.baseStats[statKey];

  if (delta > 0) {
    if (state.creation.pointsRemaining <= 0) {
      showToast("No points remaining.");
      return;
    }
    if (current >= GAME_CONFIG.pointBuy.max) {
      showToast(`${STAT_LABELS[statKey]} is at maximum.`);
      return;
    }
    state.creation.allocatedStats[statKey] += 1;
    state.creation.pointsRemaining -= 1;
  } else if (delta < 0) {
    if (current <= base) {
      return;
    }
    state.creation.allocatedStats[statKey] -= 1;
    state.creation.pointsRemaining += 1;
  }

  renderCreationState();
}

function createNewAdventurer() {
  const name = dom.playerNameInput.value.trim();
  if (!name) {
    showToast("Please enter a player name.");
    return;
  }
  if (state.creation.pointsRemaining > 0) {
    showToast("Spend all point-buy stats before continuing.");
    return;
  }

  partyManager.reset();
  const hero = partyManager.createMember(name, state.creation.className, state.creation.allocatedStats);
  partyManager.addMember(hero);

  state.gold = 130;
  state.bossesDefeated = 0;
  state.monstersDefeatedSinceBoss = 0;
  state.distanceSinceEncounter = 0;
  state.battle = null;

  createOrReplacePlayerMesh(state.creation.className);
  setPlayerPosition(0, 0);
  clearEnemyMesh();
  updateHubPanel();
  switchPhase(GAME_PHASE.HUB);
  showBanner(`${hero.name}, your legend begins.`);
}

function setPlayerPosition(x, z) {
  if (!playerMesh) {
    return;
  }
  playerMesh.position.x = clamp(x, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  playerMesh.position.z = clamp(z, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  camera.position.set(playerMesh.position.x + 18, 18, playerMesh.position.z + 18);
  camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);
}

function updateHubPanel() {
  const leader = partyManager.getLeader();
  dom.hubPlayerName.textContent = leader ? leader.name : "-";
  dom.hubGold.textContent = String(state.gold);
  dom.hubBosses.textContent = String(state.bossesDefeated);
  dom.hubPartySize.textContent = `${partyManager.members.length}/${partyManager.maxMembers}`;

  dom.hubPartyRoster.innerHTML = "";
  for (const member of partyManager.members) {
    const card = document.createElement("div");
    card.className = "party-member";
    const weaponText = member.equipment.weapon ? member.equipment.weapon.name : "None";
    const spellText = member.spells.length ? member.spells.map((spell) => spell.name).join(", ") : "None";
    card.innerHTML = `
      <strong>${member.name} (${member.className})</strong>
      <small>HP ${member.hp}/${member.maxHp} | MP ${member.mp}/${member.maxMp}</small>
      <small>STR ${member.stats.strength} | AGI ${member.stats.agility} | DEX ${member.stats.dexterity} | VIT ${member.stats.vitality} | INT ${member.stats.intelligence}</small>
      <small>Weapon: ${weaponText}</small>
      <small>Spells: ${spellText}</small>
    `;
    dom.hubPartyRoster.appendChild(card);
  }

  updateExplorationHud();
}

function visitTavernRoom(roomId) {
  const room = GAME_CONFIG.tavernRooms.find((entry) => entry.id === roomId);
  if (!room) {
    return;
  }
  if (state.gold < room.cost) {
    showToast("Not enough gold for that room.");
    return;
  }
  state.gold -= room.cost;
  partyManager.healAllByPercent(room.hpRecover, room.mpRecover);
  updateHubPanel();
  showToast(`${room.name} restored the party.`);
}

function updateShopMemberSelect() {
  const previousValue = dom.shopMemberSelect.value;
  dom.shopMemberSelect.innerHTML = "";

  for (const member of partyManager.members) {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = `${member.name} (${member.className})`;
    dom.shopMemberSelect.appendChild(option);
  }

  if (!partyManager.members.length) {
    return;
  }

  const validPrevious = partyManager.members.some((member) => member.id === previousValue);
  dom.shopMemberSelect.value = validPrevious ? previousValue : partyManager.members[0].id;
}

function purchaseWeapon(weaponId) {
  const weapon = GAME_CONFIG.shop.weapons.find((entry) => entry.id === weaponId);
  if (!weapon) {
    return;
  }
  const targetMemberId = dom.shopMemberSelect.value;
  if (!targetMemberId) {
    showToast("Choose a party member first.");
    return;
  }
  if (state.gold < weapon.cost) {
    showToast("Not enough gold.");
    return;
  }

  const equipResult = partyManager.equipWeapon(targetMemberId, weapon);
  if (!equipResult.ok) {
    showToast(equipResult.message);
    return;
  }

  state.gold -= weapon.cost;
  updateHubPanel();
  showToast(equipResult.message);
}

function purchaseSpell(spellId) {
  const spell = GAME_CONFIG.shop.spells.find((entry) => entry.id === spellId);
  if (!spell) {
    return;
  }
  const targetMemberId = dom.shopMemberSelect.value;
  if (!targetMemberId) {
    showToast("Choose a party member first.");
    return;
  }
  if (state.gold < spell.cost) {
    showToast("Not enough gold.");
    return;
  }

  const learnResult = partyManager.learnSpell(targetMemberId, spell);
  if (!learnResult.ok) {
    showToast(learnResult.message);
    return;
  }

  state.gold -= spell.cost;
  updateHubPanel();
  showToast(learnResult.message);
}

function buildEnemy(isBoss) {
  const difficultyBase = 1 + state.bossesDefeated * 2;
  const level = difficultyBase + randomInt(0, 2) + (isBoss ? 2 : 0);

  const name = isBoss
    ? GAME_CONFIG.enemies.bosses[Math.min(state.bossesDefeated, GAME_CONFIG.enemies.bosses.length - 1)]
    : pickRandom(GAME_CONFIG.enemies.regular);

  const stats = {
    strength: 5 + level * 2 + (isBoss ? 3 : 0),
    agility: 4 + level + (isBoss ? 2 : 0),
    dexterity: 4 + level + (isBoss ? 2 : 0),
    vitality: 5 + level * 2 + (isBoss ? 5 : 0),
    intelligence: 4 + level + (isBoss ? 4 : 0)
  };

  const maxHp = stats.vitality * 10 + stats.strength * 2 + (isBoss ? 40 : 12);
  const maxMp = stats.intelligence * 5 + (isBoss ? 16 : 0);

  return {
    id: `enemy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    isBoss,
    level,
    stats,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    goldReward: 18 + level * (isBoss ? 12 : 5),
    critBonus: isBoss ? 4 : 0,
    accuracyBonus: isBoss ? 8 : 0,
    guard: false
  };
}

function shouldSpawnBoss() {
  if (state.bossesDefeated >= FINAL_BOSS_COUNT) {
    return false;
  }
  const requiredMonsterWins = Math.max(2, 4 - state.bossesDefeated);
  if (state.monstersDefeatedSinceBoss >= requiredMonsterWins) {
    return true;
  }
  const randomBossChance = 0.05 + state.bossesDefeated * 0.03;
  return Math.random() < randomBossChance;
}

function triggerEncounterIfNeeded() {
  if (state.phase !== GAME_PHASE.EXPLORATION || state.battle) {
    return;
  }
  const threshold = GAME_CONFIG.world.encounterDistance / state.encounterRateMultiplier;
  if (state.distanceSinceEncounter < threshold) {
    return;
  }
  state.distanceSinceEncounter = 0;

  const baseChance = GAME_CONFIG.encounters.baseChance + state.bossesDefeated * GAME_CONFIG.encounters.scalePerBoss;
  const rolled = Math.random() < clamp(baseChance * state.encounterRateMultiplier, 0.07, 0.95);
  if (!rolled) {
    updateExplorationHud();
    return;
  }

  const enemy = buildEnemy(shouldSpawnBoss());
  startBattle(enemy);
}

function startBattle(enemy) {
  state.battle = {
    enemy,
    round: 1,
    log: []
  };
  createEnemyMesh(enemy.isBoss);
  switchPhase(GAME_PHASE.BATTLE);
  appendBattleLog(`A ${enemy.isBoss ? "Boss" : "Monster"} appears: ${enemy.name}!`);
  appendBattleLog("Choose your action.");
  renderBattlePanel();
}

function resolveBattleRound(playerAction) {
  const battle = state.battle;
  if (!battle) {
    return;
  }
  const enemy = battle.enemy;
  const leader = partyManager.getLeader();
  const aliveParty = partyManager.getAliveMembers();
  if (!leader || !aliveParty.length) {
    handlePartyDefeat();
    return;
  }

  if (playerAction === "run") {
    if (enemy.isBoss) {
      appendBattleLog("You cannot flee from a boss.");
      playerAction = "guard";
    } else {
      const runChance = clamp(42 + leader.stats.agility * 1.5 - enemy.stats.agility, 20, 85);
      if (Math.random() * 100 < runChance) {
        appendBattleLog(`${leader.name} escaped the battle.`);
        finishBattle("escape");
        return;
      }
      appendBattleLog(`${leader.name} failed to escape.`);
      playerAction = "guard";
    }
  }

  for (const member of partyManager.members) {
    member.guard = false;
  }

  const actionMap = new Map();
  for (const member of aliveParty) {
    if (member.id === leader.id) {
      actionMap.set(member.id, playerAction);
    } else {
      actionMap.set(member.id, chooseAutoAction(member));
    }
  }

  const turnOrder = [];
  for (const member of aliveParty) {
    turnOrder.push({
      kind: "party",
      actor: member,
      initiative: CombatEngine.initiative(member)
    });
  }
  turnOrder.push({
    kind: "enemy",
    actor: enemy,
    initiative: CombatEngine.initiative(enemy) + 2
  });
  turnOrder.sort((a, b) => b.initiative - a.initiative);

  for (const turn of turnOrder) {
    if (enemy.hp <= 0 || !partyManager.getAliveMembers().length) {
      break;
    }

    if (turn.kind === "party") {
      if (turn.actor.hp <= 0) {
        continue;
      }
      executePartyAction(turn.actor, actionMap.get(turn.actor.id) || "attack");
    } else {
      executeEnemyAction(enemy);
    }
  }

  if (enemy.hp <= 0) {
    handleEnemyDefeat(enemy);
    return;
  }
  if (!partyManager.getAliveMembers().length) {
    handlePartyDefeat();
    return;
  }

  battle.round += 1;
  renderBattlePanel();
  updateHubPanel();
}

function chooseAutoAction(member) {
  const needsHealing = member.hp / member.maxHp < 0.35;
  const healSpell = member.spells.find((spell) => spell.type === "heal" && member.mp >= spell.mpCost);
  if (needsHealing && healSpell) {
    return "heal";
  }

  const damageSpell = member.spells.find((spell) => spell.type === "damage" && member.mp >= spell.mpCost);
  if (damageSpell && member.stats.intelligence >= member.stats.strength) {
    return "magic";
  }

  if (member.hp / member.maxHp < 0.25) {
    return "guard";
  }

  return "attack";
}

function executePartyAction(member, action) {
  const battle = state.battle;
  if (!battle) {
    return;
  }
  const enemy = battle.enemy;

  if (action === "guard") {
    member.guard = true;
    appendBattleLog(`${member.name} braces for impact.`);
    return;
  }

  if (action === "heal") {
    const healSpell = member.spells.find((spell) => spell.type === "heal" && member.mp >= spell.mpCost);
    const defaultCost = 5;
    const manaCost = healSpell ? healSpell.mpCost : defaultCost;
    if (member.mp < manaCost) {
      appendBattleLog(`${member.name} tried to heal but lacked MP.`);
      performPhysicalAttack(member, enemy, "party");
      return;
    }
    member.mp -= manaCost;
    const healTarget = getLowestHealthPartyMember();
    if (!healTarget) {
      performPhysicalAttack(member, enemy, "party");
      return;
    }
    const baseHeal = CombatEngine.healAmount(member);
    const powerMultiplier = healSpell ? healSpell.power : 0.9;
    const totalHeal = Math.floor(baseHeal * powerMultiplier);
    healTarget.hp = clamp(healTarget.hp + totalHeal, 0, healTarget.maxHp);
    appendBattleLog(`${member.name} restores ${healTarget.name} for ${totalHeal} HP.`);
    return;
  }

  if (action === "magic") {
    const damageSpell = member.spells.find((spell) => spell.type === "damage" && member.mp >= spell.mpCost);
    const defaultCost = 6;
    const manaCost = damageSpell ? damageSpell.mpCost : defaultCost;
    if (member.mp < manaCost) {
      appendBattleLog(`${member.name} has no MP for magic.`);
      performPhysicalAttack(member, enemy, "party");
      return;
    }
    member.mp -= manaCost;
    const baseDamage = CombatEngine.magicDamage(member, enemy);
    const powerMultiplier = damageSpell ? damageSpell.power : 1;
    const dealt = Math.floor(baseDamage * powerMultiplier);
    enemy.hp = clamp(enemy.hp - dealt, 0, enemy.maxHp);
    appendBattleLog(`${member.name} casts ${damageSpell ? damageSpell.name : "Arcane Burst"} for ${dealt} damage.`);
    return;
  }

  performPhysicalAttack(member, enemy, "party");
}

function executeEnemyAction(enemy) {
  const livingMembers = partyManager.getAliveMembers();
  if (!livingMembers.length) {
    return;
  }
  const target = pickRandom(livingMembers);

  const useMagic = enemy.mp >= 8 && enemy.stats.intelligence > enemy.stats.strength && Math.random() < 0.35;
  if (useMagic) {
    enemy.mp -= 8;
    const damage = CombatEngine.magicDamage(enemy, target);
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    appendBattleLog(`${enemy.name} unleashes Void Pulse on ${target.name} for ${damage}.`);
    if (target.hp <= 0) {
      appendBattleLog(`${target.name} has fallen.`);
    }
    return;
  }

  performPhysicalAttack(enemy, target, "enemy");
}

function performPhysicalAttack(attacker, defender, side) {
  const attackerName = attacker.name;
  const defenderName = defender.name;

  if (!CombatEngine.didHit(attacker, defender)) {
    appendBattleLog(`${attackerName}'s attack misses ${defenderName}.`);
    return;
  }
  const crit = CombatEngine.didCrit(attacker);
  const damage = CombatEngine.physicalDamage(attacker, defender, crit);
  defender.hp = clamp(defender.hp - damage, 0, defender.maxHp);

  const critTag = crit ? " critical" : "";
  appendBattleLog(`${attackerName} lands a${critTag} hit on ${defenderName} for ${damage}.`);
  if (defender.hp <= 0) {
    if (side === "enemy") {
      appendBattleLog(`${defenderName} is knocked out.`);
    } else {
      appendBattleLog(`${defenderName} collapses.`);
    }
  }
}

function getLowestHealthPartyMember() {
  const alive = partyManager.getAliveMembers();
  if (!alive.length) {
    return null;
  }
  return alive.reduce((lowest, current) => {
    const lowestRatio = lowest.hp / lowest.maxHp;
    const currentRatio = current.hp / current.maxHp;
    return currentRatio < lowestRatio ? current : lowest;
  });
}

function appendBattleLog(message) {
  if (!state.battle) {
    return;
  }
  state.battle.log.push(message);
  if (state.battle.log.length > 16) {
    state.battle.log.shift();
  }
  renderBattlePanel();
}

function renderBattlePanel() {
  if (!state.battle) {
    dom.enemyName.textContent = "Enemy: -";
    dom.enemyStats.textContent = "-";
    dom.enemyHpFill.style.width = "0%";
    dom.battleLog.innerHTML = "";
    return;
  }

  const enemy = state.battle.enemy;
  const enemyRole = enemy.isBoss ? "Boss" : "Monster";
  dom.enemyName.textContent = `${enemyRole}: ${enemy.name}`;
  dom.enemyStats.textContent = `Lvl ${enemy.level} | HP ${enemy.hp}/${enemy.maxHp} | MP ${enemy.mp}/${enemy.maxMp}`;
  dom.enemyHpFill.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
  dom.battleLog.innerHTML = "";
  for (const line of state.battle.log) {
    const row = document.createElement("div");
    row.textContent = line;
    dom.battleLog.appendChild(row);
  }
  dom.battleLog.scrollTop = dom.battleLog.scrollHeight;
}

function handleEnemyDefeat(enemy) {
  appendBattleLog(`${enemy.name} has been defeated.`);

  state.gold += enemy.goldReward;
  partyManager.healAllByPercent(0.12, 0.08);

  if (enemy.isBoss) {
    state.bossesDefeated += 1;
    state.monstersDefeatedSinceBoss = 0;
    appendBattleLog("Hero Freed event triggered!");

    const newHero = unlockFreedHero();
    if (newHero) {
      appendBattleLog(`${newHero.name} joins the party.`);
    } else {
      appendBattleLog("No new class remained to unlock.");
    }
  } else {
    state.monstersDefeatedSinceBoss += 1;
  }

  updateHubPanel();
  saveGame();

  const isFinalVictory = state.bossesDefeated >= FINAL_BOSS_COUNT && partyManager.members.length >= partyManager.maxMembers;
  if (isFinalVictory) {
    finishBattle("victory");
    return;
  }

  if (enemy.isBoss) {
    finishBattle("boss_win");
  } else {
    finishBattle("monster_win");
  }
}

function handlePartyDefeat() {
  appendBattleLog("Your party has been defeated.");
  state.gold = Math.max(0, state.gold - 24);
  partyManager.healAllByPercent(0.35, 0.35);
  finishBattle("party_defeat");
}

function finishBattle(reason) {
  state.battle = null;
  clearEnemyMesh();

  if (reason === "escape") {
    switchPhase(GAME_PHASE.EXPLORATION);
    showToast("You escaped.");
    return;
  }

  if (reason === "victory") {
    const leader = partyManager.getLeader();
    dom.endingTitle.textContent = "Final Boss Defeated";
    dom.endingSummary.textContent = `${leader ? leader.name : "Your party"} cleared the final boss with a full 4-member team. The realm is free.`;
    showBanner("The final seal breaks. Peace returns.");
    switchPhase(GAME_PHASE.ENDING);
    return;
  }

  if (reason === "monster_win") {
    switchPhase(GAME_PHASE.EXPLORATION);
    showToast("Victory. Continue exploring.");
    return;
  }

  if (reason === "boss_win") {
    switchPhase(GAME_PHASE.HUB);
    showBanner("Boss defeated. A new hero has been freed.");
    return;
  }

  if (reason === "party_defeat") {
    switchPhase(GAME_PHASE.HUB);
    showToast("Defeat. The tavern patched your wounds.");
    return;
  }
}

function unlockFreedHero() {
  if (partyManager.members.length >= partyManager.maxMembers) {
    return null;
  }

  const currentClasses = new Set(partyManager.getClassNames());
  const missingClasses = Object.keys(GAME_CONFIG.classes).filter((className) => !currentClasses.has(className));
  if (!missingClasses.length) {
    return null;
  }

  const className = pickRandom(missingClasses);
  const baseStats = cloneStats(GAME_CONFIG.classes[className].baseStats);
  let pointsToSpend = GAME_CONFIG.pointBuy.pool;
  let safety = 120;
  while (pointsToSpend > 0 && safety > 0) {
    safety -= 1;
    const stat = pickRandom(STAT_KEYS);
    if (baseStats[stat] >= GAME_CONFIG.pointBuy.max) {
      continue;
    }
    baseStats[stat] += 1;
    pointsToSpend -= 1;
  }

  const randomName = pickRandom(GAME_CONFIG.heroNames);
  const heroName = `${randomName} the ${className}`;
  const newHero = partyManager.createMember(heroName, className, baseStats);
  const added = partyManager.addMember(newHero);
  if (!added) {
    return null;
  }
  showBanner(`Hero Freed: ${heroName}`);
  return newHero;
}

function saveGame() {
  if (!partyManager.members.length) {
    return;
  }

  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    gold: state.gold,
    bossesDefeated: state.bossesDefeated,
    monstersDefeatedSinceBoss: state.monstersDefeatedSinceBoss,
    encounterRateMultiplier: state.encounterRateMultiplier,
    position: {
      x: playerMesh ? playerMesh.position.x : 0,
      z: playerMesh ? playerMesh.position.z : 0
    },
    creationClass: state.creation.className,
    party: partyManager.snapshot()
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  updateLoadScreen();
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    showToast("No save data found.");
    return false;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    showToast("Save file corrupted.");
    return false;
  }

  const loaded = partyManager.loadSnapshot(data.party);
  if (!loaded) {
    showToast("Save file is missing party data.");
    return false;
  }

  state.gold = Number(data.gold) || 120;
  state.bossesDefeated = clamp(Number(data.bossesDefeated) || 0, 0, FINAL_BOSS_COUNT);
  state.monstersDefeatedSinceBoss = clamp(Number(data.monstersDefeatedSinceBoss) || 0, 0, 99);
  state.encounterRateMultiplier = clamp(Number(data.encounterRateMultiplier) || 1, 0.4, 1.8);
  state.creation.className = GAME_CONFIG.classes[data.creationClass] ? data.creationClass : partyManager.getLeader()?.className || "Warrior";
  state.distanceSinceEncounter = 0;
  state.battle = null;

  dom.encounterRateSlider.value = String(Math.round(state.encounterRateMultiplier * 100));
  dom.encounterRateValue.textContent = `${state.encounterRateMultiplier.toFixed(2)}x`;

  const leader = partyManager.getLeader();
  createOrReplacePlayerMesh(leader ? leader.className : "Warrior");
  setPlayerPosition(Number(data.position?.x) || 0, Number(data.position?.z) || 0);
  clearEnemyMesh();
  updateHubPanel();
  showToast("Save loaded.");
  return true;
}

function updateLoadScreen() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    dom.loadInfo.textContent = "No save data found.";
    dom.loadSlotBtn.disabled = true;
    return;
  }

  try {
    const data = JSON.parse(raw);
    const savedDate = data.savedAt ? new Date(data.savedAt).toLocaleString() : "Unknown time";
    const partySize = Array.isArray(data.party) ? data.party.length : 0;
    dom.loadInfo.textContent = `Save found: ${savedDate} | Gold ${data.gold ?? "?"} | Bosses ${data.bossesDefeated ?? "?"} | Party ${partySize}/4`;
    dom.loadSlotBtn.disabled = false;
  } catch (error) {
    dom.loadInfo.textContent = "Save file exists but is invalid.";
    dom.loadSlotBtn.disabled = true;
  }
}

function switchPhase(phase) {
  state.phase = phase;

  for (const screen of Object.values(dom.screens)) {
    screen.classList.remove("active");
  }

  const screenId = screenByPhase[phase];
  const targetScreen = screenId ? document.getElementById(screenId) : null;
  if (targetScreen) {
    targetScreen.classList.add("active");
  }

  if (phase === GAME_PHASE.HUB) {
    updateHubPanel();
  } else if (phase === GAME_PHASE.SHOP) {
    updateShopMemberSelect();
  } else if (phase === GAME_PHASE.EXPLORATION) {
    updateExplorationHud();
  } else if (phase === GAME_PHASE.BATTLE) {
    renderBattlePanel();
  } else if (phase === GAME_PHASE.LOAD) {
    updateLoadScreen();
  }
}

function updateExplorationHud() {
  if (!playerMesh) {
    return;
  }
  const pulse = clamp(
    Math.floor((state.distanceSinceEncounter / (GAME_CONFIG.world.encounterDistance / state.encounterRateMultiplier)) * 100),
    0,
    100
  );
  dom.hudLocation.textContent = `Position: (${playerMesh.position.x.toFixed(1)}, ${playerMesh.position.z.toFixed(1)})`;
  dom.hudEncounter.textContent = `Encounter Pulse: ${pulse}%`;
  dom.hudGold.textContent = `Gold: ${state.gold}`;
  dom.hudBosses.textContent = `Bosses Defeated: ${state.bossesDefeated}`;
}

function updateExplorationMovement(delta) {
  if (state.phase !== GAME_PHASE.EXPLORATION || !playerMesh || state.battle) {
    return;
  }

  const horizontal = Number(keysDown.has("KeyD") || keysDown.has("ArrowRight")) - Number(keysDown.has("KeyA") || keysDown.has("ArrowLeft"));
  const vertical = Number(keysDown.has("KeyS") || keysDown.has("ArrowDown")) - Number(keysDown.has("KeyW") || keysDown.has("ArrowUp"));
  if (horizontal === 0 && vertical === 0) {
    return;
  }

  const moveVector = new THREE.Vector3(horizontal, 0, vertical).normalize();
  const oldX = playerMesh.position.x;
  const oldZ = playerMesh.position.z;

  playerMesh.position.addScaledVector(moveVector, GAME_CONFIG.world.moveSpeed * delta);
  playerMesh.position.x = clamp(playerMesh.position.x, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  playerMesh.position.z = clamp(playerMesh.position.z, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);

  const movedDistance = Math.hypot(playerMesh.position.x - oldX, playerMesh.position.z - oldZ);
  if (movedDistance > 0) {
    state.distanceSinceEncounter += movedDistance;
    updateExplorationHud();
    triggerEncounterIfNeeded();
  }

  camera.position.x = playerMesh.position.x + 18;
  camera.position.z = playerMesh.position.z + 18;
  camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    dom.toast.classList.add("hidden");
  }, 2200);
}

function showBanner(message) {
  dom.eventBanner.textContent = message;
  dom.eventBanner.classList.remove("hidden");
  dom.eventBanner.style.opacity = "1";
  if (eventTimer) {
    clearTimeout(eventTimer);
  }
  eventTimer = setTimeout(() => {
    dom.eventBanner.style.opacity = "0";
    setTimeout(() => {
      dom.eventBanner.classList.add("hidden");
      dom.eventBanner.style.opacity = "1";
    }, 240);
  }, 2500);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateExplorationMovement(delta);

  for (const billboard of billboardMeshes) {
    billboard.lookAt(camera.position.x, billboard.position.y, camera.position.z);
  }

  renderer.render(scene, camera);
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneStats(stats) {
  return {
    strength: Number(stats.strength) || 0,
    agility: Number(stats.agility) || 0,
    dexterity: Number(stats.dexterity) || 0,
    vitality: Number(stats.vitality) || 0,
    intelligence: Number(stats.intelligence) || 0
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
