export const STEPS_PER_FRAME_DEFAULT = 1;
export const LOGIC_FPS = 60;

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3.0;
export const ZOOM_SENSITIVITY = 0.001;
export const PAN_SPEED = 1.0;

export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 3000;
export const REP_GRID_CELL_SIZE = 25; 

export const TERRAIN_TYPES = {
    NORMAL: 0,
    WALL: 1,
    ROUGH: 2,
    FERTILE: 3,
    VENT: 4
};

export const TERRAIN_GRID_CELL_SIZE = 25;
export const ROUGH_TERRAIN_SLOW_FACTOR = 0.5;
export const ROUGH_TERRAIN_DRAIN_MULTIPLIER = 1.5;
export const FERTILE_SPAWN_BONUS = 0.25;
export const VENT_EVAPORATION_MULTIPLIER = 5.0;

export const CYCLE_LENGTH = 5000;
export const NIGHT_PERCEPTION_PENALTY = 0.5;
export const NIGHT_STEALTH_BONUS = 0.2;
export const NIGHT_ENERGY_DRAIN_MULTIPLIER = 1.2;
export const NIGHT_FOOD_SPAWN_MULTIPLIER = 0.25;

export const CROWDING_FACTOR = 2500;
export const STARTING_POPULATION_PER_SPECIES = 50;
export const INITIAL_ENERGY = 100;

export const FOOD_SPAWN_RATE = 1.0;
export const MAX_FOOD = 1200;
export const FOOD_ENERGY = 70;

export const REPLICATION_MIN_ENERGY = 80.0;
export const REPLICATION_CHANCE = 0.5;
export const REPLICATION_ENERGY_PASS_PC = 0.4;

export const INTERACTION_COST = 0.1;
export const COMBAT_COST = 0.2;
export const COMBAT_ENERGY_REWARD_BASE = 60;
export const INTERACTION_DISTANCE_BASE = 10;

export const ENERGY_DRAIN_BASE = 0.08;

export const AI_FLEE_HEALTH_THRESHOLD = 0.3;
export const AI_FLEE_PREDATOR_STRENGTH_RATIO = 1.5;
export const AI_HERD_DISTANCE = 50;
export const AI_HERD_STRENGTH = 0.1;
export const AI_STATE_CHANGE_COOLDOWN = 5;
export const AI_STEERING_FORCE = 0.5;

export const BRAKING_FORCE = 0.8;
export const WALL_BOUNCE_SLIDE = 0.2;

export const DEBUG_CARNIVORES = false;
export const DEBUG_AI_STATE = false;


export const GRID_CELL_SIZE = 10;
export const WASTE_PER_STEP = 0.02;
export const WASTE_EVAPORATION = 0.01;
export const WASTE_DIFFUSION = 0.25;
export const WASTE_DAMAGE_MULTIPLIER = 0.5;

export const MUTATION_CHANCE_BASE = 0.05;
export const MUTATION_AMOUNTS = {
    trait: 0.05, 
    meta: 0.05,
    bigTrait: 5,
};

export const INITIAL_SPECIES_CONFIGS = [
    {
        name: "Herbivore",
        color: "hsl(120, 70%, 50%)",
        replicationRate: 1.2,
        deathRate: 0.1,
        mutationRate: 0.5,
        attack: 0.0,
        defense: 0.3,
        stealth: 0.3,
        maxEnergy: 150.0,
        size: 4,
        lifespan: 2500,
        wasteTolerance: 0.2,
        diet: 0.0,
        perception: 130,
        speed: 2.2,
    },
    {
        name: "Carnivore",
        color: "hsl(0, 70%, 50%)",
        replicationRate: 1.2,
        deathRate: 0.2,
        mutationRate: 0.5,
        attack: 0.5,
        defense: 0.5,
        stealth: 0.2,
        maxEnergy: 200.0,
        size: 6,
        lifespan: 3500,
        wasteTolerance: 0.1,
        diet: 1.0,
        perception: 180,
        speed: 2.9,
    },
    {
        name: "Omnivore",
        color: "hsl(55, 80%, 50%)",
        replicationRate: 0.9,
        deathRate: 0.15,
        mutationRate: 0.5,
        attack: 0.2,
        defense: 0.3,
        stealth: 0.3,
        maxEnergy: 120.0,
        size: 5,
        lifespan: 3000,
        wasteTolerance: 0.3,
        diet: 0.5,
        perception: 120,
        speed: 2.0,
    }
];

export const GRAPH_UPDATE_INTERVAL = 50;
export const MAX_GRAPH_HISTORY = 100;

export const LEADERBOARD_CATEGORIES_TEMPLATE = {
    peakPopulation: { label: "Peak Population", value: 0, species: null, unit: "" },
    longestLivedIndividual: { label: "Longest Lived (Indiv.)", value: 0, species: null, unit: " steps" },
    mostKills: { label: "Most Kills (Indiv.)", value: 0, species: null, unit: " kills" },
    mostFoodEaten: { label: "Most Food Eaten (Indiv.)", value: 0, species: null, unit: " pellets" },
    mostChildren: { label: "Most Children (Indiv.)", value: 0, species: null, unit: " offspring" },
    longestLineage: { label: "Longest Lineage (Species)", value: 0, species: null, unit: " steps" },
    totalKillsSpecies: { label: "Most Kills (Species)", value: 0, species: null, unit: " kills" },
    totalFoodEatenSpecies: { label: "Most Food (Species)", value: 0, species: null, unit: " pellets" },
    totalReplicationsSpecies: { label: "Most Offspring (Species)", value: 0, species: null, unit: " offspring" },
    highestEnergyHeld: { label: "Highest Energy Held (Indiv.)", value: 0, species: null, unit: " E" },
    peakAverageEnergy: { label: "Peak Average Energy (Species)", value: 0, species: null, unit: " E" },
    mostToxic: { label: "Total Waste Produced (Species)", value: 0, species: null, unit: " waste" },
    topPredator: { label: "Highest Attack Gene", value: 0, species: null, unit: "" },
    masterDefender: { label: "Highest Defense Gene", value: 0, species: null, unit: "" },
    mostEfficient: { label: "Highest Efficiency Gene", value: 0, species: null, unit: "" },
    mostResistant: { label: "Highest Waste Tol. Gene", value: 0, species: null, unit: "" },
    energyHoarder: { label: "Highest Max Energy Gene", value: 0, species: null, unit: "" },
    fastest: { label: "Highest Speed Gene", value: 0, species: null, unit: "" },
    stealthiest: { label: "Highest Stealth Gene", value: 0, species: null, unit: "" },
    largest: { label: "Largest Size Gene", value: 0, species: null, unit: "" },
    bestPerception: { label: "Highest Perception Gene", value: 0, species: null, unit: "" },
};