import { useGameStore, partyManager } from './state.js';
import { CombatEngine } from './combat-engine.js';
import { FINAL_BOSS_COUNT, SPRITE_CONFIG, ENEMY_SPRITE_CONFIG } from './config.js';
import { dom } from './dom.js';
import { finishBattle, unlockFreedHero } from './game-logic.js';
import { updateHubPanel } from './ui.js';
import { clamp, pickRandom } from './utils.js';
import type { Enemy, PartyMember } from './types.js';

export function resolveBattleRound(playerAction: string) {
  const state = useGameStore.getState();
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

  useGameStore.setState({ battle: { ...battle, round: battle.round + 1 } });
  renderBattlePanel();
  updateHubPanel();
}

export function chooseAutoAction(member: PartyMember): string {
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

export function executePartyAction(member: PartyMember, action: string) {
  const state = useGameStore.getState();
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

export function executeEnemyAction(enemy: Enemy) {
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

export function performPhysicalAttack(attacker: PartyMember | Enemy, defender: PartyMember | Enemy, side: string) {
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

  flickerSprite(side === 'enemy' ? 'player' : 'enemy');
  if (defender.hp <= 0) {
    if (side === "enemy") {
      appendBattleLog(`${defenderName} is knocked out.`);
    } else {
      appendBattleLog(`${defenderName} collapses.`);
    }
  }
}

export function getLowestHealthPartyMember(): PartyMember | null {
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

export function appendBattleLog(message: string) {
  const state = useGameStore.getState();
  const battle = state.battle;
  if (!battle) {
    return;
  }
  const newLog = [...battle.log, message];
  if (newLog.length > 16) {
    newLog.shift();
  }
  useGameStore.setState({ battle: { ...battle, log: newLog } });
}

export function renderBattlePanel() {
  const { battle } = useGameStore.getState();
  if (!battle) return;

  const { enemy } = battle;
  const leader = partyManager.getLeader();

  dom.enemyName.textContent = `Enemy: ${enemy.name}`;
  dom.enemyStats.textContent = `Level ${enemy.level}`;
  dom.enemyHpFill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
  dom.enemyHpText.textContent = `${enemy.hp} / ${enemy.maxHp}`;

  if (leader) {
    dom.playerHpFill.style.width = `${(leader.hp / leader.maxHp) * 100}%`;
    dom.playerHpFill.style.background = leader.hp > leader.maxHp * 0.5 ? '#66ee87' : leader.hp > leader.maxHp * 0.25 ? '#ffd700' : '#ff6262';
    dom.playerHpText.textContent = `${leader.hp} / ${leader.maxHp}`;
    dom.playerSprite.style.backgroundImage = `url(${SPRITE_CONFIG.idleSheetPath})`;
    dom.playerSprite.style.backgroundSize = `${SPRITE_CONFIG.columns * 100}% ${SPRITE_CONFIG.rows * 100}%`;
    dom.playerSprite.style.backgroundPosition = '0% 0%';
    dom.playerSprite.textContent = '';
  }

  if (enemy.spriteKey && ENEMY_SPRITE_CONFIG[enemy.spriteKey]) {
    const config = ENEMY_SPRITE_CONFIG[enemy.spriteKey];
    dom.enemySprite.style.backgroundImage = `url(${config.path})`;
    dom.enemySprite.style.backgroundSize = `${config.sheetSize.cols * 100}% ${config.sheetSize.rows * 100}%`;
    dom.enemySprite.style.backgroundPosition = '0% 0%';
    dom.enemySprite.textContent = '';
  } else {
    dom.enemySprite.style.backgroundImage = 'none';
    dom.enemySprite.textContent = enemy.name.charAt(0).toUpperCase();
  }

  dom.battleLog.textContent = battle.log.join('\n');
}

export function handleEnemyDefeat(enemy: Enemy) {
  appendBattleLog(`${enemy.name} has been defeated.`);

  const state = useGameStore.getState();
  useGameStore.setState({ gold: state.gold + enemy.goldReward });
  partyManager.healAllByPercent(0.12, 0.08);

  if (enemy.isBoss) {
    useGameStore.setState({
      bossesDefeated: state.bossesDefeated + 1,
      monstersDefeatedSinceBoss: 0
    });
    appendBattleLog("Hero Freed event triggered!");

    const newHero = unlockFreedHero();
    if (newHero) {
      appendBattleLog(`${newHero.name} joins the party.`);
    } else {
      appendBattleLog("No new class remained to unlock.");
    }
  } else {
    useGameStore.setState({ monstersDefeatedSinceBoss: state.monstersDefeatedSinceBoss + 1 });
  }

  updateHubPanel();

  const newState = useGameStore.getState();
  const isFinalVictory = newState.bossesDefeated >= FINAL_BOSS_COUNT && partyManager.members.length >= partyManager.maxMembers;
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

export function handlePartyDefeat() {
  appendBattleLog("Your party has been defeated.");
  const state = useGameStore.getState();
  useGameStore.setState({ gold: Math.max(0, state.gold - 24) });
  partyManager.healAllByPercent(0.35, 0.35);
  finishBattle("party_defeat");
}

let _nextCb: (() => void) | null = null;

export function showText(msg: string, onNext: () => void) {
  dom.battleMenu.classList.add('hidden');
  dom.battleNextRow.classList.add('hidden');
  dom.battleTextbox.textContent = msg;
  _nextCb = onNext;
  dom.battleNextRow.classList.remove('hidden');
}

export function showMenu() {
  dom.battleNextRow.classList.add('hidden');
  const leader = partyManager.getLeader();
  dom.battleLeaderName.textContent = leader ? leader.name : 'Unknown';
  dom.battleMenu.classList.remove('hidden');
}

export function handleBattleNext() {
  if (_nextCb) {
    const cb = _nextCb;
    _nextCb = null;
    cb();
  }
}

export function flickerSprite(target: 'player' | 'enemy') {
  const element = target === 'player' ? dom.playerSprite : dom.enemySprite;
  element.classList.remove('flicker');
  // Force reflow
  element.offsetWidth;
  element.classList.add('flicker');
  setTimeout(() => element.classList.remove('flicker'), 450);
}

export function drainLog(done: () => void) {
  const { battle } = useGameStore.getState();
  if (!battle) return done();
  const log = [...battle.log];
  useGameStore.setState({ battle: { ...battle, log: [] } });
  let index = 0;
  const next = () => {
    if (index < log.length) {
      showText(log[index], next);
      index++;
    } else {
      done();
    }
  };
  next();
}

export function handlePlayerAction(action: string) {
  const { battle } = useGameStore.getState();
  resolveBattleRound(action);
  if (battle) {
    drainLog(() => showText(`${partyManager.getLeader()?.name}'s turn!`, showMenu));
  }
}

export function startBattleScreen() {
  renderBattlePanel();
  showText("An enemy appeared!", () => showText(`${partyManager.getLeader()?.name}'s turn!`, showMenu));
}

export function initBattleListeners() {
  dom.battleNextBtn.addEventListener('click', handleBattleNext);
  dom.battleActionBtns.forEach(btn => {
    (btn as HTMLElement).addEventListener('click', () => handlePlayerAction((btn as HTMLElement).dataset.action));
  });
}