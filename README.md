# 🧬 Cell Life: An Artificial Life Simulation

Cell Life is a browser-based artificial life simulation that models populations of "replicators." These individuals live, eat, reproduce, and evolve in a dynamic world. Watch as species compete for resources, adapt to environmental pressures, and fight for survival.

This project is built entirely in vanilla JavaScript (ES6 Modules) and rendered with Pixi.js for high performance.

## Features

* **Evolving Traits:** Replicators have a "genome" with 13 distinct traits, including `diet` (herbivore to carnivore), `attack`, `defense`, `speed`, `perception`, and `wasteTolerance`.
* **Complex AI:** Individuals make decisions based on their state (`WANDERING`, `EATING`, `HUNTING`, `FLEEING`) and what they can perceive in their environment.
* **Spatial Hashing:** Optimized AI and interaction (combat, eating) using spatial hash grids for both food and replicators, allowing for thousands of units.
* **Dynamic Environment:**
    * **Day/Night Cycle:** Affects visibility, stealth, energy drain, and food spawning.
    * **Terrain:** Includes `WALLS`, `ROUGH` terrain (slows units), `FERTILE` (spawns more food), and `VENTS` (clears waste faster).
    * **Pollution:** Replicators produce waste, which damages them based on their tolerance. Waste diffuses and evaporates over time.
* **High-Performance Rendering:** Uses **Pixi.js** with object pooling (`Graphics` objects) to render thousands of units with minimal performance impact.
* **Data Visualization:** A live-updating **Chart.js** graph shows population changes for the top species over time.
* **Detailed Stats:** A comprehensive UI tracks global stats, top species, and a detailed "History" modal with leaderboards and a full species genealogy.
* **Camera Controls:** A smooth, interactive camera allows you to pan (click + drag) and zoom (scroll wheel) to explore the 3000x3000px world.

## How to Run

This project uses no build tools or local dependencies. You can run it directly from the filesystem, but **the recommended way is to use a simple local server** to avoid potential issues with ES6 module loading.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/larrythemobster/Cell-Life.git](https://github.com/larrythemobster/Cell-Life.git)
    cd Cell-Life
    ```

2.  **Start a local server:**
    If you have Python 3, run:
    ```bash
    python -m http.server
    ```
    If you have Node.js, you can use `http-server`:
    ```bash
    npx http-server
    ```

3.  **Open in your browser:**
    Navigate to `http://localhost:8000` (or the URL provided by your server).

## Controls

* **Start / Pause:** Toggles the simulation logic.
* **Reset:** Restarts the simulation with a new, random world.
* **View History:** Opens a modal with leaderboards (e.g., "Most Kills," "Longest Lived") and a complete history of all extinct and living species.
* **Camera: Auto / Manual:** Toggles the camera. `Auto` follows the center-of-mass of the population. `Manual` allows you to control it.
* **Steps per Frame:** Adjusts how many simulation steps are run per rendered frame (a simple speed control).
* **Pan:** Click and drag the left mouse button.
* **Zoom:** Use the mouse scroll wheel.

## Technology Stack

* **Core Logic:** Vanilla JavaScript (ES6 Modules)
* **Rendering:** [Pixi.js](https://pixijs.com/) (via CDN)
* **UI/Data:** [Chart.js](https://www.chartjs.org/) (via CDN)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN)