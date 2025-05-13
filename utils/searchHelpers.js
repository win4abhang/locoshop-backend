// utils/searchHelpers.js

const synonymMap = {
    bank: ["bank", "finance", "atm", "loan", "sbi", "icici", "hdfc"],
    hospital: ["hospital", "clinic", "doctor", "medical"],
    mechanic: ["mechanic", "garage", "repair", "bike repair", "puncture"],
    electrician: ["electrician", "electrical", "wiring"],
    milk: ["milk", "dairy", "amul", "gokul", "milk shop"],
    // Add more categories as needed
  };
  
  // Boost values for more important terms
  const tagBoostMap = {
    bank: 2,
    finance: 1.5,
    atm: 1.5,
    loan: 1.5,
    sbi: 1.2,
    icici: 1.2,
    hdfc: 1.2,
    hospital: 2,
    clinic: 1.5,
    doctor: 1.5,
    medical: 1.2,
    mechanic: 2,
    garage: 1.5,
    repair: 1.2,
    "bike repair": 1.5,
    puncture: 1.2,
    electrician: 2,
    electrical: 1.5,
    wiring: 1.2,
    milk: 1.5,
    dairy: 1.5,
    amul: 1.2,
    gokul: 1.2,
    "milk shop": 1.2,
  };
  
  function expandQueryTerms(query) {
    const lower = query.toLowerCase().trim();
    if (synonymMap[lower]) return synonymMap[lower];
    return [lower];
  }
  
  function getTagBoost(tag) {
    const cleanTag = tag.toLowerCase().trim();
    return tagBoostMap[cleanTag] || 1;
  }
  
  module.exports = {
    expandQueryTerms,
    getTagBoost,
  };
  