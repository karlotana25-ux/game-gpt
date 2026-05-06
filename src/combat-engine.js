import { clamp, randomInt } from "./utils.js";

export class CombatEngine {
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
