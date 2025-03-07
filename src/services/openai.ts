import axios from 'axios';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

function extractSentences(text: string): string[] {
  // Split text into sentences using common sentence endings
  return text
    .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter out very short sentences
}

function calculateWordFrequency(text: string): Map<string, number> {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/);
  
  const frequency = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  words.forEach(word => {
    if (!stopWords.has(word)) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  });
  
  return frequency;
}

function scoreSentence(sentence: string, wordFrequency: Map<string, number>): number {
  const words = sentence.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    score += wordFrequency.get(word) || 0;
  });
  
  return score / words.length;
}

export async function summarizeText(text: string): Promise<string> {
  try {
    if (!text || text.length < 100) {
      throw new Error('Text is too short to summarize');
    }

    // Extract sentences and calculate word frequency
    const sentences = extractSentences(text);
    const wordFrequency = calculateWordFrequency(text);
    
    // Score sentences and get top 5
    const scoredSentences = sentences.map(sentence => ({
      sentence,
      score: scoreSentence(sentence, wordFrequency)
    }));
    
    scoredSentences.sort((a, b) => b.score - a.score);
    
    const topSentences = scoredSentences
      .slice(0, 5)
      .map(({ sentence }) => sentence);

    // Format the summary
    const formattedSummary = `**Title:** Article Summary\n\n${
      topSentences.map(sentence => `- ${sentence.trim()}`).join('\n')
    }`;

    return formattedSummary;
  } catch (error: any) {
    console.error('Error summarizing article:', error.message || 'Unknown error');
    throw new Error('Failed to summarize article: ' + (error.message || 'Unknown error'));
  }
}

export async function summarizeArticle(url: string): Promise<string> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol. Please use http or https.');
    }

    // Use CORS proxy to fetch the content
    const proxyUrl = CORS_PROXY + encodeURIComponent(url);
    const response = await axios.get(proxyUrl, {
      timeout: 15000, // 15 second timeout
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; ArticleSummarizer/1.0)'
      }
    });

    if (!response.data) {
      throw new Error('Failed to fetch article content');
    }

    // Extract main content (improved version)
    let textContent = response.data;
    if (typeof textContent === 'string') {
      // Remove scripts, styles, and other non-content elements
      textContent = textContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b(cookie|privacy|subscribe|advertisement)\b.*?\./gi, '') // Remove common popup/banner text
        .trim();

      // Ensure we have enough content
      if (textContent.length < 100) {
        throw new Error('Could not find enough article content to summarize');
      }

      // Limit content length while keeping complete sentences
      const maxLength = 8000;
      if (textContent.length > maxLength) {
        const truncated = textContent.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        textContent = lastPeriod > 0 ? truncated.substring(0, lastPeriod + 1) : truncated;
      }

      return await summarizeText(textContent);
    } else {
      throw new Error('Invalid content type received');
    }
  } catch (error: any) {
    console.error('Error in summarize article:', error.message || 'Unknown error');
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error.response?.status === 404) {
      throw new Error('Article not found. Please check the URL and try again.');
    }
    if (error.message.includes('Invalid URL')) {
      throw new Error('Please enter a valid http or https URL.');
    }
    throw new Error('Failed to summarize article: ' + (error.message || 'Unknown error'));
  }
}