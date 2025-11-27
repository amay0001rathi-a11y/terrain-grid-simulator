// Drone Terrain Mapping Simulator
class DroneSimulator {
    constructor() {
        // Map initialization
        this.map = null;
        this.boundaryLayer = null;
        this.gridLayer = null;
        this.droneMarker = null;
        this.surveyArea = null;

        // Canvas for pixelation
        this.canvas = document.getElementById('pixelationCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Three.js 3D scene for drone
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.droneModel3D = null;
        this.droneModelPath = 'models/drone.glb'; // Your uploaded drone model

        // Drone settings
        this.droneModel = null;
        this.flightSpeed = 5; // m/s
        this.flightAltitude = 50; // meters
        this.scanPattern = 'parallel';

        // Simulation state
        this.isSimulating = false;
        this.flightPath = [];
        this.currentPathIndex = 0;
        this.scannedCells = new Set();
        this.pixelSize = 20;
        this.progressivePixelation = true;

        // Grid data
        this.gridCells = [];
        this.gridCellSize = 50; // meters
        this.areaSize = 25; // hectares

        this.initMap();
        this.initEventListeners();
        this.setupCanvas();
        this.init3DDrone();
    }

    initMap() {
        // Initialize Leaflet map (default: Cornell University area)
        this.map = L.map('map').setView([42.4440, -76.5019], 15);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add satellite view option
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        });

        // Layer control
        const baseMaps = {
            "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            "Satellite": satellite
        };

        L.control.layers(baseMaps).addTo(this.map);

        // Initialize drawing tools
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        // Update canvas size when map moves
        this.map.on('moveend zoomend', () => {
            this.updateCanvasOverlay();
        });
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

        // Drone model
        document.getElementById('droneModel').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                document.getElementById('droneFile').click();
            }
        });

        document.getElementById('droneFile').addEventListener('change', (e) => {
            this.loadDroneModel(e.target.files[0]);
        });

        // Flight parameters
        document.getElementById('flightSpeed').addEventListener('input', (e) => {
            this.flightSpeed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.flightSpeed;
        });

        document.getElementById('flightAltitude').addEventListener('input', (e) => {
            this.flightAltitude = parseFloat(e.target.value);
            document.getElementById('altitudeValue').textContent = this.flightAltitude;
        });

        document.getElementById('scanPattern').addEventListener('change', (e) => {
            this.scanPattern = e.target.value;
        });

        // Pixelation settings
        document.getElementById('progressivePixelation').addEventListener('change', (e) => {
            this.progressivePixelation = e.target.checked;
        });

        document.getElementById('pixelSize').addEventListener('input', (e) => {
            this.pixelSize = parseInt(e.target.value);
            document.getElementById('pixelSizeValue').textContent = this.pixelSize;
        });

        // Simulation control
        document.getElementById('startSimulationBtn').addEventListener('click', () => {
            this.startSimulation();
        });

        document.getElementById('stopSimulationBtn').addEventListener('click', () => {
            this.stopSimulation();
        });

        document.getElementById('resetSimulationBtn').addEventListener('click', () => {
            this.resetSimulation();
        });

        // Export
        document.getElementById('exportImageBtn').addEventListener('click', () => {
            this.exportImage();
        });

        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportGridData();
        });
    }

    setupCanvas() {
        const mapContainer = document.getElementById('map');
        this.canvas.width = mapContainer.clientWidth;
        this.canvas.height = mapContainer.clientHeight;
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

        alert('Click on the map to draw a rectangle for your survey area');

        // Enable rectangle drawing
        const drawControl = new L.Draw.Rectangle(this.map, {
            shapeOptions: {
                color: '#ff0000',
                weight: 3
            }
        });

        drawControl.enable();

        this.map.once('draw:created', (e) => {
            this.surveyArea = e.layer;
            this.boundaryLayer = e.layer;
            this.map.addLayer(this.boundaryLayer);
            this.createGrid();
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

        // Calculate number of cells based on grid cell size
        const latPerMeter = 1 / 111320; // approximate
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
                    fillOpacity: 0.05
                });

                this.gridLayer.addLayer(cell);
                this.gridCells.push({
                    id: `${row}-${col}`,
                    bounds: cellBounds,
                    center: [(cellSouth + cellNorth) / 2, (cellWest + cellEast) / 2],
                    scanned: false
                });
            }
        }

        this.map.addLayer(this.gridLayer);
        this.updateStatus(`Grid created: ${numRows}×${numCols} cells (${this.gridCellSize}m each)`);
    }

    generateFlightPath() {
        if (!this.surveyArea || this.gridCells.length === 0) {
            alert('Please create a grid first!');
            return false;
        }

        this.flightPath = [];

        switch (this.scanPattern) {
            case 'parallel':
                this.generateParallelPath();
                break;
            case 'grid':
                this.generateGridPath();
                break;
            case 'spiral':
                this.generateSpiralPath();
                break;
        }

        return true;
    }

    generateParallelPath() {
        // Sort cells by row, then alternate direction per row
        const cellsByRow = {};
        this.gridCells.forEach(cell => {
            const row = cell.id.split('-')[0];
            if (!cellsByRow[row]) cellsByRow[row] = [];
            cellsByRow[row].push(cell);
        });

        Object.keys(cellsByRow).sort((a, b) => parseInt(a) - parseInt(b)).forEach((row, idx) => {
            const cells = cellsByRow[row].sort((a, b) => {
                const colA = parseInt(a.id.split('-')[1]);
                const colB = parseInt(b.id.split('-')[1]);
                return idx % 2 === 0 ? colA - colB : colB - colA;
            });
            this.flightPath.push(...cells.map(c => c.center));
        });
    }

    generateGridPath() {
        // Row by row, left to right
        this.gridCells.sort((a, b) => {
            const [rowA, colA] = a.id.split('-').map(Number);
            const [rowB, colB] = b.id.split('-').map(Number);
            if (rowA !== rowB) return rowA - rowB;
            return colA - colB;
        });

        this.flightPath = this.gridCells.map(c => c.center);
    }

    generateSpiralPath() {
        // Calculate center cell and spiral outward
        const rows = new Set(this.gridCells.map(c => parseInt(c.id.split('-')[0])));
        const cols = new Set(this.gridCells.map(c => parseInt(c.id.split('-')[1])));
        const centerRow = Math.floor((Math.max(...rows) + Math.min(...rows)) / 2);
        const centerCol = Math.floor((Math.max(...cols) + Math.min(...cols)) / 2);

        // Simple spiral: expand in square rings
        const visited = new Set();
        let ring = 0;

        while (visited.size < this.gridCells.length) {
            for (let r = centerRow - ring; r <= centerRow + ring; r++) {
                for (let c = centerCol - ring; c <= centerCol + ring; c++) {
                    const id = `${r}-${c}`;
                    if (!visited.has(id)) {
                        const cell = this.gridCells.find(cell => cell.id === id);
                        if (cell) {
                            this.flightPath.push(cell.center);
                            visited.add(id);
                        }
                    }
                }
            }
            ring++;
        }
    }

    startSimulation() {
        if (!this.generateFlightPath()) return;

        this.isSimulating = true;
        this.currentPathIndex = 0;
        this.scannedCells.clear();

        document.getElementById('startSimulationBtn').style.display = 'none';
        document.getElementById('stopSimulationBtn').style.display = 'block';
        this.updateStatus('Flying...', 'flying');

        // Create drone marker with custom icon
        if (!this.droneMarker) {
            const droneIcon = L.divIcon({
                html: '🚁',
                className: 'drone-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            this.droneMarker = L.marker(this.flightPath[0], {
                icon: droneIcon,
                zIndexOffset: 1000
            }).addTo(this.map);

            // Add tooltip showing altitude
            this.droneMarker.bindTooltip(`Alt: ${this.flightAltitude}m`, {
                permanent: false,
                direction: 'top'
            });
        }

        this.animateDrone();
    }

    animateDrone() {
        if (!this.isSimulating || this.currentPathIndex >= this.flightPath.length) {
            this.completeSimulation();
            return;
        }

        const currentPos = this.flightPath[this.currentPathIndex];
        this.droneMarker.setLatLng(currentPos);

        // Mark cell as scanned
        const cell = this.gridCells.find(c =>
            Math.abs(c.center[0] - currentPos[0]) < 0.0001 &&
            Math.abs(c.center[1] - currentPos[1]) < 0.0001
        );

        if (cell && !cell.scanned) {
            cell.scanned = true;
            this.scannedCells.add(cell.id);

            // Progressive pixelation
            if (this.progressivePixelation) {
                this.pixelateCell(cell);
            }
        }

        // Update progress
        const progress = ((this.currentPathIndex + 1) / this.flightPath.length * 100).toFixed(1);
        document.getElementById('progressText').textContent = `${progress}%`;
        document.getElementById('progressBar').style.width = `${progress}%`;

        this.currentPathIndex++;

        // Calculate animation speed based on flight speed
        const delay = (this.gridCellSize / this.flightSpeed) * 10; // ms
        setTimeout(() => this.animateDrone(), delay);
    }

    pixelateCell(cell) {
        // Convert lat/lng bounds to canvas pixels
        const mapBounds = this.map.getBounds();
        const mapSize = this.map.getSize();

        const [[south, west], [north, east]] = cell.bounds;

        const topLeft = this.map.latLngToContainerPoint([north, west]);
        const bottomRight = this.map.latLngToContainerPoint([south, east]);

        // Draw pixelated block
        this.ctx.fillStyle = this.getRandomTerrainColor();
        this.ctx.fillRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
        );
    }

    getRandomTerrainColor() {
        // Simulate terrain detection with random colors
        const terrainTypes = [
            'rgba(34, 139, 34, 0.7)',  // Forest green
            'rgba(139, 69, 19, 0.7)',   // Brown soil
            'rgba(128, 128, 128, 0.7)', // Gray rocky
            'rgba(30, 144, 255, 0.5)',  // Blue water
            'rgba(255, 255, 224, 0.6)'  // Beige clear
        ];
        return terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
    }

    updateCanvasOverlay() {
        this.setupCanvas();
        // Redraw all scanned cells
        this.gridCells.forEach(cell => {
            if (cell.scanned) {
                this.pixelateCell(cell);
            }
        });
    }

    stopSimulation() {
        this.isSimulating = false;
        document.getElementById('startSimulationBtn').style.display = 'block';
        document.getElementById('stopSimulationBtn').style.display = 'none';
        this.updateStatus('Stopped', 'idle');
    }

    completeSimulation() {
        this.isSimulating = false;
        document.getElementById('startSimulationBtn').style.display = 'block';
        document.getElementById('stopSimulationBtn').style.display = 'none';
        this.updateStatus('Mapping Complete!', 'complete');
        document.getElementById('progressText').textContent = '100%';
        document.getElementById('progressBar').style.width = '100%';

        // Apply full pixelation if not progressive
        if (!this.progressivePixelation) {
            this.gridCells.forEach(cell => {
                if (cell.scanned) {
                    this.pixelateCell(cell);
                }
            });
        }
    }

    resetSimulation() {
        this.isSimulating = false;
        this.currentPathIndex = 0;
        this.scannedCells.clear();
        this.flightPath = [];

        if (this.droneMarker) {
            this.map.removeLayer(this.droneMarker);
            this.droneMarker = null;
        }

        this.gridCells.forEach(cell => cell.scanned = false);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        document.getElementById('progressText').textContent = '0%';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('startSimulationBtn').style.display = 'block';
        document.getElementById('stopSimulationBtn').style.display = 'none';
        this.updateStatus('Ready to start', 'idle');
    }

    updateStatus(text, status = 'idle') {
        document.getElementById('statusText').textContent = text;
        const indicator = document.getElementById('statusIndicator');
        indicator.className = 'status-indicator';
        indicator.classList.add(`status-${status}`);
    }

    init3DDrone() {
        // Load the default drone GLB model
        const loader = new THREE.GLTFLoader();
        loader.load(
            this.droneModelPath,
            (gltf) => {
                this.droneModel3D = gltf.scene;
                this.droneModel3D.scale.set(0.1, 0.1, 0.1); // Scale down for marker size
                this.updateStatus('Drone 3D model loaded successfully');
                console.log('Drone model loaded:', this.droneModelPath);
            },
            (xhr) => {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                console.log(`Loading drone model: ${percentComplete.toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading drone model:', error);
                this.updateStatus('Using default drone marker (model load failed)');
            }
        );
    }

    loadDroneModel(file) {
        // Load custom drone GLB model from file upload
        if (!file) return;

        const url = URL.createObjectURL(file);
        const loader = new THREE.GLTFLoader();

        loader.load(
            url,
            (gltf) => {
                this.droneModel3D = gltf.scene;
                this.droneModel3D.scale.set(0.1, 0.1, 0.1);
                this.droneModelPath = url;
                this.updateStatus('Custom drone model loaded successfully');
            },
            undefined,
            (error) => {
                console.error('Error loading custom drone model:', error);
                alert('Error loading drone model. Please use a valid GLB/GLTF file.');
            }
        );
    }

    exportImage() {
        const link = document.createElement('a');
        link.download = 'pixelated-terrain-map.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    exportGridData() {
        const data = {
            areaSize: this.areaSize,
            gridCellSize: this.gridCellSize,
            totalCells: this.gridCells.length,
            scannedCells: this.scannedCells.size,
            cells: this.gridCells.map(cell => ({
                id: cell.id,
                center: cell.center,
                scanned: cell.scanned
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'grid-data.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}

// Initialize the simulator when page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new DroneSimulator();
});
