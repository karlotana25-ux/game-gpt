/**
 * @fileoverview Combat engine for calculating initiative, hit chances, damage, and other combat mechanics.
 * Provides static methods for RPG-style combat calculations.
 */

import { clamp, randomInt } from "./utils.js";

/** Static class providing combat calculation methods. */
export class CombatEngine {
  /**
   * Calculates initiative for an actor in combat.
   * Initiative determines turn order; higher values go first.
   * @param {Object} actor - The actor with stats property containing agility.
   * @returns {number} Initiative value (agility + random 1-12).
   */
  static initiative(actor) {
    return actor.stats.agility + randomInt(1, 12);
  }

  /**
   * Calculates dodge chance for a defender.
   * Dodge reduces hit chance; max 65%.
   * @param {Object} defender - The defender with stats.agility.
   * @returns {number} Dodge chance as percentage (0-65).
   */
  static dodgeChance(defender) {
    return clamp(defender.stats.agility / 2, 0, 65);
  }

  /**
   * Calculates hit chance for an attacker against a defender.
   * Base accuracy 66% + dexterity bonus, reduced by defender's dodge.
   * @param {Object} attacker - The attacker with stats.dexterity and optional accuracyBonus.
   * @param {Object} defender - The defender for dodge calculation.
   * @returns {number} Hit chance as percentage (12-96).
   */
  static hitChance(attacker, defender) {
    const accuracyFromDex = 66 + attacker.stats.dexterity * 2 + (attacker.accuracyBonus || 0);
    const dodge = CombatEngine.dodgeChance(defender);
    return clamp(accuracyFromDex - dodge, 12, 96);
  }

  /**
   * Determines if an attack hits based on hit chance.
   * @param {Object} attacker - The attacker.
   * @param {Object} defender - The defender.
   * @returns {boolean} True if the attack hits.
   */
  static didHit(attacker, defender) {
    return Math.random() * 100 < CombatEngine.hitChance(attacker, defender);
  }

  /**
   * Calculates critical hit chance for an attacker.
   * Critical hits deal increased damage; max 70%.
   * @param {Object} attacker - The attacker with stats.dexterity and optional critBonus.
   * @returns {number} Critical chance as percentage (0-70).
   */
  static critChance(attacker) {
    return clamp(attacker.stats.dexterity / 4 + (attacker.critBonus || 0), 0, 70);
  }

  /**
   * Determines if an attack is a critical hit.
   * @param {Object} attacker - The attacker.
   * @returns {boolean} True if critical hit.
   */
  static didCrit(attacker) {
    return Math.random() * 100 < CombatEngine.critChance(attacker);
  }

  /**
   * Calculates physical damage dealt by attacker to defender.
   * Includes variance, defense mitigation, guard, and critical multiplier.
   * @param {Object} attacker - The attacker with stats.strength and dexterity.
   * @param {Object} defender - The defender with stats.vitality and optional guard property.
   * @param {boolean} [isCrit=false] - Whether the attack is a critical hit.
   * @returns {number} Damage amount (minimum 1).
   */
  static physicalDamage(attacker, defender, isCrit = false) {
    const baseDamage = attacker.stats.strength * 2 + Math.floor(attacker.stats.dexterity * 0.6);
    const defense = Math.floor(defender.stats.vitality * 0.9);
    const variance = randomInt(-4, 6); // Damage variance for realism
    let damage = Math.max(1, baseDamage + variance - defense);
    if (defender.guard) {
      damage = Math.max(1, Math.floor(damage * 0.5)); // Guard halves damage
    }
    if (isCrit) {
      damage = Math.floor(damage * 1.8); // Critical hits deal 1.8x damage
    }
    return damage;
  }

  /**
   * Calculates magic damage dealt by caster to defender.
   * Magic ignores some physical defense but can be mitigated by vitality.
   * @param {Object} caster - The caster with stats.intelligence.
   * @param {Object} defender - The defender with stats.vitality and optional guard.
   * @returns {number} Damage amount (minimum 1 or 2).
   */
  static magicDamage(caster, defender) {
    const baseDamage = caster.stats.intelligence * 3 + randomInt(0, 6);
    const mitigation = Math.floor(defender.stats.vitality * 0.4);
    let damage = Math.max(2, baseDamage - mitigation);
    if (defender.guard) {
      damage = Math.max(1, Math.floor(damage * 0.65)); // Guard reduces magic damage less than physical
    }
    return damage;
  }

  /**
   * Calculates healing amount provided by a caster.
   * Based on intelligence and vitality, with random variance.
   * @param {Object} caster - The caster with stats.intelligence and vitality.
   * @returns {number} Healing amount.
   */
  static healAmount(caster) {
    return caster.stats.intelligence * 2 + Math.floor(caster.stats.vitality * 0.5) + randomInt(4, 10);
  }
}
