import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function testAI() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return;
  }
  console.log('Testing with key length:', apiKey.length);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    console.log('Success:', result.response.text());
  } catch (err) {
    console.error('AI Test Failed:', err);
  }
}

testAI();
