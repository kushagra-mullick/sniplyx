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
  // This is an improved approach to extract article content
  
  // Try to find the main content using common article selectors
  const article = document.querySelector('article');
  if (article) {
    return cleanText(article.innerText);
  }
  
  // Try to find content by common article containers
  const mainContent = document.querySelector('main') || 
                      document.querySelector('.content') || 
                      document.querySelector('#content') ||
                      document.querySelector('.article-content') || 
                      document.querySelector('.post-content') ||
                      document.querySelector('.entry-content');
  if (mainContent) {
    return cleanText(mainContent.innerText);
  }
  
  // If no article container found, try to extract the most likely content area
  // by finding the div with the most text content
  const contentDivs = Array.from(document.querySelectorAll('div')).filter(div => {
    // Filter out small divs, navigation, headers, footers, sidebars, etc.
    const text = div.innerText;
    return text.length > 500 && 
           !div.id.toLowerCase().includes('nav') &&
           !div.id.toLowerCase().includes('header') &&
           !div.id.toLowerCase().includes('footer') &&
           !div.id.toLowerCase().includes('sidebar') &&
           !div.className.toLowerCase().includes('nav') &&
           !div.className.toLowerCase().includes('header') &&
           !div.className.toLowerCase().includes('footer') &&
           !div.className.toLowerCase().includes('sidebar');
  });
  
  // Sort by text length (descending)
  contentDivs.sort((a, b) => b.innerText.length - a.innerText.length);
  
  if (contentDivs.length > 0) {
    return cleanText(contentDivs[0].innerText);
  }
  
  // If still no luck, get all paragraphs
  const paragraphs = Array.from(document.querySelectorAll('p'));
  if (paragraphs.length > 0) {
    // Filter out very short paragraphs that are likely not part of the main content
    const contentParagraphs = paragraphs.filter(p => p.innerText.length > 100);
    if (contentParagraphs.length > 0) {
      return cleanText(contentParagraphs.map(p => p.innerText).join('\n\n'));
    }
    return cleanText(paragraphs.map(p => p.innerText).join('\n\n'));
  }
  
  // Last resort: get the body text
  return cleanText(document.body.innerText);
}

function cleanText(text) {
  // Remove extra whitespace
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Remove common UI text patterns
  cleaned = cleaned.replace(/Cookie Policy|Privacy Policy|Terms of Service|Accept Cookies|Sign up|Log in|Subscribe|Share|Comment/gi, '');
  
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  
  // Remove email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}