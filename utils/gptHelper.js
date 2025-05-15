const axios = require('axios');

const getSmartTag = async (userInput) => {
  try {
    const response = await axios.post('https://gpt35-pfc9.onrender.com/intent', {
      prompt: userInput
    });

    const predictedTag = response.data.predicted_tag?.toLowerCase().trim();

    return predictedTag || userInput.toLowerCase().trim(); // fallback
  } catch (error) {
    console.error("Smart API error:", error.message);
    return userInput.toLowerCase().trim(); // fallback
  }
};

module.exports = { getSmartTag };
