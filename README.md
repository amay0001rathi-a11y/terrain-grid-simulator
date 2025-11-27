# Terrain Grid Simulator with Auto-Pixelation

A web-based terrain analysis tool that allows you to create grid overlays on satellite imagery, automatically analyze terrain types using image processing, and mark different terrain features for analysis and planning.

## Features

### 🎨 Auto-Pixelation (NEW!)
Automatically analyze satellite/aerial images to detect and classify terrain types:
- **🌲 Forest Areas** - Detected by green color dominance
- **💧 Water Bodies** - Detected by blue color dominance
- **🪨 Rocky Terrain** - Detected by gray/low saturation colors
- **💣 UXO/Craters** - Detected by white bomb crater markers
- **☢️ Contaminated Areas** - Automatically marked in 1km radius around craters
- **🛣️ Roads** - Detected by dark/black areas
- **✅ Cleared Land** - Default for unclassified areas

### Manual Features
- **Upload Images**: Upload your own satellite/aerial terrain images
- **Boundary Box Drawing**: Define custom analysis areas
- **Customizable Grid System**: Define grid cell sizes (10-200 meters)
- **Manual Terrain Painting**: Override auto-detection by painting cells manually
- **Paint Mode**: Click and paint multiple cells quickly
- **Statistics**: Real-time counts of each terrain type
- **Import/Export**: Save and load configurations as JSON files

## Setup Instructions

### Run the Application

Start a local server:

```bash
# Using npm (recommended)
npm run dev

# Or using npx directly
npx http-server -p 8000
```

Then navigate to `http://localhost:8000`

## How to Use

### 1. Upload Your Image
1. Click **"Upload Terrain/Map Image"**
2. Select your satellite/aerial image (PNG, JPG, etc.)
3. The image will be displayed on the canvas

### 2. Define the Analysis Area
1. Click **"Draw Boundary Box"**
2. Click and drag on the image to create a red boundary box
3. This box defines the area to be analyzed

### 3. Configure Area & Grid
- **Box Area (Hectares)**: Set the real-world area size (default: 25 Ha = 0.25 sq km)
- **Grid Cell Size (meters)**: Set cell size in meters (default: 50m)
- The grid automatically updates based on these settings

### 4. Auto-Pixelate the Image ✨
1. Click **"🎨 Auto-Analyze Terrain"** button
2. The system will automatically:
   - Analyze each grid cell's color composition
   - Detect white bomb craters (UXO)
   - Classify terrain types based on color
   - Mark contaminated zones (1km radius around craters)
3. Progress will be shown during analysis
4. View results in the Statistics panel

### 5. Manual Adjustments (Optional)
1. Select a terrain type from the Terrain Features panel
2. Enable **"Paint Mode"** checkbox
3. Click on individual cells to manually override the auto-classification
4. Use "Clear" to remove terrain from cells

### View Statistics

The Statistics panel shows real-time counts of:
- Total grid cells
- 🌲 Forest areas
- 💧 Water bodies
- 🪨 Rocky terrain
- 💣 UXO/Craters
- ☢️ Contaminated areas (within 1km of craters)
- 🛣️ Roads
- ✅ Clear/unclassified land

## Terrain Detection Logic

The algorithm uses **advanced pixel distribution analysis** to classify terrain more accurately.

### Forest Detection
Uses pixel-level distribution analysis for better accuracy:
- **Primary**: >35% greenish pixels (G > R + 5) AND average brightness < 100
- **Alternative**: Green dominant average (G > R + 8, G >= B - 5) with brightness < 110
- **Why**: Satellite forests appear as dark green/blue-green masses
- **Example**: Dense vegetation, tree cover, forested areas

### Water Detection
Multi-criteria detection for various water appearances:
- **Primary**: >40% blue-tinted pixels (B > R + 10 AND B > G + 5)
- **Alternative**: Blue dominant average (B > R + 15, B > G + 10, B > 70)
- **Why**: Water can appear as dark spots or bright blue depending on depth/lighting
- **Example**: Rivers, lakes, ponds, flooded areas, water bodies

### Rocky Terrain Detection
- Low saturation (max color diff < 30)
- Medium brightness range: 100-150
- **Why**: Rocky areas have minimal color variation (grayish)
- **Example**: Rocky outcrops, bare soil, exposed ground

### UXO/Crater Detection (Improved)
Enhanced crater detection with water filtering:
- White/bright pixels: `R > 200`, `G > 200`, `B > 200`, and balanced (not blue-shifted)
- >30% white pixels AND <20% blue pixels (to exclude water)
- **Why**: Bomb craters appear white but water can also be bright - need to distinguish
- **Example**: Bomb craters, white circular markers, explosion sites

### Contaminated Area Detection
- Calculated radius: 1000m / grid cell size
- All cells within radius of crater marked as contaminated
- Preserves crater cells as UXO (not overwritten)
- **Purpose**: Mark hazardous zones around detected explosives
- **Note**: Uses Euclidean distance for accurate radius calculation

### Road Detection
- Very low brightness (<45) with >60% dark pixels
- **Why**: Roads appear as very dark/black lines in satellite imagery
- **Example**: Paved roads, dark paths, tracks

## Color Coding

| Terrain Type | Color | Hex Code | Visual |
|-------------|-------|----------|--------|
| Forest | Green | #228B22 | 🌲 |
| Water | Blue | #1E90FF | 💧 |
| Rocky | Gray | #808080 | 🪨 |
| UXO/Crater | Red | #FF0000 | 💣 |
| Contaminated | Brown | #8B4513 | ☢️ |
| Road | Black | #000000 | 🛣️ |
| Clear | White | #FFFFFF | ✅ |

## Tips for Best Results

1. **Image Quality**: Use high-resolution satellite/aerial images for better detection accuracy
2. **Boundary Box**: Draw tight boundaries around the area of interest
3. **Grid Size**:
   - Smaller cells (10-30m) = More detail, slower analysis
   - Larger cells (50-100m) = Faster analysis, less detail
4. **Manual Override**: Use paint mode to correct any misclassified cells
5. **Crater Detection**: Works best with clear white/light colored crater markers
6. **Lighting**: Images with consistent lighting produce better results

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
