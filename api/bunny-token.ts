import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // To support both POST body and GET query for testing
  const libraryId = req.body?.libraryId || req.query?.libraryId;
  const videoId = req.body?.videoId || req.query?.videoId;

  if (!libraryId || !videoId) {
    return res.status(400).json({ 
      success: false,
      error: 'libraryId and videoId are required' 
    });
  }

  const tokenSecurityKey = process.env.BUNNY_SECURITY_KEY?.trim();
  if (!tokenSecurityKey) {
    console.error('BUNNY_SECURITY_KEY environment variable is not defined');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error: Bunny.net tokenSecurityKey missing in environment.' 
    });
  }

  try {
    const expirationInSeconds = 3600; // 1 hour
    const expires = Math.floor(Date.now() / 1000) + expirationInSeconds;
    
    // Bunny.net security token: sha256( SecurityKey + VideoID + Expires )
    const hashableString = tokenSecurityKey + videoId + expires;
    const token = crypto.createHash('sha256').update(hashableString).digest('hex');
    
    const secureUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
    
    return res.status(200).json({ 
      success: true,
      videoUrl: secureUrl,
      secureUrl: secureUrl
    });
  } catch (error) {
    console.error('Error generating secure Bunny URL:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate secure video session URL'
    });
  }
}
