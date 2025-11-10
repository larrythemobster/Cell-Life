import { App } from './main.js';

/**
 * Manages the waste grid for pollution.
 */
export const wasteManager = {
    getGridCoords(x, y) {
        return {
            x: Math.floor(x / App.config.GRID_CELL_SIZE),
            y: Math.floor(y / App.config.GRID_CELL_SIZE)
        };
    },
    
    getGridKey(x, y) {
        return `${x},${y}`;
    },
    
    getWaste(x, y) {
        const coords = this.getGridCoords(x, y);
        return App.state.wasteGrid.get(this.getGridKey(coords.x, coords.y)) || 0;
    },
    
    addWaste(x, y, amount) {
        const coords = this.getGridCoords(x, y);
        if (coords.x < 0 || coords.x >= App.state.gridWidth || coords.y < 0 || coords.y >= App.state.gridHeight) return;
        
        const key = this.getGridKey(coords.x, coords.y);
        const currentWaste = App.state.wasteGrid.get(key) || 0;
        App.state.wasteGrid.set(key, currentWaste + amount);
    },
    
    updateWasteGrid() {
        const newGrid = App.state.wasteGridBuffer;
        const oldGrid = App.state.wasteGrid;
        const diffusionAmount = App.config.WASTE_DIFFUSION / 4;

        for (const [key, currentWaste] of oldGrid.entries()) {
            
            if (currentWaste < 0.01) continue;

            const [x, y] = key.split(',').map(Number);

            const worldX = x * App.config.GRID_CELL_SIZE;
            const worldY = y * App.config.GRID_CELL_SIZE;
            const terrainType = App.grid.terrain.getTerrainAt(worldX, worldY);
            
            let evaporation = App.config.WASTE_EVAPORATION;
            if (terrainType === App.config.TERRAIN_TYPES.VENT) {
                evaporation *= App.config.VENT_EVAPORATION_MULTIPLIER;
            }

            let newWaste = currentWaste * (1 - evaporation);
            
            const neighbors = [
                { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
            ];

            for (const neighbor of neighbors) {
                const nx = x + neighbor.dx;
                const ny = y + neighbor.dy;
                if (nx >= 0 && nx < App.state.gridWidth && ny >= 0 && ny < App.state.gridHeight) {
                    const neighborKey = this.getGridKey(nx, ny);
                    const neighborWaste = oldGrid.get(neighborKey) || 0;
                    if (currentWaste > neighborWaste) {
                        const diff = (currentWaste - neighborWaste) * diffusionAmount;
                        newWaste -= diff;
                        const currentNeighborWaste = newGrid.get(neighborKey) || 0;
                        newGrid.set(neighborKey, currentNeighborWaste + diff);
                    }
                }
            }
            
            if (newWaste > 0.01) {
                const existingNewWaste = newGrid.get(key) || 0;
                newGrid.set(key, existingNewWaste + newWaste);
            }
        }
        
        App.state.wasteGrid = newGrid;
        App.state.wasteGridBuffer = oldGrid;
        App.state.wasteGridBuffer.clear();
    }
};

export const terrainManager = {
    getTerrainGridCoords(x, y) {
        return {
            x: Math.floor(x / App.config.TERRAIN_GRID_CELL_SIZE),
            y: Math.floor(y / App.config.TERRAIN_GRID_CELL_SIZE)
        };
    },
    
    getGridKey(x, y) {
        return `${x},${y}`;
    },
    
    getTerrainAt(x, y) {
        const coords = this.getTerrainGridCoords(x, y);
        const key = this.getGridKey(coords.x, coords.y);
        return App.state.terrainGrid.get(key) || App.config.TERRAIN_TYPES.NORMAL;
    }
};