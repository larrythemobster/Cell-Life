import * as CONFIG from './config.js';

export const state = {
    allReplicators: [],
    allSpecies: {},
    foodPellets: [],
    wasteGrid: new Map(),
    wasteGridBuffer: new Map(),
    terrainGrid: new Map(),

    repGrid: new Map(),
    foodGrid: new Map(),

    simulationRunning: false,
    simulationFrameId: null,
    simulationStep: 0,
    speciesCounter: 0,
    stepsPerFrame: CONFIG.STEPS_PER_FRAME_DEFAULT,
    
    newBirths: [],

    gridWidth: 0,
    gridHeight: 0,
    terrainGridWidth: 0,
    terrainGridHeight: 0,

    worldWidth: CONFIG.WORLD_WIDTH,
    worldHeight: CONFIG.WORLD_HEIGHT,
    
    pixiApp: null,
    worldContainer: null,
    terrainContainer: null,
    wasteContainer: null,
    foodContainer: null,
    repContainer: null,
    nightOverlay: null,
    wasteGraphics: new Map(),
    foodGrid: new Map(),
    repGraphicsPool: [],
    foodGraphicsPool: [],

    cameraMode: 'auto',
    isDragging: false,
    lastMousePos: { x: 0, y: 0 },
    
    isDay: true,
    cycleTimer: 0,

    populationChart: null,
    simulationHistory: {
        labels: [],
        datasets: {},
        leaderboards: JSON.parse(JSON.stringify(CONFIG.LEADERBOARD_CATEGORIES_TEMPLATE))
    },
    lastGraphUpdateStep: 0,
};