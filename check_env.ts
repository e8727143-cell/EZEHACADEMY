import dotenv from 'dotenv';
dotenv.config();

const key = process.env.YOUTUBE_API_KEY;
console.log('--- ENV CHECK ---');
console.log(`YOUTUBE_API_KEY exists: ${!!key}`);
if (key) {
  console.log(`Length: ${key.length}`);
  console.log(`First 4: ${key.substring(0, 4)}`);
  console.log(`Last 4: ${key.substring(key.length - 4)}`);
  console.log(`Contains whitespace: ${/\s/.test(key)}`);
  console.log(`Contains quotes: ${/['"]/.test(key)}`);
} else {
  console.log('YOUTUBE_API_KEY is undefined or empty');
}
console.log('--- END ENV CHECK ---');
