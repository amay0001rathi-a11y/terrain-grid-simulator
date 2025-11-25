// Terrain Grid Simulator
class TerrainGridSimulator {
    constructor() {
        this.map = null;
        this.areaRectangle = null;
        this.gridCells = [];
        this.gridData = new Map();
        this.selectedTerrain = null;
        this.paintMode = false;

        // Default area parameters (0.26 sq km)
        this.areaSizeKm = 0.26;
        this.centerLat = 13.3671; // Cambodia coordinates from image
        this.centerLng = 103.8448;
        this.gridCellSize = 50; // meters

        // Terrain colors
        this.terrainColors = {
            forest: '#228B22',
            rocky: '#808080',
            water: '#1E90FF',
            uxo: '#FF0000',
            road: '#000000',
            clear: '#FFFFFF'
        };

        this.initEventListeners();
    }

    initEventListeners() {
        // File operations
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importConfiguration(e);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportConfiguration();
        });

        // Area setup
        document.getElementById('applyArea').addEventListener('click', () => {
            this.applyAreaSettings();
        });

        // Grid configuration
        document.getElementById('applyGrid').addEventListener('click', () => {
            this.applyGridSettings();
        });

        // Terrain selection
        document.querySelectorAll('.terrain-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTerrain(e.target.dataset.terrain, e.target);
            });
        });

        // Paint mode
        document.getElementById('paintMode').addEventListener('change', (e) => {
            this.paintMode = e.target.checked;
        });

        // Edit controls
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllTerrain();
        });

        document.getElementById('resetGrid').addEventListener('click', () => {
            this.resetGrid();
        });
    }

    initMap() {
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: this.centerLat, lng: this.centerLng },
            zoom: 15,
            mapTypeId: 'satellite'
        });

        this.drawArea();
        this.createGrid();
    }

    drawArea() {
        // Remove existing rectangle
        if (this.areaRectangle) {
            this.areaRectangle.setMap(null);
        }

        // Calculate bounds for 0.26 sq km area
        const sideLengthKm = Math.sqrt(this.areaSizeKm);
        const sideLengthDeg = sideLengthKm / 111; // Rough conversion

        const bounds = {
            north: this.centerLat + sideLengthDeg / 2,
            south: this.centerLat - sideLengthDeg / 2,
            east: this.centerLng + sideLengthDeg / 2,
            west: this.centerLng - sideLengthDeg / 2
        };

        this.areaRectangle = new google.maps.Rectangle({
            bounds: bounds,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 3,
            fillColor: '#FF0000',
            fillOpacity: 0.1,
            map: this.map
        });

        this.bounds = bounds;
    }

    createGrid() {
        // Clear existing grid
        this.gridCells.forEach(cell => cell.setMap(null));
        this.gridCells = [];

        if (!this.bounds) return;

        // Calculate number of cells
        const sideLengthMeters = Math.sqrt(this.areaSizeKm * 1000000);
        const cellsPerSide = Math.ceil(sideLengthMeters / this.gridCellSize);

        const latStep = (this.bounds.north - this.bounds.south) / cellsPerSide;
        const lngStep = (this.bounds.east - this.bounds.west) / cellsPerSide;

        // Create grid cells
        for (let i = 0; i < cellsPerSide; i++) {
            for (let j = 0; j < cellsPerSide; j++) {
                const cellBounds = {
                    north: this.bounds.south + (i + 1) * latStep,
                    south: this.bounds.south + i * latStep,
                    east: this.bounds.west + (j + 1) * lngStep,
                    west: this.bounds.west + j * lngStep
                };

                const cellId = `${i}-${j}`;
                const cellData = this.gridData.get(cellId) || { terrain: null };

                const rectangle = new google.maps.Rectangle({
                    bounds: cellBounds,
                    strokeColor: '#FFFFFF',
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                    fillColor: cellData.terrain ? this.terrainColors[cellData.terrain] : '#FFFFFF',
                    fillOpacity: cellData.terrain ? 0.6 : 0.1,
                    map: this.map,
                    clickable: true
                });

                rectangle.cellId = cellId;

                rectangle.addListener('click', () => {
                    this.onCellClick(rectangle, cellId);
                });

                this.gridCells.push(rectangle);
            }
        }

        // Update grid info
        document.getElementById('gridInfo').textContent = `Grid: ${cellsPerSide} x ${cellsPerSide} cells (${cellsPerSide * cellsPerSide} total)`;
        this.updateStatistics();
    }

    onCellClick(rectangle, cellId) {
        if (this.paintMode && this.selectedTerrain) {
            this.paintCell(rectangle, cellId, this.selectedTerrain);
        }
    }

    paintCell(rectangle, cellId, terrain) {
        if (terrain === 'clear') {
            this.gridData.delete(cellId);
            rectangle.setOptions({
                fillColor: '#FFFFFF',
                fillOpacity: 0.1
            });
        } else {
            this.gridData.set(cellId, { terrain: terrain });
            rectangle.setOptions({
                fillColor: this.terrainColors[terrain],
                fillOpacity: 0.6
            });
        }
        this.updateStatistics();
    }

    selectTerrain(terrain, button) {
        // Remove active class from all buttons
        document.querySelectorAll('.terrain-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected button
        button.classList.add('active');

        this.selectedTerrain = terrain;
        document.getElementById('selectedTerrain').textContent =
            terrain.charAt(0).toUpperCase() + terrain.slice(1);
    }

    applyAreaSettings() {
        this.centerLat = parseFloat(document.getElementById('centerLat').value);
        this.centerLng = parseFloat(document.getElementById('centerLng').value);

        this.map.setCenter({ lat: this.centerLat, lng: this.centerLng });
        this.drawArea();
        this.createGrid();
    }

    applyGridSettings() {
        this.gridCellSize = parseInt(document.getElementById('gridSize').value);
        this.createGrid();
    }

    clearAllTerrain() {
        if (confirm('Clear all terrain data?')) {
            this.gridData.clear();
            this.createGrid();
        }
    }

    resetGrid() {
        if (confirm('Reset grid to default settings?')) {
            document.getElementById('centerLat').value = 13.3671;
            document.getElementById('centerLng').value = 103.8448;
            document.getElementById('gridSize').value = 50;
            this.gridData.clear();
            this.applyAreaSettings();
        }
    }

    updateStatistics() {
        const stats = {
            forest: 0,
            rocky: 0,
            water: 0,
            uxo: 0,
            road: 0,
            clear: 0
        };

        this.gridData.forEach(cell => {
            if (cell.terrain && stats.hasOwnProperty(cell.terrain)) {
                stats[cell.terrain]++;
            }
        });

        const totalCells = this.gridCells.length;
        stats.clear = totalCells - (stats.forest + stats.rocky + stats.water + stats.uxo + stats.road);

        document.getElementById('totalCells').textContent = totalCells;
        document.getElementById('forestCount').textContent = stats.forest;
        document.getElementById('rockyCount').textContent = stats.rocky;
        document.getElementById('waterCount').textContent = stats.water;
        document.getElementById('uxoCount').textContent = stats.uxo;
        document.getElementById('roadCount').textContent = stats.road;
        document.getElementById('clearCount').textContent = stats.clear;
    }

    exportConfiguration() {
        const config = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            area: {
                centerLat: this.centerLat,
                centerLng: this.centerLng,
                sizeKm: this.areaSizeKm
            },
            grid: {
                cellSize: this.gridCellSize
            },
            terrainData: Array.from(this.gridData.entries()).map(([cellId, data]) => ({
                cellId,
                terrain: data.terrain
            }))
        };

        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `terrain-grid-${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    importConfiguration(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);

                // Apply area settings
                this.centerLat = config.area.centerLat;
                this.centerLng = config.area.centerLng;
                this.areaSizeKm = config.area.sizeKm;

                document.getElementById('centerLat').value = this.centerLat;
                document.getElementById('centerLng').value = this.centerLng;

                // Apply grid settings
                this.gridCellSize = config.grid.cellSize;
                document.getElementById('gridSize').value = this.gridCellSize;

                // Clear existing data
                this.gridData.clear();

                // Load terrain data
                config.terrainData.forEach(item => {
                    this.gridData.set(item.cellId, { terrain: item.terrain });
                });

                // Redraw
                this.applyAreaSettings();

                alert('Configuration imported successfully!');
            } catch (error) {
                alert('Error importing configuration: ' + error.message);
            }
        };
        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    }
}

// Global variable for the simulator
let simulator;

// Initialize the map
function initMap() {
    simulator = new TerrainGridSimulator();
    simulator.initMap();
}
