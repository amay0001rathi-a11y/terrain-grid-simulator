# Terrain Grid Simulator

A web-based terrain analysis tool that allows you to create grid overlays on satellite imagery and mark different terrain features for analysis and planning.

## Features

- **Google Maps Integration**: View satellite imagery of any location
- **Customizable Grid System**: Define grid cell sizes (10-200 meters)
- **Terrain Feature Painting**: Mark cells with different terrain types:
  - Forest Land
  - Rocky
  - Water
  - UXO (Unexploded Ordnance)
  - Road
  - Clear
- **Paint Mode**: Click and paint multiple cells quickly
- **Statistics**: Real-time counts of each terrain type
- **Import/Export**: Save and load configurations as JSON files
- **Edit Controls**: Clear terrain data or reset grid
- **Apply Buttons**: All panels have apply buttons for controlled updates

## Default Test Area

The simulator is pre-configured to test on a 0.26 sq km area in Cambodia (coordinates from provided satellite image).

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Maps JavaScript API
4. Create credentials (API Key)
5. Copy your API key

### 2. Configure the Application

Open [index.html](index.html) and replace `YOUR_API_KEY_HERE` with your actual Google Maps API key:

```html
<script async defer
    src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&callback=initMap">
</script>
```

### 3. Run the Application

Simply open `index.html` in a web browser. For best results, use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js with http-server
npx http-server
```

Then navigate to `http://localhost:8000`

## How to Use

### Setting Up the Area

1. Enter the center latitude and longitude in the "Area Setup" panel
2. Click "Apply Area" to update the map
3. The red rectangle shows your analysis area (default: 0.26 sq km)

### Creating the Grid

1. Set your desired grid cell size in meters (10-200m)
2. Click "Apply Grid" to generate the grid
3. The grid info shows how many cells were created

### Painting Terrain Features

1. Select a terrain type by clicking one of the colored buttons
2. Enable "Paint Mode" checkbox
3. Click on grid cells to paint them with the selected terrain
4. Use "Clear" to remove terrain from cells

### Import/Export

- **Export**: Click "Export Configuration" to save your current setup as a JSON file
- **Import**: Click "Import Configuration" to load a previously saved configuration

### Statistics

The statistics panel shows real-time counts of:
- Total grid cells
- Number of cells for each terrain type

## File Format

Exported configurations are JSON files with the following structure:

```json
{
  "version": "1.0",
  "timestamp": "2025-11-25T12:00:00.000Z",
  "area": {
    "centerLat": 13.3671,
    "centerLng": 103.8448,
    "sizeKm": 0.26
  },
  "grid": {
    "cellSize": 50
  },
  "terrainData": [
    {
      "cellId": "0-0",
      "terrain": "forest"
    }
  ]
}
```

## Project Structure

```
terrain-grid-simulator/
├── index.html          # Main HTML file
├── styles.css          # Styling
├── app.js             # Application logic
└── README.md          # This file
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License
