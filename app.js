// Terrain Grid Simulator - Standalone Version with Boundary Box
class TerrainGridSimulator {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.baseImage = null;
        this.gridCells = [];
        this.gridData = new Map();
        this.selectedTerrain = null;
        this.paintMode = false;

        // Boundary box
        this.boundaryBox = null; // {x, y, width, height} in canvas coordinates
        this.drawingBoundary = false;
        this.boundaryStart = null;

        // Area parameters
        this.boxAreaSqMeters = 250000; // Default 0.25 sq km
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

        // Boundary box drawing
        document.getElementById('drawBoundaryBtn').addEventListener('click', () => {
            this.enableBoundaryDrawing();
        });

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

        // Canvas interactions
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

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
                this.boundaryBox = null; // Reset boundary when new image loaded
                this.redraw();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        event.target.value = '';
    }

    enableBoundaryDrawing() {
        if (!this.baseImage) {
            alert('Please upload an image first!');
            return;
        }
        this.drawingBoundary = true;
        this.canvas.style.cursor = 'crosshair';
        alert('Click and drag to draw a boundary box on the image');
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.drawingBoundary) {
            this.boundaryStart = { x, y };
        } else if (this.paintMode && this.selectedTerrain && this.boundaryBox) {
            // Paint cell
            this.onCanvasClick(x, y);
        }
    }

    onMouseMove(e) {
        if (!this.drawingBoundary || !this.boundaryStart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Draw temporary boundary
        this.redraw();
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
            this.boundaryStart.x,
            this.boundaryStart.y,
            x - this.boundaryStart.x,
            y - this.boundaryStart.y
        );
    }

    onMouseUp(e) {
        if (!this.drawingBoundary || !this.boundaryStart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const width = Math.abs(x - this.boundaryStart.x);
        const height = Math.abs(y - this.boundaryStart.y);

        if (width > 10 && height > 10) {
            this.boundaryBox = {
                x: Math.min(this.boundaryStart.x, x),
                y: Math.min(this.boundaryStart.y, y),
                width: width,
                height: height
            };

            document.getElementById('boundaryInfo').textContent =
                `Box drawn: ${Math.round(width)}x${Math.round(height)}px`;
        }

        this.drawingBoundary = false;
        this.boundaryStart = null;
        this.canvas.style.cursor = 'default';
        this.redraw();
    }

    applyAreaSettings() {
        const boxArea = parseFloat(document.getElementById('boxArea').value);
        this.boxAreaSqMeters = boxArea;
        this.updateAreaDisplay();
        this.redraw();
    }

    createGrid() {
        this.gridCells = [];

        if (!this.boundaryBox) return;

        // Calculate number of cells based on area and cell size
        const cellAreaSqMeters = this.gridCellSize * this.gridCellSize; // 2500 m² for 50m cells
        const totalCells = Math.ceil(this.boxAreaSqMeters / cellAreaSqMeters);

        // Try to make grid as square as possible
        const aspectRatio = this.boundaryBox.width / this.boundaryBox.height;
        const cellsHeight = Math.ceil(Math.sqrt(totalCells / aspectRatio));
        const cellsWidth = Math.ceil(totalCells / cellsHeight);

        const cellWidth = this.boundaryBox.width / cellsWidth;
        const cellHeight = this.boundaryBox.height / cellsHeight;

        for (let i = 0; i < cellsHeight; i++) {
            for (let j = 0; j < cellsWidth; j++) {
                const cellId = `${i}-${j}`;
                this.gridCells.push({
                    id: cellId,
                    x: this.boundaryBox.x + j * cellWidth,
                    y: this.boundaryBox.y + i * cellHeight,
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
            return;
        }

        // Draw boundary box if exists
        if (this.boundaryBox) {
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(
                this.boundaryBox.x,
                this.boundaryBox.y,
                this.boundaryBox.width,
                this.boundaryBox.height
            );

            // Create and draw grid inside boundary
            this.createGrid();
            this.drawGrid();
        }
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

    onCanvasClick(x, y) {
        if (!this.paintMode || !this.selectedTerrain) return;

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
        this.redraw();
    }

    updateAreaDisplay() {
        const areaSqKm = this.boxAreaSqMeters / 1000000;
        const areaHectares = this.boxAreaSqMeters / 10000;
        document.getElementById('areaSizeDisplay').textContent =
            `Area: ${areaSqKm.toFixed(3)} sq km (${areaHectares.toFixed(2)} Ha)`;
        document.getElementById('selectedAreaInfo').textContent =
            `${areaSqKm.toFixed(3)} sq km`;
    }

    clearAllTerrain() {
        if (confirm('Clear all terrain data?')) {
            this.gridData.clear();
            this.redraw();
        }
    }

    resetGrid() {
        if (confirm('Reset everything?')) {
            document.getElementById('boxArea').value = 250000;
            document.getElementById('gridSize').value = 50;
            this.gridData.clear();
            this.boundaryBox = null;
            this.boxAreaSqMeters = 250000;
            this.gridCellSize = 50;
            this.redraw();
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
            version: '4.0',
            timestamp: new Date().toISOString(),
            boundaryBox: this.boundaryBox,
            area: {
                sqMeters: this.boxAreaSqMeters
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

                // Apply settings
                if (config.version === '4.0') {
                    this.boundaryBox = config.boundaryBox;
                    this.boxAreaSqMeters = config.area.sqMeters;
                    document.getElementById('boxArea').value = this.boxAreaSqMeters;
                }

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
                this.redraw();

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
