# Article Summarizer Chrome Extension

A Chrome extension that uses AI to summarize articles on any webpage.

## Features

- Summarize any article with one click
- Clean, user-friendly interface
- Caches summaries for faster access
- Copy summaries to clipboard

## Installation

### Local Development

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and visible in your toolbar

### From Chrome Web Store

(Once published, you would add instructions here)

## Usage

1. Navigate to any article you want to summarize
2. Click the Article Summarizer icon in your browser toolbar
3. Click "Summarize This Page"
4. View the AI-generated summary
5. Use the copy button to copy the summary to your clipboard

## Technical Details

This extension uses:
- Chrome Extension Manifest V3
- Content scripts to extract article text
- OpenAI's API for summarization (via a backend service)
- Local storage for caching summaries

## Privacy

This extension:
- Only accesses the content of the current tab when you click "Summarize"
- Sends article content to OpenAI's API for processing
- Stores summaries locally on your device
- Does not track browsing history or collect personal data

## License

MIT