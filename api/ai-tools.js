import OpenAI from "openai";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tool, input, url } = req.body;

  // Validate request
  if (!tool) {
    return res.status(400).json({ error: 'Tool parameter is required' });
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_API_KEY>",
  });

  try {
    if (tool === "title-generator") {
      const [keywords, tone] = input.split(' | Tone: ');
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: `Generate 15 high-CTR YouTube titles. Niche: ${keywords}. Tone: ${tone}. Keep titles SEO friendly and emotional. Format as numbered list.`,
      });
      return res.json({ result: response.output_text });
    }

    if (tool === "description-maker") {
      const [titlePart, keywordsPart, detailsPart] = input.split(' | ');
      const title = titlePart.replace('Title: ', '');
      const keywords = keywordsPart.replace('Keywords: ', '');
      const details = detailsPart.replace('Details: ', '');
      
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: `Write a keyword-rich YouTube description. Video Title: ${title}. Keywords: ${keywords}. ${details !== 'None' ? `Additional details: ${details}` : ''} Include SEO keywords, timestamps, and call to action. Make it engaging and professional.`,
      });
      return res.json({ result: response.output_text });
    }

    if (tool === "shorts-script") {
      const [topic, style] = input.split(' | Style: ');
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: `Create a 45-60 second YouTube Shorts script. Topic: ${topic}. Style: ${style}. Make it fast paced, hook in first 3 seconds. Include timing cues [0-3s], [3-10s], etc.`,
      });
      return res.json({ result: response.output_text });
    }

    if (tool === "thumbnail-ideas") {
      const [topic, style] = input.split(' | Style: ');
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: `Generate 10 high-CTR thumbnail ideas for YouTube. Topic: ${topic}. Style: ${style}. Include color suggestions and emotional triggers. Format as numbered list.`,
      });
      return res.json({ result: response.output_text });
    }

    if (tool === "hashtag-finder") {
      const [topic, competitors] = input.split(' | Competitors: ');
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: `Generate the 30 best YouTube hashtags. Topic: ${topic}. ${competitors !== 'None' ? `Consider competitors: ${competitors}.` : ''} Include SEO variations and trending hashtags.`,
      });
      return res.json({ result: response.output_text });
    }

    if (tool === "tag-extractor") {
      try {
        const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
        
        if (!videoId) {
          return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        // Try to get video info via oEmbed first
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        
        if (oembedResponse.ok) {
          const videoInfo = await oembedResponse.json();
          
          // Generate relevant tags based on video title and description
          const aiResponse = await client.responses.create({
            model: "gpt-4o-mini",
            input: `Generate 20 relevant YouTube tags for a video titled: "${videoInfo.title}". Make them SEO-friendly and related to the content.`,
          });
          
          const tags = aiResponse.output_text.split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .slice(0, 20);
            
          return res.json({ result: tags });
        } else {
          // Fallback: Generate tags based on common YouTube categories
          const fallbackTags = [
            'youtube', 'video', 'content', 'creator', 'viral',
            'trending', '2024', 'tips', 'tutorial', 'howto',
            'guide', 'education', 'entertainment', 'funny', 'lifehacks'
          ];
          return res.json({ result: fallbackTags });
        }
      } catch (error) {
        console.error('Tag extraction error:', error);
        return res.status(500).json({ error: "Failed to extract tags" });
      }
    }

    return res.status(400).json({ error: "Invalid tool request" });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
