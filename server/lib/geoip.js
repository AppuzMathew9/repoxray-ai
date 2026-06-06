import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig = null;
let lastLoadedTime = 0;

// Load dynamic geocoding config data with hot-reloading checks
const loadGeoipConfig = () => {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'geoip-data.json');
    const stat = fs.statSync(configPath);
    if (!cachedConfig || stat.mtimeMs > lastLoadedTime) {
      logger.info(`Loading/reloading geoip configuration from ${configPath}`);
      const content = fs.readFileSync(configPath, 'utf-8');
      cachedConfig = JSON.parse(content);
      lastLoadedTime = stat.mtimeMs;
    }
    return cachedConfig;
  } catch (error) {
    logger.error('Failed to load geocoding config file, using empty fallbacks', { error: error.message });
    return cachedConfig || { landLocations: [], cities: [], locationRules: [] };
  }
};

// Seed initial values for backward compatibility exports
const initialConfig = loadGeoipConfig();
const landLocations = initialConfig.landLocations || [];
const cities = initialConfig.cities || [];

const geocodeLocation = (locStr) => {
  const defaultCoords = { lat: 0, lon: 0, loc: "Unknown Coordinates" };

  try {
    // 1. Strict Input Validation (robust type and boundary verification)
    if (locStr === null || locStr === undefined) {
      return defaultCoords;
    }
    const cleanStr = String(locStr).trim();
    if (cleanStr.length === 0 || cleanStr.length > 200) {
      return defaultCoords;
    }

    const l = cleanStr.toLowerCase();
    const currentConfig = loadGeoipConfig();
    const rules = currentConfig.locationRules || [];
    const currentLand = currentConfig.landLocations || [];

    // 2. Dynamic Rule lookup (avoids hardcoded substring pattern matches)
    for (const rule of rules) {
      if (Array.isArray(rule.keys) && rule.keys.some(k => l.includes(k.toLowerCase()))) {
        return rule.coords;
      }
    }

    if (currentLand.length === 0) {
      return defaultCoords;
    }

    // 3. Fallback hashing check
    let hash = 0;
    for (let i = 0; i < cleanStr.length; i++) {
      hash = cleanStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % currentLand.length;
    const base = currentLand[idx];
    return { lat: base.lat, lon: base.lon, loc: base.loc };
  } catch (error) {
    logger.warn(`Failed to geocode location safely: ${locStr}`, { error: error.message });
    return defaultCoords;
  }
};

export { landLocations, geocodeLocation, cities };
