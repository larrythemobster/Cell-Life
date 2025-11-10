import { App } from './main.js';
import * as utils from './utils.js';
import * as CONFIG from './config.js';

/**
 * Initializes the Chart.js graph.
 */
export function initChart() {
    if (App.state.populationChart) {
        App.state.populationChart.destroy();
    }
    const graphCtx = App.dom.graphCanvas.getContext('2d');
    App.state.populationChart = new Chart(graphCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' }, beginAtZero: true }
            },
            onClick: (evt) => App.handlers.handleGraphClick(evt)
        }
    });
}

/**
 * Updates the graph with the latest data.
 */
export function updateGraphData(sortedSpecies) {
    const { simulationHistory, simulationStep, allSpecies } = App.state;
    const { config } = App;
    
    simulationHistory.labels.push(simulationStep);
    const topSpeciesIds = new Set(sortedSpecies.slice(0, 5).map(s => s.id));

    // --- EVOLVE GAME ---
    // Ensure player species is always tracked on the graph
    if (App.state.playerSpeciesId) {
        topSpeciesIds.add(App.state.playerSpeciesId);
    }
    // --- END ---

    for(const species of sortedSpecies) {
        if (!topSpeciesIds.has(species.id)) continue; 

        if (!simulationHistory.datasets[species.id]) {
            simulationHistory.datasets[species.id] = {
                label: species.name, 
                data: new Array(simulationHistory.labels.length - 1).fill(0),
                borderColor: species.color,
                backgroundColor: utils.colorToRgba(species.color, 0.5),
                fill: false,
                tension: 0.1,
                borderWidth: (species.id === App.state.playerSpeciesId) ? 4 : 2, // Thicker line for player
                pointRadius: 0,
                speciesId: species.id
            };
        }
        simulationHistory.datasets[species.id].data.push(species.population);
    }
    
    for (const id in simulationHistory.datasets) {
        if (!allSpecies[id] || allSpecies[id].population === 0) {
            if (simulationHistory.datasets[id].data.length > 0 && simulationHistory.datasets[id].data[simulationHistory.datasets[id].data.length - 1] !== 0) {
                 simulationHistory.datasets[id].data.push(0);
            }
        } else if (simulationHistory.datasets[id].data.length < simulationHistory.labels.length) {
            simulationHistory.datasets[id].data.push(allSpecies[id].population);
        }
    }

    if (simulationHistory.labels.length > config.MAX_GRAPH_HISTORY) {
        simulationHistory.labels.shift();
        for (const id in simulationHistory.datasets) {
            simulationHistory.datasets[id].data.shift();
        }
    }
    
    for (const id in simulationHistory.datasets) {
        if (simulationHistory.datasets[id].data.length > 0 &&
            simulationHistory.datasets[id].data[simulationHistory.datasets[id].data.length - 1] === 0) {
            if (!allSpecies[id] || (allSpecies[id].population === 0 && id >= config.INITIAL_SPECIES_CONFIGS.length)) {
                delete simulationHistory.datasets[id];
            }
        }
    }

    App.state.populationChart.data.labels = simulationHistory.labels;
    App.state.populationChart.data.datasets = Object.values(simulationHistory.datasets);
    App.state.populationChart.update('none');
}

/**
 * Handles clicking on the population graph to highlight a species.
 */
export function handleGraphClick(evt) {
    const points = App.state.populationChart.getElementsAtEventForMode(evt, 'index', { intersect: false });
    if (points.length > 0) {
        const datasetIndex = points[0].datasetIndex;
        if (!App.state.populationChart.data.datasets[datasetIndex]) return;
        
        const speciesId = App.state.populationChart.data.datasets[datasetIndex].speciesId;
        
        const allItems = App.dom.speciesListContainer.querySelectorAll('div[data-species-id]');
        allItems.forEach(item => item.classList.remove('highlight', 'bg-gray-600'));

        const speciesItem = App.dom.speciesListContainer.querySelector(`[data-species-id="${speciesId}"]`);
        if (speciesItem) {
            speciesItem.scrollIntoView({ behavior: 'smooth', 'block': 'nearest' });
            speciesItem.classList.add('highlight');
        }
    }
}

