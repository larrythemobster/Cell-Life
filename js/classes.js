import { App } from './main.js';
import * as utils from './utils.js';
import { wasteManager } from './wasteGrid.js';

/**
 * Represents a species (the "genome" or prototype).
 */
export class ReplicatorSpecies {
    constructor(config) {
        this.id = App.state.speciesCounter++;
        this.parentSpeciesId = config.parentSpeciesId || null;
        this.name = config.name || `Mutant #${this.id}`;
        this.color = config.color || `hsl(${Math.random() * 360}, 70%, 70%)`;
        
        this.replicationRate = config.replicationRate;
        this.deathRate = config.deathRate;
        this.mutationRate = config.mutationRate;
        this.attack = config.attack;
        this.defense = config.defense;
        this.stealth = config.stealth;
        this.maxEnergy = config.maxEnergy;
        this.size = config.size;
        this.lifespan = config.lifespan;
        this.wasteTolerance = config.wasteTolerance;
        this.diet = config.diet;
        this.perception = config.perception;
        this.speed = config.speed;

        this.population = 0;
        this.peakPopulation = 0; 
        this.spawnStep = config.spawnStep || App.state.simulationStep;
        this.extinctionStep = -1;
        this.totalKills = 0;
        this.totalFoodEaten = 0;
        this.totalReplications = 0;
        this.peakAvgEnergy = 0;
        this.totalWasteProduced = 0;
    }

    mutate() {
        const newTraits = {
            replicationRate: utils.clamp(this.replicationRate + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0.1, 5.0),
            deathRate: utils.clamp(this.deathRate + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0.001),
            mutationRate: utils.clamp(this.mutationRate + utils.randNorm(App.config.MUTATION_AMOUNTS.meta), 0.0, 1.0),
            attack: utils.clamp(this.attack + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0, 1.0),
            defense: utils.clamp(this.defense + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0, 1.0),
            stealth: utils.clamp(this.stealth + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0, 1.0),
            maxEnergy: Math.max(20, this.maxEnergy + utils.randNorm(App.config.MUTATION_AMOUNTS.trait * 20)),
            size: utils.clamp(this.size + utils.randNorm(App.config.MUTATION_AMOUNTS.trait / 2), 2, 10),
            lifespan: Math.max(500, this.lifespan + utils.randNorm(App.config.MUTATION_AMOUNTS.bigTrait * 100)),
            wasteTolerance: utils.clamp(this.wasteTolerance + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0.0, 1.0),
            diet: utils.clamp(this.diet + utils.randNorm(App.config.MUTATION_AMOUNTS.trait), 0.0, 1.0),
            perception: Math.max(20, this.perception + utils.randNorm(App.config.MUTATION_AMOUNTS.bigTrait * 5)),
            speed: utils.clamp(this.speed + utils.randNorm(App.config.MUTATION_AMOUNTS.trait / 2), 1.0, 5.0),
            color: `hsl(${Math.random() * 360}, 70%, 70%)`,
            name: `Mutant #${App.state.speciesCounter}`,
            spawnStep: App.state.simulationStep
        };

        const combatBudget = 1.0;
        const totalCombat = newTraits.attack + newTraits.defense + newTraits.stealth;
        if (totalCombat > 0) {
            const ratio = combatBudget / totalCombat;
            newTraits.attack = utils.clamp(newTraits.attack * ratio, 0, 1.0);
            newTraits.defense = utils.clamp(newTraits.defense * ratio, 0, 1.0);
            newTraits.stealth = utils.clamp(newTraits.stealth * ratio, 0, 1.0);
        }
        
        const newSpecies = new ReplicatorSpecies({ ...newTraits, parentSpeciesId: this.id });
        App.state.allSpecies[newSpecies.id] = newSpecies;
        return newSpecies;
    }
}

/**
 * Represents an individual replicator in the world.
 */
export class ReplicatorIndividual {
    constructor(species, x, y, initialEnergy) {
        this.species = species;
        this.species.population++;
        this.id = Math.random() + performance.now();
        this.currentEnergy = initialEnergy;
        this.age = 0;
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.isAlive = true;
        
        this.state = 'WANDERING';
        this.currentTarget = null;
        this.stateTimer = 0;

        this.kills = 0;
        this.foodEaten = 0;
        this.replications = 0;
        this.totalWasteProduced = 0;
        
        this.pixiObject = null;
        if (App.state.repContainer) {
            this.pixiObject = App.drawing.getRepGraphic(this);
        }
    }

