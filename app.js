// Terrain Grid Simulator - Standalone Version with Boundary Box
class TerrainGridSimulator {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.baseImage = null;
        this.pixelatedImage = null; // Store pixelated version
        this.isPixelated = false;
        this.pixelSize = 20; // Default pixel size
        this.simplePixelationMode = false; // Flag to separate simple pixelation from grid mode
        this.gridCells = [];
        this.gridData = new Map();
        this.selectedTerrain = null;
        this.paintMode = false;

        // Boundary box
        this.boundaryBox = null; // {x, y, width, height} in canvas coordinates
        this.drawingBoundary = false;
        this.boundaryStart = null;

        // Pixelation area selection
        this.pixelationArea = null; // {x, y, width, height} for selective pixelation
        this.drawingPixelationArea = false;
        this.pixelationAreaStart = null;

        // Area parameters
        this.boxAreaHectares = 25; // Default 25 Ha = 0.25 sq km
        this.gridCellSize = 50; // meters (0.25 hectares = 50m x 50m)

        // Terrain colors
        this.terrainColors = {
            forest: '#228B22',
            rocky: '#808080',
            water: '#1E90FF',
            uxo: '#FF0000',
            road: '#000000',
            clear: '#FFFFFF',
            contaminated: '#8B4513' // Brown color for contaminated areas
        };

        // Analysis canvas for image processing
        this.analysisCanvas = document.createElement('canvas');
        this.analysisCtx = this.analysisCanvas.getContext('2d');

