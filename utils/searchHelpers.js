// utils/searchHelpers.js

function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

// Normalize text for consistent matching
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
    .trim();
};


// Validate latitude and longitude
const isValidCoordinates = (lat, lng) => {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};


module.exports = { 
  normalizeQuery,
  isValidCoordinates,
  normalizeText
 };