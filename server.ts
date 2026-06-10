import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cors from 'cors';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// YouTube API Setup
const youtube = google.youtube({
  version: 'v3'
});

// Helper to extract channel ID or handle from URL
function parseYoutubeUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    if (path.startsWith('/channel/')) {
      return { type: 'id', value: path.split('/')[2] };
    } else if (path.startsWith('/@')) {
      return { type: 'handle', value: path.substring(1).split('/')[0] }; // Remove leading /
    } else if (path.startsWith('/c/')) {
      return { type: 'username', value: path.split('/')[2] };
    } else if (path.startsWith('/user/')) {
      return { type: 'username', value: path.split('/')[2] };
    }
    
    // Handle root path or other cases
    if (path === '/' || path === '') {
        return null;
    } 
    
    // Fallback: assume it's a handle if it starts with @, or try to guess
    const segment = path.split('/')[1];
    if (segment) {
        if (segment.startsWith('@')) return { type: 'handle', value: segment };
        return { type: 'username', value: segment }; // Try as username/custom URL
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// API Route: Get Channel Info
app.get('/api/youtube/channel-info', async (req: any, res: any) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY is missing');
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  // Log key details for debugging (safe version)
  console.log(`Using API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)} (Length: ${apiKey.length})`);

  const parsed = parseYoutubeUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid YouTube URL format' });
  }

  // Helper function for YouTube API calls with error checking
  const fetchYouTube = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
        // Check for API key errors specifically
        if (data.error.code === 400 && (data.error.message?.includes('API key not valid') || data.error.status === 'INVALID_ARGUMENT')) {
            throw new Error('Invalid YouTube API Key: The provided API key is invalid. Please check your Google Cloud Console.');
        }
        // Check for quota errors
        if (data.error.code === 403 && data.error.message?.includes('quota')) {
             throw new Error('YouTube API Quota Exceeded: The API key has exceeded its quota.');
        }
        // Log other errors
        console.error('YouTube API Error:', JSON.stringify(data.error));
    }
    return data;
  };

  try {
    let channelId = '';

    // 1. Resolve to Channel ID
    if (parsed.type === 'id') {
      channelId = parsed.value;
    } else if (parsed.type === 'handle') {
      try {
        // Use search for handle (forHandle is deprecated)
        // Ensure handle starts with @ for better search accuracy
        const handle = parsed.value.startsWith('@') ? parsed.value : `@${parsed.value}`;
        console.log(`Searching for handle: ${handle}`);

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${apiKey}`;
        const searchData = await fetchYouTube(searchUrl);
        
        if (searchData.items && searchData.items.length > 0 && searchData.items[0].snippet?.channelId) {
            channelId = searchData.items[0].snippet.channelId;
        } else {
            // Fallback: try searching without @ if it failed
            if (handle.startsWith('@')) {
                 const handleNoAt = handle.substring(1);
                 console.log(`Search failed for ${handle}, trying ${handleNoAt}`);
                 const searchUrl2 = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handleNoAt)}&type=channel&maxResults=1&key=${apiKey}`;
                 const searchData2 = await fetchYouTube(searchUrl2);
                 
                 if (searchData2.items && searchData2.items.length > 0 && searchData2.items[0].snippet?.channelId) {
                    channelId = searchData2.items[0].snippet.channelId;
                 } else {
                    return res.status(404).json({ error: 'Channel not found for handle' });
                 }
            } else {
                 return res.status(404).json({ error: 'Channel not found for handle' });
            }
        }
      } catch (e: any) {
         console.error('Error searching for handle:', e);
         if (e.message && (e.message.includes('Invalid YouTube API Key') || e.message.includes('Quota Exceeded'))) {
             return res.status(500).json({ error: e.message });
         }
         return res.status(500).json({ error: 'Error resolving handle: ' + e.message });
      }
    } else if (parsed.type === 'username') {
      // Try forUsername first
      try {
          const usernameUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
          const usernameData = await fetchYouTube(usernameUrl);

          if (usernameData.items && usernameData.items.length > 0 && usernameData.items[0].id) {
            channelId = usernameData.items[0].id;
          }
      } catch (e) {
          // Ignore error and try search, unless it's an API key error
          if (e instanceof Error && (e.message.includes('Invalid YouTube API Key') || e.message.includes('Quota Exceeded'))) {
              return res.status(500).json({ error: e.message });
          }
      }

      // If not found, try search (for custom URLs that aren't usernames)
      if (!channelId) {
         try {
             const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(parsed.value)}&type=channel&maxResults=1&key=${apiKey}`;
             const searchData = await fetchYouTube(searchUrl);

             if (searchData.items && searchData.items.length > 0 && searchData.items[0].snippet?.channelId) {
                 channelId = searchData.items[0].snippet.channelId;
             } else {
                 return res.status(404).json({ error: 'Channel not found for username' });
             }
         } catch (e: any) {
             console.error('Error searching for username:', e);
             if (e.message && (e.message.includes('Invalid YouTube API Key') || e.message.includes('Quota Exceeded'))) {
                 return res.status(500).json({ error: e.message });
             }
             return res.status(500).json({ error: 'Error searching for channel' });
         }
      }
    }

    if (!channelId) {
        return res.status(404).json({ error: 'Could not resolve channel ID' });
    }

    console.log(`Attempting to fetch channel details for ID: ${channelId}`);
    console.log(`Using API Key (first 4 chars): ${apiKey ? apiKey.substring(0, 4) : 'UNDEFINED'}`);

    // 2. Get Channel Stats
    // User requested to only fetch: channel name, subscribers, and video count.
    try {
      const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
      const statsData = await fetchYouTube(statsUrl);

      if (!statsData.items || statsData.items.length === 0) {
        console.log('Channel details not found in YouTube response');
        return res.status(404).json({ error: 'Channel details not found' });
      }

      const channel = statsData.items[0];
      const snippet = channel.snippet;
      const statistics = channel.statistics;

      // Only return what was requested: name, subscribers, video count (and ID/thumbnail for basic UI context if needed, but prioritizing user request)
      const result = {
        id: channel.id,
        title: snippet?.title,
        // description: snippet?.description, // Removed
        // customUrl: snippet?.customUrl, // Removed
        // publishedAt: snippet?.publishedAt, // Removed
        thumbnail: snippet?.thumbnails?.default?.url, // Keeping a small thumbnail is usually essential for UI confirmation, but can remove if strictly requested. I'll keep a small one.
        subscriberCount: statistics?.subscriberCount,
        videoCount: statistics?.videoCount,
        // viewCount: statistics?.viewCount, // Removed
        // hiddenSubscriberCount: statistics?.hiddenSubscriberCount // Removed
      };

      res.json(result);
    } catch (apiError: any) {
      console.error('YouTube API Error Details:', JSON.stringify(apiError.response?.data || apiError.message, null, 2));
      
      // Check for specific error reasons
      const errorReason = apiError.response?.data?.error?.errors?.[0]?.reason;
      const errorMessage = apiError.response?.data?.error?.message || apiError.message;

      if (errorReason === 'keyInvalid') {
        return res.status(400).json({ error: 'API Key is invalid. Please check your Google Cloud Console.' });
      }
      if (errorReason === 'ipRefererBlocked') {
        return res.status(403).json({ error: 'API Key is restricted by IP. Please remove IP restrictions in Google Cloud Console.' });
      }
      if (errorReason === 'projectNotLinked') {
        return res.status(403).json({ error: 'Project is not linked to a billing account or API is not enabled.' });
      }
      if (errorReason === 'accessNotConfigured') {
        return res.status(403).json({ error: 'YouTube Data API v3 is not enabled for this project.' });
      }

      return res.status(500).json({ 
        error: `YouTube API Error: ${errorMessage}`,
        details: apiError.response?.data 
      });
    }

  } catch (error: any) {
    console.error('YouTube API Error:', error);
    
    let errorMessage = 'Failed to fetch channel data';
    let errorDetails = error.message;

    // Extract specific Google API error message if available
    if (error.response && error.response.data && error.response.data.error) {
        const googleError = error.response.data.error;
        errorMessage = googleError.message || errorMessage;
        errorDetails = JSON.stringify(googleError.errors || googleError, null, 2);
    }

    res.status(500).json({ 
        error: errorMessage, 
        details: errorDetails 
    });
  }
});

// Vite Middleware (Must be last)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
      // In production, serve static files from dist
      app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
