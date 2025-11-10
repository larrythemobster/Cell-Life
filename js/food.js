import { App } from './main.js';

/**
 * Represents a single food pellet.
 */
export class FoodPellet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 3;
        this.energy = App.config.FOOD_ENERGY;
        this.id = Math.random() + performance.now();
        this.isEaten = false;
        this.gridKey = null;
        
        this.pixiObject = null;
        if (App.state.foodContainer) {
            this.pixiObject = App.drawing.getFoodGraphic(this);
        }
    }
}

/**
 * Spawns a new food pellet at a specific location.
 * Assumes the location has already been checked for validity (e.g., not a WALL).
 */
export function spawnFood(x, y) {
    
    if (App.state.foodPellets.length >= App.config.MAX_FOOD || App.state.worldWidth === 0) return;
    
    const newFood = new FoodPellet(x, y);
    App.state.foodPellets.push(newFood);
    
    const gridX = Math.floor(x / App.config.REP_GRID_CELL_SIZE);
    const gridY = Math.floor(y / App.config.REP_GRID_CELL_SIZE);
    const key = `${gridX},${gridY}`;
    
    if (!App.state.foodGrid.has(key)) {
        App.state.foodGrid.set(key, []);
    }
    App.state.foodGrid.get(key).push(newFood);
    newFood.gridKey = key;
}