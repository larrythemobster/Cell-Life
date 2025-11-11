import { App } from './main.js';
import * as utils from './utils.js';

const { Application, Container, Graphics, Ticker, ParticleContainer } = PIXI;

/**
 * Initializes the Pixi.js Application and containers.
 */
export function initPixi(containerElement) {
    const app = new Application({
        width: containerElement.clientWidth,
        height: containerElement.clientHeight,
        backgroundColor: 0x111827,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        antialias: true,
    });
    containerElement.appendChild(app.view);
    
    const worldContainer = new Container();
    worldContainer.sortableChildren = true;
    app.stage.addChild(worldContainer);

    const terrainContainer = new Container();
    terrainContainer.zIndex = 0;
    
    const wasteContainer = new Graphics(); // MODIFIED: Was Container
    wasteContainer.zIndex = 1;
    
    const foodContainer = new Container();
    foodContainer.zIndex = 2;
    
    const repContainer = new Container(); 
    repContainer.zIndex = 3;
    
    worldContainer.addChild(terrainContainer);
    worldContainer.addChild(wasteContainer);
    worldContainer.addChild(foodContainer);
    worldContainer.addChild(repContainer);

    const nightOverlay = new Graphics();
    nightOverlay.beginFill(0x000032, 0.2);
    nightOverlay.drawRect(0, 0, app.screen.width, app.screen.height);
    nightOverlay.endFill();
    nightOverlay.visible = false;
    nightOverlay.zIndex = 10;
    app.stage.addChild(nightOverlay);

    App.state.pixiApp = app;
    App.state.worldContainer = worldContainer;
    App.state.terrainContainer = terrainContainer;
    App.state.wasteContainer = wasteContainer;
    App.state.foodContainer = foodContainer;
    App.state.repContainer = repContainer;
    App.state.nightOverlay = nightOverlay;
    
    App.state.repGraphicsPool = [];
    App.state.foodGraphicsPool = [];
    
    app.stage.interactive = true;
    app.stage.hitArea = app.screen;
    app.stage.on('mousedown', App.handlers.handleMouseDown);
    app.stage.on('mouseup', App.handlers.handleMouseUp);
    app.stage.on('mouseleave', App.handlers.handleMouseUp);
    app.stage.on('mousemove', App.handlers.handleMouseMove);
    app.view.addEventListener('wheel', App.handlers.handleWheel, { passive: false });
}

/**
 * Handles resizing the Pixi.js renderer.
 */
export function resizePixi(width, height) {
    const { pixiApp, nightOverlay } = App.state;
    if (!pixiApp) return;
    pixiApp.renderer.resize(width, height);
    
    if(nightOverlay) {
        nightOverlay.clear();
        nightOverlay.beginFill(0x000032, 0.2);
        nightOverlay.drawRect(0, 0, width, height);
        nightOverlay.endFill();
    }
}

/**
 * Factory function to create a new Replicator graphic.
 * We draw a white circle of radius 1, which we will tint and scale.
 */
function _createRepGraphic() {
    const g = new Graphics();
    g.beginFill(0xFFFFFF, 1.0);
    g.drawCircle(0, 0, 1);
    g.endFill();
    return g;
}

/**
 * Gets a Replicator graphic from the pool or creates a new one.
 */
export function getRepGraphic(rep) {
    const g = App.state.repGraphicsPool.pop() || _createRepGraphic();
    
    const [h, sl, l] = rep.species.color.match(/\d+/g).map(Number);
    const color = new PIXI.Color({ h: h, s: sl, l: l }).toNumber();
    
    g.tint = color; 
    g.scale.set(rep.species.size);
    g.x = rep.x;
    g.y = rep.y;
    g.visible = true;
    
    App.state.repContainer.addChild(g);
    return g;
}

/**
 * Returns a Replicator graphic to the pool.
 */
export function returnRepGraphic(g) {
    if (!g) return;
    g.visible = false;
    App.state.repContainer.removeChild(g);
    App.state.repGraphicsPool.push(g);
}

/**
 * Factory function to create a new Food Pellet graphic.
 */
function _createFoodGraphic() {
    const g = new Graphics();
    g.beginFill(0x86efac, 0.8);
    g.drawCircle(0, 0, 3);
    g.endFill();
    return g;
}

/**
 * Gets a Food graphic from the pool or creates a new one.
 */
export function getFoodGraphic(food) {
    const g = App.state.foodGraphicsPool.pop() || _createFoodGraphic();
    
    g.x = food.x;
    g.y = food.y;
    g.visible = true;

    App.state.foodContainer.addChild(g);
    return g;
}

/**
 * Returns a Food graphic to the pool.
 */
export function returnFoodGraphic(g) {
    if (!g) return;
    g.visible = false;
    App.state.foodContainer.removeChild(g);
    App.state.foodGraphicsPool.push(g);
}

/**
 * Draws the *static* terrain grid.
 * (This function is unchanged and correct)
 */
export function drawTerrain() {
    const { terrainGrid, terrainContainer } = App.state;
    
    for (const [key, type] of terrainGrid.entries()) {
        const [x, y] = key.split(',').map(Number);
        const size = App.config.TERRAIN_GRID_CELL_SIZE;
        
        let style = null;
        switch (type) {
            case App.config.TERRAIN_TYPES.WALL:   style = [0x4b5563, 1.0]; break;
            case App.config.TERRAIN_TYPES.ROUGH:  style = [0x8B4513, 0.2]; break;
            case App.config.TERRAIN_TYPES.FERTILE:style = [0x228B22, 0.2]; break;
            case App.config.TERRAIN_TYPES.VENT:   style = [0xFFFFFF, 0.1]; break;
        }
        
        if (style) {
            const g = new Graphics();
            g.beginFill(style[0], style[1]);
            g.drawRect(x * size, y * size, size, size);
            g.endFill();
            terrainContainer.addChild(g);
        }
    }
}

/**
 * This is the main "draw" loop.
 * (This function is unchanged and correct)
 */
export function updateGraphics() {
    const { allReplicators, wasteGrid, wasteContainer } = App.state; // MODIFIED: Removed wasteGraphics

    for (const rep of allReplicators) {
        if (rep.pixiObject) {
            rep.pixiObject.x = rep.x;
            rep.pixiObject.y = rep.y;
            
            const energyPercent = utils.clamp(rep.currentEnergy / rep.species.maxEnergy, 0.2, 1.0);
            rep.pixiObject.alpha = energyPercent;
        }
    }
    
    const cellSize = App.config.GRID_CELL_SIZE;
    
    wasteContainer.clear();

    for (const [key, waste] of wasteGrid.entries()) {
        if (waste > 0.1) {
            const alpha = utils.clamp(waste / 20, 0, 0.4);
            const [x, y] = key.split(',').map(Number);
            
            wasteContainer.beginFill(0xdc2626, alpha);
            wasteContainer.drawRect(x * cellSize, y * cellSize, cellSize, cellSize);
            wasteContainer.endFill();
        }
    }
    
    if(App.state.nightOverlay) {
        App.state.nightOverlay.visible = !App.state.isDay;
    }
}