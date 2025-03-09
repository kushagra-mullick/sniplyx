// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    try {
      // Get the article content
      const content = extractArticleContent();
      sendResponse({ content });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
  return true; // Keep the message channel open for async responses
});

function extractArticleContent() {
  // Enhanced content extraction with better error handling and CORS bypass
  try {
    // First try to get the article content using standard methods
    const article = document.querySelector('article');
    if (article) {
      return cleanText(article.innerText);
    }

    // Try common article containers
    const mainContent = document.querySelector('main') || 
                       document.querySelector('.content') || 
                       document.querySelector('#content') ||
                       document.querySelector('.article-content') || 
                       document.querySelector('.post-content') ||
                       document.querySelector('.entry-content');
    if (mainContent) {
      return cleanText(mainContent.innerText);
    }

    // If no standard containers found, try to find the largest text block
    const textBlocks = Array.from(document.getElementsByTagName('*'))
      .filter(element => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               !['script', 'style', 'nav', 'header', 'footer'].includes(element.tagName.toLowerCase()) &&
               element.innerText.length > 200;
      })
      .map(element => ({
        element,
        textLength: element.innerText.length,
        // Calculate text-to-markup ratio
        density: element.innerText.length / element.innerHTML.length
      }))
      .sort((a, b) => (b.textLength * b.density) - (a.textLength * a.density));

    if (textBlocks.length > 0) {
      return cleanText(textBlocks[0].element.innerText);
    }

    // Last resort: try to get all visible text
    const visibleText = Array.from(document.getElementsByTagName('p'))
      .filter(p => {
        const style = window.getComputedStyle(p);
        return style.display !== 'none' && p.innerText.trim().length > 0;
      })
      .map(p => p.innerText)
      .join('\n\n');

    if (visibleText.length > 100) {
      return cleanText(visibleText);
    }

    throw new Error('No readable content found on this page');
  } catch (error) {
    if (error.message.includes('Access Denied')) {
      throw new Error('This page is not accessible due to CORS restrictions. Try opening the article in a new tab.');
    }
    throw error;
  }
}

function cleanText(text) {
  if (!text) return '';

  // Remove extra whitespace
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Remove common UI text patterns
  cleaned = cleaned.replace(/Cookie Policy|Privacy Policy|Terms of Service|Accept Cookies|Sign up|Log in|Subscribe|Share|Comment/gi, '');
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Remove email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  
  // Remove special characters and HTML entities
  cleaned = cleaned.replace(/&[a-z]+;/gi, ' ');
  cleaned = cleaned.replace(/&#[0-9]+;/g, ' ');
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, ' ');
  
  // Normalize quotes and apostrophes
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}