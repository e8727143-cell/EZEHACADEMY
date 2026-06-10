import dotenv from 'dotenv';
dotenv.config();

const key = process.env.YOUTUBE_API_KEY;
console.log('--- ENV CHECK ---');
console.log(`YOUTUBE_API_KEY exists: ${!!key}`);
if (key) {
  console.log(`Length: ${key.length}`);
  console.log(`First 4: ${key.substring(0, 4)}`);
  console.log(`Last 4: ${key.substring(key.length - 4)}`);
} else {
  console.log('YOUTUBE_API_KEY is undefined or empty');
}

const bunnyKey = process.env.BUNNY_SECURITY_KEY;
console.log(`BUNNY_SECURITY_KEY exists: ${!!bunnyKey}`);
if (bunnyKey) {
  console.log(`Length: ${bunnyKey.length}`);
  console.log(`First 3: ${bunnyKey.substring(0, 3)}`);
  console.log(`Last 3: ${bunnyKey.substring(bunnyKey.length - 3)}`);
  console.log(`Contains whitespace: ${/\s/.test(bunnyKey)}`);
} else {
  console.log('BUNNY_SECURITY_KEY is undefined or empty');
}
console.log('--- END ENV CHECK ---');