    updateState() {
        if (!this.isAlive) return;
        
        this.age++;
        const localWaste = wasteManager.getWaste(this.x, this.y);
        const wasteMultiplier = 1 + (localWaste * (1 - this.species.wasteTolerance) * App.config.WASTE_DAMAGE_MULTIPLIER);
        
        const currentTerrain = App.grid.terrain.getTerrainAt(this.x, this.y);
        let terrainMultiplier = 1.0;
        if (currentTerrain === App.config.TERRAIN_TYPES.ROUGH) {
            terrainMultiplier = App.config.ROUGH_TERRAIN_DRAIN_MULTIPLIER;
        }
        const cycleDrainMultiplier = App.state.isDay ? 1.0 : App.config.NIGHT_ENERGY_DRAIN_MULTIPLIER;

        const drain = (
            (this.species.deathRate * App.config.ENERGY_DRAIN_BASE) + 
            (this.species.size * 0.01) +
            (this.species.attack * 0.05) +
            (this.species.defense * 0.05) +
            (this.species.speed * 0.02)
        ) * wasteMultiplier * terrainMultiplier * cycleDrainMultiplier;
        
        this.currentEnergy -= drain;
        
        if (this.currentEnergy <= 0 || this.age > this.species.lifespan) {
            this.isAlive = false;
            this.species.population--;
            if (this.pixiObject) {
                App.drawing.returnRepGraphic(this.pixiObject);
                this.pixiObject = null;
            }
            return;
        }
        
        wasteManager.addWaste(this.x, this.y, App.config.WASTE_PER_STEP);
        this.totalWasteProduced += App.config.WASTE_PER_STEP;
        this.species.totalWasteProduced += App.config.WASTE_PER_STEP;

        if (this.currentEnergy >= App.config.REPLICATION_MIN_ENERGY && App.state.allReplicators.length < App.config.CROWDING_FACTOR && Math.random() < App.config.REPLICATION_CHANCE) {
            this.replicate();
            this.state = 'WANDERING'; 
            this.currentTarget = null;
            this.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN;
        }

        if (this.state !== 'FLEEING') {
            
            let taskIsInvalid = false;
            if (this.state === 'EATING') {
                if (!this.currentTarget) {
                    taskIsInvalid = true;
                } else {
                    const foodExists = App.state.foodPellets.some(food => food.id === this.currentTarget.id);
                    if (!foodExists) {
                        taskIsInvalid = true;
                        if (App.config.DEBUG_AI_STATE && this.species.diet < 1.0) {
                            console.log(`[AI STATE ${Math.floor(this.id)}] Target food ${this.currentTarget.id} is gone. Marking task invalid.`);
                        }
                    }
                }
            } else if (this.state === 'HUNTING') {
                if (!this.currentTarget || !this.currentTarget.isAlive) {
                    taskIsInvalid = true;
                }
            }

            let shouldFindNewTask = false;
            
            if (taskIsInvalid) {
                shouldFindNewTask = true;
                this.currentTarget = null;
                this.state = 'WANDERING';
                this.stateTimer = 0;
            } else if (this.state === 'WANDERING') {
                if (this.stateTimer > 0) {
                    this.stateTimer--; 
                }
                
                if (this.stateTimer === 0) {
                    shouldFindNewTask = true;
                }
            }

            if (shouldFindNewTask) {
                const fleeTarget = this.checkForDanger();
                if (fleeTarget) {
                    if (this.state !== 'FLEEING') {
                        this.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN;
                    }
                    this.state = 'FLEEING';
                    this.currentTarget = fleeTarget;
                } else {
                    this.findNewTask(); 
                }
            }
        } else {
            if (this.stateTimer > 0) {
                this.stateTimer--;
            }
            
            if (this.stateTimer === 0) {
                this.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN;
                const fleeTarget = this.checkForDanger();
                if (!fleeTarget) {
                    this.state = 'WANDERING';
                    this.currentTarget = null;
                    this.stateTimer = 0;
                }
            }
        }

        this.executeCurrentState();

        if (this.currentEnergy > this.species.maxEnergy) {
            this.currentEnergy = this.species.maxEnergy;
        }
    }
    
