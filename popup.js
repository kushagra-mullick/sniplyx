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
  const analysisContainer = document.getElementById('analysis-container');
  const sentimentIndicator = document.getElementById('sentiment-indicator');
  const entitiesList = document.getElementById('entities-list');
  const simplifiedTextContent = document.getElementById('simplified-text-content');

  let currentUrl = '';
  let currentSummary = '';
  let currentAnalysis = null;

  // Initialize TensorFlow.js
  await tf.ready();
  
  // Get the current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentUrl = tabs[0].url;
    currentUrlElement.textContent = currentUrl;
    currentUrlElement.title = currentUrl;
    
    // Check if we have a cached analysis for this URL
    chrome.storage.local.get(['analyses'], (result) => {
      const analyses = result.analyses || {};
      if (analyses[currentUrl]) {
        displayAnalysis(analyses[currentUrl]);
      }
    });
  });

  // Analyze button click handler
  summarizeBtn.addEventListener('click', async () => {
    try {
      setLoading(true);
      hideError();
      hideAnalysis();

      // Send message to content script to get the page content
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        currentUrl = tabs[0].url;
        currentUrlElement.textContent = currentUrl;
        currentUrlElement.title = currentUrl;
        
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getPageContent' },
          async (response) => {
            if (chrome.runtime.lastError) {
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
      
      if (content.length < 100) {
        throw new Error('The extracted content is too short to analyze. Please try a different page.');
      }
      
      const analysis = await analyzeText(content);
      
      // Cache the analysis
      chrome.storage.local.get(['analyses'], (result) => {
        const analyses = result.analyses || {};
        analyses[currentUrl] = analysis;
        chrome.storage.local.set({ analyses });
      });

      displayAnalysis(analysis);
    } catch (error) {
      showError(error.message || 'Failed to analyze article. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function displayAnalysis(analysis) {
    currentAnalysis = analysis;
    
    // Display summary
    summaryContent.innerHTML = `
      <h3>Summary</h3>
      <p>${analysis.summary}</p>
    `;
    
    // Display sentiment
    const sentimentColor = {
      positive: 'bg-green-500',
      neutral: 'bg-gray-500',
      negative: 'bg-red-500'
    }[analysis.sentiment.sentiment];
    
    sentimentIndicator.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="${sentimentColor} w-3 h-3 rounded-full"></div>
        <span class="capitalize">${analysis.sentiment.sentiment}</span>
      </div>
    `;
    
    // Display entities
    entitiesList.innerHTML = Object.entries(analysis.entities)
      .filter(([_, values]) => values.length > 0)
      .map(([type, values]) => `
        <div class="mb-2">
          <h4 class="font-semibold capitalize">${type}</h4>
          <ul class="list-disc list-inside">
            ${values.map(value => `<li>${value}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    
    // Display simplified text
    simplifiedTextContent.innerHTML = `
      <h3>Simplified Version</h3>
      <p>${analysis.simplifiedText}</p>
    `;
    
    summaryContainer.classList.remove('hidden');
    analysisContainer.classList.remove('hidden');
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

  function hideAnalysis() {
    summaryContainer.classList.add('hidden');
    analysisContainer.classList.add('hidden');
    summaryContent.innerHTML = '';
    sentimentIndicator.innerHTML = '';
    entitiesList.innerHTML = '';
    simplifiedTextContent.innerHTML = '';
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
      btnText.textContent = 'Analyzing...';
    } else {
      summarizeBtn.disabled = false;
      loadingSpinner.classList.add('hidden');
      btnText.textContent = 'Analyze This Page';
    }
  }

  // Copy button click handler
  copyBtn.addEventListener('click', () => {
    const textToCopy = currentAnalysis ? 
      `Summary:\n${currentAnalysis.summary}\n\n` +
      `Sentiment: ${currentAnalysis.sentiment.sentiment}\n\n` +
      `Key Entities:\n${Object.entries(currentAnalysis.entities)
        .filter(([_, values]) => values.length > 0)
        .map(([type, values]) => `${type}: ${values.join(', ')}`)
        .join('\n')}\n\n` +
      `Simplified Text:\n${currentAnalysis.simplifiedText}` :
      '';
    
    navigator.clipboard.writeText(textToCopy);
    
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