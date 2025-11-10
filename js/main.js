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
            App.state.newBirths = []; 

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
            
            const activeSpeciesIds = new Set(App.state.allReplicators.map(r => r.species.id));
            const allSpeciesIds = Object.keys(App.state.allSpecies).map(id => parseInt(id, 10));
            
            for (const id of allSpeciesIds) {
                if (App.state.allSpecies[id] && !activeSpeciesIds.has(id)) {
                    if (App.state.allSpecies[id].extinctionStep === -1) {
                         App.state.allSpecies[id].extinctionStep = App.state.simulationStep;
                    }
                }
            }
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
        getMouseWorldPos(e) {
            return App.state.worldContainer.toLocal(e.global);
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
        }
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