import { loadEnv } from 'vite';
const env = loadEnv('development', '.', '');
console.log('API KEY:', env.GEMINI_API_KEY ? 'EXISTS' : 'UNDEFINED');
