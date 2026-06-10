import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.YOUTUBE_API_KEY?.trim();
const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers channel

async function test() {
  console.log(`Testing API Key: ${apiKey?.substring(0, 4)}...`);
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Success! Channel Title:', data.items?.[0]?.snippet?.title);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

test();