/**
 * Updates all the text-based UI elements (stats, lists).
 */
export function updateUI() {
    const { allSpecies, allReplicators, simulationStep, foodPellets, lastGraphUpdateStep, isDay } = App.state;
    const { stepCountEl, totalPopulationEl, speciesCountEl, foodCountEl, speciesListContainer, cycleStatusEl, evolutionPointsCountEl } = App.dom;
    
    const speciesPop = {};
    const speciesEnergy = {};

    for (const id in allSpecies) {
        speciesPop[id] = allSpecies[id].population;
        speciesEnergy[id] = 0;
    }
    for (const rep of allReplicators) {
         const id = rep.species.id;
         if (allSpecies[id]) {
            speciesEnergy[id] += rep.currentEnergy;
         }
    }
    
    updateLeaderboards(speciesPop, speciesEnergy);
    
    stepCountEl.textContent = simulationStep.toLocaleString();
    totalPopulationEl.textContent = allReplicators.length.toLocaleString();
    speciesCountEl.textContent = Object.values(allSpecies).filter(s => s.population > 0).length.toLocaleString();
    foodCountEl.textContent = foodPellets.length.toLocaleString();
    cycleStatusEl.textContent = isDay ? 'Day' : 'Night'; 

    if (evolutionPointsCountEl) {
        evolutionPointsCountEl.textContent = Math.floor(App.state.evolutionPoints).toLocaleString();
    }

    updateActiveToolUI();

    const sortedSpecies = Object.values(allSpecies)
        .filter(s => s.population > 0)
        .sort((a, b) => b.population - a.population);

    speciesListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < Math.min(sortedSpecies.length, 10); i++) {
        const species = sortedSpecies[i];
        const item = document.createElement('div');
        
        // --- EVOLVE GAME: Highlight Player Species ---
        if (species.id === App.state.playerSpeciesId) {
            item.className = 'flex items-center justify-between p-2 rounded-lg bg-purple-900/50 hover:bg-purple-800/50 transition-colors cursor-pointer border-2 border-purple-500';
        } else {
            item.className = 'flex items-center justify-between p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors cursor-pointer';
        }
        // --- END ---

        item.dataset.speciesId = species.id;
        
        const avgEnergy = (speciesEnergy[species.id] / species.population) || 0;

        const statsTitle = `R(Eff): ${species.replicationRate.toFixed(2)}, D(Drain): ${species.deathRate.toFixed(3)}, M(Mut): ${species.mutationRate.toFixed(2)}, A(Atk): ${species.attack.toFixed(2)}, Df(Def): ${species.defense.toFixed(2)}, S(Stl): ${species.stealth.toFixed(2)}, E(Max): ${species.maxEnergy.toFixed(0)}, Sz(Size): ${species.size.toFixed(1)}, Lf(Life): ${species.lifespan.toFixed(0)}, W(Waste): ${species.wasteTolerance.toFixed(2)}, Di(Diet): ${species.diet.toFixed(2)}, P(Perc): ${species.perception.toFixed(0)}, Sp(Spd): ${species.speed.toFixed(1)}`;

        item.innerHTML = `
            <div class="flex items-center space-x-3 min-w-0">
                <div class.flex-shrink-0 w-3 h-3 rounded-full" style="background-color: ${species.color}; border: 1px solid #fff3;"></div>
                <div class="min-w-0 flex-1">
                    <div class="text-white font-medium text-sm truncate">${species.name} ${species.id === App.state.playerSpeciesId ? '(You)' : ''}</div>
                    <div class="text-xs text-gray-400 break-words" title="${statsTitle}">
                        <span class="text-blue-300">R:</span>${species.replicationRate.toFixed(1)} 
                        <span class="text-red-300">D:</span>${species.deathRate.toFixed(2)} 
                        <span class="text-purple-300">M:</span>${species.mutationRate.toFixed(2)} 
                        <span class="text-yellow-300">A:</span>${species.attack.toFixed(2)} 
                        <span class="text-green-300">Df:</span>${species.defense.toFixed(2)} 
                        <span class="text-indigo-300">S:</span>${species.stealth.toFixed(2)} 
                        <span class="text-pink-300">E:</span>${species.maxEnergy.toFixed(0)} 
                        <span class="text-gray-300">Sz:</span>${species.size.toFixed(1)} 
                        <span class="text-orange-400">Lf:</span>${species.lifespan.toFixed(0)}
                        <span class="text-teal-300">W:</span>${species.wasteTolerance.toFixed(2)}
                        <span class="text-lime-300">Di:</span>${species.diet.toFixed(2)}
                        <span style="color: #fde047;">P:</span>${species.perception.toFixed(0)}
                        <span style="color: #fda4af;">Sp:</span>${species.speed.toFixed(1)}
                    </div>
                </div>
            </div>
            <div class="text-right flex-shrink-0 ml-2">
                <div class="text-white font-bold">${species.population}</div>
                <div class="text-xs text-yellow-400">${avgEnergy.toFixed(0)} E</div>
            </div>
        `;
        fragment.appendChild(item);
    }
    speciesListContainer.appendChild(fragment);

    updateGraphData(sortedSpecies);
}
        
