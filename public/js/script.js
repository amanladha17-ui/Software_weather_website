// --- DATA AND CONSTANTS ---
// Using Open-Meteo for keyless public data in the frontend demo
// In the final Node.js application, this URL should be changed to YOUR Express endpoint: `/api/weather`
const API_URL = 'https://api.open-meteo.com/v1/forecast';

// Coordinates for the 5 famous places (Lat, Lon)
const FAMOUS_CITIES = {
    'London': { lat: 51.5074, lon: 0.1278, icon: '🇬🇧' },
    'Paris': { lat: 48.8566, lon: 2.3522, icon: '🇫🇷' },
    'Tokyo': { lat: 35.6895, lon: 139.6917, icon: '🇯🇵' },
    'New York': { lat: 40.7128, lon: -74.0060, icon: '🇺🇸' },
    'Dubai': { lat: 25.2048, lon: 55.2708, icon: '🇦🇪' }
};

// Mapping for Open-Meteo's WMO Weather codes (simplified for display)
const WMO_CODE_MAP = {
    0: { desc: "Clear sky", icon: "☀️" },
    1: { desc: "Mostly Clear", icon: "🌤️" },
    2: { desc: "Partly Cloudy", icon: "⛅" },
    3: { desc: "Overcast", icon: "☁️" },
    45: { desc: "Fog", icon: "🌫️" },
    51: { desc: "Drizzle Light", icon: "🌧️" },
    61: { desc: "Rain Slight", icon: "🌧️" },
    65: { desc: "Rain Heavy", icon: "⛈️" },
    71: { desc: "Snow Slight", icon: "🌨️" },
    80: { desc: "Rain showers", icon: "🌦️" },
    95: { desc: "Thunderstorm", icon: "🌩️" },
    99: { desc: "Heavy Thunderstorm", icon: "🌪️" },
    'default': { desc: "Unknown", icon: "" }
};

// --- DOM ELEMENTS ---
// These elements are available globally because script.js is loaded after the body
const landingPage = document.getElementById('landingPage');
const detailsPage = document.getElementById('detailsPage');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const featuredCitiesContainer = document.getElementById('featuredCities');
const loadingIndicator = document.getElementById('loadingIndicator');
const messageBox = document.getElementById('messageBox');

// --- UTILITY FUNCTIONS ---

/** Shows a temporary message notification (replacing alert()) */
function showMessage(msg, isError = true) {
    messageBox.textContent = msg;
    messageBox.className = isError 
        ? 'fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-xl z-50 transition-opacity duration-300' 
        : 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 transition-opacity duration-300';
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 4000);
}

/** Converts an ISO 8601 timestamp to a formatted time string (e.g., 6:30 AM) */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Utility for basic client-side navigation (simulating a two-page app) */
function navigate(page) {
    if (page === 'details') {
        landingPage.classList.add('opacity-0');
        landingPage.classList.add('hidden');

        detailsPage.classList.remove('hidden');
        setTimeout(() => {
            detailsPage.classList.remove('opacity-0');
        }, 10);
    } else { // 'landing'
        detailsPage.classList.add('opacity-0');
        detailsPage.classList.add('hidden');
        
        landingPage.classList.remove('hidden');
        setTimeout(() => {
            landingPage.classList.remove('opacity-0');
        }, 10);
    }
}

/**
 * Fetches weather data for a given location using coordinates.
 * This function currently calls Open-Meteo directly for the demo environment.
 */
async function fetchWeatherData(city, lat, lon) {
    loadingIndicator.style.display = 'flex';
    
    // Construct the Open-Meteo API URL
    const url = `${API_URL}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto&forecast_days=7&temperature_unit=celsius&wind_speed_unit=kmh`;

    try {
        const maxRetries = 3;
        let response = null;

        for (let i = 0; i < maxRetries; i++) {
            response = await fetch(url);
            if (response.ok) break;

            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                 throw new Error(`Failed to fetch data after ${maxRetries} attempts.`);
            }
        }

        const data = await response.json();
        loadingIndicator.style.display = 'none';

        if (data.reason || !data.current || !data.daily) {
             throw new Error(`API returned an error for location ${city}: ${data.reason || 'No data available'}`);
        }

        const currentData = data.current;
        const dailyData = data.daily;
        const weatherCode = currentData.weather_code;
        const weatherInfo = WMO_CODE_MAP[weatherCode] || WMO_CODE_MAP['default'];
        
        const todaySunrise = dailyData.sunrise[0];
        const todaySunset = dailyData.sunset[0];

        return {
            city: city,
            temp: currentData.temperature_2m,
            humidity: currentData.relative_humidity_2m,
            windSpeed: currentData.wind_speed_10m,
            weather: weatherInfo.desc,
            icon: weatherInfo.icon,
            sunrise: todaySunrise,
            sunset: todaySunset,
            dailyForecasts: dailyData,
            // Mock Alert
            alert: Math.random() < 0.2 ? "Severe Weather Warning: Strong winds expected." : null
        };

    } catch (error) {
        loadingIndicator.style.display = 'none';
        console.error("Error fetching weather:", error);
        showMessage(`Could not fetch weather for ${city}. Please check the location.`, true);
        return null;
    }
}


// --- RENDERING FUNCTIONS ---

