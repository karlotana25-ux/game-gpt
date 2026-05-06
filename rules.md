## AI Development Directives: 2.5D RPG Project

To ensure the highest quality of development for this WebGL/React Three Fiber RPG, I (and any AI agent working on this codebase) must strictly adhere to the following operational ruleset. 

---

### Rule 1: Strict Anti-Laziness Protocol (Complete Code Only)
*   **No Placeholders:** Never use comments like `// ... rest of the code remains the same` or `// Add logic here`. Every code block provided must be complete, fully functional, and ready to be copy-pasted into the project.
*   **Contextual Awareness:** When modifying an existing file, output the entirety of the necessary changes. If a function is updated, provide the full function, not just the modified lines.
*   **Thorough Implementation:** If a feature requires updates across multiple files (e.g., adding a new stat requires updating the Zustand store, the UI component, and the combat logic), provide the updates for all affected files in a single response.

### Rule 2: Zero Regression & Backwards Compatibility
*   **Non-Destructive Modifications:** Every change must guarantee that existing features, state schemas, and rendering pipelines remain intact. Do not rename existing variables or alter existing API signatures unless explicitly instructed to perform a refactor.
*   **Graceful Fallbacks:** When adding new properties to the Zustand state or save files, include default values or null-checks to ensure older save data or previous implementations do not crash the game.
*   **Component Isolation:** UI additions must not interfere with the React Three Fiber canvas. Changes to the 3D scene must not break the 2D DOM overlays.

### Rule 3: Future-Proofing & Scalability
*   **Strict Separation of Concerns:** Maintain a hard boundary between Game Logic (Math/Stats), Physics (Matter.js), Rendering (Three.js/R3F), and UI (React DOM). 
*   **Modular Architecture:** Build systems as independent modules. For example, the `CombatEngine` should accept generic attacker and defender objects, making it agnostic to whether it is processing a Player vs. Boss or a future Monster vs. Monster scenario.
*   **Data-Driven Design:** Hardcode as little as possible. Keep class base stats, room prices, and item attributes in centralized configuration dictionaries or JSON structures to allow for easy balancing later.

### Rule 4: Mandatory Double-Check Validation
*   **Mental Compilation:** Before generating output, verify that the code imports all necessary hooks (e.g., `useFrame`, `useStore`, `useEffect`) and libraries.
*   **Dependency Verification:** Ensure that R3F components are strictly rendered inside the `<Canvas>` and standard HTML is kept outside.
*   **Physics/Render Sync:** Verify that Three.js visual coordinates are correctly mapped to Matter.js physics coordinates, accounting for differences in origin points (e.g., center vs. top-left).

---

### Rule 5: Project-Specific Error Checking & Debugging

**Handling WebGL & Render Errors:**
*   **React Error Boundaries:** Wrap the `<Canvas>` and major UI components in strict React Error Boundaries. If a custom shader or sprite fails, it should log a fallback UI rather than white-screening the entire browser.
*   **Visual Debugging:** Utilize `Tweakpane` to expose rendering variables (camera position, zoom, bloom threshold) and `useHelper` from `@react-three/drei` for visualizing hitboxes, lights, and camera frustums during development.

**Handling Physics (Matter.js) Desyncs:**
*   **Wireframe Overlay:** Implement a toggleable Matter.js debug renderer (using standard HTML Canvas over the R3F Canvas) to visually verify that the invisible physics bodies align perfectly with the Three.js sprites.
*   **Loop Logging:** Never put `console.log` inside `useFrame` or the Matter.js engine update loop. Instead, log state snapshots based on discrete events (e.g., on collision start, on attack command).

**Handling State (Zustand) Issues:**
*   **Middleware Tracking:** Apply the `devtools` middleware to the Zustand store. This allows developers to use the Redux DevTools extension to time-travel and track exactly when HP, Mana, or Party unlocks mutate.
*   **Type Safety Validations:** Enforce strict prop types or TypeScript interfaces (if used) for the `PartyManager` payload. Whenever a boss dies, validate the generated party member object against a schema before pushing it to the active roster array.</Canvas></Canvas>

This is a vital addition. Relying on "mental compilation" is good, but automated static analysis is the only way to ensure the AI doesn't hallucinate property names or overlook type mismatches in a complex 3D engine.

---

### Rule 6: Mandatory Static Analysis & Validation (CI/CD for AI)

Before any code is finalized or presented, it must pass a "Pre-Flight Check" to ensure it is syntactically sound and type-safe.

*   **TypeScript Compiler (`tsc`):**
    *   The AI must virtually "run" `tsc --noEmit` on the generated code. 
    *   **Rule:** No `any` types allowed. Every Three.js object, Matter.js body, and Zustand state slice must have a defined Interface or Type.
    *   **Verification:** Ensure that props passed to R3F components (like `position`, `rotation`) conform to `Vector3` or `Euler` types to prevent runtime "undefined" crashes.
*   **ESLint Integration:**
    *   **Command:** The AI should simulate an `eslint . --ext .js,.jsx,.ts,.tsx` run.
    *   **Focus Areas:** Check for unused variables, missing dependency arrays in `useEffect` or `useMemo`, and illegal hook placements (e.g., calling hooks inside loops or conditional logic).
    *   **Strict R3F Rules:** Adhere to `eslint-plugin-react-hooks` to ensure the frame-loop (`useFrame`) doesn't create memory leaks or redundant state updates.
*   **Automated Correction:**
    *   If a `tsc` error occurs (e.g., "Property 'agility' does not exist on type 'Enemy'"), the AI must immediately identify the source of the missing definition, update the central Type file, and re-validate the code before outputting it to the user.

---

### Operational Flow for Code Generation

When generating new features (e.g., the Tavern Healing system), the AI will follow this internal loop:
1.  **Draft Logic:** Write the React/Three.js components.
2.  **Stat Check:** Run `tsc` check against the `Zustand` store schema.
3.  **Linter Check:** Verify no hooks are misused.
4.  **Final Polish:** Add `Tweakpane` debug controls for the new feature.
5.  **Output:** Present the finalized, validated code block.</Canvas>