export function updateActiveToolUI() {
    const ep = App.state.evolutionPoints;
    
    const tools = [
        { id: 'foodDropBtn', cost: App.config.POWER_COST_FOOD_DROP },
        { id: 'spawnAllyBtn', cost: App.config.POWER_COST_SPAWN_ALLY },
        { id: 'wasteBlightBtn', cost: App.config.POWER_COST_WASTE_BLIGHT }
    ];

    for (const tool of tools) {
        const btn = App.dom[tool.id];
        if (btn) {
            const hasEnoughEP = ep >= tool.cost;
            btn.disabled = !hasEnoughEP;

            if (App.state.activeTool === btn.dataset.tool && !hasEnoughEP) {
                App.state.activeTool = 'none';
                btn.classList.remove('tool-active');
            }
        }
    }
}

export function checkIndividualLeaderboards(rep) {
    const leaderboards = App.state.simulationHistory.leaderboards;
    
    if (rep.age > leaderboards.longestLivedIndividual.value) {
        leaderboards.longestLivedIndividual.value = rep.age;
        leaderboards.longestLivedIndividual.species = { ...rep.species, ageAchieved: rep.age };
    }
    if (rep.kills > leaderboards.mostKills.value) {
        leaderboards.mostKills.value = rep.kills;
        leaderboards.mostKills.species = { ...rep.species, killsAchieved: rep.kills };
    }
    if (rep.foodEaten > leaderboards.mostFoodEaten.value) {
        leaderboards.mostFoodEaten.value = rep.foodEaten;
        leaderboards.mostFoodEaten.species = { ...rep.species, foodAchieved: rep.foodEaten };
    }
    if (rep.replications > leaderboards.mostChildren.value) {
        leaderboards.mostChildren.value = rep.replications;
        leaderboards.mostChildren.species = { ...rep.species, childrenAchieved: rep.replications };
    }
}

