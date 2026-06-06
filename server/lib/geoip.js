import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dynamic geocoding config data
const loadGeoipConfig = () => {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'geoip-data.json');
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to load geocoding config file, using empty fallbacks', { error: error.message });
    return { landLocations: [], cities: [] };
  }
};

const configData = loadGeoipConfig();
const landLocations = configData.landLocations || [];
const cities = configData.cities || [];

const geocodeLocation = (locStr) => {
  try {
    if (!locStr || typeof locStr !== 'string') return null;
    const l = locStr.toLowerCase().trim();
    if (l.includes('francisco') || l.includes('california') || l.includes('ca')) return { lat: 37.7749, lon: -122.4194, loc: "San Francisco, USA" };
    if (l.includes('london') || l.includes('uk') || l.includes('united kingdom')) return { lat: 51.5074, lon: -0.1278, loc: "London, UK" };
    if (l.includes('tokyo') || l.includes('japan')) return { lat: 35.6762, lon: 139.6503, loc: "Tokyo, Japan" };
    if (l.includes('india') || l.includes('bangalore') || l.includes('bengaluru')) return { lat: 12.9716, lon: 77.5946, loc: "Bengaluru, India" };
    if (l.includes('germany') || l.includes('munich') || l.includes('berlin')) return { lat: 48.1351, lon: 11.5820, loc: "Munich, Germany" };
    if (l.includes('australia') || l.includes('sydney') || l.includes('melbourne')) return { lat: -33.8688, lon: 151.2093, loc: "Sydney, Australia" };
    if (l.includes('paris') || l.includes('france')) return { lat: 48.8566, lon: 2.3522, loc: "Paris, France" };
    if (l.includes('brazil') || l.includes('sao paulo') || l.includes('rio')) return { lat: -23.5505, lon: -46.6333, loc: "Sao Paulo, Brazil" };
    if (l.includes('canada') || l.includes('toronto') || l.includes('vancouver')) return { lat: 43.6532, lon: -79.3832, loc: "Toronto, Canada" };

    if (landLocations.length === 0) {
      return { lat: 0, lon: 0, loc: "Unknown Coordinates" };
    }

    let hash = 0;
    for (let i = 0; i < locStr.length; i++) {
      hash = locStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % landLocations.length;
    const base = landLocations[idx];
    return { lat: base.lat, lon: base.lon, loc: base.loc };
  } catch (error) {
    logger.warn(`Failed to geocode location: ${locStr}`, { error: error.message });
    return { lat: 0, lon: 0, loc: "Unknown Coordinates" };
  }
};

export { landLocations, geocodeLocation, cities };
