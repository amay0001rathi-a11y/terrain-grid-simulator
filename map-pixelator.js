// Map Terrain Pixelator - Clean Version
class MapPixelator {
    constructor() {
        console.log('MapPixelator initializing...');

        // Map
        this.map = null;
        this.currentYear = 2024;
        this.tileLayer = null;

        // Survey area and grid
        this.surveyArea = null;
        this.boundaryLayer = null;
        this.gridLayer = null;
        this.gridCells = [];
        this.gridCellSize = 50; // meters
        this.areaSize = 25; // hectares

        // Pixelation
        this.pixelSize = 20;
        this.pixelatedLayer = null;

        try {
            this.initMap();
            this.initEventListeners();
            console.log('MapPixelator initialized successfully');
        } catch (error) {
            console.error('Error initializing MapPixelator:', error);
            alert('Error loading map. Please check console for details.');
        }
    }

    initMap() {
        // Initialize map (default: Cornell, NY)
        this.map = L.map('map').setView([42.4440, -76.5019], 15);

        // Add satellite tile layer
        this.updateTileLayer(2024);

        // Drawing tools
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
    }

    updateTileLayer(year) {
        // Remove existing tile layer
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }

        // For now, we use current satellite imagery
        // In a production app, you'd use services like Google Earth Engine for historical data
        this.tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri',
            maxZoom: 19
        }).addTo(this.map);

        // Update info
        if (year === 2024) {
            document.getElementById('yearInfo').textContent = 'Showing current satellite imagery';
        } else {
            document.getElementById('yearInfo').textContent = `Showing imagery from ${year} (simulated)`;
        }
    }

    initEventListeners() {
        // Location search
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchLocation();
        });

        document.getElementById('goToCoords').addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            if (!isNaN(lat) && !isNaN(lng)) {
                this.map.setView([lat, lng], 15);
            }
        });

        // Year slider
        document.getElementById('yearSlider').addEventListener('input', (e) => {
            this.currentYear = parseInt(e.target.value);
            document.getElementById('yearDisplay').textContent = this.currentYear;
            this.updateTileLayer(this.currentYear);
        });

        // Draw boundary
        document.getElementById('drawBoundaryBtn').addEventListener('click', () => {
            this.enableBoundaryDrawing();
        });

        // Area size
        document.getElementById('areaSize').addEventListener('input', (e) => {
            this.areaSize = parseFloat(e.target.value);
            const sqKm = this.areaSize / 100;
            document.getElementById('areaSizeDisplay').textContent =
                `${this.areaSize} Ha (${sqKm.toFixed(2)} sq km)`;
        });

        // Grid settings
        document.getElementById('gridCellSize').addEventListener('input', (e) => {
            this.gridCellSize = parseFloat(e.target.value);
        });

        document.getElementById('applyGridBtn').addEventListener('click', () => {
            if (this.surveyArea) {
                this.createGrid();
            } else {
                alert('Please draw a survey area first!');
            }
        });

        // Pixelation
        document.getElementById('pixelSize').addEventListener('input', (e) => {
            this.pixelSize = parseInt(e.target.value);
            document.getElementById('pixelSizeValue').textContent = this.pixelSize;
        });

        document.getElementById('pixelateBtn').addEventListener('click', () => {
            this.pixelateArea();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetView();
        });

        // Export
        document.getElementById('exportImageBtn').addEventListener('click', () => {
            this.exportImage();
        });

        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportGridData();
        });
    }

    searchLocation() {
        const query = document.getElementById('locationSearch').value;
        if (!query) return;

        // Use OpenStreetMap Nominatim for geocoding
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    this.map.setView([lat, lon], 15);
                    document.getElementById('latitude').value = lat;
                    document.getElementById('longitude').value = lon;
                } else {
                    alert('Location not found!');
                }
            })
            .catch(err => {
                console.error('Geocoding error:', err);
                alert('Error searching location');
            });
    }

    enableBoundaryDrawing() {
        // Clear previous boundary
        if (this.boundaryLayer) {
            this.map.removeLayer(this.boundaryLayer);
        }
        if (this.gridLayer) {
            this.map.removeLayer(this.gridLayer);
        }
        if (this.pixelatedLayer) {
            this.map.removeLayer(this.pixelatedLayer);
        }

        alert('Click and drag to draw a rectangle for your survey area');

        // Enable rectangle drawing
        const drawControl = new L.Draw.Rectangle(this.map, {
            shapeOptions: {
                color: '#00ff00',
                weight: 3,
                fillOpacity: 0.1
            }
        });

        drawControl.enable();

        this.map.once('draw:created', (e) => {
            this.surveyArea = e.layer;
            this.boundaryLayer = e.layer;
            this.map.addLayer(this.boundaryLayer);
            this.createGrid();
            document.getElementById('pixelInfo').textContent = 'Area selected - Ready to pixelate';
        });
    }

    createGrid() {
        // Clear existing grid
        if (this.gridLayer) {
            this.map.removeLayer(this.gridLayer);
        }

        this.gridCells = [];
        this.gridLayer = L.featureGroup();

        const bounds = this.surveyArea.getBounds();
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();

        // Calculate grid based on cell size in meters
        const latPerMeter = 1 / 111320;
        const lngPerMeter = 1 / (111320 * Math.cos(north * Math.PI / 180));

        const cellLatSize = this.gridCellSize * latPerMeter;
        const cellLngSize = this.gridCellSize * lngPerMeter;

        const numRows = Math.ceil((north - south) / cellLatSize);
        const numCols = Math.ceil((east - west) / cellLngSize);

        // Create grid cells
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const cellSouth = south + row * cellLatSize;
                const cellNorth = cellSouth + cellLatSize;
                const cellWest = west + col * cellLngSize;
                const cellEast = cellWest + cellLngSize;

                const cellBounds = [[cellSouth, cellWest], [cellNorth, cellEast]];
                const cell = L.rectangle(cellBounds, {
                    color: '#00ff00',
                    weight: 1,
                    fillOpacity: 0
                });

                this.gridLayer.addLayer(cell);
                this.gridCells.push({
                    id: `${row}-${col}`,
                    bounds: cellBounds,
                    center: [(cellSouth + cellNorth) / 2, (cellWest + cellEast) / 2],
                    layer: cell
                });
            }
        }

        this.map.addLayer(this.gridLayer);
        document.getElementById('pixelInfo').textContent =
            `Grid created: ${numRows}×${numCols} cells (${this.gridCellSize}m each)`;
    }

    async pixelateArea() {
        if (!this.surveyArea || this.gridCells.length === 0) {
            alert('Please create a grid first!');
            return;
        }

        document.getElementById('pixelInfo').textContent = 'Capturing map... Please wait';

        // Remove old pixelated layer
        if (this.pixelatedLayer) {
            this.map.removeLayer(this.pixelatedLayer);
        }

        // Hide grid temporarily for clean capture
        const gridVisible = this.gridLayer && this.map.hasLayer(this.gridLayer);
        if (gridVisible) {
            this.map.removeLayer(this.gridLayer);
        }

        // Capture the map using html2canvas
        const mapElement = document.getElementById('map');

        try {
            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            document.getElementById('pixelInfo').textContent = 'Processing colors...';

            this.pixelatedLayer = L.featureGroup();

            // Sample color from each cell
            for (const cell of this.gridCells) {
                const color = this.getCellColorFromCanvas(cell, canvas);

                // Create filled rectangle with sampled color
                const pixelRect = L.rectangle(cell.bounds, {
                    color: color,
                    weight: 0,
                    fillColor: color,
                    fillOpacity: 0.9
                });

                this.pixelatedLayer.addLayer(pixelRect);
            }

            this.map.addLayer(this.pixelatedLayer);

            // Show grid with thin lines if it was visible
            if (gridVisible) {
                this.map.addLayer(this.gridLayer);
                this.gridLayer.setStyle({ weight: 0.5, color: '#ffffff', opacity: 0.3 });
            }

            document.getElementById('pixelInfo').textContent =
                `✓ Pixelated ${this.gridCells.length} cells with real satellite colors`;

        } catch (error) {
            console.error('Error capturing map:', error);
            document.getElementById('pixelInfo').textContent = 'Error: Could not capture map colors';
            alert('Error capturing map. The pixelation may not show accurate colors.');
        }
    }

    getCellColorFromCanvas(cell, canvas) {
        // Get cell bounds on the canvas
        const bounds = L.latLngBounds(cell.bounds);
        const center = bounds.getCenter();
        const topLeft = bounds.getNorthWest();
        const bottomRight = bounds.getSouthEast();

        // Convert to pixel coordinates on the map
        const centerPoint = this.map.latLngToContainerPoint(center);
        const topLeftPoint = this.map.latLngToContainerPoint(topLeft);
        const bottomRightPoint = this.map.latLngToContainerPoint(bottomRight);

        // Get canvas context
        const ctx = canvas.getContext('2d');

        // Sample multiple points and average
        const samples = [];
        const cellWidth = bottomRightPoint.x - topLeftPoint.x;
        const cellHeight = bottomRightPoint.y - topLeftPoint.y;

        // Sample 9 points in a grid within the cell
        for (let dy = 0.25; dy <= 0.75; dy += 0.25) {
            for (let dx = 0.25; dx <= 0.75; dx += 0.25) {
                const x = Math.floor(topLeftPoint.x + cellWidth * dx);
                const y = Math.floor(topLeftPoint.y + cellHeight * dy);

                if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
                }
            }
        }

        // Average all samples
        if (samples.length === 0) {
            return 'rgb(128, 128, 128)'; // Gray fallback
        }

        const avgR = Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length);
        const avgG = Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length);
        const avgB = Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length);

        return `rgb(${avgR}, ${avgG}, ${avgB})`;
    }

    resetView() {
        if (this.boundaryLayer) {
            this.map.removeLayer(this.boundaryLayer);
        }
        if (this.gridLayer) {
            this.map.removeLayer(this.gridLayer);
        }
        if (this.pixelatedLayer) {
            this.map.removeLayer(this.pixelatedLayer);
        }

        this.surveyArea = null;
        this.gridCells = [];
        document.getElementById('pixelInfo').textContent = 'Draw an area to start';
    }

    exportImage() {
        // Use leaflet-image or similar library for production
        // For now, show instructions
        alert('To export: Right-click the map and select "Save image as..."');
    }

    exportGridData() {
        const data = {
            year: this.currentYear,
            location: this.map.getCenter(),
            zoom: this.map.getZoom(),
            areaSize: this.areaSize,
            gridCellSize: this.gridCellSize,
            totalCells: this.gridCells.length,
            cells: this.gridCells.map(cell => ({
                id: cell.id,
                center: cell.center,
                bounds: cell.bounds
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `grid-data-${this.currentYear}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const pixelator = new MapPixelator();
});