export function updateLeaderboards(speciesPop = {}, speciesEnergy = {}) {
    const leaderboards = App.state.simulationHistory.leaderboards;
    
    for(const species of Object.values(App.state.allSpecies)) {
        const pop = speciesPop[species.id] || species.population; 
        if (pop > species.peakPopulation) {
            species.peakPopulation = pop;
        }
        
        const avgEnergy = (speciesEnergy[species.id] / pop) || 0;
        if (avgEnergy > species.peakAvgEnergy) {
            species.peakAvgEnergy = avgEnergy;
        }
        
        const lineageDuration = (species.extinctionStep !== -1 ? species.extinctionStep : App.state.simulationStep) - species.spawnStep;

        if (species.peakPopulation > leaderboards.peakPopulation.value) {
            leaderboards.peakPopulation.value = species.peakPopulation;
            leaderboards.peakPopulation.species = { ...species };
        }
        if (lineageDuration > leaderboards.longestLineage.value) {
            leaderboards.longestLineage.value = lineageDuration;
            leaderboards.longestLineage.species = { ...species };
        }
        if (species.totalKills > leaderboards.totalKillsSpecies.value) {
            leaderboards.totalKillsSpecies.value = species.totalKills;
            leaderboards.totalKillsSpecies.species = { ...species };
        }
        if (species.totalFoodEaten > leaderboards.totalFoodEatenSpecies.value) {
            leaderboards.totalFoodEatenSpecies.value = species.totalFoodEaten;
            leaderboards.totalFoodEatenSpecies.species = { ...species };
        }
        if (species.totalReplications > leaderboards.totalReplicationsSpecies.value) {
            leaderboards.totalReplicationsSpecies.value = species.totalReplications;
            leaderboards.totalReplicationsSpecies.species = { ...species };
        }
        if (species.peakAvgEnergy > leaderboards.peakAverageEnergy.value) {
            leaderboards.peakAverageEnergy.value = species.peakAvgEnergy;
            leaderboards.peakAverageEnergy.species = { ...species };
        }
        if (species.totalWasteProduced > leaderboards.mostToxic.value) {
            leaderboards.mostToxic.value = species.totalWasteProduced;
            leaderboards.mostToxic.species = { ...species };
        }
        
        if (species.attack > leaderboards.topPredator.value) {
            leaderboards.topPredator.value = species.attack;
            leaderboards.topPredator.species = { ...species };
        }
        if (species.defense > leaderboards.masterDefender.value) {
            leaderboards.masterDefender.value = species.defense;
            leaderboards.masterDefender.species = { ...species };
        }
        if (species.replicationRate > leaderboards.mostEfficient.value) {
            leaderboards.mostEfficient.value = species.replicationRate;
            leaderboards.mostEfficient.species = { ...species };
        }
        if (species.wasteTolerance > leaderboards.mostResistant.value) {
            leaderboards.mostResistant.value = species.wasteTolerance;
            leaderboards.mostResistant.species = { ...species };
        }
        if (species.maxEnergy > leaderboards.energyHoarder.value) {
            leaderboards.energyHoarder.value = species.maxEnergy;
            leaderboards.energyHoarder.species = { ...species };
        }
        if (species.speed > leaderboards.fastest.value) {
            leaderboards.fastest.value = species.speed;
            leaderboards.fastest.species = { ...species };
        }
        if (species.stealth > leaderboards.stealthiest.value) {
            leaderboards.stealthiest.value = species.stealth;
            leaderboards.stealthiest.species = { ...species };
        }
        if (species.size > leaderboards.largest.value) {
            leaderboards.largest.value = species.size;
            leaderboards.largest.species = { ...species };
        }
        if (species.perception > leaderboards.bestPerception.value) {
            leaderboards.bestPerception.value = species.perception;
            leaderboards.bestPerception.species = { ...species };
        }
    }
    
    for(const rep of App.state.allReplicators) {
        if (rep.currentEnergy > leaderboards.highestEnergyHeld.value) {
            leaderboards.highestEnergyHeld.value = rep.currentEnergy;
            leaderboards.highestEnergyHeld.species = { ...rep.species, energyAchieved: rep.currentEnergy };
        }
    }
}

/**
 * Renders the list of leaderboard categories in the modal.
 */
