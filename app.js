// Terrain Grid Simulator - Standalone Version (No Google Maps API Required)
class TerrainGridSimulator {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.baseImage = null;
        this.gridCells = [];
        this.gridData = new Map();
        this.selectedTerrain = null;
        this.paintMode = false;

        // Default area parameters
        this.areaWidth = 500; // meters
        this.areaHeight = 500; // meters
        this.gridCellSize = 50; // meters (0.25 hectares = 50m x 50m)

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
        this.setupCanvas();
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

        // Image upload
        document.getElementById('uploadImageBtn').addEventListener('click', () => {
            document.getElementById('imageFile').click();
        });

        document.getElementById('imageFile').addEventListener('change', (e) => {
            this.loadImage(e);
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

        // Canvas click handling
        this.canvas.addEventListener('click', (e) => {
            this.onCanvasClick(e);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.redraw();
        });
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.updateAreaDisplay();
    }

    loadImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.baseImage = img;
                document.getElementById('imageInfo').textContent =
                    `Image loaded: ${img.width}x${img.height}px`;
                this.redraw();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        event.target.value = '';
    }

    createGrid() {
        this.gridCells = [];

        const cellsWidth = Math.ceil(this.areaWidth / this.gridCellSize);
        const cellsHeight = Math.ceil(this.areaHeight / this.gridCellSize);

        const cellWidth = this.canvas.width / cellsWidth;
        const cellHeight = this.canvas.height / cellsHeight;

        for (let i = 0; i < cellsHeight; i++) {
            for (let j = 0; j < cellsWidth; j++) {
                const cellId = `${i}-${j}`;
                this.gridCells.push({
                    id: cellId,
                    x: j * cellWidth,
                    y: i * cellHeight,
                    width: cellWidth,
                    height: cellHeight,
                    row: i,
                    col: j
                });
            }
        }

        // Calculate hectares per cell
        const hectaresPerCell = (this.gridCellSize * this.gridCellSize) / 10000;

        // Update grid info
        document.getElementById('gridInfo').textContent =
            `Grid: ${cellsWidth} x ${cellsHeight} cells (${cellsWidth * cellsHeight} total) - Each cell = ${hectaresPerCell.toFixed(2)} Ha`;

        this.updateStatistics();
    }

    redraw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw base image if loaded
        if (this.baseImage) {
            this.ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Draw background
            this.ctx.fillStyle = '#f0f0f0';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw "Upload Image" text
            this.ctx.fillStyle = '#666';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Click "Upload Terrain/Map Image" to begin',
                this.canvas.width / 2, this.canvas.height / 2);
        }

        // Create and draw grid
        this.createGrid();
        this.drawGrid();
    }

    drawGrid() {
        this.gridCells.forEach(cell => {
            const cellData = this.gridData.get(cell.id);

            // Draw terrain fill if exists
            if (cellData && cellData.terrain) {
                this.ctx.fillStyle = this.terrainColors[cellData.terrain];
                this.ctx.globalAlpha = 0.6;
                this.ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
                this.ctx.globalAlpha = 1.0;
            }

            // Draw grid lines
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
        });
    }

    onCanvasClick(event) {
        if (!this.paintMode || !this.selectedTerrain) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Find clicked cell
        const cell = this.gridCells.find(c =>
            x >= c.x && x <= c.x + c.width &&
            y >= c.y && y <= c.y + c.height
        );

        if (cell) {
            this.paintCell(cell.id, this.selectedTerrain);
        }
    }

    paintCell(cellId, terrain) {
        if (terrain === 'clear') {
            this.gridData.delete(cellId);
        } else {
            this.gridData.set(cellId, { terrain: terrain });
        }
        this.redraw();
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

    applyGridSettings() {
        this.gridCellSize = parseInt(document.getElementById('gridSize').value);
        this.areaWidth = parseFloat(document.getElementById('areaWidth').value);
        this.areaHeight = parseFloat(document.getElementById('areaHeight').value);
        this.updateAreaDisplay();
        this.redraw();
    }

    updateAreaDisplay() {
        const areaSqKm = (this.areaWidth * this.areaHeight) / 1000000;
        document.getElementById('areaSizeDisplay').textContent = `Area: ${areaSqKm.toFixed(3)} sq km`;
        document.getElementById('selectedAreaInfo').textContent = `${areaSqKm.toFixed(3)} sq km`;
    }

    clearAllTerrain() {
        if (confirm('Clear all terrain data?')) {
            this.gridData.clear();
            this.redraw();
        }
    }

    resetGrid() {
        if (confirm('Reset grid to default settings?')) {
            document.getElementById('areaWidth').value = 500;
            document.getElementById('areaHeight').value = 500;
            document.getElementById('gridSize').value = 50;
            this.gridData.clear();
            this.applyGridSettings();
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
            version: '3.0',
            timestamp: new Date().toISOString(),
            area: {
                width: this.areaWidth,
                height: this.areaHeight
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
                if (config.version === '3.0' || config.version === '2.0') {
                    this.areaWidth = config.area.width || config.area.width;
                    this.areaHeight = config.area.height || config.area.height;
                } else {
                    // Legacy v1.0 format
                    const sideLengthMeters = Math.sqrt(config.area.sizeKm * 1000000);
                    this.areaWidth = sideLengthMeters;
                    this.areaHeight = sideLengthMeters;
                }

                document.getElementById('areaWidth').value = this.areaWidth;
                document.getElementById('areaHeight').value = this.areaHeight;

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
                this.applyGridSettings();

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

// Initialize the simulator when page loads
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new TerrainGridSimulator();
});
