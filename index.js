// Load environment variables from .env file
require('dotenv').config();

// Example of accessing environment variables
console.log('Environment setup complete');

// Check if API key is available (don't log the actual key in production)
if (process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key is configured');
} else {
    console.log('Warning: OpenAI API key is not configured');
}

// Simple example of using LangChain
// Uncomment and modify as needed for your specific use case
/*
const { OpenAI } = require('langchain/llms/openai');

async function runExample() {
  // The environment variables are automatically used by LangChain
  const model = new OpenAI({
    temperature: 0.9,
  });
  
  const result = await model.call(
    "What would be a good company name for a company that makes colorful socks?"
  );
  
  console.log(result);
}

runExample().catch(console.error);
*/