    replicate() {
        const childEnergy = this.currentEnergy * App.config.REPLICATION_ENERGY_PASS_PC;
        this.currentEnergy *= (1.0 - App.config.REPLICATION_ENERGY_PASS_PC); 
        
        this.replications++;
        this.species.totalReplications++;

        if (this.species.id === App.state.playerSpeciesId) {
            App.state.evolutionPoints += 1;
        }
        
        let newIndividual;
        if (Math.random() < (this.species.mutationRate * App.config.MUTATION_CHANCE_BASE)) {
            const newSpecies = this.species.mutate();
            newIndividual = new ReplicatorIndividual(newSpecies, this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10, childEnergy);
        } else {
            newIndividual = new ReplicatorIndividual(this.species, this.x + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10, childEnergy);
        }
        App.state.newBirths.push(newIndividual);
    }

    checkForDanger() {
        let closestPredator = null;
        
        const perception = App.state.isDay 
            ? this.species.perception 
            : this.species.perception * App.config.NIGHT_PERCEPTION_PENALTY;
            
        let minPredatorDistSq = perception * perception;
        const isFeelingVulnerable = this.currentEnergy < this.species.maxEnergy * App.config.AI_FLEE_HEALTH_THRESHOLD;

        const gridX = Math.floor(this.x / App.config.REP_GRID_CELL_SIZE);
        const gridY = Math.floor(this.y / App.config.REP_GRID_CELL_SIZE);
        const gridRange = Math.ceil(perception / App.config.REP_GRID_CELL_SIZE);

        for (let dx = -gridRange; dx <= gridRange; dx++) {
            for (let dy = -gridRange; dy <= gridRange; dy++) {
                const key = `${gridX + dx},${gridY + dy}`;
                if (!App.state.repGrid.has(key)) continue;

                for (const rep of App.state.repGrid.get(key)) {
                    if (!rep.isAlive || rep.id === this.id || rep.species.id === this.species.id) continue;
                    if (this.species.diet >= 1.0) {
                        if (rep.species.diet < 1.0) continue; 
                    } else {
                        if (rep.species.diet < 0.3) continue; 
                    }
                    
                    const stealth = rep.species.stealth + (App.state.isDay ? 0 : App.config.NIGHT_STEALTH_BONUS);
                    if (Math.random() < stealth) continue;

                    if (this.species.diet >= 1.0 && rep.species.diet >= 1.0) {
                        if (!isFeelingVulnerable) continue;
                    }

                    const distSq = utils.getDistanceSq(this.x, this.y, rep.x, rep.y);
                    if (distSq < minPredatorDistSq) {
                        const predatorStrength = rep.species.attack + rep.species.size;
                        const myDefense = this.species.defense + this.species.size;
                        const isPredatorDangerous = predatorStrength > (myDefense * App.config.AI_FLEE_PREDATOR_STRENGTH_RATIO);

                        if (isPredatorDangerous || isFeelingVulnerable) {
                            minPredatorDistSq = distSq;
                            closestPredator = rep;
                        }
                    }
                }
            }
        }
        return closestPredator;
    }