/** Renders a small card for a featured city */
function renderCityCard(city, data) {
    const card = document.createElement('div');
    card.className = 'weather-card bg-white p-6 rounded-2xl shadow-lg border-b-4 border-sky-blue/50 cursor-pointer';
    card.setAttribute('data-city', city);
    card.onclick = () => showDetails(city, data.lat, data.lon);

    const currentTemp = data.temp !== undefined ? `${Math.round(data.temp)}°C` : '--';
    const weatherDesc = data.weather || 'Check now';
    const weatherIcon = data.icon || '🌎';

    card.innerHTML = `
        <div class="flex items-start justify-between">
            <div>
                <p class="text-3xl font-bold text-dark-slate">${city}</p>
                <p class="text-sm text-gray-500">${data.icon}</p>
            </div>
            <div class="text-5xl">${weatherIcon}</div>
        </div>
        <div class="mt-4">
            <p class="text-5xl font-extralight text-sky-blue">${currentTemp}</p>
        </div>
    `;
    return card;
}

/** Renders the landing page with current data for featured cities */
async function renderLandingPage() {
    featuredCitiesContainer.innerHTML = '';
    
    // Use Promise.all to fetch city data concurrently for faster loading
    const cityPromises = Object.entries(FAMOUS_CITIES).map(async ([city, data]) => {
        const weatherData = await fetchWeatherData(city, data.lat, data.lon);
        if (weatherData) {
            FAMOUS_CITIES[city] = { ...data, ...weatherData }; 
            return { city, weatherData };
        }
        return { city, weatherData: data };
    });

    const results = await Promise.all(cityPromises);

    results.forEach(({ city, weatherData }) => {
        featuredCitiesContainer.appendChild(renderCityCard(city, weatherData));
    });
}

/** Renders the detailed 7-day forecast cards */
function renderSevenDayForecast(dailyData) {
    const container = document.getElementById('sevenDayForecast');
    container.innerHTML = '';

    for (let i = 0; i < dailyData.time.length; i++) {
        const date = new Date(dailyData.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const weatherCode = dailyData.weather_code[i];
        const weatherInfo = WMO_CODE_MAP[weatherCode] || WMO_CODE_MAP['default'];
        const maxTemp = Math.round(dailyData.temperature_2m_max[i]);
        const minTemp = Math.round(dailyData.temperature_2m_min[i]);

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl shadow-md flex flex-col items-center text-center transition hover:shadow-lg border-b-4 border-sky-blue/30';
        
        card.innerHTML = `
            <p class="text-lg font-semibold text-dark-slate">${dayName}</p>
            <div class="text-3xl my-2">${weatherInfo.icon}</div>
            <p class="text-sm text-gray-600">${weatherInfo.desc}</p>
            <p class="text-md font-bold text-sky-blue mt-2">${maxTemp}° / <span class="text-gray-400">${minTemp}°</span></p>
        `;
        container.appendChild(card);
    }
}

/** Renders the details page content */
function updateDetailsPage(data) {
    document.getElementById('detailsCityName').textContent = data.city;
    document.getElementById('currentTemp').textContent = Math.round(data.temp);
    // document.getElementById('weatherDescription').textContent = data.weather;
    document.getElementById('currentWeatherIcon').textContent = data.icon;
    document.getElementById('humidity').textContent = `${Math.round(data.humidity)}%`;
    document.getElementById('windSpeed').textContent = `${data.windSpeed.toFixed(1)} km/h`;
    
    document.getElementById('sunriseTime').textContent = formatTime(data.sunrise);
    document.getElementById('sunsetTime').textContent = formatTime(data.sunset);

    // Alerts Section
    const alertElement = document.getElementById('alertSection');
    const alertMessage = document.getElementById('alertMessage');
    if (data.alert) {
        alertElement.classList.remove('bg-white');
        alertElement.classList.add('bg-red-100', 'border-l-4', 'border-red-500');
        alertMessage.textContent = `🚨 ALERT: ${data.alert}`;
        alertMessage.classList.add('text-red-700', 'font-semibold');
    } else {
        alertElement.className = 'bg-white p-6 rounded-2xl shadow-xl';
        alertMessage.textContent = `No active weather alerts for this location.`;
        alertMessage.classList.remove('text-red-700', 'font-semibold');
    }

    renderSevenDayForecast(data.dailyForecasts);
    navigate('details');
}

// --- EVENT HANDLERS ---

/** Handles navigation to the details page and fetches data if necessary */
async function showDetails(city, lat, lon) {
    const cityData = FAMOUS_CITIES[city];
    let weatherData;

    if (cityData && cityData.temp !== undefined) {
        weatherData = cityData;
    } else {
        weatherData = await fetchWeatherData(city, lat, lon);
    }

    if (weatherData) {
        updateDetailsPage(weatherData);
    }
}

// Handle the search form submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const locationName = searchInput.value.trim();
    if (!locationName) return;
    
    loadingIndicator.style.display = 'flex';
    
    try {
        // Step 1: Geocoding (using Open-Meteo's geocoding service for demo)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            showMessage(`Location "${locationName}" not found.`, true);
            return;
        }

        const result = geoData.results[0];
        const lat = result.latitude;
        const lon = result.longitude;
        const displayCity = result.name + (result.country ? `, ${result.country}` : '');

        // Step 2: Fetch Weather using the coordinates
        const weatherData = await fetchWeatherData(displayCity, lat, lon);
        
        if (weatherData) {
            updateDetailsPage(weatherData);
            searchInput.value = '';
        }

    } catch (error) {
        showMessage(`Failed to process search for ${locationName}.`, true);
        console.error('Search and Geocoding Error:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
});

// Handle the back button click
document.getElementById('backButton').addEventListener('click', () => {
    navigate('landing');
});

// --- INITIALIZATION ---
window.onload = renderLandingPage;