document.addEventListener('DOMContentLoaded', async () => {
  const currentUrlElement = document.getElementById('current-url');
  const summarizeBtn = document.getElementById('summarize-btn');
  const loadingSpinner = document.querySelector('.loading-spinner');
  const btnText = document.querySelector('.btn-text');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');
  const copyBtn = document.getElementById('copy-btn');
  const openBtn = document.getElementById('open-btn');

  let currentUrl = '';
  let currentSummary = '';

  // Get the current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentUrl = tabs[0].url;
    currentUrlElement.textContent = currentUrl;
    currentUrlElement.title = currentUrl;
    
    // Check if we have a cached summary for this URL
    chrome.storage.local.get(['summaries'], (result) => {
      const summaries = result.summaries || {};
      if (summaries[currentUrl]) {
        displaySummary(summaries[currentUrl]);
      }
    });
  });

  // Summarize button click handler
  summarizeBtn.addEventListener('click', async () => {
    try {
      setLoading(true);
      hideError();
      hideSummary();

      // Send message to content script to get the page content
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        // Update current URL to ensure we're summarizing the correct page
        currentUrl = tabs[0].url;
        currentUrlElement.textContent = currentUrl;
        currentUrlElement.title = currentUrl;
        
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getPageContent' },
          async (response) => {
            if (chrome.runtime.lastError) {
              // Content script might not be loaded yet
              try {
                await injectContentScript(tabs[0].id);
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: 'getPageContent' },
                  handleContentResponse
                );
              } catch (error) {
                showError('Could not access page content. Please refresh the page and try again.');
                setLoading(false);
              }
            } else {
              handleContentResponse(response);
            }
          }
        );
      });
    } catch (error) {
      showError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });

  async function handleContentResponse(response) {
    try {
      if (!response || !response.content) {
        throw new Error('Could not extract content from the page');
      }

      const content = response.content;
      
      // Check if content is too short
      if (content.length < 100) {
        throw new Error('The extracted content is too short to summarize. Please try a different page.');
      }
      
      const summary = await summarizeContent(content);
      
      // Cache the summary
      chrome.storage.local.get(['summaries'], (result) => {
        const summaries = result.summaries || {};
        summaries[currentUrl] = summary;
        chrome.storage.local.set({ summaries });
      });

      displaySummary(summary);
    } catch (error) {
      showError(error.message || 'Failed to summarize article. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function injectContentScript(tabId) {
    return new Promise((resolve, reject) => {
      try {
        chrome.scripting.executeScript(
          {
            target: { tabId },
            files: ['content.js']
          },
          (results) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(results);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async function summarizeContent(content) {
    try {
      // Use OpenAI API to summarize the content
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
      
      // Limit content length to avoid token limits (roughly 4000 tokens max)
      const truncatedContent = content.substring(0, 12000);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
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
              content: `Summarize this article content: ${truncatedContent}`
            }
          ],
          temperature: 0.5,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API error:', errorData);
        throw new Error(`Failed to summarize article (${response.status})`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error summarizing content:', error);
      throw new Error('Failed to summarize article. Please check your internet connection and try again.');
    }
  }

  function displaySummary(summary) {
    currentSummary = summary;
    
    // Format the summary for display
    let formattedSummary = '';
    
    summary.split('\n\n').forEach((paragraph) => {
      if (paragraph.startsWith('**Title:**')) {
        const title = paragraph.replace('**Title:** ', '');
        formattedSummary += `<h3>${title}</h3>`;
      } else {
        formattedSummary += '<ul>';
        paragraph.split('\n').forEach((line) => {
          if (line.startsWith('- ')) {
            const content = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedSummary += `<li>${content}</li>`;
          } else {
            const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedSummary += `<p>${content}</p>`;
          }
        });
        formattedSummary += '</ul>';
      }
    });
    
    summaryContent.innerHTML = formattedSummary;
    summaryContainer.classList.remove('hidden');
  }

  function hideSummary() {
    summaryContainer.classList.add('hidden');
    summaryContent.innerHTML = '';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
  }

  function hideError() {
    errorContainer.classList.add('hidden');
    errorMessage.textContent = '';
  }

  function setLoading(isLoading) {
    if (isLoading) {
      summarizeBtn.disabled = true;
      loadingSpinner.classList.remove('hidden');
      btnText.textContent = 'Summarizing...';
    } else {
      summarizeBtn.disabled = false;
      loadingSpinner.classList.add('hidden');
      btnText.textContent = 'Summarize This Page';
    }
  }

  // Copy button click handler
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentSummary);
    
    // Show feedback
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    setTimeout(() => {
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
    }, 2000);
  });

  // Open original article button click handler
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: currentUrl });
  });
});