    findNewTask() {
        if (App.config.DEBUG_AI_STATE) {
            console.log(`[AI STATE ${Math.floor(this.id)}] Calling findNewTask(). Current state: ${this.state}, Timer: ${this.stateTimer}, Energy: ${this.currentEnergy.toFixed(0)}`);
        }

        if (this.currentEnergy >= this.species.maxEnergy * 0.9) {
            this.state = 'WANDERING';
            this.currentTarget = null;
            return; 
        }

        const wantsFood = this.species.diet < 0.7;
        const wantsPrey = this.species.diet > 0.3;

        let bestFoodTarget = null;
        let bestPreyTarget = null;
        
        const perception = App.state.isDay 
            ? this.species.perception 
            : this.species.perception * App.config.NIGHT_PERCEPTION_PENALTY;
        let maxFoodScore = -Infinity; // REPLACE THIS

        if (wantsFood) {
            const gridX = Math.floor(this.x / App.config.REP_GRID_CELL_SIZE);
            const gridY = Math.floor(this.y / App.config.REP_GRID_CELL_SIZE);
            const gridRange = Math.ceil(perception / App.config.REP_GRID_CELL_SIZE);

            for (let dx = -gridRange; dx <= gridRange; dx++) {
                for (let dy = -gridRange; dy <= gridRange; dy++) {
                    const key = `${gridX + dx},${gridY + dy}`;
                    if (!App.state.foodGrid.has(key)) continue;

                    for (const food of App.state.foodGrid.get(key)) {
                        if (food.isEaten) continue; 

                        const distSq = utils.getDistanceSq(this.x, this.y, food.x, food.y);
                        const foodScore = App.config.FOOD_ENERGY / (distSq + 1e-6); // Score = Energy / Distance
                        if (foodScore > maxFoodScore && distSq < (perception * perception)) {
                            maxFoodScore = foodScore;
                            bestFoodTarget = food;
                        }
                    }
                }
            }
        }

        if (wantsPrey) {
            let maxPreyScore = -Infinity; 
            const perceptionSq = perception * perception;
            
            const gridX = Math.floor(this.x / App.config.REP_GRID_CELL_SIZE);
            const gridY = Math.floor(this.y / App.config.REP_GRID_CELL_SIZE);
            const gridRange = Math.ceil(perception / App.config.REP_GRID_CELL_SIZE);

            for (let dx = -gridRange; dx <= gridRange; dx++) {
                for (let dy = -gridRange; dy <= gridRange; dy++) {
                    const key = `${gridX + dx},${gridY + dy}`;
                    if (!App.state.repGrid.has(key)) continue;
                    
                    for (const rep of App.state.repGrid.get(key)) {
                        if (!rep.isAlive || rep.id === this.id || rep.species.id === this.species.id) continue;
                        if (rep.species.diet >= 1.0) continue; 

                        const stealth = rep.species.stealth + (App.state.isDay ? 0 : App.config.NIGHT_STEALTH_BONUS);
                        if (Math.random() < stealth) continue; 

                        const distSq = utils.getDistanceSq(this.x, this.y, rep.x, rep.y);
                        if (distSq < perceptionSq) {
                            const energyScore = rep.currentEnergy / (distSq + 1e-6);
                            const winChance = Math.max(0, this.species.attack - rep.species.defense);
                            const preyScore = energyScore * (0.1 + winChance);

                            if (preyScore > maxPreyScore) {
                                maxPreyScore = preyScore;
                                bestPreyTarget = rep;
                            }
                        }
                    }
                }
            }
        }

        let newState = 'WANDERING';
        let newTarget = null;

        const foodFound = wantsFood && bestFoodTarget;
        const preyFound = wantsPrey && bestPreyTarget;

        if (foodFound && preyFound) {
            if (this.species.diet <= 0.5) { 
                newState = 'EATING';
                newTarget = bestFoodTarget;
            } else { 
                newState = 'HUNTING';
                newTarget = bestPreyTarget;
            }
        } else if (foodFound) {
            newState = 'EATING';
            newTarget = bestFoodTarget;
        } else if (preyFound) {
            if (App.config.DEBUG_CARNIVORES && this.species.diet >= 1.0) {
                console.log(`[CARNIVORE ${Math.floor(this.id)}] Acquired prey target ${Math.floor(bestPreyTarget.id)}`);
            }
            newState = 'HUNTING';
            newTarget = bestPreyTarget;
        }

        this.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN;
        
        
        if (App.config.DEBUG_AI_STATE && this.species.diet < 1.0 && this.state !== newState) {
            console.log(`[AI STATE ${Math.floor(this.id)}] Task changed: ${this.state} -> ${newState}. Target: ${newTarget?.id}`);
        }
        this.state = newState;
        this.currentTarget = newTarget;
    }
    
