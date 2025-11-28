const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Disable caching for development
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Serve the main HTML file BEFORE static middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'map-pixelator.html'));
});

// Serve static files (CSS, JS, images) - disable index.html auto-serving
app.use(express.static(path.join(__dirname), {
    index: false
}));

// Old versions for reference
app.get('/old', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/drone', (req, res) => {
    res.sendFile(path.join(__dirname, 'drone-simulator.html'));
});

// Error handling for port in use
const server = app.listen(PORT, () => {
    console.log('');
    console.log('==============================================');
    console.log('   Terrain Grid Simulator - Node.js Server');
    console.log('==============================================');
    console.log('');
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log('');
    console.log('📝 Press Ctrl+C to stop the server');
    console.log('');
    console.log('==============================================');
    console.log('');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port or stop the other server.`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
        process.exit(1);
    }
});
