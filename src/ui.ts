import { dom, SCREEN_BY_PHASE } from './dom.js';
import { GAME_CONFIG, STAT_KEYS, STAT_LABELS, SAVE_KEY, FINAL_BOSS_COUNT } from './config.js';
import { useGameStore } from './state.js';
import { partyManager } from './state.js';
import { clamp, pickRandom, cloneStats } from './utils.js';
import { GamePhase } from './types.js';
import { resolveBattleRound, renderBattlePanel, appendBattleLog, startBattleScreen } from './battle.js';
import { clearEnemyMesh, createOrReplacePlayerMesh, playerMesh } from './scene.js';
import { setPlayerPosition } from './movement.js';
import { spawnRoamingEnemies } from './game-logic.js';

let toastTimer: number | null = null;
let eventTimer: number | null = null;

export { toastTimer, eventTimer };

const keysDown = new Set<string>();

export { keysDown };

export function setupUI() {
  bindMenuButtons();
  buildClassCards();
  buildStatRows();
  buildTavernRoomButtons();
  buildShopLists();
  bindBattleButtons();
  bindKeyboardInput();

  (dom.playerNameInput as HTMLInputElement).addEventListener("input", () => {
    const clean = (dom.playerNameInput as HTMLInputElement).value.replace(/\s+/g, " ").trimStart();
    if (clean !== (dom.playerNameInput as HTMLInputElement).value) {
      (dom.playerNameInput as HTMLInputElement).value = clean;
    }
  });

  dom.statPointGrid.addEventListener("click", (event: Event) => {
    const btn = (event.target as HTMLElement).closest("button[data-stat][data-delta]") as HTMLElement;
    if (!btn) {
      return;
    }
    const stat = btn.dataset.stat!;
    const delta = Number(btn.dataset.delta);
    adjustCreationStat(stat, delta);
  });

  dom.classOptions.addEventListener("click", (event: Event) => {
    const classBtn = (event.target as HTMLElement).closest("button[data-class]") as HTMLElement;
    if (!classBtn) {
      return;
    }
    resetCreationState(classBtn.dataset.class!);
  });

  dom.confirmCharacterBtn.addEventListener("click", () => {
    createNewAdventurer();
  });

  dom.backFromCharacterBtn.addEventListener("click", () => {
    switchPhase(GamePhase.MAIN_MENU);
  });

  dom.exploreBtn.addEventListener("click", () => {
    if (!partyManager.getAliveMembers().length) {
      showToast("Your party is wiped out. Rest at the tavern first.");
      return;
    }
    switchPhase(GamePhase.EXPLORATION);
    showToast("Use WASD or arrow keys to explore.");
  });

  dom.openShopBtn.addEventListener("click", () => {
    updateShopMemberSelect();
    switchPhase(GamePhase.SHOP);
  });

  dom.backToHubFromShopBtn.addEventListener("click", () => {
    switchPhase(GamePhase.HUB);
  });

  (dom.shopMemberSelect as HTMLSelectElement).addEventListener("change", () => {
    updateShopMemberSelect();
  });

  dom.weaponList.addEventListener("click", (event: Event) => {
    const btn = (event.target as HTMLElement).closest("button[data-weapon-id]") as HTMLElement;
    if (!btn) {
      return;
    }
    purchaseWeapon(btn.dataset.weaponId!);
  });

  dom.spellList.addEventListener("click", (event: Event) => {
    const btn = (event.target as HTMLElement).closest("button[data-spell-id]") as HTMLElement;
    if (!btn) {
      return;
    }
    purchaseSpell(btn.dataset.spellId!);
  });

  dom.saveGameBtn.addEventListener("click", saveGame);

  dom.backToMenuBtn.addEventListener("click", () => {
    switchPhase(GamePhase.MAIN_MENU);
  });

  dom.returnHubBtn.addEventListener("click", () => {
    switchPhase(GamePhase.HUB);
  });

  const store = useGameStore.getState();
  (dom.encounterRateSlider as HTMLInputElement).addEventListener("input", () => {
    const value = Number((dom.encounterRateSlider as HTMLInputElement).value) / 100;
    useGameStore.setState({ encounterRateMultiplier: value });
    dom.encounterRateValue.textContent = `${value.toFixed(2)}x`;
  });

  dom.backFromSettingsBtn.addEventListener("click", () => {
    switchPhase(GamePhase.MAIN_MENU);
  });

  (dom.loadSlotBtn as HTMLButtonElement).addEventListener("click", () => {
    const loaded = loadGame();
    if (loaded) {
      switchPhase(GamePhase.HUB);
    }
  });

  dom.backFromLoadBtn.addEventListener("click", () => {
    switchPhase(GamePhase.MAIN_MENU);
  });

  dom.restartBtn.addEventListener("click", () => {
    switchPhase(GamePhase.MAIN_MENU);
  });

  dom.leaveBattleBtn.addEventListener("click", () => {
    const state = useGameStore.getState();
    if (state.phase !== GamePhase.BATTLE) {
      return;
    }
    useGameStore.setState({ battle: null });
    clearEnemyMesh();
    showToast("Retreat complete.");
    switchPhase(GamePhase.HUB);
  });
}

