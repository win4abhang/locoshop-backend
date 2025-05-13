// utils/searchHelpers.js

const synonymMap = {
  "puncture": ["tyre repair", "bike repair", "wheel fix"],
  "bike": ["motorcycle", "two wheeler"],
  "cleaning": ["safai", "dusting", "maid"],
  "cooler": ["fan", "cooling", "ac"],
  "battery": ["power", "cell", "spray battery"],
  "repair": ["fix", "service", "maintenance"]
};

const expandQueryTerms = (query) => {
  const terms = query.split(/\s+/).map(t => t.trim().toLowerCase());
  const expanded = new Set();

  for (let term of terms) {
    expanded.add(term);
    if (synonymMap[term]) {
      synonymMap[term].forEach(syn => expanded.add(syn));
    }
  }

  return Array.from(expanded);
};

module.exports = { expandQueryTerms };