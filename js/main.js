import * as CONFIG from './config.js';
import { state } from './state.js';
import * as utils from './utils.js';
import { ReplicatorSpecies, ReplicatorIndividual } from './classes.js';
import { FoodPellet, spawnFood } from './food.js';
import { wasteManager, terrainManager } from './wasteGrid.js';
import * as drawing from './drawing.js';

import { 
    initChart, 
    updateUI, 
    updateLeaderboards, 
    checkIndividualLeaderboards, 
    updateLeaderboardUI, 
    showLeaderboardDetails, 
    handleGraphClick,
    setupEventHandlers,
} from './ui.js';

const { Ticker } = PIXI;

export const App = {
    config: CONFIG,
    state: state,
    utils: utils,
    classes: {
        ReplicatorSpecies,
        ReplicatorIndividual,
        FoodPellet
    },
    grid: {
        waste: wasteManager,
        terrain: terrainManager
    },
    drawing: drawing,
    
    ui: {
        initChart,
        updateUI,
        updateLeaderboards,
        checkIndividualLeaderboards,
        updateLeaderboardUI,
        showLeaderboardDetails,
        handleGraphClick,
        setupEventHandlers
    },
    
    dom: {
        canvasContainer: null,
        startStopBtn: null,
        resetBtn: null,
        stepCountEl: null,
        totalPopulationEl: null,
        speciesCountEl: null,
        foodCountEl: null,
        cycleStatusEl: null, 
        speciesListContainer: null,
        stepsPerFrameSlider: null,
        stepsPerFrameValue: null,
        graphCanvas: null,
        leaderboardModal: null,
        leaderboardBtn: null,
        closeModalBtn: null,
        leaderboardList: null,
        leaderboardDetail: null,
        toggleCameraBtn: null,
        evolveBtn: null,
        evolutionPointsCountEl: null,
        evolveModal: null,
        closeEvolveModalBtn: null,
        evolveEpCountEl: null,
        evolveSpeciesNameEl: null,
        foodDropBtn: null,
        spawnAllyBtn: null,
        wasteBlightBtn: null,
    },

    simulation: {
        lastLogicTime: 0,
        logicInterval: 1000 / CONFIG.LOGIC_FPS,
        initializeSimulation() {
            console.log("Initializing simulation...");
            
            App.state.simulationRunning = false;
            App.dom.startStopBtn.textContent = 'Start';
            App.dom.startStopBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
            App.dom.startStopBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            
            if (App.state.repContainer) {
                while (App.state.repContainer.children.length > 0) {
                    App.drawing.returnRepGraphic(App.state.repContainer.children[0]);
                }
                while (App.state.foodContainer.children.length > 0) {
                    App.drawing.returnFoodGraphic(App.state.foodContainer.children[0]);
                }
                
                App.state.wasteContainer.removeChildren();
                App.state.wasteGraphics.clear();
                
                App.state.terrainContainer.removeChildren();
            }
            
            App.state.allReplicators = [];
            App.state.allSpecies = {};
            App.state.foodPellets = [];
            App.state.wasteGrid.clear(); 
            App.state.terrainGrid.clear(); 
            App.state.speciesCounter = 0;
            App.state.simulationStep = 0;
            App.state.lastGraphUpdateStep = 0;
            
            App.state.playerSpeciesId = null;
            App.state.evolutionPoints = 0;
            App.state.activeTool = 'none';
            if (App.dom.evolutionPointsCountEl) {
                App.dom.evolutionPointsCountEl.textContent = '0';
            }

            App.state.isDay = true;
            App.state.cycleTimer = 0;
            
            App.state.cameraMode = 'auto';
            App.state.isDragging = false;
            App.dom.toggleCameraBtn.textContent = 'Camera: Auto';
            
            App.state.simulationHistory = {
                labels: [],
                datasets: {},
                leaderboards: JSON.parse(JSON.stringify(App.config.LEADERBOARD_CATEGORIES_TEMPLATE))
            };
            
            App.handlers.handleResize(); 
            
            App.state.gridWidth = Math.ceil(App.state.worldWidth / App.config.GRID_CELL_SIZE);
            App.state.gridHeight = Math.ceil(App.state.worldHeight / App.config.GRID_CELL_SIZE);
            App.state.terrainGridWidth = Math.ceil(App.state.worldWidth / App.config.TERRAIN_GRID_CELL_SIZE);
            App.state.terrainGridHeight = Math.ceil(App.state.worldHeight / App.config.TERRAIN_GRID_CELL_SIZE);

            if (App.state.worldContainer) {
                App.state.worldContainer.x = App.state.pixiApp.screen.width / 2;
                App.state.worldContainer.y = App.state.pixiApp.screen.height / 2;
                App.state.worldContainer.scale.set(1.0);
            }
            App.handlers.centerCameraOn(App.state.worldWidth / 2, App.state.worldHeight / 2);

            for (let x = 0; x < App.state.terrainGridWidth; x++) {
                App.state.terrainGrid.set(`${x},0`, App.config.TERRAIN_TYPES.WALL);
                App.state.terrainGrid.set(`${x},${App.state.terrainGridHeight - 1}`, App.config.TERRAIN_TYPES.WALL);
            }
            for (let y = 1; y < App.state.terrainGridHeight - 1; y++) {
                App.state.terrainGrid.set(`0,${y}`, App.config.TERRAIN_TYPES.WALL);
                App.state.terrainGrid.set(`${App.state.terrainGridWidth - 1},${y}`, App.config.TERRAIN_TYPES.WALL);
            }
            for (let i = 0; i < 5; i++) {
                const patchX = Math.floor(Math.random() * (App.state.terrainGridWidth - 20)) + 10;
                const patchY = Math.floor(Math.random() * (App.state.terrainGridHeight - 20)) + 10;
                const patchType = [App.config.TERRAIN_TYPES.ROUGH, App.config.TERRAIN_TYPES.FERTILE, App.config.TERRAIN_TYPES.VENT][Math.floor(Math.random() * 3)];
                for (let x = patchX; x < patchX + 10; x++) {
                    for (let y = patchY; y < patchY + 10; y++) {
                        App.state.terrainGrid.set(`${x},${y}`, patchType);
                    }
                }
            }
            
            App.drawing.drawTerrain();

            for (const speciesConfig of App.config.INITIAL_SPECIES_CONFIGS) {
                const newSpecies = new App.classes.ReplicatorSpecies({ ...speciesConfig, spawnStep: 0 });
                App.state.allSpecies[newSpecies.id] = newSpecies;
                
                // --- EVOLVE GAME ---
                // Assign the first species (e.g., "Herbivore") as the player's
                if (App.state.playerSpeciesId === null) {
                    App.state.playerSpeciesId = newSpecies.id;
                    console.log(`Player species set to: ${newSpecies.name} (ID: ${newSpecies.id})`);
                }
                // --- END ---
                
                if (App.state.worldWidth > 0 && App.state.worldHeight > 0) {
                    for (let i = 0; i < App.config.STARTING_POPULATION_PER_SPECIES; i++) {
                        
                        let x, y, terrainType;
                        do {
                            x = Math.random() * (App.state.worldWidth - 40) + 20;
                            y = Math.random() * (App.state.worldHeight - 40) + 20;
                            terrainType = App.grid.terrain.getTerrainAt(x, y);
                        } while (terrainType === App.config.TERRAIN_TYPES.WALL);
                        
                        const individual = new App.classes.ReplicatorIndividual(newSpecies, x, y, App.config.INITIAL_ENERGY);
                        App.state.allReplicators.push(individual);
                    }
                }
            }
            
            if (App.state.worldWidth > 0 && App.state.worldHeight > 0) {
                for (let i = 0; i < App.config.MAX_FOOD / 2; i++) {
                    let x, y, terrainType;
                    do {
                        x = Math.random() * (App.state.worldWidth - 40) + 20;
                        y = Math.random() * (App.state.worldHeight - 40) + 20;
                        terrainType = App.grid.terrain.getTerrainAt(x, y);
                    } while (terrainType === App.config.TERRAIN_TYPES.WALL);

                    App.simulation.spawnFood(x, y);
                }
            }

            App.ui.initChart();
            App.ui.updateLeaderboardUI();
            App.ui.updateUI();
            
            App.simulation.lastLogicTime = performance.now();
        },

        spawnFood, 

        runSimulationStep() {
            const REP_GRID_CELL_SIZE = App.config.REP_GRID_CELL_SIZE;

            if (App.state.allReplicators.length === 0) {
                if (App.state.simulationRunning) App.handlers.toggleSimulation(); 
                console.log("Simulation ended: All replicators are dead.");
                App.ui.updateLeaderboards();
                App.ui.updateLeaderboardUI();
                return;
            }
            
            App.state.simulationStep++;

            // --- EVOLVE GAME: Passive EP Gain ---
            const playerSpecies = App.state.allSpecies[App.state.playerSpeciesId];
            if (playerSpecies && playerSpecies.population > 0 && App.state.simulationStep % 100 === 0) {
                 App.state.evolutionPoints += 1;
            }
            // --- END ---

            App.state.cycleTimer++;
            if (App.state.cycleTimer >= App.config.CYCLE_LENGTH) {
                App.state.cycleTimer = 0;
                App.state.isDay = !App.state.isDay;
            }

            const foodSpawnChance = App.state.isDay 
                ? App.config.FOOD_SPAWN_RATE 
                : App.config.FOOD_SPAWN_RATE * App.config.NIGHT_FOOD_SPAWN_MULTIPLIER;
            
            const x = Math.random() * (App.state.worldWidth - 40) + 20;
            const y = Math.random() * (App.state.worldHeight - 40) + 20;
            
            const terrainType = App.grid.terrain.getTerrainAt(x, y);

            if (terrainType !== App.config.TERRAIN_TYPES.WALL) {
                let finalFoodSpawnChance = foodSpawnChance;
                
                if (terrainType === App.config.TERRAIN_TYPES.FERTILE) {
                    finalFoodSpawnChance += App.config.FERTILE_SPAWN_BONUS;
                }

                if (Math.random() < finalFoodSpawnChance) {
                    App.simulation.spawnFood(x, y);
                }
            }
            
            App.grid.waste.updateWasteGrid();
            
            App.utils.shuffleArray(App.state.allReplicators);

            App.state.repGrid.clear();
            for (const rep of App.state.allReplicators) {
                if (!rep.isAlive) continue;
                const gridX = Math.floor(rep.x / REP_GRID_CELL_SIZE);
                const gridY = Math.floor(rep.y / REP_GRID_CELL_SIZE);
                const key = `${gridX},${gridY}`;
                if (!App.state.repGrid.has(key)) {
                    App.state.repGrid.set(key, []);
                }
                App.state.repGrid.get(key).push(rep);
            }
            
            const deadRepsThisStep = [];
            
            for (const rep of App.state.allReplicators) {
                if (rep.isAlive) {
                    rep.updateState(); 
                }
            }
            
            for (const rep of App.state.allReplicators) {
                if (rep.isAlive) {
                    rep.move(); 
                }
            }
            
            const allReps = App.state.allReplicators;
            
            for (const rep of allReps) {
                if (!rep.isAlive) continue;

                if (rep.state === 'EATING') {
                    rep.eat(); 
                }

                const gridX = Math.floor(rep.x / REP_GRID_CELL_SIZE);
                const gridY = Math.floor(rep.y / REP_GRID_CELL_SIZE);

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${gridX + dx},${gridY + dy}`;
                        if (!App.state.repGrid.has(key)) continue;

                        for (const other of App.state.repGrid.get(key)) {
                            if (rep.id <= other.id || !other.isAlive) continue;

                            const interactionDist = (rep.species.size / 2) + (other.species.size / 2);
                            const distSq = App.utils.getDistanceSq(rep.x, rep.y, other.x, other.y);

                            if (distSq < (interactionDist * interactionDist)) {
                                rep.interactWith(other);
                                if (!rep.isAlive) break;
                            }
                        }
                        if (!rep.isAlive) break;
                    }
                    if (!rep.isAlive) break;
                }
            }

            const survivingReps = [];
            for (const rep of App.state.allReplicators) {
                if (rep.isAlive) {
                    survivingReps.push(rep);
                } else {
                    deadRepsThisStep.push(rep);
                }
            }
            App.state.allReplicators = survivingReps;

            const survivingFood = [];
            for (const food of App.state.foodPellets) {
                if (!food.isEaten) {
                    survivingFood.push(food);
                }
            }
            App.state.foodPellets = survivingFood;

            for (const rep of deadRepsThisStep) {
                App.ui.checkIndividualLeaderboards(rep);
                
                if (rep.pixiObject) {
                    App.drawing.returnRepGraphic(rep.pixiObject);
                    rep.pixiObject = null;
                }
            }

            App.state.allReplicators.push(...App.state.newBirths);
            App.state.newBirths = [];
            
            const activeSpeciesIds = new Set(App.state.allReplicators.map(r => r.species.id));
            const allSpeciesIds = Object.keys(App.state.allSpecies).map(id => parseInt(id, 10));
            
            for (const id of allSpeciesIds) {
                if (App.state.allSpecies[id] && !activeSpeciesIds.has(id)) {
                    if (App.state.allSpecies[id].extinctionStep === -1) {
                         App.state.allSpecies[id].extinctionStep = App.state.simulationStep;

                         // --- EVOLVE GAME: LOSE CONDITION ---
                         if (id === App.state.playerSpeciesId && App.state.simulationRunning) {
                            console.log("--- GAME OVER: Your species was eradicated! ---");
                            // In a real app, you'd show a modal.
                            App.handlers.toggleSimulation();
                         }
                         // --- END ---
                    }
                }
            }

            // --- EVOLVE GAME: WIN CONDITION ---
            if (App.state.simulationRunning && App.state.playerSpeciesId !== null) {
                const playerSpecies = App.state.allSpecies[App.state.playerSpeciesId];
                const totalPopulation = App.state.allReplicators.length;

                if (playerSpecies && playerSpecies.population > 0 && totalPopulation > 0) {
                    const playerDominance = playerSpecies.population / totalPopulation;
                    
                    if (playerDominance >= 0.98) {
                        console.log(`--- VICTORY: Your species is ${(playerDominance * 100).toFixed(0)}% dominant! ---`);
                        // In a real app, you'd show a modal.
                        App.handlers.toggleSimulation();
                    }
                }
            }
            // --- END ---
        },
        logicLoop(timestamp) {
            requestAnimationFrame(App.simulation.logicLoop);

            const now = timestamp || performance.now();
            const elapsed = now - App.simulation.lastLogicTime;

            if (App.state.simulationRunning && elapsed >= App.simulation.logicInterval) {
                App.simulation.lastLogicTime = now - (elapsed % App.simulation.logicInterval);
                
                for (let i = 0; i < App.state.stepsPerFrame; i++) {
                    App.simulation.runSimulationStep();
                }

                if (App.state.cameraMode === 'auto' && App.state.allReplicators.length > 0) {
                    let avgX = 0, avgY = 0;
                    for (const rep of App.state.allReplicators) {
                        avgX += rep.x;
                        avgY += rep.y;
                    }
                    avgX /= App.state.allReplicators.length;
                    avgY /= App.state.allReplicators.length;

                    const { worldContainer, pixiApp } = App.state;
                    const scale = worldContainer.scale.x;
                    const targetX = (pixiApp.screen.width / 2) - (avgX * scale);
                    const targetY = (pixiApp.screen.height / 2) - (avgY * scale);

                    worldContainer.x += (targetX - worldContainer.x) * 0.05;
                    worldContainer.y += (targetY - worldContainer.y) * 0.05;
                    
                    App.handlers.clampCamera(); 
                }

                if (App.state.simulationStep >= App.state.lastGraphUpdateStep + App.config.GRAPH_UPDATE_INTERVAL) {
                    App.state.lastGraphUpdateStep = App.state.simulationStep; 
                    App.ui.updateUI(); 
                }
            }
        }
    },

    handlers: {
        toggleSimulation() {
            App.state.simulationRunning = !App.state.simulationRunning;
            if (App.state.simulationRunning) {
                App.dom.startStopBtn.textContent = 'Pause';
                App.dom.startStopBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                App.dom.startStopBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
                console.log("Simulation started");
            } else {
                App.dom.startStopBtn.textContent = 'Start';
                App.dom.startStopBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
                App.dom.startStopBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                App.ui.updateLeaderboards();
                App.ui.updateLeaderboardUI();
                console.log("Simulation paused");
            }
        },

        resetSimulation() {
            App.state.simulationRunning = false;
            console.log("Resetting simulation...");
            App.state.activeTool = 'none';
            App.simulation.initializeSimulation();
        },

        handleGraphClick(evt) { 
             App.ui.handleGraphClick(evt);
        },
        
        handleResize() {
            if (!App.dom.canvasContainer || !App.state.pixiApp) return;
            try {
                const { width, height } = App.dom.canvasContainer.getBoundingClientRect();
                if (width === 0 || height === 0) return;
                
                App.drawing.resizePixi(width, height);
                App.handlers.clampCamera();
                
            } catch (e) {
                // This catch block will prevent the ResizeObserver error from firing
            }
        },
        
        /** Helper to convert screen space to world space */
        getMouseWorldPos(globalPos) {
            return App.state.worldContainer.toLocal(globalPos);
        },

        /** Center the camera on a specific world coordinate */
        centerCameraOn(worldX, worldY) {
            const { worldContainer, pixiApp } = App.state;
            if (!worldContainer) return;
            const scale = worldContainer.scale.x;
            
            worldContainer.x = (pixiApp.screen.width / 2) - (worldX * scale);
            worldContainer.y = (pixiApp.screen.height / 2) - (worldY * scale);
            
            App.handlers.clampCamera();
        },

        /** Clamps the camera view to the world boundaries. */
        clampCamera() {
            const { worldContainer, worldWidth, worldHeight, pixiApp } = App.state;
            if (!worldContainer) return;
            
            const scale = worldContainer.scale.x;
            const screenWidth = pixiApp.screen.width;
            const screenHeight = pixiApp.screen.height;

            worldContainer.x = Math.min(screenWidth * 0.8, worldContainer.x);
            worldContainer.x = Math.max(screenWidth * 0.2 - worldWidth * scale, worldContainer.x);

            worldContainer.y = Math.min(screenHeight * 0.8, worldContainer.y);
            worldContainer.y = Math.max(screenHeight * 0.2 - worldHeight * scale, worldContainer.y);
        },
        
        /** Toggles camera between 'auto' and 'manual' modes. */
        toggleCameraMode() {
            if (App.state.cameraMode === 'auto') {
                App.state.cameraMode = 'manual';
                App.dom.toggleCameraBtn.textContent = 'Camera: Manual';
            } else {
                App.state.cameraMode = 'auto';
                App.dom.toggleCameraBtn.textContent = 'Camera: Auto';
            }
        },

        /** Handles mouse down for panning. */
        handleMouseDown(e) {
            if (e.originalEvent.button !== 0) return;

            if (App.state.activeTool !== 'none') {
                const worldPos = App.handlers.getMouseWorldPos(e.global);
                App.handlers.useActiveTool(worldPos);
                return; // Don't start panning
            }

            App.state.isDragging = true;
            App.state.lastMousePos = { x: e.global.x, y: e.global.y };
            
            if (App.state.cameraMode === 'auto') {
                App.state.cameraMode = 'manual';
                App.dom.toggleCameraBtn.textContent = 'Camera: Manual';
            }
        },

        /** Handles mouse up/leave to stop panning. */
        handleMouseUp(e) {
            App.state.isDragging = false;
        },

        /** Handles mouse move for panning. */
        handleMouseMove(e) {
            if (!App.state.isDragging) return;
            
            const dx = e.global.x - App.state.lastMousePos.x;
            const dy = e.global.y - App.state.lastMousePos.y;
            App.state.lastMousePos = { x: e.global.x, y: e.global.y };
            
            App.state.worldContainer.x += dx;
            App.state.worldContainer.y += dy;
            
            App.handlers.clampCamera();
        },

        /** Handles mouse wheel for zooming (zooms to cursor). */
        handleWheel(e) {
            e.preventDefault();
            
            if (App.state.cameraMode === 'auto') {
                App.state.cameraMode = 'manual';
                App.dom.toggleCameraBtn.textContent = 'Camera: Manual';
            }

            const { worldContainer, pixiApp } = App.state;
            
            const rect = pixiApp.view.getBoundingClientRect();
            
            const rendererScreenPos = new PIXI.Point(
                (e.clientX - rect.left) * pixiApp.renderer.resolution, 
                (e.clientY - rect.top) * pixiApp.renderer.resolution
            );

            const worldPos = worldContainer.toLocal(rendererScreenPos);

            const zoomAmount = e.deltaY * App.config.ZOOM_SENSITIVITY;
            let newZoom = worldContainer.scale.x - zoomAmount;
            newZoom = App.utils.clamp(newZoom, App.config.MIN_ZOOM, App.config.MAX_ZOOM);

            worldContainer.scale.set(newZoom);

            const newRendererScreenPos = worldContainer.toGlobal(worldPos);

            worldContainer.x += rendererScreenPos.x - newRendererScreenPos.x;
            worldContainer.y += rendererScreenPos.y - newRendererScreenPos.y;

            App.handlers.clampCamera();
        },

        // --- EVOLVE GAME HANDLERS ---
        
        /**
         * Calculates the EP cost to upgrade a specific trait.
         */
        getTraitUpgradeCost(trait, currentValue) {
            switch(trait) {
                case 'replicationRate': return Math.floor(currentValue * 30) + 10;
                case 'deathRate':       return Math.floor((1 - currentValue) * 30) + 10; // Cost to *lower* drain
                case 'mutationRate':    return Math.floor(currentValue * 20) + 5; // Cost to *increase* random mutation
                case 'attack':          return Math.floor(currentValue * 20) + 5;
                case 'defense':         return Math.floor(currentValue * 20) + 5;
                case 'stealth':         return Math.floor(currentValue * 20) + 5;
                case 'maxEnergy':       return Math.floor(currentValue / 10) + 5;
                case 'size':            return Math.floor(currentValue * 5) + 5;
                case 'lifespan':        return Math.floor(currentValue / 100) + 5;
                case 'wasteTolerance':  return Math.floor(currentValue * 25) + 10;
                case 'diet':            return Math.floor(currentValue * 30) + 15; // Cost to become more carnivorous
                case 'perception':      return Math.floor(currentValue / 5) + 5;
                case 'speed':           return Math.floor(currentValue * 10) + 5;
                default: return 999;
            }
        },
        handleToolSelect(toolName) {
            if (App.state.activeTool === toolName) {
                // Toggle off
                App.state.activeTool = 'none';
                document.querySelector(`[data-tool="${toolName}"]`).classList.remove('tool-active');
                return;
            }

            // Check cost
            let cost = 0;
            switch(toolName) {
                case 'food':   cost = App.config.POWER_COST_FOOD_DROP; break;
                case 'spawn':  cost = App.config.POWER_COST_SPAWN_ALLY; break;
                case 'blight': cost = App.config.POWER_COST_WASTE_BLIGHT; break;
            }

            if (App.state.evolutionPoints < cost) {
                App.state.activeTool = 'none'; // Ensure it's off
                return; // Can't afford
            }

            // Deactivate all other tools
            App.state.activeTool = toolName;
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('tool-active');
            });
            // Activate the new one
            document.querySelector(`[data-tool="${toolName}"]`).classList.add('tool-active');
        },
        /**
         * Executes the currently armed tool at the given world position.
         */
        useActiveTool(worldPos) {
            let cost = 0;
            const tool = App.state.activeTool;

            switch(tool) {
                case 'food':
                    cost = App.config.POWER_COST_FOOD_DROP;
                    if (App.state.evolutionPoints < cost) break;
                    
                    App.state.evolutionPoints -= cost;
                    for (let i = 0; i < 10; i++) {
                        const x = worldPos.x + (Math.random() - 0.5) * 30;
                        const y = worldPos.y + (Math.random() - 0.5) * 30;
                        if (App.grid.terrain.getTerrainAt(x, y) !== App.config.TERRAIN_TYPES.WALL) {
                            App.simulation.spawnFood(x, y);
                        }
                    }
                    console.log("Used Food Drop");
                    break;

                case 'spawn':
                    cost = App.config.POWER_COST_SPAWN_ALLY;
                    const playerSpecies = App.state.allSpecies[App.state.playerSpeciesId];
                    if (App.state.evolutionPoints < cost || !playerSpecies) break;
                    
                    if (App.grid.terrain.getTerrainAt(worldPos.x, worldPos.y) === App.config.TERRAIN_TYPES.WALL) break;

                    App.state.evolutionPoints -= cost;
                    const individual = new App.classes.ReplicatorIndividual(playerSpecies, worldPos.x, worldPos.y, App.config.INITIAL_ENERGY);
                    
                    App.state.newBirths.push(individual);
                    console.log("Used Spawn Ally");
                    break;
                
                case 'blight':
                    cost = App.config.POWER_COST_WASTE_BLIGHT;
                    if (App.state.evolutionPoints < cost) break;

                    if (App.grid.terrain.getTerrainAt(worldPos.x, worldPos.y) === App.config.TERRAIN_TYPES.WALL) break;

                    App.state.evolutionPoints -= cost;
                    for (let i = -2; i <= 2; i++) {
                        for (let j = -2; j <= 2; j++) {
                            const x = worldPos.x + (i * App.config.GRID_CELL_SIZE);
                            const y = worldPos.y + (j * App.config.GRID_CELL_SIZE);
                            App.grid.waste.addWaste(x, y, 20); // Add a large amount of waste
                        }
                    }
                    console.log("Used Waste Blight");
                    break;
            }

            App.state.activeTool = 'none';
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('tool-active');
            });
            App.ui.updateActiveToolUI(); // Re-check disabled states
        },
        /**
         * Updates the "Evolve" modal with current species stats and costs.
         */
        updateEvolveModalUI() {
            const playerSpecies = App.state.allSpecies[App.state.playerSpeciesId];
            if (!playerSpecies) return;

            App.dom.evolveSpeciesNameEl.textContent = playerSpecies.name;
            const currentEP = Math.floor(App.state.evolutionPoints);
            App.dom.evolveEpCountEl.textContent = currentEP.toLocaleString();
            
            const traits = [
                'replicationRate', 'deathRate', 'mutationRate', 'attack', 'defense', 'stealth',
                'maxEnergy', 'size', 'lifespan', 'wasteTolerance', 'diet', 'perception', 'speed'
            ];

            for (const trait of traits) {
                const value = playerSpecies[trait];
                const cost = App.handlers.getTraitUpgradeCost(trait, value);
                
                let valueStr;
                if (value < 10) valueStr = value.toFixed(2);
                else if (value < 100) valueStr = value.toFixed(1);
                else valueStr = Math.floor(value).toLocaleString();
                
                document.getElementById(`evolve-${trait}-val`).textContent = valueStr;
                const costEl = document.getElementById(`evolve-${trait}-cost`);
                const btnEl = costEl.parentElement;

                costEl.textContent = `(${cost} EP)`;
                
                if (currentEP < cost) {
                    btnEl.disabled = true;
                    btnEl.classList.remove('bg-green-600', 'hover:bg-green-700');
                    btnEl.classList.add('bg-gray-500', 'cursor-not-allowed');
                } else {
                    btnEl.disabled = false;
                    btnEl.classList.add('bg-green-600', 'hover:bg-green-700');
                    btnEl.classList.remove('bg-gray-500', 'cursor-not-allowed');
                }
            }
            
            // Special case: make "Drain" button red (it's a "bad" thing to upgrade)
            const drainBtn = document.querySelector('[data-trait="deathRate"]');
            if (drainBtn.disabled) {
                drainBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            } else {
                 drainBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                 drainBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            }
        },

        /**
         * Opens the Evolve modal and pauses the game.
         */
        openEvolveModal() {
            if (App.state.simulationRunning) {
                App.handlers.toggleSimulation();
            }
            App.handlers.updateEvolveModalUI();
            App.dom.evolveModal.classList.remove('hidden');
        },

        /**
         * Closes the Evolve modal.
         */
        closeEvolveModal() {
            App.dom.evolveModal.classList.add('hidden');
        },

        /**
         * The core logic for spending EP to upgrade a trait.
         */
        upgradePlayerTrait(trait) {
            const playerSpecies = App.state.allSpecies[App.state.playerSpeciesId];
            if (!playerSpecies) return;

            const currentValue = playerSpecies[trait];
            const cost = App.handlers.getTraitUpgradeCost(trait, currentValue);

            if (App.state.evolutionPoints < cost) return;

            App.state.evolutionPoints -= cost;
            
            // Apply upgrade
            switch (trait) {
                case 'replicationRate': playerSpecies.replicationRate = App.utils.clamp(playerSpecies.replicationRate + 0.05, 0.1, 5.0); break;
                case 'deathRate':       playerSpecies.deathRate = App.utils.clamp(playerSpecies.deathRate - 0.005, 0.001, 1.0); break; // Gets *lower*
                case 'mutationRate':    playerSpecies.mutationRate = App.utils.clamp(playerSpecies.mutationRate + 0.05, 0.0, 1.0); break;
                case 'attack':          playerSpecies.attack = App.utils.clamp(playerSpecies.attack + 0.05, 0, 1.0); break;
                case 'defense':         playerSpecies.defense = App.utils.clamp(playerSpecies.defense + 0.05, 0, 1.0); break;
                case 'stealth':         playerSpecies.stealth = App.utils.clamp(playerSpecies.stealth + 0.05, 0, 1.0); break;
                case 'maxEnergy':       playerSpecies.maxEnergy = Math.max(20, playerSpecies.maxEnergy + 10); break;
                case 'size':            playerSpecies.size = App.utils.clamp(playerSpecies.size + 0.2, 2, 10); break;
                case 'lifespan':        playerSpecies.lifespan = Math.max(500, playerSpecies.lifespan + 100); break;
                case 'wasteTolerance':  playerSpecies.wasteTolerance = App.utils.clamp(playerSpecies.wasteTolerance + 0.02, 0.0, 1.0); break;
                case 'diet':            playerSpecies.diet = App.utils.clamp(playerSpecies.diet + 0.05, 0.0, 1.0); break;
                case 'perception':      playerSpecies.perception = Math.max(20, playerSpecies.perception + 5); break;
                case 'speed':           playerSpecies.speed = App.utils.clamp(playerSpecies.speed + 0.1, 1.0, 5.0); break;
            }
            
            // Re-balance combat stats
            if (['attack', 'defense', 'stealth'].includes(trait)) {
                const combatBudget = 1.0;
                const totalCombat = playerSpecies.attack + playerSpecies.defense + playerSpecies.stealth;
                if (totalCombat > combatBudget) {
                    const ratio = combatBudget / totalCombat;
                    playerSpecies.attack = App.utils.clamp(playerSpecies.attack * ratio, 0, 1.0);
                    playerSpecies.defense = App.utils.clamp(playerSpecies.defense * ratio, 0, 1.0);
                    playerSpecies.stealth = App.utils.clamp(playerSpecies.stealth * ratio, 0, 1.0);
                }
            }
            
            // Refresh the modal UI
            App.handlers.updateEvolveModalUI();
            // Refresh the main UI
            App.ui.updateUI();
        }
        // --- END EVOLVE HANDLERS ---
    },

    init() {
        this.dom.canvasContainer = document.getElementById('canvas-container');
        this.dom.startStopBtn = document.getElementById('startStopBtn');
        this.dom.resetBtn = document.getElementById('resetBtn');
        this.dom.stepCountEl = document.getElementById('stepCount');
        this.dom.totalPopulationEl = document.getElementById('totalPopulation');
        this.dom.speciesCountEl = document.getElementById('speciesCount');
        this.dom.foodCountEl = document.getElementById('foodCount');
        this.dom.cycleStatusEl = document.getElementById('cycleStatus'); 
        this.dom.speciesListContainer = document.getElementById('speciesListContainer');
        this.dom.stepsPerFrameSlider = document.getElementById('stepsPerFrame');
        this.dom.stepsPerFrameValue = document.getElementById('stepsPerFrameValue');
        this.dom.graphCanvas = document.getElementById('populationGraph');
        this.dom.leaderboardModal = document.getElementById('leaderboardModal');
        this.dom.leaderboardBtn = document.getElementById('leaderboardBtn'); 
        this.dom.closeModalBtn = document.getElementById('closeModalBtn');
        this.dom.leaderboardList = document.getElementById('leaderboardList');
        this.dom.leaderboardDetail = document.getElementById('leaderboardDetail');
        this.dom.tabLeaderboard = document.getElementById('tabLeaderboard');
        this.dom.tabSpeciesHistory = document.getElementById('tabSpeciesHistory');
        this.dom.leaderboardContent = document.getElementById('leaderboardContent');
        this.dom.speciesHistoryContent = document.getElementById('speciesHistoryContent');
        this.dom.speciesHistoryList = document.getElementById('speciesHistoryList');
        this.dom.speciesHistoryDetail = document.getElementById('speciesHistoryDetail');
        this.dom.toggleCameraBtn = document.getElementById('toggleCameraBtn'); 
        this.dom.evolveBtn = document.getElementById('evolveBtn');
        this.dom.evolutionPointsCountEl = document.getElementById('evolutionPointsCount');
        this.dom.evolveModal = document.getElementById('evolveModal');
        this.dom.closeEvolveModalBtn = document.getElementById('closeEvolveModalBtn');
        this.dom.evolveEpCountEl = document.getElementById('evolveEpCount');
        this.dom.evolveSpeciesNameEl = document.getElementById('evolveSpeciesName');
        this.dom.foodDropBtn = document.getElementById('foodDropBtn');
        this.dom.spawnAllyBtn = document.getElementById('spawnAllyBtn');
        this.dom.wasteBlightBtn = document.getElementById('wasteBlightBtn');
        this.dom.foodDropCost = document.getElementById('foodDropCost');
        this.dom.spawnAllyCost = document.getElementById('spawnAllyCost');
        this.dom.wasteBlightCost = document.getElementById('wasteBlightCost');
        
        // Set cost text from config
        this.dom.foodDropCost.textContent = App.config.POWER_COST_FOOD_DROP;
        this.dom.spawnAllyCost.textContent = App.config.POWER_COST_SPAWN_ALLY;
        this.dom.wasteBlightCost.textContent = App.config.POWER_COST_WASTE_BLIGHT;

        this.drawing.initPixi(this.dom.canvasContainer);
        
        this.ui.setupEventHandlers();
        
        this.dom.stepsPerFrameValue.textContent = this.dom.stepsPerFrameSlider.value;
        this.state.stepsPerFrame = parseInt(this.dom.stepsPerFrameSlider.value, 10);

        requestAnimationFrame(() => {
             this.handlers.handleResize(); 
             this.simulation.initializeSimulation();
        });
        
        App.state.pixiApp.ticker.add((delta) => {
            App.drawing.updateGraphics(); 
        });
        
        requestAnimationFrame(this.simulation.logicLoop);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});