export function bindMenuButtons() {
  dom.startGameBtn.addEventListener("click", () => {
    resetCreationState("Warrior");
    (dom.playerNameInput as HTMLInputElement).value = "";
    switchPhase(GamePhase.CHARACTER_CREATION);
  });

  dom.loadGameBtn.addEventListener("click", () => {
    updateLoadScreen();
    switchPhase(GamePhase.LOAD);
  });

  dom.settingsBtn.addEventListener("click", () => {
    switchPhase(GamePhase.SETTINGS);
  });

  dom.exitBtn.addEventListener("click", () => {
    showToast("Exit requested. Close the browser tab to leave the prototype.");
  });
}

export function bindBattleButtons() {
  for (const btn of dom.battleActionBtns) {
    (btn as HTMLElement).addEventListener("click", () => {
      const state = useGameStore.getState();
      if (state.phase !== GamePhase.BATTLE || !state.battle) {
        return;
      }
      resolveBattleRound((btn as HTMLElement).dataset.action!);
    });
  }
}

export function bindKeyboardInput() {
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
      return;
    }

    if (event.code === "Escape") {
      const state = useGameStore.getState();
      if (state.phase === GamePhase.EXPLORATION) {
        switchPhase(GamePhase.HUB);
      }
      return;
    }

    keysDown.add(event.code);
  });

  window.addEventListener("keyup", (event: KeyboardEvent) => {
    keysDown.delete(event.code);
  });
}

