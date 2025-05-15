const axios = require('axios');

// FastAPI URL for text generation
const FASTAPI_URL = 'https://distilgpt2.onrender.com/generate';  // Replace with your actual FastAPI URL

// Function to call the FastAPI text generation endpoint
async function generateText(prompt, maxLength = 50) {
  try {
    const response = await axios.post(FASTAPI_URL, {
      prompt,
      max_length: maxLength
    });

    return response.data.generated_text;
  } catch (error) {
    console.error('Error calling text generation API:', error);
    return 'Sorry, I couldn’t generate a response at this time.';
  }
}

module.exports = { generateText };
