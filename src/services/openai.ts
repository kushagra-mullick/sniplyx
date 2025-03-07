import axios from 'axios';
import { Claude } from '@anthropic-ai/claude-sdk';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Initialize Claude client
const claude = new Claude({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  apiUrl: 'https://api.anthropic.com/v1'
});

export async function summarizeText(text: string): Promise<string> {
  try {
    if (!text || text.length < 100) {
      throw new Error('Text is too short to summarize');
    }

    const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
    if (!API_KEY) {
      throw new Error('API key not configured');
    }

    const response = await claude.complete({
      prompt: `Summarize this article content in a clear and concise way. Format the output with a title and bullet points highlighting key information. Here's the content: ${text}`,
      model: 'claude-3-haiku-20240307',
      maxTokens: 1000,
      temperature: 0.5
    });

    if (!response.completion) {
      throw new Error('Invalid response from summarization API');
    }

    // Format the summary in our desired style
    const summary = response.completion;
    const formattedSummary = `**Title:** Article Summary\n\n${
      summary.split('\n')
        .filter(line => line.trim())
        .map(line => line.startsWith('•') ? line : `- ${line}`)
        .join('\n')
    }`;

    return formattedSummary;
  } catch (error: any) {
    console.error('Error summarizing article:', error.message || 'Unknown error');
    if (error.status === 401) {
      throw new Error('API authentication failed. Please check your API key.');
    }
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