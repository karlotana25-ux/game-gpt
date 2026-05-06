# Echoes of the Valley: A 16-Bit 2.5D RPG

Welcome to **Echoes of the Valley**, a modern tribute to the golden age of 16-bit JRPGs. Built with **Three.js** and **React Three Fiber**, this project blends nostalgic pixel art with a dynamic 2.5D environment, featuring a deep class system, scaling difficulty, and a mystery-driven narrative.

---

## 📜 The Legend
You wake up in a dimly lit tavern with no memory of who you are or how you arrived. The air is thick with whispers—faint, ethereal voices urging you to venture into the Valley, vanquish a rising evil, and "save your friends." These friends are the keys to your past and the only hope for the future.

---

## ⚔️ Game Features

### **Dynamic Party System**
*   **Unlocking Heroes:** Every boss defeated isn't just a victory—it's a rescue. Defeating a boss unlocks a unique party member.
*   **RNG Party Composition:** To ensure every run is unique, party members are randomly assigned classes you haven't already picked. Meet `[Name] the Hunter` or `[Name] the Healer` in a different order every time you play.
*   **Unique Classes:**
    *   **Warrior:** The frontline tank. Relies on **Strength** and **Vitality**.
    *   **Hunter:** The agile striker. Relies on **Agility** and **Dexterity**.
    *   **Mage:** The glass cannon. Relies on **Intelligence** for massive mana and magic power.
    *   **Healer:** The backbone. Relies on **Intelligence** and **Vitality** to keep the party alive.

### **The RPG Engine**
*   **Deep Stat Mechanics:** 
    *   **Strength:** Increases Physical Power.
    *   **Agility:** Increases Dodge Rate.
    *   **Dexterity:** Increases Hit Chance and Critical Hit Rate.
    *   **Vitality:** Increases Defense and total HP.
    *   **Intelligence:** Increases Magic Power, Mana, and Healing potency.
*   **Scaling Difficulty:** The further you roam, the stronger the monsters become. The Valley adapts to your party's growth.
*   **The Tavern Hub:** Your sanctuary. Rest in Budget, Standard, or Luxury rooms to restore HP and MP at varying costs.

---

## 🛠 Tech Stack

This project is engineered for high performance and a polished "2.5D" aesthetic:

| Library | Purpose |
| :--- | :--- |
| **Three.js / R3F** | Core 3D/2.5D rendering engine. |
| **Zustand** | Global game state (Stats, Party, Save Data). |
| **Matter.js** | 2D Physics for movement and collision detection. |
| **Postprocessing** | Pixelation shaders and Bloom for magic effects. |
| **Troika-Three-Text** | High-performance 3D floating combat text. |
| **Yuka** | Advanced AI for monster roaming and pathfinding. |
| **Howler.js** | Seamless 16-bit audio loops and sound effects. |

---

## 🕹 Getting Started

### **Controls**
*   **WASD / Arrows:** Move Character
*   **Space / Enter:** Interact / Advance Dialogue
*   **M:** Open Menu / Attributes
*   **Esc:** Pause Game

### **Installation**
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

---

## Module Structure

The prototype is now split into focused ES modules for clearer separation of concerns:

*   `main.js` - Game orchestration, UI events, phase switching, exploration loop.
*   `src/config.js` - Centralized data-driven constants (classes, tavern, shop, enemy configs).
*   `src/dom.js` - DOM element registry and phase-to-screen mapping.
*   `src/utils.js` - Shared utility helpers (`clamp`, `cloneStats`, `randomInt`, `pickRandom`).
*   `src/party-manager.js` - `PartyManager` class for party state, stat recomputation, save-safe restoration.
*   `src/combat-engine.js` - `CombatEngine` class with stat-based turn formulas (dodge/crit/magic/heal).

---

## 🏗 Development Guidelines (AI & Contributor Rules)

To maintain the integrity of the Valley’s code, all development must follow these strict protocols:

1.  **Strict Anti-Laziness:** No placeholders. Provide complete, copy-pasteable code blocks.
2.  **Performance First:** Always prioritize 60 FPS. Use object pooling for combat text and particles.
3.  **Zero Regression:** Every change must be backwards compatible. Never break the existing Zustand store or save files.
4.  **The "Pre-Flight" Check:** Before finalizing code, simulate the following:
    *   `tsc --noEmit`: Ensure zero type errors (no `any` types).
    *   `eslint .`: Ensure no hook violations or memory leaks.
5.  **2.5D Rendering:** All sprites must use `NearestFilter` for texture scaling to maintain crisp 16-bit pixels.

---

## 🐞 Debugging
*   **Physics:** Toggle the Matter.js wireframe overlay in `Settings` to check hitboxes.
*   **Stats:** Use the **Tweakpane** overlay (`Ctrl + D`) to live-edit player stats for testing.
*   **State:** Use Redux DevTools to track Zustand state mutations in real-time.

*Will you save the Valley, or will the whispers fade into the mist?*
```
