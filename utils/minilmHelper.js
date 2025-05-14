const axios = require('axios');

const getSmartTag = async (userInput) => {
  try {
    const response = await axios.post('https://minilm-api.onrender.com/predict', {
      query: userInput
    });

    return response.data.tag; // Adjust if your MiniLM API returns a different field
  } catch (error) {
    console.error("MiniLM API error:", error.message);
    return userInput; // Fallback to original input
  }
};

module.exports = { getSmartTag };