export function updateLeaderboardUI() {
    const { leaderboardList, leaderboardDetail } = App.dom;
    const leaderboards = App.state.simulationHistory.leaderboards;

    leaderboardList.innerHTML = '';
    
    if (leaderboardDetail && !leaderboardDetail.querySelector('.species-detail-card')) {
         leaderboardDetail.innerHTML = '<div class="text-gray-400 text-center mt-10">Select a record to view species details.</div>';
    }
    
    for (const [key, entry] of Object.entries(leaderboards)) {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors cursor-pointer';
        item.dataset.leaderboardKey = key;
        item.onclick = () => showLeaderboardDetails(key);
        
        let valueStr = entry.value.toFixed(2);
        if (['peakPopulation', 'longestLivedIndividual', 'longestLineage', 'mostKills', 'mostFoodEaten', 'mostChildren', 'totalKillsSpecies', 'totalFoodEatenSpecies', 'totalReplicationsSpecies', 'highestEnergyHeld', 'peakAverageEnergy', 'mostToxic', 'lifespan', 'perception', 'maxEnergy', 'size'].includes(key)) {
            valueStr = entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 });
        }

        item.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-white">${entry.label}</span>
                <span class="text-sm font-bold text-yellow-300">${valueStr}${entry.unit}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">
                ${entry.species ? `by ${entry.species.name}` : 'N/A'}
            </div>
        `;
        leaderboardList.appendChild(item);
    }
}

/**
 * Renders the details for a clicked leaderboard item.
 */
export function showLeaderboardDetails(categoryKey) {
    const { leaderboardList, leaderboardDetail } = App.dom;
    const entry = App.state.simulationHistory.leaderboards[categoryKey];
    const species = entry.species;
    
    if (!species) {
        leaderboardDetail.innerHTML = '<div class="text-gray-400 text-center mt-10">No species has set this record yet.</div>';
        return;
    }

    Array.from(leaderboardList.children).forEach(child => {
        child.classList.toggle('bg-gray-600/80', child.dataset.leaderboardKey === categoryKey);
    });
    
    let recordString = '';
    switch(categoryKey) {
        case 'longestLivedIndividual':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Age:</span><span class="font-medium text-white">${(species.ageAchieved || 0).toLocaleString()} steps</span></div>`;
            break;
        case 'peakPopulation':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Population:</span><span class="font-medium text-white">${(species.peakPopulation || 0).toLocaleString()}</span></div>`;
            break;
        case 'mostKills':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Kills (Indiv.):</span><span class="font-medium text-white">${(species.killsAchieved || 0).toLocaleString()}</span></div>`;
            break;
        case 'mostFoodEaten':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Food (Indiv.):</span><span class="font-medium text-white">${(species.foodAchieved || 0).toLocaleString()}</span></div>`;
            break;
        case 'mostChildren':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Offspring (Indiv.):</span><span class="font-medium text-white">${(species.childrenAchieved || 0).toLocaleString()}</span></div>`;
            break;
        case 'longestLineage':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Lineage Duration:</span><span class="font-medium text-white">${(entry.value || 0).toLocaleString()} steps</span></div>`;
            break;
        case 'totalKillsSpecies':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Total Kills (Species):</span><span class="font-medium text-white">${(species.totalKills || 0).toLocaleString()}</span></div>`;
            break;
        case 'totalFoodEatenSpecies':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Total Food (Species):</span><span class="font-medium text-white">${(species.totalFoodEaten || 0).toLocaleString()}</span></div>`;
            break;
        case 'totalReplicationsSpecies':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Total Offspring (Species):</span><span class="font-medium text-white">${(species.totalReplications || 0).toLocaleString()}</span></div>`;
            break;
        case 'highestEnergyHeld':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Energy (Indiv.):</span><span class="font-medium text-white">${(species.energyAchieved || entry.value || 0).toFixed(0)} E</span></div>`;
            break;
         case 'peakAverageEnergy':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Record Avg. Energy (Species):</span><span class="font-medium text-white">${(species.peakAvgEnergy || 0).toFixed(0)} E</span></div>`;
            break;
        case 'mostToxic':
            recordString = `<div class="flex justify-between"><span class="text-gray-400">Total Waste (Species):</span><span class="font-medium text-white">${(species.totalWasteProduced || 0).toFixed(0)}</span></div>`;
            break;
        default:
            recordString = `<div class="flex justify-between"><span class="text-gray-400">${entry.label}:</span><span class="font-medium text-white">${(entry.value || 0).toFixed(2)}</span></div>`;
            break;
    }

    leaderboardDetail.innerHTML = `
        <div class="species-detail-card p-2 rounded-lg bg-gray-700">
            <div class="flex items-center space-x-3 mb-4">
                <div class="flex-shrink-0 w-8 h-8 rounded-full" style="background-color: ${species.color}; border: 2px solid #fff3;"></div>
                <h3 class="text-xl font-bold text-white truncate">${species.name}</h3>
            </div>
            <div class="space-y-2 text-sm">
                ${recordString}
                
                <hr class="border-gray-600 my-2">
                <div class="text-base font-semibold text-gray-200 mb-1">Genetic Stats at Time of Record</div>

                <div class="flex justify-between"><span class="text-blue-300">R (Efficiency):</span><span class="font-medium text-white">${(species.replicationRate || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-red-300">D (Drain):</span><span class="font-medium text-white">${(species.deathRate || 0).toFixed(3)}</span></div>
                <div class="flex justify-between"><span class="text-purple-300">M (Mutation):</span><span class="font-medium text-white">${(species.mutationRate || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-yellow-300">A (Attack):</span><span class="font-medium text-white">${(species.attack || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-green-300">Df (Defense):</span><span class="font-medium text-white">${(species.defense || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-indigo-300">S (Stealth):</span><span class="font-medium text-white">${(species.stealth || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-pink-300">E (Max Energy):</span><span class="font-medium text-white">${(species.maxEnergy || 0).toFixed(0)}</span></div>
                <div class="flex justify-between"><span class="text-gray-300">Sz (Size):</span><span class="font-medium text-white">${(species.size || 0).toFixed(1)}</span></div>
                <div class="flex justify-between"><span class="text-orange-400">Lf (Lifespan):</span><span class="font-medium text-white">${(species.lifespan || 0).toFixed(0)}</span></div>
                <div class="flex justify-between"><span class="text-teal-300">W (Waste Tol.):</span><span class="font-medium text-white">${(species.wasteTolerance || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-lime-300">Di (Diet):</span><span class="font-medium text-white">${(species.diet || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span style="color: #fde047;">P (Perception):</span><span class="font-medium text-white">${(species.perception || 0).toFixed(0)}</span></div>
                <div class="flex justify-between"><span style="color: #fda4af;">Sp (Speed):</span><span class="font-medium text-white">${(species.speed || 0).toFixed(1)}</span></div>
            </div>
        </div>
    `;
}

