// Image-Based Terrain Pixelator - Enhanced Version
class ImagePixelator {
    constructor() {
        console.log('ImagePixelator initializing...');

        // Canvas and image
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.imageLoaded = false;

        // Drawing state
        this.isDrawing = false;
        this.drawingMode = null; // 'polygon' or 'rectangle'
        this.polygonPoints = [];
        this.rectangleStart = null;
        this.selectedArea = null; // Stores the drawn area

        // Grid settings
        this.gridCellSize = 50; // meters
        this.surveyAreaHa = 25; // hectares
        this.metersPerPixel = 1; // Will be calculated based on survey area
        this.gridCells = [];

        // Pixelation
        this.pixelatedData = [];
        this.isPixelated = false;

        // 3D Scene
        this.scene3D = null;
        this.camera3D = null;
        this.renderer3D = null;
        this.controls3D = null;
        this.mesh3D = null;

        this.initEventListeners();
        this.setupCanvas();
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = window.innerWidth - 320;
        this.canvas.height = window.innerHeight;

        // Add mouse event listeners for drawing
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    }

    initEventListeners() {
        // Image upload
        document.getElementById('loadImageBtn').addEventListener('click', () => this.loadImage());

        // Drawing tools
        document.getElementById('drawPolygonBtn').addEventListener('click', () => this.startPolygonDrawing());
        document.getElementById('drawRectangleBtn').addEventListener('click', () => this.startRectangleDrawing());
        document.getElementById('clearPolygonBtn').addEventListener('click', () => this.clearPolygon());

        // Grid settings
        document.getElementById('surveyAreaHa').addEventListener('input', (e) => {
            this.surveyAreaHa = parseFloat(e.target.value);
        });
        document.getElementById('gridCellSize').addEventListener('input', (e) => {
            this.gridCellSize = parseFloat(e.target.value);
        });
        document.getElementById('applyGridBtn').addEventListener('click', () => this.createGrid());

        // Pixelation
        document.getElementById('pixelateBtn').addEventListener('click', () => this.pixelateArea());
        document.getElementById('show3DBtn').addEventListener('click', () => this.show3DView());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // 3D viewer
        document.getElementById('close3DBtn').addEventListener('click', () => this.close3DView());

        // Export
        document.getElementById('exportImageBtn').addEventListener('click', () => this.exportImage());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportGridData());
    }

    loadImage() {
        const input = document.getElementById('imageUpload');
        const file = input.files[0];

        if (!file) {
            alert('Please select an image file first!');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                this.imageLoaded = true;
                this.drawImageOnCanvas();
                document.getElementById('imageInfo').textContent = `✓ Image loaded: ${file.name}`;
                document.getElementById('areaInfo').textContent = 'Draw an area to start';
                document.getElementById('pixelInfo').textContent = 'Draw an area to start';
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    drawImageOnCanvas() {
        // Fill canvas completely with image (cover mode)
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imageAspect = this.image.width / this.image.height;

        let width, height, x, y;

        if (canvasAspect > imageAspect) {
            // Canvas is wider than image - fit to width
            width = this.canvas.width;
            height = this.canvas.width / imageAspect;
            x = 0;
            y = (this.canvas.height - height) / 2;
        } else {
            // Canvas is taller than image - fit to height
            height = this.canvas.height;
            width = this.canvas.height * imageAspect;
            x = (this.canvas.width - width) / 2;
            y = 0;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, x, y, width, height);

        // Store image dimensions for later use
        this.imageRect = { x, y, width, height };
    }

    startPolygonDrawing() {
        if (!this.imageLoaded) {
            alert('Please load an image first!');
            return;
        }
        this.drawingMode = 'polygon';
        this.polygonPoints = [];
        this.selectedArea = null;
        this.gridCells = [];
        this.isPixelated = false;
        this.pixelatedData = [];
        document.getElementById('areaInfo').textContent = 'Click to add points. Double-click or press ENTER to finish.';
        document.getElementById('clearPolygonBtn').style.display = 'block';
        this.redrawCanvas();
    }

    startRectangleDrawing() {
        if (!this.imageLoaded) {
            alert('Please load an image first!');
            return;
        }
        this.drawingMode = 'rectangle';
        this.rectangleStart = null;
        this.selectedArea = null;
        this.gridCells = [];
        this.isPixelated = false;
        this.pixelatedData = [];
        document.getElementById('areaInfo').textContent = 'Click and drag to draw rectangle.';
        document.getElementById('clearPolygonBtn').style.display = 'none';
        this.redrawCanvas();
    }

    clearPolygon() {
        this.polygonPoints = [];
        this.drawingMode = 'polygon';
        this.redrawCanvas();
        document.getElementById('areaInfo').textContent = 'Click to add points. Double-click or press ENTER to finish.';
    }

    handleMouseDown(e) {
        if (!this.drawingMode || !this.imageLoaded) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.drawingMode === 'polygon') {
            this.polygonPoints.push({ x, y });
            this.redrawCanvas();
            document.getElementById('areaInfo').textContent = `Points: ${this.polygonPoints.length}. Double-click to finish.`;
        } else if (this.drawingMode === 'rectangle') {
            this.isDrawing = true;
            this.rectangleStart = { x, y };
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Show preview line for polygon
        if (this.drawingMode === 'polygon' && this.polygonPoints.length > 0 && !this.isDrawing) {
            this.redrawCanvas();
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.polygonPoints[this.polygonPoints.length - 1].x,
                           this.polygonPoints[this.polygonPoints.length - 1].y);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw rectangle preview
        if (this.isDrawing && this.drawingMode === 'rectangle') {
            this.redrawCanvas();

            // Draw temporary rectangle
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.rectangleStart.x,
                this.rectangleStart.y,
                x - this.rectangleStart.x,
                y - this.rectangleStart.y
            );
        }
    }

    handleMouseUp(e) {
        if (!this.isDrawing || this.drawingMode !== 'rectangle') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = false;
        this.selectedArea = {
            type: 'rectangle',
            x: Math.min(this.rectangleStart.x, x),
            y: Math.min(this.rectangleStart.y, y),
            width: Math.abs(x - this.rectangleStart.x),
            height: Math.abs(y - this.rectangleStart.y)
        };

        this.drawingMode = null;
        this.redrawCanvas();
        document.getElementById('areaInfo').textContent = '✓ Rectangle drawn. Apply grid to continue.';
        document.getElementById('clearPolygonBtn').style.display = 'none';
    }

    handleDoubleClick(e) {
        if (this.drawingMode !== 'polygon' || this.polygonPoints.length < 3) return;

        this.selectedArea = {
            type: 'polygon',
            points: [...this.polygonPoints]
        };

        this.drawingMode = null;
        this.polygonPoints = [];
        this.redrawCanvas();
        document.getElementById('areaInfo').textContent = '✓ Polygon drawn. Apply grid to continue.';
        document.getElementById('clearPolygonBtn').style.display = 'none';
    }

    redrawCanvas() {
        // Redraw image
        this.drawImageOnCanvas();

        // Dim non-selected area if area is selected
        if (this.selectedArea && !this.isPixelated) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Changed to 20% opacity
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Clear selected area
            this.ctx.globalCompositeOperation = 'destination-out';
            if (this.selectedArea.type === 'rectangle') {
                this.ctx.fillRect(
                    this.selectedArea.x,
                    this.selectedArea.y,
                    this.selectedArea.width,
                    this.selectedArea.height
                );
            } else if (this.selectedArea.type === 'polygon') {
                this.ctx.beginPath();
                this.ctx.moveTo(this.selectedArea.points[0].x, this.selectedArea.points[0].y);
                for (let i = 1; i < this.selectedArea.points.length; i++) {
                    this.ctx.lineTo(this.selectedArea.points[i].x, this.selectedArea.points[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
            }

            // Restore composite operation and redraw selected area with full brightness
            this.ctx.globalCompositeOperation = 'source-over';
            if (this.selectedArea.type === 'rectangle') {
                this.ctx.drawImage(
                    this.image,
                    (this.selectedArea.x - this.imageRect.x) / (this.imageRect.width / this.image.width),
                    (this.selectedArea.y - this.imageRect.y) / (this.imageRect.height / this.image.height),
                    this.selectedArea.width / (this.imageRect.width / this.image.width),
                    this.selectedArea.height / (this.imageRect.height / this.image.height),
                    this.selectedArea.x,
                    this.selectedArea.y,
                    this.selectedArea.width,
                    this.selectedArea.height
                );
            }
        }

        // Draw polygon points if in polygon mode
        if (this.drawingMode === 'polygon' && this.polygonPoints.length > 0) {
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.fillStyle = '#00d4ff';
            this.ctx.lineWidth = 3;

            this.ctx.beginPath();
            this.ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
            for (let i = 1; i < this.polygonPoints.length; i++) {
                this.ctx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
            }
            this.ctx.stroke();

            // Draw points with glow
            this.polygonPoints.forEach((point, index) => {
                // Glow effect
                this.ctx.shadowColor = '#00d4ff';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;

                // Point number
                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 10px Courier New';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(index + 1, point.x, point.y);
                this.ctx.fillStyle = '#00d4ff';
            });
        }

        // Draw selected area outline
        if (this.selectedArea) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 10;

            if (this.selectedArea.type === 'rectangle') {
                this.ctx.strokeRect(
                    this.selectedArea.x,
                    this.selectedArea.y,
                    this.selectedArea.width,
                    this.selectedArea.height
                );
            } else if (this.selectedArea.type === 'polygon') {
                this.ctx.beginPath();
                this.ctx.moveTo(this.selectedArea.points[0].x, this.selectedArea.points[0].y);
                for (let i = 1; i < this.selectedArea.points.length; i++) {
                    this.ctx.lineTo(this.selectedArea.points[i].x, this.selectedArea.points[i].y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
            this.ctx.shadowBlur = 0;
        }

        // Draw grid if exists (always visible with thin black lines)
        if (this.gridCells.length > 0) {
            this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)'; // Light black/dark gray
            this.ctx.lineWidth = 0.5; // Thin lines
            this.ctx.globalAlpha = 1.0;

            this.gridCells.forEach(cell => {
                if (cell.corners) {
                    // Draw rotated cell using corners
                    this.ctx.beginPath();
                    this.ctx.moveTo(cell.corners[0].x, cell.corners[0].y);
                    for (let i = 1; i < cell.corners.length; i++) {
                        this.ctx.lineTo(cell.corners[i].x, cell.corners[i].y);
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();
                } else {
                    // Draw regular rectangular cell
                    this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
                }
            });
        }
    }

    createGrid() {
        if (!this.selectedArea) {
            alert('Please draw an area first!');
            return;
        }

        this.gridCells = [];

        // Calculate meters per pixel based on survey area
        let areaPixels;
        if (this.selectedArea.type === 'rectangle') {
            areaPixels = this.selectedArea.width * this.selectedArea.height;
        } else {
            // Calculate polygon area in pixels
            const points = this.selectedArea.points;
            let area = 0;
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                area += points[i].x * points[j].y;
                area -= points[j].x * points[i].y;
            }
            areaPixels = Math.abs(area / 2);
        }

        // Convert hectares to square meters: 1 Ha = 10,000 m²
        const areaSqMeters = this.surveyAreaHa * 10000;
        this.metersPerPixel = Math.sqrt(areaSqMeters / areaPixels);
        const cellSizePixels = this.gridCellSize / this.metersPerPixel;

        if (this.selectedArea.type === 'rectangle') {
            const { x, y, width, height } = this.selectedArea;
            const cols = Math.ceil(width / cellSizePixels);
            const rows = Math.ceil(height / cellSizePixels);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const cellX = x + col * cellSizePixels;
                    const cellY = y + row * cellSizePixels;
                    const cellWidth = Math.min(cellSizePixels, x + width - cellX);
                    const cellHeight = Math.min(cellSizePixels, y + height - cellY);

                    this.gridCells.push({
                        x: cellX,
                        y: cellY,
                        width: cellWidth,
                        height: cellHeight,
                        centerX: cellX + cellWidth / 2,
                        centerY: cellY + cellHeight / 2,
                        row,
                        col
                    });
                }
            }
        } else if (this.selectedArea.type === 'polygon') {
            const points = this.selectedArea.points;

            // Find the longest edge to determine grid orientation
            let longestEdgeLength = 0;
            let longestEdgeIndex = 0;

            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

                if (length > longestEdgeLength) {
                    longestEdgeLength = length;
                    longestEdgeIndex = i;
                }
            }

            // Calculate angle of the longest edge (this will be our primary axis)
            const p1 = points[longestEdgeIndex];
            const p2 = points[(longestEdgeIndex + 1) % points.length];
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            // Find bounding box
            const minX = Math.min(...points.map(p => p.x));
            const maxX = Math.max(...points.map(p => p.x));
            const minY = Math.min(...points.map(p => p.y));
            const maxY = Math.max(...points.map(p => p.y));

            // Calculate center of polygon for rotation
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            // Rotate all polygon points to align with axes
            const rotatedPoints = points.map(p => ({
                x: Math.cos(-angle) * (p.x - centerX) - Math.sin(-angle) * (p.y - centerY),
                y: Math.sin(-angle) * (p.x - centerX) + Math.cos(-angle) * (p.y - centerY)
            }));

            // Find rotated bounding box
            const rotatedMinX = Math.min(...rotatedPoints.map(p => p.x));
            const rotatedMaxX = Math.max(...rotatedPoints.map(p => p.x));
            const rotatedMinY = Math.min(...rotatedPoints.map(p => p.y));
            const rotatedMaxY = Math.max(...rotatedPoints.map(p => p.y));

            // Create grid in rotated space
            const cols = Math.ceil((rotatedMaxX - rotatedMinX) / cellSizePixels);
            const rows = Math.ceil((rotatedMaxY - rotatedMinY) / cellSizePixels);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // Position in rotated space
                    const rotatedCellX = rotatedMinX + col * cellSizePixels;
                    const rotatedCellY = rotatedMinY + row * cellSizePixels;
                    const rotatedCellCenterX = rotatedCellX + cellSizePixels / 2;
                    const rotatedCellCenterY = rotatedCellY + cellSizePixels / 2;

                    // Rotate back to original space
                    const cellX = Math.cos(angle) * rotatedCellX - Math.sin(angle) * rotatedCellY + centerX;
                    const cellY = Math.sin(angle) * rotatedCellX + Math.cos(angle) * rotatedCellY + centerY;
                    const cellCenterX = Math.cos(angle) * rotatedCellCenterX - Math.sin(angle) * rotatedCellCenterY + centerX;
                    const cellCenterY = Math.sin(angle) * rotatedCellCenterX + Math.cos(angle) * rotatedCellCenterY + centerY;

                    // Check if center is inside polygon
                    if (this.pointInPolygon({ x: cellCenterX, y: cellCenterY }, points)) {
                        // Calculate the 4 corners of the rotated cell
                        const corners = [
                            { rx: rotatedCellX, ry: rotatedCellY },
                            { rx: rotatedCellX + cellSizePixels, ry: rotatedCellY },
                            { rx: rotatedCellX + cellSizePixels, ry: rotatedCellY + cellSizePixels },
                            { rx: rotatedCellX, ry: rotatedCellY + cellSizePixels }
                        ].map(corner => ({
                            x: Math.cos(angle) * corner.rx - Math.sin(angle) * corner.ry + centerX,
                            y: Math.sin(angle) * corner.rx + Math.cos(angle) * corner.ry + centerY
                        }));

                        this.gridCells.push({
                            x: cellX,
                            y: cellY,
                            width: cellSizePixels,
                            height: cellSizePixels,
                            centerX: cellCenterX,
                            centerY: cellCenterY,
                            corners: corners,
                            angle: angle,
                            row,
                            col
                        });
                    }
                }
            }
        }

        this.redrawCanvas();
        const totalAreaCovered = this.gridCells.length * this.gridCellSize * this.gridCellSize;
        const hectaresCovered = (totalAreaCovered / 10000).toFixed(2);
        document.getElementById('pixelInfo').textContent =
            `✓ Grid: ${this.gridCells.length} cells (${this.gridCellSize}m × ${this.gridCellSize}m = ${hectaresCovered} Ha)`;
    }

    pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    pixelateArea() {
        if (this.gridCells.length === 0) {
            alert('Please create a grid first!');
            return;
        }

        this.pixelatedData = [];
        this.isPixelated = true;

        // Redraw image to get clean version
        this.drawImageOnCanvas();

        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Sample each grid cell
        this.gridCells.forEach(cell => {
            const samples = [];

            // Sample 9 points in the cell
            for (let dy = 0.25; dy <= 0.75; dy += 0.25) {
                for (let dx = 0.25; dx <= 0.75; dx += 0.25) {
                    const x = Math.floor(cell.x + cell.width * dx);
                    const y = Math.floor(cell.y + cell.height * dy);

                    if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
                        const index = (y * this.canvas.width + x) * 4;
                        samples.push({
                            r: imageData.data[index],
                            g: imageData.data[index + 1],
                            b: imageData.data[index + 2]
                        });
                    }
                }
            }

            // Average color
            if (samples.length > 0) {
                const avgR = Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length);
                const avgG = Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length);
                const avgB = Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length);

                this.pixelatedData.push({
                    ...cell,
                    color: { r: avgR, g: avgG, b: avgB }
                });
            }
        });

        // Draw pixelated version with dimmed background
        this.drawImageOnCanvas();

        // Create a mask for the selected area
        this.ctx.save();

        // Dim entire background significantly (80% dark)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Cut out the polygon area from the dark overlay
        this.ctx.globalCompositeOperation = 'destination-out';
        if (this.selectedArea.type === 'polygon') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.selectedArea.points[0].x, this.selectedArea.points[0].y);
            for (let i = 1; i < this.selectedArea.points.length; i++) {
                this.ctx.lineTo(this.selectedArea.points[i].x, this.selectedArea.points[i].y);
            }
            this.ctx.closePath();
            this.ctx.fill();
        } else if (this.selectedArea.type === 'rectangle') {
            this.ctx.fillRect(this.selectedArea.x, this.selectedArea.y, this.selectedArea.width, this.selectedArea.height);
        }

        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.restore();

        // Draw pixelated cells with full brightness (no additional dimming)
        this.pixelatedData.forEach(pixel => {
            this.ctx.fillStyle = `rgb(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b})`;

            if (pixel.corners) {
                // Draw rotated cell
                this.ctx.beginPath();
                this.ctx.moveTo(pixel.corners[0].x, pixel.corners[0].y);
                for (let i = 1; i < pixel.corners.length; i++) {
                    this.ctx.lineTo(pixel.corners[i].x, pixel.corners[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                // Draw regular rectangular cell
                this.ctx.fillRect(pixel.x, pixel.y, pixel.width, pixel.height);
            }
        });

        // Draw grid on top with thin black lines
        this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)'; // Light black/dark gray
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 1.0;
        this.gridCells.forEach(cell => {
            if (cell.corners) {
                // Draw rotated cell using corners
                this.ctx.beginPath();
                this.ctx.moveTo(cell.corners[0].x, cell.corners[0].y);
                for (let i = 1; i < cell.corners.length; i++) {
                    this.ctx.lineTo(cell.corners[i].x, cell.corners[i].y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            } else {
                // Draw regular rectangular cell
                this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            }
        });

        document.getElementById('pixelInfo').textContent = `✓ Pixelated ${this.pixelatedData.length} cells`;
    }

    show3DView() {
        if (this.pixelatedData.length === 0) {
            alert('Please pixelate the area first!');
            return;
        }

        document.getElementById('viewer3D').style.display = 'block';
        this.init3DScene();
        this.create3DTerrain();
        this.animate3D();
    }

    init3DScene() {
        const container = document.getElementById('viewer3D');

        // Scene
        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0x000000);

        // Camera
        this.camera3D = new THREE.PerspectiveCamera(75, (window.innerWidth - 320) / window.innerHeight, 0.1, 1000);
        this.camera3D.position.set(0, 50, 100);

        // Renderer
        this.renderer3D = new THREE.WebGLRenderer({ antialias: true });
        this.renderer3D.setSize(window.innerWidth - 320, window.innerHeight);
        container.appendChild(this.renderer3D.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene3D.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        this.scene3D.add(directionalLight);

        // Controls
        this.controls3D = new THREE.OrbitControls(this.camera3D, this.renderer3D.domElement);
        this.controls3D.enableDamping = true;
    }

    create3DTerrain() {
        // Create geometry from pixelated data
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];

        // Find grid dimensions
        const minX = Math.min(...this.pixelatedData.map(p => p.x));
        const minY = Math.min(...this.pixelatedData.map(p => p.y));
        const maxX = Math.max(...this.pixelatedData.map(p => p.x + p.width));
        const maxY = Math.max(...this.pixelatedData.map(p => p.y + p.height));

        this.pixelatedData.forEach(pixel => {
            // Calculate height from color brightness
            const brightness = (pixel.color.r + pixel.color.g + pixel.color.b) / 3;
            const height = (brightness / 255) * 20;

            // Normalize coordinates
            const x = (pixel.x - minX) / (maxX - minX) * 100 - 50;
            const z = (pixel.y - minY) / (maxY - minY) * 100 - 50;

            // Create 4 vertices for each cell (as two triangles)
            const w = (pixel.width / (maxX - minX)) * 100;
            const h = (pixel.height / (maxY - minY)) * 100;

            // Triangle 1
            vertices.push(x, height, z);
            vertices.push(x + w, height, z);
            vertices.push(x, height, z + h);

            // Triangle 2
            vertices.push(x + w, height, z);
            vertices.push(x + w, height, z + h);
            vertices.push(x, height, z + h);

            // Colors for both triangles
            const r = pixel.color.r / 255;
            const g = pixel.color.g / 255;
            const b = pixel.color.b / 255;

            for (let i = 0; i < 6; i++) {
                colors.push(r, g, b);
            }
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide
        });

        this.mesh3D = new THREE.Mesh(geometry, material);
        this.scene3D.add(this.mesh3D);
    }

    animate3D() {
        if (!this.renderer3D) return;

        requestAnimationFrame(() => this.animate3D());
        this.controls3D.update();
        this.renderer3D.render(this.scene3D, this.camera3D);
    }

    close3DView() {
        document.getElementById('viewer3D').style.display = 'none';
        if (this.renderer3D && this.renderer3D.domElement.parentNode) {
            this.renderer3D.domElement.parentNode.removeChild(this.renderer3D.domElement);
        }
        this.renderer3D = null;
        this.scene3D = null;
        this.camera3D = null;
        this.controls3D = null;
        this.mesh3D = null;
    }

    reset() {
        this.selectedArea = null;
        this.gridCells = [];
        this.pixelatedData = [];
        this.isPixelated = false;
        this.drawingMode = null;
        this.polygonPoints = [];
        document.getElementById('clearPolygonBtn').style.display = 'none';

        if (this.imageLoaded) {
            this.drawImageOnCanvas();
            document.getElementById('areaInfo').textContent = 'Draw an area to start';
            document.getElementById('pixelInfo').textContent = 'Draw an area to start';
        }
    }

    exportImage() {
        if (!this.isPixelated) {
            alert('Please pixelate the area first!');
            return;
        }

        const link = document.createElement('a');
        link.download = 'pixelated-terrain.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    exportGridData() {
        if (this.pixelatedData.length === 0) {
            alert('Please pixelate the area first!');
            return;
        }

        const data = {
            surveyAreaHa: this.surveyAreaHa,
            gridCellSizeMeters: this.gridCellSize,
            totalCells: this.pixelatedData.length,
            metersPerPixel: this.metersPerPixel,
            cells: this.pixelatedData.map((cell, index) => ({
                id: index + 1,
                row: cell.row,
                col: cell.col,
                x: cell.x,
                y: cell.y,
                width: cell.width,
                height: cell.height,
                color: cell.color,
                widthMeters: cell.width * this.metersPerPixel,
                heightMeters: cell.height * this.metersPerPixel
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'terrain-grid-data.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImagePixelator();
});
