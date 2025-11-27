// Map Terrain Pixelator with Polygon & 3D Support
class MapPixelator3D {
    constructor() {
        console.log('MapPixelator3D initializing...');

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

        // Pixelation
        this.pixelatedLayer = null;
        this.pixelatedData = []; // Store pixel data for 3D

        // 3D Scene
        this.scene3D = null;
        this.camera3D = null;
        this.renderer3D = null;
        this.controls3D = null;
        this.mesh3D = null;

        try {
            this.initMap();
            this.initEventListeners();
            console.log('MapPixelator3D initialized successfully');
        } catch (error) {
            console.error('Error initializing MapPixelator3D:', error);
            alert('Error loading map. Please check console for details.');
        }
    }

    initMap() {
        this.map = L.map('map').setView([42.4440, -76.5019], 15);
        this.updateTileLayer(2024);
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
    }

    updateTileLayer(year) {
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }

        this.tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri',
            maxZoom: 19
        }).addTo(this.map);

        document.getElementById('yearInfo').textContent =
            year === 2024 ? 'Showing current satellite imagery' : `Showing imagery from ${year} (simulated)`;
    }

    initEventListeners() {
        // Location search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchLocation());
        document.getElementById('goToCoords').addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            if (!isNaN(lat) && !isNaN(lng)) this.map.setView([lat, lng], 15);
        });

        // Year slider
        document.getElementById('yearSlider').addEventListener('input', (e) => {
            this.currentYear = parseInt(e.target.value);
            document.getElementById('yearDisplay').textContent = this.currentYear;
            this.updateTileLayer(this.currentYear);
        });

        // Drawing tools
        document.getElementById('drawPolygonBtn').addEventListener('click', () => this.enablePolygonDrawing());
        document.getElementById('drawRectangleBtn').addEventListener('click', () => this.enableRectangleDrawing());

        // Grid
        document.getElementById('gridCellSize').addEventListener('input', (e) => {
            this.gridCellSize = parseFloat(e.target.value);
        });
        document.getElementById('applyGridBtn').addEventListener('click', () => {
            if (this.surveyArea) this.createGrid();
            else alert('Please draw an area first!');
        });

        // Pixelation
        document.getElementById('pixelateBtn').addEventListener('click', () => this.pixelateArea());
        document.getElementById('show3DBtn').addEventListener('click', () => this.show3DView());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetView());

        // 3D viewer
        document.getElementById('close3DBtn').addEventListener('click', () => this.close3DView());

        // Export
        document.getElementById('exportImageBtn').addEventListener('click', () => this.exportImage());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportGridData());
    }

    searchLocation() {
        const query = document.getElementById('locationSearch').value;
        if (!query) return;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    this.map.setView([lat, lon], 15);
                    document.getElementById('latitude').value = lat;
                    document.getElementById('longitude').value = lon;
                } else alert('Location not found!');
            })
            .catch(err => {
                console.error('Geocoding error:', err);
                alert('Error searching location');
            });
    }

    enablePolygonDrawing() {
        this.clearDrawing();
        alert('Click points to draw a polygon. Double-click to finish.');

        const drawControl = new L.Draw.Polygon(this.map, {
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
            document.getElementById('areaInfo').textContent = 'Polygon area selected';
        });
    }

    enableRectangleDrawing() {
        this.clearDrawing();
        alert('Click and drag to draw a rectangle');

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
            document.getElementById('areaInfo').textContent = 'Rectangle area selected';
        });
    }

    clearDrawing() {
        if (this.boundaryLayer) this.map.removeLayer(this.boundaryLayer);
        if (this.gridLayer) this.map.removeLayer(this.gridLayer);
        if (this.pixelatedLayer) this.map.removeLayer(this.pixelatedLayer);
    }

    createGrid() {
        if (this.gridLayer) this.map.removeLayer(this.gridLayer);

        this.gridCells = [];
        this.gridLayer = L.featureGroup();

        const bounds = this.surveyArea.getBounds();
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();

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

                const cellCenter = L.latLng((cellSouth + cellNorth) / 2, (cellWest + cellEast) / 2);

                // Check if cell center is inside polygon
                if (this.surveyArea.getBounds().contains(cellCenter)) {
                    // For polygon, check if actually inside
                    if (this.surveyArea instanceof L.Polygon) {
                        if (!this.pointInPolygon(cellCenter, this.surveyArea.getLatLngs()[0])) {
                            continue;
                        }
                    }

                    const cellBounds = [[cellSouth, cellWest], [cellNorth, cellEast]];
                    const cell = L.rectangle(cellBounds, {
                        color: '#00ff00',
                        weight: 1,
                        fillOpacity: 0
                    });

                    this.gridLayer.addLayer(cell);
                    this.gridCells.push({
                        id: `${row}-${col}`,
                        row,
                        col,
                        bounds: cellBounds,
                        center: [cellCenter.lat, cellCenter.lng]
                    });
                }
            }
        }

        this.map.addLayer(this.gridLayer);
        document.getElementById('areaInfo').textContent =
            `Grid created: ${this.gridCells.length} cells (${this.gridCellSize}m each)`;
    }

    pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat, yi = polygon[i].lng;
            const xj = polygon[j].lat, yj = polygon[j].lng;

            const intersect = ((yi > point.lng) !== (yj > point.lng))
                && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    async pixelateArea() {
        if (!this.surveyArea || this.gridCells.length === 0) {
            alert('Please create a grid first!');
            return;
        }

        document.getElementById('pixelInfo').textContent = 'Capturing map... Please wait';

        if (this.pixelatedLayer) this.map.removeLayer(this.pixelatedLayer);

        const gridVisible = this.gridLayer && this.map.hasLayer(this.gridLayer);
        if (gridVisible) this.map.removeLayer(this.gridLayer);

        const mapElement = document.getElementById('map');

        try {
            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            document.getElementById('pixelInfo').textContent = 'Processing colors...';

            this.pixelatedLayer = L.featureGroup();
            this.pixelatedData = [];

            for (const cell of this.gridCells) {
                const color = this.getCellColorFromCanvas(cell, canvas);
                const pixelRect = L.rectangle(cell.bounds, {
                    color: color,
                    weight: 0,
                    fillColor: color,
                    fillOpacity: 0.9
                });

                this.pixelatedLayer.addLayer(pixelRect);

                // Store for 3D
                this.pixelatedData.push({
                    row: cell.row,
                    col: cell.col,
                    color: color,
                    bounds: cell.bounds
                });
            }

            this.map.addLayer(this.pixelatedLayer);

            if (gridVisible) {
                this.map.addLayer(this.gridLayer);
                this.gridLayer.setStyle({ weight: 0.5, color: '#ffffff', opacity: 0.3 });
            }

            document.getElementById('pixelInfo').textContent =
                `✓ Pixelated ${this.gridCells.length} cells - Ready for 3D view!`;

        } catch (error) {
            console.error('Error capturing map:', error);
            document.getElementById('pixelInfo').textContent = 'Error: Could not capture map colors';
        }
    }

    getCellColorFromCanvas(cell, canvas) {
        const bounds = L.latLngBounds(cell.bounds);
        const topLeft = bounds.getNorthWest();
        const bottomRight = bounds.getSouthEast();

        const topLeftPoint = this.map.latLngToContainerPoint(topLeft);
        const bottomRightPoint = this.map.latLngToContainerPoint(bottomRight);

        const ctx = canvas.getContext('2d');
        const samples = [];
        const cellWidth = bottomRightPoint.x - topLeftPoint.x;
        const cellHeight = bottomRightPoint.y - topLeftPoint.y;

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

        if (samples.length === 0) return 'rgb(128, 128, 128)';

        const avgR = Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length);
        const avgG = Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length);
        const avgB = Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length);

        return `rgb(${avgR}, ${avgG}, ${avgB})`;
    }

    show3DView() {
        if (this.pixelatedData.length === 0) {
            alert('Please pixelate the area first!');
            return;
        }

        document.getElementById('map').style.display = 'none';
        document.getElementById('viewer3D').style.display = 'block';

        this.init3DScene();
        this.create3DTerrain();
        this.animate3D();
    }

    init3DScene() {
        const container = document.getElementById('viewer3D');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0x1a1a1a);

        // Camera
        this.camera3D = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera3D.position.set(0, 50, 50);

        // Renderer
        this.renderer3D = new THREE.WebGLRenderer({ antialias: true });
        this.renderer3D.setSize(width, height);
        container.appendChild(this.renderer3D.domElement);

        // Controls
        this.controls3D = new THREE.OrbitControls(this.camera3D, this.renderer3D.domElement);
        this.controls3D.enableDamping = true;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene3D.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(10, 10, 10);
        this.scene3D.add(directionalLight);
    }

    create3DTerrain() {
        // Find grid dimensions
        const maxRow = Math.max(...this.pixelatedData.map(p => p.row));
        const maxCol = Math.max(...this.pixelatedData.map(p => p.col));

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const indices = [];

        // Create vertices with height based on color intensity
        const gridMap = new Map();
        this.pixelatedData.forEach(pixel => {
            gridMap.set(`${pixel.row}-${pixel.col}`, pixel);
        });

        for (let row = 0; row <= maxRow; row++) {
            for (let col = 0; col <= maxCol; col++) {
                const pixel = gridMap.get(`${row}-${col}`);

                // Calculate height from color (darker = lower elevation)
                let height = 0;
                if (pixel) {
                    const rgb = pixel.color.match(/\d+/g).map(Number);
                    const brightness = (rgb[0] + rgb[1] + rgb[2]) / 3;
                    height = (brightness / 255) * 10; // Scale height

                    colors.push(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
                } else {
                    colors.push(0.5, 0.5, 0.5);
                }

                vertices.push(col - maxCol / 2, height, row - maxRow / 2);
            }
        }

        // Create faces
        for (let row = 0; row < maxRow; row++) {
            for (let col = 0; col < maxCol; col++) {
                const a = row * (maxCol + 1) + col;
                const b = a + maxCol + 1;

                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: false
        });

        if (this.mesh3D) this.scene3D.remove(this.mesh3D);
        this.mesh3D = new THREE.Mesh(geometry, material);
        this.scene3D.add(this.mesh3D);

        // Grid helper
        const gridHelper = new THREE.GridHelper(Math.max(maxRow, maxCol), 10);
        this.scene3D.add(gridHelper);
    }

    animate3D() {
        if (!this.renderer3D) return;

        requestAnimationFrame(() => this.animate3D());
        this.controls3D.update();
        this.renderer3D.render(this.scene3D, this.camera3D);
    }

    close3DView() {
        document.getElementById('viewer3D').style.display = 'none';
        document.getElementById('map').style.display = 'block';

        if (this.renderer3D) {
            this.renderer3D.domElement.remove();
            this.renderer3D.dispose();
            this.renderer3D = null;
        }
    }

    resetView() {
        this.clearDrawing();
        this.surveyArea = null;
        this.gridCells = [];
        this.pixelatedData = [];
        document.getElementById('pixelInfo').textContent = 'Draw an area to start';
        document.getElementById('areaInfo').textContent = 'Draw an area to start';
    }

    exportImage() {
        alert('To export: Right-click the map and select "Save image as..."');
    }

    exportGridData() {
        const data = {
            year: this.currentYear,
            gridCellSize: this.gridCellSize,
            totalCells: this.gridCells.length,
            pixelatedData: this.pixelatedData
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `terrain-data-3d-${this.currentYear}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const pixelator = new MapPixelator3D();
});