/**
 * Attaches all event listeners to the DOM.
 */
export function setupEventHandlers() {
    const dom = App.dom; 
    
    dom.startStopBtn.addEventListener('click', App.handlers.toggleSimulation);
    dom.resetBtn.addEventListener('click', App.handlers.resetSimulation); 
    
    dom.stepsPerFrameSlider.addEventListener('input', (e) => {
        App.state.stepsPerFrame = parseInt(e.target.value, 10);
        dom.stepsPerFrameValue.textContent = App.state.stepsPerFrame;
    });
    
    dom.leaderboardBtn.addEventListener('click', () => {
        updateLeaderboards();
        updateLeaderboardUI();
        updateSpeciesHistoryList(); 
        
        dom.leaderboardModal.classList.remove('hidden');
        
        dom.leaderboardContent.classList.remove('hidden');
        dom.speciesHistoryContent.classList.add('hidden');
        dom.tabLeaderboard.classList.add('tab-active');
        dom.tabSpeciesHistory.classList.remove('tab-active');
    });
    
    dom.closeModalBtn.addEventListener('click', () => { 
        dom.leaderboardModal.classList.add('hidden');
        Array.from(dom.leaderboardList.children).forEach(child => {
            child.classList.remove('bg-gray-600/80');
        });
        dom.leaderboardDetail.innerHTML = '<div class="text-gray-400 text-center mt-10">Select a record to view species details.</div>';
         Array.from(dom.speciesHistoryList.children).forEach(child => {
            child.classList.remove('bg-gray-600/80');
        });
        dom.speciesHistoryDetail.innerHTML = '<div class="text-gray-400 text-center mt-10">Select a species to view details.</div>';
    });

    dom.tabLeaderboard.addEventListener('click', () => {
        dom.leaderboardContent.classList.remove('hidden');
        dom.speciesHistoryContent.classList.add('hidden');
        dom.tabLeaderboard.classList.add('tab-active');
        dom.tabSpeciesHistory.classList.remove('tab-active');
    });
    
    dom.tabSpeciesHistory.addEventListener('click', () => {
        dom.leaderboardContent.classList.add('hidden');
        dom.speciesHistoryContent.classList.remove('hidden');
        dom.tabLeaderboard.classList.remove('tab-active');
        dom.tabSpeciesHistory.classList.add('tab-active');
    });
    
    dom.toggleCameraBtn.addEventListener('click', App.handlers.toggleCameraMode);

    dom.evolveBtn.addEventListener('click', App.handlers.openEvolveModal);
    dom.closeEvolveModalBtn.addEventListener('click', App.handlers.closeEvolveModal);

    dom.evolveModal.addEventListener('click', (e) => {
        const button = e.target.closest('.evolve-btn');
        if (button && !button.disabled) {
            const trait = button.dataset.trait;
            if (trait) {
                App.handlers.upgradePlayerTrait(trait);
            }
        }
    });
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool) {
                App.handlers.handleToolSelect(tool);
            }
        });
    });
    
    const resizeObserver = new ResizeObserver(entries => {
        window.requestAnimationFrame(() => { 
            if (!Array.isArray(entries) || !entries.length) { 
                return;
            }
            App.handlers.handleResize();
        });
    });
    
    if (dom.canvasContainer) {
        resizeObserver.observe(dom.canvasContainer);
    }
}
export function updateSpeciesHistoryList() {
    const { speciesHistoryList, speciesHistoryDetail } = App.dom;
    const allSpecies = Object.values(App.state.allSpecies).sort((a, b) => a.spawnStep - b.spawnStep);

    speciesHistoryList.innerHTML = '';
    
    if (speciesHistoryDetail && !speciesHistoryDetail.querySelector('.species-detail-card')) {
         speciesHistoryDetail.innerHTML = '<div class="text-gray-400 text-center mt-10">Select a species to view details.</div>';
    }
    
    for (const species of allSpecies) {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors cursor-pointer';
        item.dataset.speciesId = species.id;
        item.onclick = () => showSpeciesHistoryDetails(species.id);
        
        const statusDot = species.extinctionStep === -1 
            ? '<span class="w-2 h-2 rounded-full bg-green-400" title="Alive"></span>' 
            : '<span class="w-2 h-2 rounded-full bg-red-400" title="Extinct"></span>';
        
        const lifespan = species.extinctionStep === -1 
            ? `(Age: ${App.state.simulationStep - species.spawnStep})`
            : `(Lived: ${species.extinctionStep - species.spawnStep} steps)`;
        
        const playerName = species.id === App.state.playerSpeciesId ? ' (You)' : '';

        item.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <div class="flex-shrink-0 w-3 h-3 rounded-full" style="background-color: ${species.color}; border: 1px solid #fff3;"></div>
                    <span class="text-sm font-medium text-white">${species.name}${playerName}</span>
                    ${statusDot}
                </div>
                <span class="text-sm font-bold text-yellow-300">${species.peakPopulation.toLocaleString()}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">
                Spawned: step ${species.spawnStep.toLocaleString()} ${lifespan}
            </div>
        `;
        speciesHistoryList.appendChild(item);
    }
}

/**
 * Renders the details for a clicked species from the history list.
 */
export function showSpeciesHistoryDetails(speciesId) {
    const { speciesHistoryList, speciesHistoryDetail } = App.dom;
    const species = App.state.allSpecies[speciesId];

    let parentName = "Primordial"; // Default for initial species
    if (species.parentSpeciesId !== null && App.state.allSpecies[species.parentSpeciesId]) {
        parentName = App.state.allSpecies[species.parentSpeciesId].name;
    }
    
    if (!species) {
        speciesHistoryDetail.innerHTML = '<div class="text-gray-400 text-center mt-10">Error: Could not find species data.</div>';
        return;
    }

    Array.from(speciesHistoryList.children).forEach(child => {
        child.classList.toggle('bg-gray-600/80', child.dataset.speciesId == speciesId);
    });
    
    const lineage = species.extinctionStep === -1
        ? `Born: Step ${species.spawnStep.toLocaleString()} (Alive)`
        : `Born: Step ${species.spawnStep.toLocaleString()} | Died: Step ${species.extinctionStep.toLocaleString()}`;
    
    const playerName = species.id === App.state.playerSpeciesId ? ' (You)' : '';

    speciesHistoryDetail.innerHTML = `
        <div class="species-detail-card p-2 rounded-lg bg-gray-700">
            <div class="flex items-center space-x-3 mb-4">
                <div class="flex-shrink-0 w-8 h-8 rounded-full" style="background-color: ${species.color}; border: 2px solid #fff3;"></div>
                <h3 class="text-xl font-bold text-white truncate">${species.name}${playerName}</h3>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-400">Lineage:</span><span class="font-medium text-white">${lineage}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Mutated From:</span><span class"font-medium text-white">${parentName}</span></div> <div class="flex justify-between"><span class="text-gray-400">Peak Population:</span><span class="font-medium text-white">${(species.peakPopulation || 0).toLocaleString()}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Peak Population:</span><span class="font-medium text-white">${(species.peakPopulation || 0).toLocaleString()}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Total Kills:</span><span class="font-medium text-white">${(species.totalKills || 0).toLocaleString()}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Total Food:</span><span class="font-medium text-white">${(species.totalFoodEaten || 0).toLocaleString()}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Total Offspring:</span><span class="font-medium text-white">${(species.totalReplications || 0).toLocaleString()}</span></div>
                
                <hr class="border-gray-600 my-2">
                <div class="text-base font-semibold text-gray-200 mb-1">Final Genetic Stats</div>

                <div class="flex justify-between"><span class="text-blue-300">R (Efficiency):</span><span class="font-medium text-white">${(species.replicationRate || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-red-300">D (Drain):</span><span class="font-medium text-white">${(species.deathRate || 0).toFixed(3)}</span></div>
                <div class="flex justify-between"><span class="text-purple-300">M (Mutation):</span><span class="font-medium text-white">${(species.mutationRate || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-yellow-300">A (Attack):</span><span class="font-medium text-white">${(species.attack || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-green-300">Df (Defense):</span><span class="font-medium text-white">${(species.defense || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-indigo-300">S (Stealth):</span><span class="font-medium text-white">${(species.stealth || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-pink-300">E (Max Energy):</span><span class="font-medium text-white">${(species.maxEnergy || 0).toFixed(0)}</span></div>
                <div class="flex justify-between"><span class="text-gray-300">Sz (Size):</span><span class="font-medium text-white">${(species.size || 0).toFixed(1)}</span></div>
                <div class="flex justify-between"><span class="text-orange-400">Lf (Lifespan):</span><span class="font-medium text-white">${(species.lifespan || 0).toFixed(0)}</span></div>
                <div class="flex justify-between"><span class="text-teal-300">W (Waste Tol.):</span><span class="font-medium text-white">${(species.wasteTolerance || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-lime-300">Di (Diet):</span><span class="font-medium text-white">${(species.diet || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span style="color: #fde047;">P (Perception):</span><span class="font-medium text-white">${(species.perception || 0).toFixed(0)}</span></div>
                <div class="flex justify-between"><span style="color: #fda4af;">Sp (Speed):</span><span class="font-medium text-white">${(species.speed || 0).toFixed(1)}</span></div>
            </div>
        </div>
    `;
}