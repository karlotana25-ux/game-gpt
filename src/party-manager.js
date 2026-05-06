import { GAME_CONFIG, STAT_KEYS } from "./config.js";
import { clamp, cloneStats } from "./utils.js";

export class PartyManager {
  constructor(maxMembers = 4) {
    this.maxMembers = maxMembers;
    this.members = [];
    this.idCounter = 1;
  }

  nextId() {
    return `member-${this.idCounter++}`;
  }

  syncIdCounterFromValue(memberId) {
    if (typeof memberId !== "string") {
      return;
    }
    const match = /^member-(\d+)$/.exec(memberId);
    if (!match) {
      return;
    }
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= this.idCounter) {
      this.idCounter = parsed + 1;
    }
  }

  reset() {
    this.members.length = 0;
  }

  createMember(name, className, baseStats) {
    const member = {
      id: this.nextId(),
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
    this.syncIdCounterFromValue(member.id);
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
      restored.id = rawMember.id || this.nextId();
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