    executeCurrentState() {
        if (!this.currentTarget && (this.state === 'HUNTING' || this.state === 'EATING' || this.state === 'FLEEING')) {
            if (App.config.DEBUG_AI_STATE) {
                console.warn(`[AI STUCK?] Rep ${Math.floor(this.id)} was in state ${this.state} with no target. Resetting to WANDERING.`);
            }
            this.state = 'WANDERING';
            this.currentTarget = null;
            this.stateTimer = 0; 
        }

        if (App.config.DEBUG_CARNIVORES && this.species.diet >= 1.0) {
            if (this.state === 'HUNTING') {
                console.log(`[CARNIVORE ${Math.floor(this.id)}] State: HUNTING ${Math.floor(this.currentTarget?.id)}`);
            } else if (this.state === 'FLEEING') {
                 console.log(`[CARNIVORE ${Math.floor(this.id)}] State: FLEEING ${Math.floor(this.currentTarget?.id)}`);
            }
        }

        switch (this.state) {
            case 'WANDERING':
                this.wander();
                break;
            case 'EATING':
                if (this.currentTarget) {
                    this.moveTo(this.currentTarget);
                }
                break;
            case 'HUNTING':
                if (this.currentTarget && this.currentTarget.isAlive) {
                    this.moveTo(this.currentTarget);
                } else {
                    this.currentTarget = null;
                    this.state = 'WANDERING';
                    this.stateTimer = 0; 
                }
                break;
            case 'FLEEING':
                if (this.currentTarget) {
                    this.moveAwayFrom(this.currentTarget);
                }
                break;
        }
    }

    moveTo(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const currentTerrain = App.grid.terrain.getTerrainAt(this.x, this.y);
        let currentMaxSpeed = this.species.speed;
        if (currentTerrain === App.config.TERRAIN_TYPES.ROUGH) {
            currentMaxSpeed *= App.config.ROUGH_TERRAIN_SLOW_FACTOR;
        }
        
        if (dist > 1) { 
            const force_x = (dx / dist) * App.config.AI_STEERING_FORCE;
            const force_y = (dy / dist) * App.config.AI_STEERING_FORCE;
            this.vx += force_x;
            this.vy += force_y;

            const currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
            if (currentSpeed > currentMaxSpeed) {
                this.vx = (this.vx / currentSpeed) * currentMaxSpeed;
                this.vy = (this.vy / currentSpeed) * currentMaxSpeed;
            }
        } else {
            this.vx *= App.config.BRAKING_FORCE; 
            this.vy *= App.config.BRAKING_FORCE;
        }
    }
    
    moveAwayFrom(target) {
        let dx = this.x - target.x;
        let dy = this.y - target.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) { 
            dist = 1; 
            dx = (Math.random() - 0.5);
            dy = (Math.random() - 0.5);
        }

        const currentTerrain = App.grid.terrain.getTerrainAt(this.x, this.y);
        let currentMaxSpeed = this.species.speed;
        if (currentTerrain === App.config.TERRAIN_TYPES.ROUGH) {
            currentMaxSpeed *= App.config.ROUGH_TERRAIN_SLOW_FACTOR;
        }

        this.vx = (dx / dist) * currentMaxSpeed;
        this.vy = (dy / dist) * currentMaxSpeed;
    }
    
    wander() {
        let avgX = 0;
        let avgY = 0;
        let herdCount = 0;
        const herdDistSq = App.config.AI_HERD_DISTANCE * App.config.AI_HERD_DISTANCE;
        
        const gridX = Math.floor(this.x / App.config.REP_GRID_CELL_SIZE);
        const gridY = Math.floor(this.y / App.config.REP_GRID_CELL_SIZE);
        const gridRange = Math.ceil(App.config.AI_HERD_DISTANCE / App.config.REP_GRID_CELL_SIZE);

        for (let dx = -gridRange; dx <= gridRange; dx++) {
            for (let dy = -gridRange; dy <= gridRange; dy++) {
                const key = `${gridX + dx},${gridY + dy}`;
                if (!App.state.repGrid.has(key)) continue;

                for (const rep of App.state.repGrid.get(key)) {
                    if (rep.id === this.id || rep.species.id !== this.species.id || !rep.isAlive) continue;
                    
                    const distSq = utils.getDistanceSq(this.x, this.y, rep.x, rep.y);
                    if (distSq < herdDistSq) {
                        avgX += rep.x;
                        avgY += rep.y;
                        herdCount++;
                    }
                }
            }
        }

        if (herdCount > 0) {
            avgX /= herdCount;
            avgY /= herdCount;
            
            const dx = avgX - this.x;
            const dy = avgY - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 1) {
                this.vx += (dx / dist) * App.config.AI_HERD_STRENGTH;
                this.vy += (dy / dist) * App.config.AI_HERD_STRENGTH;
            }
        }
        
        this.vx += (Math.random() - 0.5) * 0.5;
        this.vy += (Math.random() - 0.5) * 0.5;
        
        const currentTerrain = App.grid.terrain.getTerrainAt(this.x, this.y);
        let currentMaxSpeed = this.species.speed;
        if (currentTerrain === App.config.TERRAIN_TYPES.ROUGH) {
            currentMaxSpeed *= App.config.ROUGH_TERRAIN_SLOW_FACTOR;
        }

        const currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        if (currentSpeed > currentMaxSpeed) {
            this.vx = (this.vx / currentSpeed) * currentMaxSpeed;
            this.vy = (this.vy / currentSpeed) * currentMaxSpeed;
        }
    }

    move() {
        const { worldWidth, worldHeight } = App.state;
        
        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;
        
        const terrainAtNextPos = App.grid.terrain.getTerrainAt(nextX, nextY);

        if (terrainAtNextPos === App.config.TERRAIN_TYPES.WALL) {
            this.vx *= -1;
            this.vy *= -1;
        } else {
            this.x = nextX;
            this.y = nextY;
        }
        
        const r = this.species.size / 2;
        const slide = App.config.WALL_BOUNCE_SLIDE;

        if (this.x < r) { 
            this.x = r; 
            this.vx *= -1; 
            this.vy += (Math.random() - 0.5) * slide;
        }
        if (this.y < r) { 
            this.y = r; 
            this.vy *= -1; 
            this.vx += (Math.random() - 0.5) * slide;
        }
        if (this.x > worldWidth - r) { 
            this.x = worldWidth - r; 
            this.vx *= -1; 
            this.vy += (Math.random() - 0.5) * slide;
        }
        if (this.y > worldHeight - r) { 
            this.y = worldHeight - r; 
            this.vy *= -1; 
            this.vx += (Math.random() - 0.5) * slide;
        }
        if (App.config.DEBUG_AI_STATE && this.isAlive && this.vx === 0 && this.vy === 0) {
             console.warn(`[AI STUCK?] Rep ${Math.floor(this.id)} has zero velocity. State: ${this.state}`);
        }
    }

    eat() {
        if (!this.currentTarget || this.currentTarget.isEaten) {
            if (App.config.DEBUG_AI_STATE && this.species.diet < 1.0) {
                console.log(`[AI STATE ${Math.floor(this.id)}] In EAT state with no/eaten target. Resetting.`);
            }
            this.state = 'WANDERING';
            this.currentTarget = null;
            this.stateTimer = 0;
            return;
        }

        const food = this.currentTarget;
        const eatDist = (this.species.size / 2) + food.size;
        const distSq = utils.getDistanceSq(this.x, this.y, food.x, food.y);

        if (distSq < (eatDist * eatDist)) {
            this.currentEnergy += food.energy * this.species.replicationRate;
            this.foodEaten++;
            this.species.totalFoodEaten++;

            food.isEaten = true;
            
            if (food.gridKey && App.state.foodGrid.has(food.gridKey)) {
                const cell = App.state.foodGrid.get(food.gridKey);
                const index = cell.indexOf(food);
                if (index > -1) {
                    cell.splice(index, 1);
                }
            }

            if (food.pixiObject) {
                App.drawing.returnFoodGraphic(food.pixiObject);
                food.pixiObject = null;
            }
            
            this.currentTarget = null; 
            this.state = 'WANDERING';
            this.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN;
            
            this.vx = (Math.random() - 0.5) * this.species.speed;
            this.vy = (Math.random() - 0.5) * this.species.speed;
            return; 
        }
    }
    
    interactWith(opponent) {
        if (!opponent || !opponent.isAlive) {
            this.currentTarget = null;
            this.state = 'WANDERING';
            this.stateTimer = 0; 
            return false; 
        }

        const interactionDist = (this.species.size / 2) + (opponent.species.size / 2);
        const distSq = utils.getDistanceSq(this.x, this.y, opponent.x, opponent.y);

        if (distSq < (interactionDist * interactionDist)) {
            
            if (this.species.id === opponent.species.id) {
                this.currentEnergy -= App.config.INTERACTION_COST;
                return true; 
            }

            const stealth = opponent.species.stealth + (App.state.isDay ? 0 : App.config.NIGHT_STEALTH_BONUS);
            if (Math.random() < stealth) {
                this.currentEnergy -= App.config.INTERACTION_COST;
                this.currentTarget = null; 
                this.state = 'WANDERING';
                this.stateTimer = 0; 
                return true; 
            }
            
            this.currentEnergy -= App.config.COMBAT_COST;
            opponent.currentEnergy -= App.config.COMBAT_COST;

            const repAttack = this.species.attack * (0.8 + Math.random() * 0.4) * (1 + this.species.size / 10);
            const oppAttack = opponent.species.attack * (0.8 + Math.random() * 0.4) * (1 + opponent.species.size / 10);
            const repDefense = this.species.defense * (0.8 + Math.random() * 0.4) * (1 + this.species.size / 10);
            const oppDefense = opponent.species.defense * (0.8 + Math.random() * 0.4) * (1 + opponent.species.size / 10);

            if (App.config.DEBUG_CARNIVORES && this.species.diet >= 1.0) {
                 console.log(`[COMBAT] Attacker ${Math.floor(this.id)} (Base Atk: ${this.species.attack.toFixed(2)}) rolled ${repAttack.toFixed(2)}`);
                 console.log(`[COMBAT] Defender ${Math.floor(opponent.id)} (Base Def: ${opponent.species.defense.toFixed(2)}) rolled ${oppDefense.toFixed(2)}`);
            }

            if (repAttack > oppDefense) {
                const stolenEnergy = (App.config.COMBAT_ENERGY_REWARD_BASE + opponent.species.size * 5) * this.species.replicationRate; 
                this.currentEnergy += stolenEnergy;
                opponent.isAlive = false; 
                opponent.species.population--; // <--- ADD THIS LINE
                this.kills++; 
                this.species.totalKills++; 
                if (this.species.id === App.state.playerSpeciesId) {
                    App.state.evolutionPoints += 5;
                }
                if (App.config.DEBUG_CARNIVORES && this.species.diet >= 1.0) {
                    console.log(`%c[CARNIVORE ${Math.floor(this.id)}] Attack SUCCESS. ${this.kills} kills.`, 'color: #00ff00');
                }
            } else if (oppAttack > repDefense) {
                const stolenEnergy = (App.config.COMBAT_ENERGY_REWARD_BASE + this.species.size * 5) * opponent.species.replicationRate;
                opponent.currentEnergy += stolenEnergy;
                this.isAlive = false;
                this.species.population--; // <--- ADD THIS LINE
                opponent.kills++;
                opponent.species.totalKills++;
                if (opponent.species.id === App.state.playerSpeciesId) {
                    App.state.evolutionPoints += 5; // Grant EP if the player's species gets a kill
                }
                if (App.config.DEBUG_CARNIVORES && this.species.diet >= 1.0) {
                     console.log(`%c[COMBAT] Attacker ${Math.floor(this.id)} LOSES`, 'color: #ff0000');
                }
            } else { 
                 if (App.config.DEBUG_CARNIVORES && this.species.diet >= 1.0) {
                     console.log(`%c[COMBAT] Attacker ${Math.floor(this.id)} STALEMATE`, 'color: #ffff00');
                 }
            }
            
            this.currentTarget = null;
            this.state = 'WANDERING';
            this.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN; 
            this.vx = (Math.random() - 0.5) * this.species.speed;
            this.vy = (Math.random() - 0.5) * this.species.speed;

            opponent.currentTarget = null;
            opponent.state = 'WANDERING';
            opponent.stateTimer = App.config.AI_STATE_CHANGE_COOLDOWN; 
            opponent.vx = (Math.random() - 0.5) * opponent.species.speed;
            opponent.vy = (Math.random() - 0.5) * opponent.species.speed;
            
            return true; 
        }
        return false; 
    }
}