        this.initEventListeners();
        this.setupCanvas();
    }

    initEventListeners() {
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

        // Area input - auto update on change
        document.getElementById('boxArea').addEventListener('input', () => {
            this.applyAreaSettings();
        });

        // Grid configuration - auto update on change
        document.getElementById('gridSize').addEventListener('input', () => {
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

        // Auto-pixelate button
        document.getElementById('autoPixelateBtn').addEventListener('click', () => {
            this.autoPixelateImage();
        });

        // Pixelation controls
        document.getElementById('pixelSize').addEventListener('input', (e) => {
            this.pixelSize = parseInt(e.target.value);
            document.getElementById('pixelSizeValue').textContent = `${this.pixelSize}px`;
            // If already in simple pixelation mode, re-pixelate with new size
            if (this.simplePixelationMode) {
                this.pixelateImageSimple();
            }
        });

        document.getElementById('pixelateBtn').addEventListener('click', () => {
            this.pixelateImageSimple();
        });

        document.getElementById('selectAreaBtn').addEventListener('click', () => {
            this.enablePixelationAreaSelection();
        });

        document.getElementById('resetImageBtn').addEventListener('click', () => {
            this.showOriginalImage();
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
                this.simplePixelationMode = false; // Reset pixelation mode
                this.isPixelated = false;
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
        // Disable simple pixelation mode when entering boundary/grid mode
        this.simplePixelationMode = false;
        this.drawingBoundary = true;
        this.canvas.style.cursor = 'crosshair';
        alert('Click and drag to draw a boundary box on the image');
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.drawingPixelationArea) {
            this.pixelationAreaStart = { x, y };
        } else if (this.drawingBoundary) {
            this.boundaryStart = { x, y };
        } else if (this.paintMode && this.selectedTerrain && this.boundaryBox) {
            // Paint cell
            this.onCanvasClick(x, y);
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Draw temporary pixelation area
        if (this.drawingPixelationArea && this.pixelationAreaStart) {
            this.redraw();
            this.ctx.strokeStyle = '#00FF00'; // Green for pixelation area
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([10, 5]); // Dashed line
            this.ctx.strokeRect(
                this.pixelationAreaStart.x,
                this.pixelationAreaStart.y,
                x - this.pixelationAreaStart.x,
                y - this.pixelationAreaStart.y
            );
            this.ctx.setLineDash([]); // Reset line dash
            return;
        }

        // Draw temporary boundary
        if (this.drawingBoundary && this.boundaryStart) {
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
    }

    onMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Handle pixelation area selection
        if (this.drawingPixelationArea && this.pixelationAreaStart) {
            const width = Math.abs(x - this.pixelationAreaStart.x);
            const height = Math.abs(y - this.pixelationAreaStart.y);

            if (width > 10 && height > 10) {
                this.pixelationArea = {
                    x: Math.min(this.pixelationAreaStart.x, x),
                    y: Math.min(this.pixelationAreaStart.y, y),
                    width: width,
                    height: height
                };

                document.getElementById('pixelateAreaInfo').textContent =
                    `Area selected: ${Math.round(width)}×${Math.round(height)}px - Now pixelating...`;

                // Automatically pixelate the selected area
                setTimeout(() => {
                    this.pixelateSelectedArea();
                }, 100);
            }

            this.drawingPixelationArea = false;
            this.pixelationAreaStart = null;
            this.canvas.style.cursor = 'default';
            return;
        }

        // Handle boundary box drawing
        if (!this.drawingBoundary || !this.boundaryStart) return;

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
        const boxAreaHa = parseFloat(document.getElementById('boxArea').value);
        this.boxAreaHectares = boxAreaHa;
        this.updateAreaDisplay();
        this.redraw();
    }

    createGrid() {
        this.gridCells = [];

        if (!this.boundaryBox) return;

        // FIXED CALCULATION: Calculate grid dimensions based on real-world dimensions
        // The boundary box represents the real-world area in Hectares

        // Convert hectares to meters (1 Ha = 10,000 m² = 100m x 100m)
        const boxAreaSqMeters = this.boxAreaHectares * 10000;

        // Calculate real-world dimensions (maintaining aspect ratio)
        const aspectRatio = this.boundaryBox.width / this.boundaryBox.height;
        const boxHeightMeters = Math.sqrt(boxAreaSqMeters / aspectRatio);
        const boxWidthMeters = boxHeightMeters * aspectRatio;

        // Calculate number of cells in each direction
        const cellsWidth = Math.ceil(boxWidthMeters / this.gridCellSize);
        const cellsHeight = Math.ceil(boxHeightMeters / this.gridCellSize);

        // Calculate pixel size for each cell (on canvas)
        const cellWidth = this.boundaryBox.width / cellsWidth;
        const cellHeight = this.boundaryBox.height / cellsHeight;

        // Create grid cells
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
                    col: j,
                    // Store real-world dimensions for accurate contamination radius
                    realWorldSize: this.gridCellSize
                });
            }
        }

        // Calculate actual hectares per cell
        const hectaresPerCell = (this.gridCellSize * this.gridCellSize) / 10000;
        const totalCells = cellsWidth * cellsHeight;
        const actualArea = (totalCells * hectaresPerCell).toFixed(2);

        // Update grid info with detailed information
        document.getElementById('gridInfo').textContent =
            `Grid: ${cellsWidth} x ${cellsHeight} = ${totalCells} cells | Each cell: ${this.gridCellSize}m x ${this.gridCellSize}m (${hectaresPerCell.toFixed(3)} Ha) | Total: ${actualArea} Ha`;

        this.updateStatistics();
    }

    pixelateImageSimple() {
        if (!this.baseImage) {
            alert('Please upload an image first!');
            return;
        }

        // Enable simple pixelation mode
        this.simplePixelationMode = true;
        this.isPixelated = true;

        // Create temporary canvas for pixelation
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Set canvas to same size as display canvas
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        // Draw original image at full size
        tempCtx.drawImage(this.baseImage, 0, 0, tempCanvas.width, tempCanvas.height);

        // Disable image smoothing for pixelated effect
        tempCtx.imageSmoothingEnabled = false;

        // Calculate how many "pixels" we need
        const cols = Math.floor(tempCanvas.width / this.pixelSize);
        const rows = Math.floor(tempCanvas.height / this.pixelSize);

        // Clear main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw each "pixel" block
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Get the color at the center of this pixel block from original image
                const sampleX = Math.floor(x * this.pixelSize + this.pixelSize / 2);
                const sampleY = Math.floor(y * this.pixelSize + this.pixelSize / 2);

                const pixel = tempCtx.getImageData(sampleX, sampleY, 1, 1).data;

                // Draw solid color rectangle
                this.ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                this.ctx.fillRect(
                    x * this.pixelSize,
                    y * this.pixelSize,
                    this.pixelSize,
                    this.pixelSize
                );
            }
        }
    }

    showOriginalImage() {
        if (!this.baseImage) return;
        this.isPixelated = false;
        this.simplePixelationMode = false;
        this.pixelationArea = null;
        document.getElementById('pixelateAreaInfo').textContent = '';
        this.redraw();
    }

    enablePixelationAreaSelection() {
        if (!this.baseImage) {
            alert('Please upload an image first!');
            return;
        }
        this.drawingPixelationArea = true;
        this.canvas.style.cursor = 'crosshair';
        document.getElementById('pixelateAreaInfo').textContent =
            'Click and drag to select area to pixelate (green dashed box)';
    }

    pixelateSelectedArea() {
        if (!this.baseImage || !this.pixelationArea) {
            alert('Please select an area first!');
            return;
        }

        // Enable simple pixelation mode
        this.simplePixelationMode = true;
        this.isPixelated = true;

        // Create temporary canvas for pixelation
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        // Draw original image
        tempCtx.drawImage(this.baseImage, 0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.imageSmoothingEnabled = false;

        // Start with the original image on main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);

        // Calculate pixelation only for selected area
        const area = this.pixelationArea;
        const cols = Math.floor(area.width / this.pixelSize);
        const rows = Math.floor(area.height / this.pixelSize);

        // Pixelate only the selected area
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Calculate position relative to selected area
                const sampleX = Math.floor(area.x + x * this.pixelSize + this.pixelSize / 2);
                const sampleY = Math.floor(area.y + y * this.pixelSize + this.pixelSize / 2);

                const pixel = tempCtx.getImageData(sampleX, sampleY, 1, 1).data;

                // Draw solid color rectangle only in selected area
                this.ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                this.ctx.fillRect(
                    area.x + x * this.pixelSize,
                    area.y + y * this.pixelSize,
                    this.pixelSize,
                    this.pixelSize
                );
            }
        }

        // Draw green border around pixelated area
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(area.x, area.y, area.width, area.height);

        document.getElementById('pixelateAreaInfo').textContent =
            `Pixelated area: ${Math.round(area.width)}×${Math.round(area.height)}px with ${this.pixelSize}px blocks`;
    }

    redraw() {
        // If in simple pixelation mode, re-apply the pixelation effect
        if (this.simplePixelationMode && this.baseImage) {
            this.pixelateImageSimple();
            return;
        }

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

        // Draw boundary box if exists (only in non-simple-pixelation mode)
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

            // TRUE PIXELATION: Draw each cell as a solid color block
            // Extract average color from the original image for this cell

            // Get the average color of this cell from the base image
            const imageData = this.analysisCtx.getImageData(
                Math.floor(cell.x),
                Math.floor(cell.y),
                Math.ceil(cell.width),
                Math.ceil(cell.height)
            );
            const pixels = imageData.data;

            let avgR = 0, avgG = 0, avgB = 0;
            let pixelCount = pixels.length / 4;

            // Calculate average color for this cell
            for (let i = 0; i < pixels.length; i += 4) {
                avgR += pixels[i];
                avgG += pixels[i + 1];
                avgB += pixels[i + 2];
            }

            avgR = Math.round(avgR / pixelCount);
            avgG = Math.round(avgG / pixelCount);
            avgB = Math.round(avgB / pixelCount);

            // Draw solid color block (pixelated effect)
            this.ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
            this.ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

            // Optional: Draw thin border for classification indication
            if (cellData && cellData.terrain && cellData.terrain !== 'clear') {
                this.ctx.strokeStyle = this.terrainColors[cellData.terrain];
                this.ctx.lineWidth = 1;
                this.ctx.globalAlpha = 0.5;
                this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
                this.ctx.globalAlpha = 1.0;
            }
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
        const areaSqKm = this.boxAreaHectares / 100; // 1 Ha = 0.01 sq km
        document.getElementById('areaSizeDisplay').textContent =
            `Area: ${this.boxAreaHectares.toFixed(2)} Ha (${areaSqKm.toFixed(2)} sq km)`;
        document.getElementById('selectedAreaInfo').textContent =
            `${this.boxAreaHectares.toFixed(2)} Ha (${areaSqKm.toFixed(2)} sq km)`;
    }

    clearAllTerrain() {
        if (confirm('Clear all terrain data?')) {
            this.gridData.clear();
            this.redraw();
        }
    }

    resetGrid() {
        if (confirm('Reset everything?')) {
            document.getElementById('boxArea').value = 25;
            document.getElementById('gridSize').value = 50;
            this.gridData.clear();
            this.boundaryBox = null;
            this.boxAreaHectares = 25;
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
            contaminated: 0,
            clear: 0
        };

        this.gridData.forEach(cell => {
            if (cell.terrain && stats.hasOwnProperty(cell.terrain)) {
                stats[cell.terrain]++;
            }
        });

        const totalCells = this.gridCells.length;
        stats.clear = totalCells - (stats.forest + stats.rocky + stats.water + stats.uxo + stats.road + stats.contaminated);

        document.getElementById('totalCells').textContent = totalCells;
        document.getElementById('forestCount').textContent = stats.forest;
        document.getElementById('rockyCount').textContent = stats.rocky;
        document.getElementById('waterCount').textContent = stats.water;
        document.getElementById('uxoCount').textContent = stats.uxo;
        document.getElementById('roadCount').textContent = stats.road;
        document.getElementById('contaminatedCount').textContent = stats.contaminated;
        document.getElementById('clearCount').textContent = stats.clear;
    }

    // Auto-pixelation: Analyze image and automatically classify terrain
    autoPixelateImage() {
        if (!this.baseImage) {
            alert('Please upload an image first!');
            return;
        }

        if (!this.boundaryBox) {
            alert('Please draw a boundary box first!');
            return;
        }

        if (this.gridCells.length === 0) {
            alert('Grid not created. Creating grid now...');
            this.createGrid();
        }

        // Confirm before overwriting existing data
        if (this.gridData.size > 0) {
            if (!confirm('This will overwrite existing terrain data. Continue?')) {
                return;
            }
        }

        // Show progress
        document.getElementById('pixelateStatus').textContent = 'Analyzing image...';

        // Use setTimeout to allow UI to update
        setTimeout(() => {
            this.performPixelation();
        }, 100);
    }

    performPixelation() {
        // Setup analysis canvas to match the base image
        this.analysisCanvas.width = this.canvas.width;
        this.analysisCanvas.height = this.canvas.height;

        // Draw the base image to analysis canvas
        this.analysisCtx.drawImage(this.baseImage, 0, 0, this.analysisCanvas.width, this.analysisCanvas.height);

        // Clear existing grid data
        this.gridData.clear();

        // Step 1: Find all UXO/crater locations (white bomb craters)
        const craterCells = this.detectCraters();

        // Step 2: Analyze each grid cell
        this.gridCells.forEach((cell, index) => {
            // Get the average color of this cell
            const terrain = this.analyzeCellTerrain(cell);

            if (terrain) {
                this.gridData.set(cell.id, { terrain: terrain });
            }

            // Progress update
            if (index % 100 === 0) {
                const progress = Math.round((index / this.gridCells.length) * 100);
                document.getElementById('pixelateStatus').textContent =
                    `Analyzing: ${progress}% (${index}/${this.gridCells.length} cells)`;
            }
        });

        // Step 3: Mark contaminated areas (1km radius around craters)
        this.markContaminatedAreas(craterCells);

        // Redraw and update stats
        this.redraw();

        document.getElementById('pixelateStatus').textContent =
            `Analysis complete! Processed ${this.gridCells.length} cells.`;

        // Clear status after 3 seconds
        setTimeout(() => {
            document.getElementById('pixelateStatus').textContent = '';
        }, 3000);
    }

    detectCraters() {
        const craterCells = [];

        this.gridCells.forEach(cell => {
            const imageData = this.analysisCtx.getImageData(cell.x, cell.y, cell.width, cell.height);
            const pixels = imageData.data;

            let whitePixels = 0;
            let brightPixels = 0;
            let bluePixels = 0;
            let totalPixels = pixels.length / 4;

            // Check for white/bright pixels (bomb craters appear as white/very light areas)
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const brightness = (r + g + b) / 3;

                // White or very light color (crater detection) - lowered threshold
                // Must be bright AND relatively balanced (not blue-shifted like water)
                if (r > 180 && g > 180 && b > 180 && Math.abs(r - b) < 50) {
                    whitePixels++;
                }

                // Also count generally bright pixels
                if (brightness > 170) {
                    brightPixels++;
                }

                // Count blue pixels to distinguish from water
                if (b > r + 20 && b > g + 10) {
                    bluePixels++;
                }
            }

            // More sensitive crater detection
            const whiteRatio = whitePixels / totalPixels;
            const brightRatio = brightPixels / totalPixels;
            const blueRatio = bluePixels / totalPixels;

            // Crater if: (lots of white pixels OR very bright) AND not water
            if ((whiteRatio > 0.25 || brightRatio > 0.4) && blueRatio < 0.25) {
                craterCells.push(cell);
                // Mark as UXO
                this.gridData.set(cell.id, { terrain: 'uxo' });
            }
        });

        return craterCells;
    }

    analyzeCellTerrain(cell) {
        // Get image data for this cell
        const imageData = this.analysisCtx.getImageData(cell.x, cell.y, cell.width, cell.height);
        const pixels = imageData.data;

        let avgR = 0, avgG = 0, avgB = 0;
        let pixelCount = pixels.length / 4;

        // DETAILED color distribution tracking
        let darkPixels = 0;      // Very dark (forest/water/road)
        let greenishPixels = 0;  // ANY green tint
        let blueishPixels = 0;   // Blue tint (water)
        let brownishPixels = 0;  // Brown/rocky tint
        let lightGreenPixels = 0; // Light green
        let darkGreenPixels = 0;  // Dark green

        // Calculate average color and DETAILED distribution
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            avgR += r;
            avgG += g;
            avgB += b;

            const brightness = (r + g + b) / 3;

            // Dark pixels
            if (brightness < 80) darkPixels++;

            // ANY greenish tint - very sensitive
            if (g >= r && g >= b) greenishPixels++;
            if (g > r + 3 || (g >= r && g > b + 3)) greenishPixels++;

            // Light green (grass, young vegetation)
            if (g > r + 8 && g > b + 5 && brightness > 90) lightGreenPixels++;

            // Dark green (forest, dense vegetation)
            if (g >= r && g >= b - 5 && brightness < 90) darkGreenPixels++;

            // Blue pixels (water)
            if (b > r + 10 && b > g + 5) blueishPixels++;

            // Brown/tan/rocky (soil, earth)
            if (r >= g - 10 && r > b + 5 && brightness > 60 && brightness < 150) brownishPixels++;
        }

        avgR /= pixelCount;
        avgG /= pixelCount;
        avgB /= pixelCount;

        const greenRatio = greenishPixels / pixelCount;
        const blueRatio = blueishPixels / pixelCount;
        const darkRatio = darkPixels / pixelCount;
        const brownRatio = brownishPixels / pixelCount;
        const lightGreenRatio = lightGreenPixels / pixelCount;
        const darkGreenRatio = darkGreenPixels / pixelCount;

        // Classify based on DETAILED color distribution
        return this.classifyTerrainByColor(
            avgR, avgG, avgB,
            greenRatio, blueRatio, darkRatio,
            brownRatio, lightGreenRatio, darkGreenRatio
        );
    }

    classifyTerrainByColor(r, g, b, greenRatio = 0, blueRatio = 0, darkRatio = 0,
                           brownRatio = 0, lightGreenRatio = 0, darkGreenRatio = 0) {
        // Calculate color properties
        const brightness = (r + g + b) / 3;
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

        // ============================================================
        // ULTRA-DETAILED PIXELATOR - MAXIMUM SENSITIVITY
        // ============================================================

        // ========== WATER DETECTION ==========
        if (blueRatio > 0.35 || (b > r + 12 && b > g + 10 && b > 45)) {
            return 'water';
        }

        // ========== FOREST DETECTION - ANY SHADE OF GREEN ==========
        // Rule: If there's ANY green presence, classify as forest

        // 1. Strong green pixel presence (any shade)
        if (greenRatio > 0.15 || lightGreenRatio > 0.1 || darkGreenRatio > 0.15) {
            return 'forest';
        }

        // 2. Green is dominant channel (even slightly)
        if (g >= r && g >= b && g > 35) {
            return 'forest';
        }

        // 3. Green exceeds red (any brightness)
        if (g > r + 3 && g >= b - 5) {
            return 'forest';
        }

        // 4. Dark green (satellite forests) - very sensitive
        if (g >= r - 3 && g >= b - 8 && brightness < 95) {
            return 'forest';
        }

        // 5. Light green (grass, fields)
        if (g > r + 5 && g > b - 3 && brightness >= 80) {
            return 'forest';
        }

        // 6. Medium green (vegetation)
        if (g > r && g > b && brightness >= 50 && brightness < 150) {
            return 'forest';
        }

        // 7. Green-gray (sparse vegetation)
        if (g >= r && g >= b && greenRatio > 0.1) {
            return 'forest';
        }

        // ========== BROWN/ROCKY/CONTAMINATED SOIL ==========
        // Detect ALL brown, tan, beige, gray, reddish-brown shades

        // 1. Strong brown pixel presence
        if (brownRatio > 0.2) {
            return 'rocky';
        }

        // 2. Brown soil: Red/Yellow tint
        if (r > b + 8 && r >= g - 12 && brightness >= 65 && brightness < 165) {
            return 'rocky';
        }

        // 3. Reddish-brown (iron-rich soil)
        if (r > g + 3 && r > b + 12 && brightness >= 55 && brightness < 155) {
            return 'rocky';
        }

        // 4. Dark brown (wet soil, shadows)
        if (r >= g - 5 && r > b + 5 && brightness >= 40 && brightness < 90) {
            return 'rocky';
        }

        // 5. Tan/beige/sandy (light brown)
        if (r >= g - 8 && r > b && brightness >= 100 && brightness < 180 && maxDiff < 45) {
            return 'rocky';
        }

        // 6. Gray soil (neutral)
        if (maxDiff < 25 && brightness >= 55 && brightness < 145) {
            return 'rocky';
        }

        // 7. Yellowish-brown (clay soil)
        if (r > b + 10 && g > b + 8 && r >= g - 10 && brightness >= 70 && brightness < 150) {
            return 'rocky';
        }

        // 8. Pale brown (dry soil)
        if (r >= g && r >= b && r < 200 && brightness >= 90 && brightness < 170) {
            return 'rocky';
        }

        // ========== ROAD/VERY DARK ==========
        if (brightness < 32 && darkRatio > 0.5) {
            return 'road';
        }

        // ========== DEFAULT: CLEARED LAND ==========
        // Very bright, white, or truly unclassified
        return 'clear';
    }

    markContaminatedAreas(craterCells) {
        if (craterCells.length === 0) return;

        // Calculate 1km radius in grid cells
        // 1km = 1000m, divide by gridCellSize to get number of cells
        const radiusCells = Math.ceil(1000 / this.gridCellSize);

        craterCells.forEach(crater => {
            // Mark all cells within radius as contaminated
            this.gridCells.forEach(cell => {
                // Calculate distance in grid cells
                const rowDist = Math.abs(cell.row - crater.row);
                const colDist = Math.abs(cell.col - crater.col);
                const distance = Math.sqrt(rowDist * rowDist + colDist * colDist);

                if (distance <= radiusCells && distance > 0) { // Don't override the crater itself
                    const currentTerrain = this.gridData.get(cell.id);
                    // Only mark as contaminated if not already UXO
                    if (!currentTerrain || currentTerrain.terrain !== 'uxo') {
                        this.gridData.set(cell.id, { terrain: 'contaminated' });
                    }
                }
            });
        });
    }

    exportConfiguration() {
        const config = {
            version: '5.0',
            timestamp: new Date().toISOString(),
            boundaryBox: this.boundaryBox,
            area: {
                hectares: this.boxAreaHectares
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

                // Apply settings based on version
                if (config.version === '5.0') {
                    this.boundaryBox = config.boundaryBox;
                    this.boxAreaHectares = config.area.hectares;
                    document.getElementById('boxArea').value = this.boxAreaHectares;
                } else if (config.version === '4.0') {
                    // Legacy support - convert from sq meters to hectares
                    this.boundaryBox = config.boundaryBox;
                    this.boxAreaHectares = config.area.sqMeters / 10000;
                    document.getElementById('boxArea').value = this.boxAreaHectares;
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
