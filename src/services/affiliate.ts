interface AffiliateLink {
  keyword: string;
  url: string;
  platform: string;
}

export class AffiliateManager {
  private static instance: AffiliateManager;
  private affiliateLinks: AffiliateLink[] = [
    {
      keyword: 'book',
      url: 'https://amazon.com/dp/{ASIN}?tag=YOUR_AFFILIATE_ID',
      platform: 'Amazon'
    },
    {
      keyword: 'course',
      url: 'https://udemy.com/course/{SLUG}/?referralCode=YOUR_AFFILIATE_ID',
      platform: 'Udemy'
    }
  ];

  private constructor() {}

  static getInstance(): AffiliateManager {
    if (!AffiliateManager.instance) {
      AffiliateManager.instance = new AffiliateManager();
    }
    return AffiliateManager.instance;
  }

  processContent(content: string): string {
    let processedContent = content;
    
    this.affiliateLinks.forEach(link => {
      const regex = new RegExp(`\\b${link.keyword}\\b`, 'gi');
      processedContent = processedContent.replace(regex, (match) => {
        return `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="affiliate-link">${match}</a>`;
      });
    });
    
    return processedContent;
  }
}