export function buildClassCards() {
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

export function buildStatRows() {
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

export function buildTavernRoomButtons() {
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

  dom.tavernRoomButtons.addEventListener("click", (event: Event) => {
    const btn = (event.target as HTMLElement).closest("button[data-room-id]") as HTMLElement;
    if (!btn) {
      return;
    }
    visitTavernRoom(btn.dataset.roomId!);
  });
}

export function buildShopLists() {
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

export function resetCreationState(className: string) {
  const resolvedClass = GAME_CONFIG.classes[className] ? className : "Warrior";
  const base = cloneStats(GAME_CONFIG.classes[resolvedClass].baseStats);
  useGameStore.setState({
    creation: {
      className: resolvedClass,
      baseStats: base,
      allocatedStats: cloneStats(base),
      pointsRemaining: GAME_CONFIG.pointBuy.pool
    }
  });
  renderCreationState();
}

export function renderCreationState() {
  const state = useGameStore.getState();
  dom.pointsRemaining.textContent = String(state.creation.pointsRemaining);
  dom.classSummary.textContent = `${GAME_CONFIG.classes[state.creation.className].description}`;

  const classButtons = Array.from(dom.classOptions.querySelectorAll("button[data-class]"));
  for (const btn of classButtons) {
    (btn as HTMLElement).classList.toggle("selected", (btn as HTMLElement).dataset.class === state.creation.className);
  }

  for (const statKey of STAT_KEYS) {
    const statNode = dom.statPointGrid.querySelector(`[data-stat-value="${statKey}"]`);
    if (statNode) {
      statNode.textContent = String(state.creation.allocatedStats[statKey]);
    }
  }
}

export function adjustCreationStat(statKey: string, delta: number) {
  if (!STAT_KEYS.includes(statKey as any)) {
    return;
  }

  const state = useGameStore.getState();
  const current = state.creation.allocatedStats[statKey as keyof typeof state.creation.allocatedStats];
  const base = state.creation.baseStats[statKey as keyof typeof state.creation.baseStats];

  if (delta > 0) {
    if (state.creation.pointsRemaining <= 0) {
      showToast("No points remaining.");
      return;
    }
    if (current >= GAME_CONFIG.pointBuy.max) {
      showToast(`${STAT_LABELS[statKey as keyof typeof STAT_LABELS]} is at maximum.`);
      return;
    }
    const newAllocated = { ...state.creation.allocatedStats };
    newAllocated[statKey as keyof typeof newAllocated] += 1;
    useGameStore.setState({
      creation: {
        ...state.creation,
        allocatedStats: newAllocated,
        pointsRemaining: state.creation.pointsRemaining - 1
      }
    });
  } else if (delta < 0) {
    if (current <= base) {
      return;
    }
    const newAllocated = { ...state.creation,
      allocatedStats: { ...state.creation.allocatedStats, [statKey]: current - 1 },
      pointsRemaining: state.creation.pointsRemaining + 1
    };
    useGameStore.setState({
      creation: {
        ...state.creation,
        allocatedStats: newAllocated.allocatedStats,
        pointsRemaining: newAllocated.pointsRemaining
      }
    });
  }

  renderCreationState();
}

export function createNewAdventurer() {
  const name = (dom.playerNameInput as HTMLInputElement).value.trim();
  if (!name) {
    showToast("Please enter a player name.");
    return;
  }
  const state = useGameStore.getState();
  if (state.creation.pointsRemaining > 0) {
    showToast("Spend all point-buy stats before continuing.");
    return;
  }

  partyManager.reset();
  const hero = partyManager.createMember(name, state.creation.className, state.creation.allocatedStats);
  partyManager.addMember(hero);

  useGameStore.setState({
    gold: 130,
    bossesDefeated: 0,
    monstersDefeatedSinceBoss: 0,
    distanceSinceEncounter: 0,
    battle: null
  });

  createOrReplacePlayerMesh(state.creation.className);
  setPlayerPosition(0, 0);
  clearEnemyMesh();
  updateHubPanel();
  switchPhase(GamePhase.HUB);
  showBanner(`${hero.name}, your legend begins.`);
}

export function updateHubPanel() {
  const state = useGameStore.getState();
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

export function visitTavernRoom(roomId: string) {
  const room = GAME_CONFIG.tavernRooms.find((entry) => entry.id === roomId);
  if (!room) {
    return;
  }
  const state = useGameStore.getState();
  if (state.gold < room.cost) {
    showToast("Not enough gold for that room.");
    return;
  }
  useGameStore.setState({ gold: state.gold - room.cost });
  partyManager.healAllByPercent(room.hpRecover, room.mpRecover);
  updateHubPanel();
  showToast(`${room.name} restored the party.`);
}

export function updateShopMemberSelect() {
  const previousValue = (dom.shopMemberSelect as HTMLSelectElement).value;
  (dom.shopMemberSelect as HTMLSelectElement).innerHTML = "";

  for (const member of partyManager.members) {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = `${member.name} (${member.className})`;
    (dom.shopMemberSelect as HTMLSelectElement).appendChild(option);
  }

  if (!partyManager.members.length) {
    return;
  }

  const validPrevious = partyManager.members.some((member) => member.id === previousValue);
  (dom.shopMemberSelect as HTMLSelectElement).value = validPrevious ? previousValue : partyManager.members[0].id;
}

export function purchaseWeapon(weaponId: string) {
  const weapon = GAME_CONFIG.shop.weapons.find((entry) => entry.id === weaponId);
  if (!weapon) {
    return;
  }
  const targetMemberId = (dom.shopMemberSelect as HTMLSelectElement).value;
  if (!targetMemberId) {
    showToast("Choose a party member first.");
    return;
  }
  const state = useGameStore.getState();
  if (state.gold < weapon.cost) {
    showToast("Not enough gold.");
    return;
  }

  const equipResult = partyManager.equipWeapon(targetMemberId, weapon);
  if (!equipResult.ok) {
    showToast(equipResult.message);
    return;
  }

  useGameStore.setState({ gold: state.gold - weapon.cost });
  updateHubPanel();
  showToast(equipResult.message);
}

export function purchaseSpell(spellId: string) {
  const spell = GAME_CONFIG.shop.spells.find((entry) => entry.id === spellId);
  if (!spell) {
    return;
  }
  const targetMemberId = (dom.shopMemberSelect as HTMLSelectElement).value;
  if (!targetMemberId) {
    showToast("Choose a party member first.");
    return;
  }
  const state = useGameStore.getState();
  if (state.gold < spell.cost) {
    showToast("Not enough gold.");
    return;
  }

  const learnResult = partyManager.learnSpell(targetMemberId, spell);
  if (!learnResult.ok) {
    showToast(learnResult.message);
    return;
  }

  useGameStore.setState({ gold: state.gold - spell.cost });
  updateHubPanel();
  showToast(learnResult.message);
}

export function saveGame() {
  if (!partyManager.members.length) {
    return;
  }

  const state = useGameStore.getState();
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

export function loadGame(): boolean {
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

  useGameStore.setState({
    gold: Number(data.gold) || 120,
    bossesDefeated: clamp(Number(data.bossesDefeated) || 0, 0, FINAL_BOSS_COUNT),
    monstersDefeatedSinceBoss: clamp(Number(data.monstersDefeatedSinceBoss) || 0, 0, 99),
    encounterRateMultiplier: clamp(Number(data.encounterRateMultiplier) || 1, 0.4, 1.8),
    creation: { ...useGameStore.getState().creation, className: GAME_CONFIG.classes[data.creationClass] ? data.creationClass : partyManager.getLeader()?.className || "Warrior" },
    distanceSinceEncounter: 0,
    battle: null
  });

  (dom.encounterRateSlider as HTMLInputElement).value = String(Math.round(useGameStore.getState().encounterRateMultiplier * 100));
  dom.encounterRateValue.textContent = `${useGameStore.getState().encounterRateMultiplier.toFixed(2)}x`;

  const leader = partyManager.getLeader();
  createOrReplacePlayerMesh(leader ? leader.className : "Warrior");
  setPlayerPosition(Number(data.position?.x) || 0, Number(data.position?.z) || 0);
  clearEnemyMesh();
  updateHubPanel();
  showToast("Save loaded.");
  return true;
}

export function updateLoadScreen() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    dom.loadInfo.textContent = "No save data found.";
    (dom.loadSlotBtn as HTMLButtonElement).disabled = true;
    return;
  }

  try {
    const data = JSON.parse(raw);
    const savedDate = data.savedAt ? new Date(data.savedAt).toLocaleString() : "Unknown time";
    const partySize = Array.isArray(data.party) ? data.party.length : 0;
    dom.loadInfo.textContent = `Save found: ${savedDate} | Gold ${data.gold ?? "?"} | Bosses ${data.bossesDefeated ?? "?"} | Party ${partySize}/4`;
    (dom.loadSlotBtn as HTMLButtonElement).disabled = false;
  } catch (error) {
    dom.loadInfo.textContent = "Save file exists but is invalid.";
    (dom.loadSlotBtn as HTMLButtonElement).disabled = true;
  }
}

export function switchPhase(phase: GamePhase) {
  useGameStore.setState({ phase });

  for (const screen of Object.values(dom.screens)) {
    (screen as HTMLElement).classList.remove("active");
  }

  const screenId = SCREEN_BY_PHASE[phase];
  const targetScreen = screenId ? document.getElementById(screenId) : null;
  if (targetScreen) {
    targetScreen.classList.add("active");
  }

  if (phase === GamePhase.HUB) {
    updateHubPanel();
  } else if (phase === GamePhase.SHOP) {
    updateShopMemberSelect();
   } else if (phase === GamePhase.EXPLORATION) {
     updateExplorationHud();
     spawnRoamingEnemies();
   } else if (phase === GamePhase.BATTLE) {
     startBattleScreen();
   }
}

export function updateExplorationHud() {
  if (!playerMesh) {
    return;
  }
  const state = useGameStore.getState();
  dom.hudLocation.textContent = `Position: (${playerMesh.position.x.toFixed(1)}, ${playerMesh.position.z.toFixed(1)})`;
  dom.hudEncounter.textContent = `Roaming Enemies: ${state.roamingEnemies.length}`;
  dom.hudGold.textContent = `Gold: ${state.gold}`;
  dom.hudBosses.textContent = `Bosses Defeated: ${state.bossesDefeated}`;
}

export function showToast(message: string) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    dom.toast.classList.add("hidden");
  }, 2200);
}

export function showBanner(message: string) {
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

