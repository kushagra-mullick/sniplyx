import OpenAI from 'openai';
import axios from 'axios';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from a backend
});

export async function extractArticleContent(url: string): Promise<string> {
  try {
    // This is a simplified approach. In production, you would use a proper
    // article extraction service or backend API
    const response = await axios.get(url);
    const html = response.data;
    
    // Extract text from HTML (very simplified)
    const textContent = html.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to first 10,000 characters
    
    return textContent;
  } catch (error) {
    console.error('Error extracting article content:', error);
    throw new Error('Failed to extract article content');
  }
}

export async function summarizeArticle(url: string): Promise<string> {
  try {
    // Extract article content
    const articleContent = await extractArticleContent(url);
    
    // Use OpenAI to summarize the content
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an advanced AI that summarizes online articles.
          When given article content, generate a concise, easy-to-read summary.
          
          Instructions:
          1. Identify the main idea, key arguments, and conclusion.
          2. Remove unnecessary details, fluff, and ads.
          3. Generate a short summary (100-150 words) with bullet points.
          4. If the article contains important data or statistics, include them.
          
          Format your response like this:
          **Title:** [Descriptive title based on content]
          
          - [Key point 1 with **important terms** in bold]
          - [Key point 2 with **important terms** in bold]
          - [Key point 3 with **important terms** in bold]
          - Conclusion: [Brief conclusion with **important terms** in bold]`
        },
        {
          role: "user",
          content: `Summarize this article content: ${articleContent}`
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });
    
    return response.choices[0].message.content || 'No summary generated';
  } catch (error) {
    console.error('Error summarizing article:', error);
    throw new Error('Failed to summarize article');
  }
}