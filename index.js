// server.js - Main entry point for the Express server
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = 3000;

// IMPORTANT: Replace this with your actual OpenWeatherMap API key (or use a .env file for security)
const WEATHER_API_KEY = 'YOUR_API_KEY_HERE'; 
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5'; 

// Middleware to serve static files from the 'public' folder
// This makes public/index.html accessible at http://localhost:3000/
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- 1. Root Route ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public'));
});

// --- 2. API Proxy Endpoint (/api/weather) ---
// The frontend (script.js) calls this endpoint. 
// The server adds the secret API key and calls the external service.
app.get('/api/weather', async (req, res) => {
    const { location } = req.query;
    if (!location) {
        return res.status(400).json({ error: 'Location query parameter is required.' });
    }

    // Defensive check to ensure the API key is set
    if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
        console.error("FATAL: API Key is not configured in server.js!");
        return res.status(503).json({ error: 'Weather service is unavailable due to missing API Key configuration.' });
    }
    
    try {
        console.log(`Fetching weather for: ${location}`);
        
        // Secure request to OpenWeatherMap
        const response = await axios.get(`${API_BASE_URL}/weather`, {
            params: {
                q: location, // Query by city name
                appid: WEATHER_API_KEY,
                units: 'metric' // Use Celsius
            }
        });

        // Send the external API response data back to the client
        res.json(response.data);

    } catch (error) {
        // Log the error details and send a generic error response back
        const status = error.response ? error.response.status : 500;
        const message = error.response && error.response.data && error.response.data.message 
            ? error.response.data.message 
            : 'Failed to fetch weather data.';
            
        console.error(`External API Error (${status}): ${message}`);
        res.status(status).json({ error: message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("To view the application, open http://localhost:3000/ in your browser.");
});