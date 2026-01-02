/**
 * EO API Sources - RSS/Atom Feeds and External APIs as Data Sources
 *
 * Provides unified interface for importing data from:
 * - RSS 2.0 feeds
 * - Atom feeds
 * - Generic REST APIs
 * - Webhook endpoints (push-based)
 *
 * Follows the existing parser pattern (like ICSParser, CSVParser).
 * Returns normalized data for Source creation via eo_hierarchy.js.
 */

// ============================================================================
// SECTION I: Configuration
// ============================================================================

const APISourceConfig = {
  // Request timeouts
  TIMEOUT_MS: 30000,

  // Cache settings
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // Rate limiting defaults
  MIN_REQUEST_INTERVAL_MS: 100,

  // Result limits
  DEFAULT_LIMIT: 100,
  MAX_RECORDS: 10000,

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000
};

// ============================================================================
// SECTION II: RSS/Atom Parser
// ============================================================================

/**
 * Parse RSS 2.0 and Atom feeds into normalized records
 *
 * Supports:
 * - RSS 2.0 (https://www.rssboard.org/rss-specification)
 * - Atom 1.0 (https://tools.ietf.org/html/rfc4287)
 * - Auto-detection of feed format
 */
class RSSParser {
  constructor() {
    // Common date formats in feeds
    this.datePatterns = {
      // RFC 822 (RSS): "Sat, 07 Sep 2002 00:00:01 GMT"
      rfc822: /^[A-Za-z]{3},?\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}/,
      // ISO 8601 (Atom): "2003-12-13T18:30:02Z" or "2003-12-13T18:30:02+01:00"
      iso8601: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    };
  }

  /**
   * Parse RSS/Atom feed text into records
   * @param {string} text - Raw XML feed content
   * @returns {{ headers: string[], rows: object[], feedInfo: object, feedFormat: string }}
   */
  parse(text) {
    // Detect feed format
    const format = this._detectFormat(text);

    if (format === 'rss') {
      return this._parseRSS(text);
    } else if (format === 'atom') {
      return this._parseAtom(text);
    } else {
      throw new Error('Unknown feed format. Expected RSS 2.0 or Atom.');
    }
  }

  /**
   * Detect if content is RSS or Atom
   */
  _detectFormat(text) {
    // Quick check for format indicators
    if (text.includes('<rss') || text.includes('<channel>')) {
      return 'rss';
    }
    if (text.includes('<feed') && text.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      return 'atom';
    }
    if (text.includes('<feed')) {
      return 'atom'; // Assume Atom if <feed> tag present
    }
    return 'unknown';
  }

  /**
   * Parse RSS 2.0 feed
   */
  _parseRSS(text) {
    const items = [];
    const feedInfo = this._parseRSSChannelInfo(text);

    // Extract all <item> blocks
    const itemBlocks = this._extractBlocks(text, 'item');

    for (const block of itemBlocks) {
      const item = this._parseRSSItem(block);
      if (item) {
        items.push(item);
      }
    }

    // Standard RSS headers
    const headers = [
      'title',
      'link',
      'description',
      'pubDate',
      'author',
      'guid',
      'categories',
      'enclosureUrl',
      'enclosureType',
      'content'
    ];

    // Convert to row format
    const rows = items.map(item => ({
      'title': item.title || '',
      'link': item.link || '',
      'description': item.description || '',
      'pubDate': item.pubDate || '',
      'author': item.author || '',
      'guid': item.guid || item.link || '',
      'categories': item.categories?.join(', ') || '',
      'enclosureUrl': item.enclosure?.url || '',
      'enclosureType': item.enclosure?.type || '',
      'content': item.content || ''
    }));

    return {
      headers,
      rows,
      hasHeaders: true,
      totalRows: rows.length,
      feedInfo,
      feedFormat: 'rss',
      fileType: 'rss'
    };
  }

  /**
   * Parse RSS channel (feed-level) info
   */
  _parseRSSChannelInfo(text) {
    return {
      title: this._extractTag(text, 'title'),
      link: this._extractTag(text, 'link'),
      description: this._extractTag(text, 'description'),
      language: this._extractTag(text, 'language'),
      lastBuildDate: this._parseDate(this._extractTag(text, 'lastBuildDate')),
      ttl: this._extractTag(text, 'ttl'),
      generator: this._extractTag(text, 'generator'),
      image: this._extractTag(text, 'image')
    };
  }

  /**
   * Parse a single RSS item
   */
  _parseRSSItem(block) {
    const item = {};

    item.title = this._extractTag(block, 'title');
    item.link = this._extractTag(block, 'link');
    item.description = this._extractCDATA(this._extractTag(block, 'description'));
    item.pubDate = this._parseDate(this._extractTag(block, 'pubDate'));
    item.guid = this._extractTag(block, 'guid');

    // Author can be in <author> or <dc:creator>
    item.author = this._extractTag(block, 'author') ||
                  this._extractTag(block, 'dc:creator') ||
                  this._extractTag(block, 'creator');

    // Categories (can be multiple)
    item.categories = this._extractAllTags(block, 'category');

    // Enclosure (media attachment)
    const enclosureMatch = block.match(/<enclosure([^>]*)>/i);
    if (enclosureMatch) {
      const attrs = enclosureMatch[1];
      item.enclosure = {
        url: this._extractAttribute(attrs, 'url'),
        type: this._extractAttribute(attrs, 'type'),
        length: this._extractAttribute(attrs, 'length')
      };
    }

    // Content (encoded HTML content)
    item.content = this._extractCDATA(
      this._extractTag(block, 'content:encoded') ||
      this._extractTag(block, 'content')
    );

    return item;
  }

  /**
   * Parse Atom 1.0 feed
   */
  _parseAtom(text) {
    const entries = [];
    const feedInfo = this._parseAtomFeedInfo(text);

    // Extract all <entry> blocks
    const entryBlocks = this._extractBlocks(text, 'entry');

    for (const block of entryBlocks) {
      const entry = this._parseAtomEntry(block);
      if (entry) {
        entries.push(entry);
      }
    }

    // Standard Atom headers (normalized to match RSS)
    const headers = [
      'title',
      'link',
      'description',
      'pubDate',
      'author',
      'guid',
      'categories',
      'enclosureUrl',
      'enclosureType',
      'content'
    ];

    // Convert to row format (normalized to RSS field names)
    const rows = entries.map(entry => ({
      'title': entry.title || '',
      'link': entry.link || '',
      'description': entry.summary || '',
      'pubDate': entry.published || entry.updated || '',
      'author': entry.author || '',
      'guid': entry.id || entry.link || '',
      'categories': entry.categories?.join(', ') || '',
      'enclosureUrl': entry.enclosure?.url || '',
      'enclosureType': entry.enclosure?.type || '',
      'content': entry.content || ''
    }));

    return {
      headers,
      rows,
      hasHeaders: true,
      totalRows: rows.length,
      feedInfo,
      feedFormat: 'atom',
      fileType: 'atom'
    };
  }

  /**
   * Parse Atom feed-level info
   */
  _parseAtomFeedInfo(text) {
    // Get first occurrence before any <entry>
    const feedSection = text.split(/<entry/i)[0];

    return {
      title: this._extractTag(feedSection, 'title'),
      link: this._extractAtomLink(feedSection),
      subtitle: this._extractTag(feedSection, 'subtitle'),
      id: this._extractTag(feedSection, 'id'),
      updated: this._parseDate(this._extractTag(feedSection, 'updated')),
      author: this._extractTag(feedSection, 'name'), // Inside <author>
      generator: this._extractTag(feedSection, 'generator'),
      icon: this._extractTag(feedSection, 'icon'),
      logo: this._extractTag(feedSection, 'logo')
    };
  }

  /**
   * Parse a single Atom entry
   */
  _parseAtomEntry(block) {
    const entry = {};

    entry.title = this._extractTag(block, 'title');
    entry.link = this._extractAtomLink(block);
    entry.summary = this._extractCDATA(this._extractTag(block, 'summary'));
    entry.content = this._extractCDATA(this._extractTag(block, 'content'));
    entry.published = this._parseDate(this._extractTag(block, 'published'));
    entry.updated = this._parseDate(this._extractTag(block, 'updated'));
    entry.id = this._extractTag(block, 'id');

    // Author (nested in <author><name>)
    const authorBlock = this._extractTagWithContent(block, 'author');
    if (authorBlock) {
      entry.author = this._extractTag(authorBlock, 'name') ||
                     this._extractTag(authorBlock, 'email');
    }

    // Categories (can be multiple, term attribute)
    entry.categories = this._extractAtomCategories(block);

    // Enclosure (link with rel="enclosure")
    const enclosureMatch = block.match(/<link[^>]+rel=["']enclosure["'][^>]*>/i);
    if (enclosureMatch) {
      const attrs = enclosureMatch[0];
      entry.enclosure = {
        url: this._extractAttribute(attrs, 'href'),
        type: this._extractAttribute(attrs, 'type'),
        length: this._extractAttribute(attrs, 'length')
      };
    }

    return entry;
  }

  /**
   * Extract Atom link (prefers alternate, falls back to self/first)
   */
  _extractAtomLink(block) {
    // Try alternate first
    const alternateMatch = block.match(/<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    if (alternateMatch) {
      return alternateMatch[1];
    }

    // Try any link with href
    const anyMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (anyMatch) {
      return anyMatch[1];
    }

    return null;
  }

  /**
   * Extract Atom categories (term attributes)
   */
  _extractAtomCategories(block) {
    const categories = [];
    const regex = /<category[^>]+term=["']([^"']+)["']/gi;
    let match;
    while ((match = regex.exec(block)) !== null) {
      categories.push(match[1]);
    }
    return categories;
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Extract blocks of a given tag type
   */
  _extractBlocks(text, tagName) {
    const blocks = [];
    const startTag = `<${tagName}`;
    const endTag = `</${tagName}>`;

    let searchStart = 0;
    while (true) {
      const blockStart = text.toLowerCase().indexOf(startTag.toLowerCase(), searchStart);
      if (blockStart === -1) break;

      const blockEnd = text.toLowerCase().indexOf(endTag.toLowerCase(), blockStart);
      if (blockEnd === -1) break;

      const blockContent = text.substring(blockStart, blockEnd + endTag.length);
      blocks.push(blockContent);

      searchStart = blockEnd + endTag.length;
    }

    return blocks;
  }

  /**
   * Extract content of a single tag
   */
  _extractTag(text, tagName) {
    // Handle namespaced tags (e.g., dc:creator, content:encoded)
    const escapedTag = tagName.replace(':', '\\:');
    const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
    const match = text.match(regex);
    return match ? this._decodeEntities(match[1].trim()) : null;
  }

  /**
   * Extract tag with its full content (including nested tags)
   */
  _extractTagWithContent(text, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'i');
    const match = text.match(regex);
    return match ? match[0] : null;
  }

  /**
   * Extract all occurrences of a tag
   */
  _extractAllTags(text, tagName) {
    const values = [];
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      values.push(this._decodeEntities(match[1].trim()));
    }
    return values;
  }

  /**
   * Extract attribute value from tag string
   */
  _extractAttribute(tagString, attrName) {
    const regex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i');
    const match = tagString.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Extract and unwrap CDATA content
   */
  _extractCDATA(text) {
    if (!text) return text;
    // Remove CDATA wrapper if present
    const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdataMatch) {
      return cdataMatch[1];
    }
    return text;
  }

  /**
   * Decode HTML entities
   */
  _decodeEntities(text) {
    if (!text) return text;
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  /**
   * Parse date string to ISO format
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Fall through to return original
    }

    return dateStr;
  }
}

// ============================================================================
// SECTION III: API Source Fetcher
// ============================================================================

/**
 * Fetch data from REST APIs with pagination support
 */
class APIFetcher {
  constructor(config = {}) {
    this.timeout = config.timeout || APISourceConfig.TIMEOUT_MS;
    this.maxRetries = config.maxRetries || APISourceConfig.MAX_RETRIES;
    this.retryDelay = config.retryDelay || APISourceConfig.RETRY_DELAY_MS;
  }

  /**
   * Fetch data from an API endpoint
   * @param {Object} apiConfig - API configuration
   * @returns {Promise<{ headers: string[], rows: object[], apiInfo: object }>}
   */
  async fetch(apiConfig) {
    const {
      endpoint,
      method = 'GET',
      headers = {},
      body = null,
      auth = null,
      pagination = null,
      recordsPath = null,
      schemaMapping = null,
      maxRecords = APISourceConfig.MAX_RECORDS
    } = apiConfig;

    // Build request headers
    const requestHeaders = { ...headers };

    // Add authentication
    if (auth) {
      this._applyAuth(requestHeaders, auth);
    }

    // Add default headers if not present
    if (!requestHeaders['Accept']) {
      requestHeaders['Accept'] = 'application/json';
    }
    if (!requestHeaders['User-Agent']) {
      requestHeaders['User-Agent'] = 'EO-Lake/1.0';
    }

    let allRecords = [];
    let pageInfo = null;
    let currentEndpoint = endpoint;

    // Fetch with pagination
    do {
      const response = await this._fetchWithRetry(currentEndpoint, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : null
      });

      const data = await response.json();

      // Extract records from response
      const records = recordsPath
        ? this._getNestedValue(data, recordsPath)
        : (Array.isArray(data) ? data : [data]);

      if (Array.isArray(records)) {
        allRecords = allRecords.concat(records);
      }

      // Check pagination
      if (pagination && allRecords.length < maxRecords) {
        pageInfo = this._getNextPage(data, pagination, currentEndpoint);
        currentEndpoint = pageInfo?.nextUrl;
      } else {
        currentEndpoint = null;
      }

    } while (currentEndpoint && allRecords.length < maxRecords);

    // Apply schema mapping if provided
    const mappedRecords = schemaMapping
      ? allRecords.map(r => this._applySchemaMapping(r, schemaMapping))
      : allRecords;

    // Extract field headers from records
    const fieldHeaders = this._inferHeaders(mappedRecords);

    // Normalize records to match headers
    const rows = mappedRecords.map((record, index) => {
      const row = {};
      fieldHeaders.forEach(header => {
        const value = record[header];
        row[header] = this._normalizeValue(value);
      });
      row._rowIndex = index;
      return row;
    });

    return {
      headers: fieldHeaders,
      rows,
      hasHeaders: true,
      totalRows: rows.length,
      apiInfo: {
        endpoint: apiConfig.endpoint,
        method,
        fetchedAt: new Date().toISOString(),
        recordCount: rows.length,
        hadPagination: !!pagination
      },
      fileType: 'api'
    };
  }

  /**
   * Fetch with retry logic
   */
  async _fetchWithRetry(url, options) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries - 1) {
          await this._sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Apply authentication to headers
   */
  _applyAuth(headers, auth) {
    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.token}`;
        break;
      case 'basic':
        const credentials = btoa(`${auth.username}:${auth.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'api_key':
        if (auth.location === 'header') {
          headers[auth.headerName || 'X-API-Key'] = auth.key;
        }
        // For query param, it should be added to the URL
        break;
    }
  }

  /**
   * Get next page URL for pagination
   */
  _getNextPage(data, pagination, currentUrl) {
    switch (pagination.type) {
      case 'offset': {
        const currentOffset = this._getQueryParam(currentUrl, pagination.offsetParam || 'offset') || 0;
        const limit = pagination.limit || 100;
        const nextOffset = parseInt(currentOffset) + limit;
        const total = this._getNestedValue(data, pagination.totalPath);

        if (total && nextOffset >= total) {
          return null;
        }

        return {
          nextUrl: this._setQueryParam(currentUrl, pagination.offsetParam || 'offset', nextOffset)
        };
      }

      case 'page': {
        const currentPage = parseInt(this._getQueryParam(currentUrl, pagination.pageParam || 'page') || 1);
        const totalPages = this._getNestedValue(data, pagination.totalPagesPath);

        if (totalPages && currentPage >= totalPages) {
          return null;
        }

        return {
          nextUrl: this._setQueryParam(currentUrl, pagination.pageParam || 'page', currentPage + 1)
        };
      }

      case 'cursor': {
        const cursor = this._getNestedValue(data, pagination.cursorPath);
        if (!cursor) {
          return null;
        }

        return {
          nextUrl: this._setQueryParam(currentUrl, pagination.cursorParam || 'cursor', cursor)
        };
      }

      case 'link-header': {
        // Would need response headers, which we don't have in this context
        // This would need to be handled differently
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  _getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Apply schema mapping to a record
   */
  _applySchemaMapping(record, mapping) {
    const result = {};

    for (const [sourcePath, targetConfig] of Object.entries(mapping)) {
      const value = this._getNestedValue(record, sourcePath);
      const targetField = typeof targetConfig === 'string'
        ? targetConfig
        : targetConfig.field;

      result[targetField] = value;
    }

    return result;
  }

  /**
   * Infer headers from records
   */
  _inferHeaders(records) {
    const headerSet = new Set();

    for (const record of records) {
      if (record && typeof record === 'object') {
        Object.keys(record).forEach(key => headerSet.add(key));
      }
    }

    return Array.from(headerSet);
  }

  /**
   * Normalize value for display
   */
  _normalizeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Get query parameter from URL
   */
  _getQueryParam(url, param) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get(param);
    } catch {
      return null;
    }
  }

  /**
   * Set query parameter in URL
   */
  _setQueryParam(url, param, value) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set(param, value);
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SECTION IV: Feed/API Registry
// ============================================================================

/**
 * Pre-configured RSS feeds for common sources
 */
const RSSFeeds = {
  // =========================================================================
  // Tech News
  // =========================================================================

  hackernews: {
    id: 'hackernews',
    name: 'Hacker News',
    category: 'tech_news',
    url: 'https://news.ycombinator.com/rss',
    format: 'rss',
    description: 'Top stories from Hacker News'
  },

  lobsters: {
    id: 'lobsters',
    name: 'Lobsters',
    category: 'tech_news',
    url: 'https://lobste.rs/rss',
    format: 'rss',
    description: 'Computing-focused community'
  },

  techcrunch: {
    id: 'techcrunch',
    name: 'TechCrunch',
    category: 'tech_news',
    url: 'https://techcrunch.com/feed/',
    format: 'rss',
    description: 'Technology news and analysis'
  },

  arstechnica: {
    id: 'arstechnica',
    name: 'Ars Technica',
    category: 'tech_news',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    format: 'rss',
    description: 'Technology news and analysis'
  },

  // =========================================================================
  // Government & Regulatory
  // =========================================================================

  federalRegisterSignificant: {
    id: 'federalRegisterSignificant',
    name: 'Federal Register - Significant',
    category: 'government',
    url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Bsignificant%5D=1',
    format: 'rss',
    description: 'Significant federal regulatory documents'
  },

  federalRegisterRules: {
    id: 'federalRegisterRules',
    name: 'Federal Register - Final Rules',
    category: 'government',
    url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Btype%5D%5B%5D=RULE',
    format: 'rss',
    description: 'Final rules published in the Federal Register'
  },

  congressBills: {
    id: 'congressBills',
    name: 'Congress.gov - Recent Bills',
    category: 'government',
    url: 'https://www.congress.gov/rss/most-viewed-bills.xml',
    format: 'rss',
    description: 'Most viewed bills in Congress'
  },

  supremeCourtOpinions: {
    id: 'supremeCourtOpinions',
    name: 'Supreme Court Opinions',
    category: 'government',
    url: 'https://www.supremecourt.gov/rss/cases/opinions.aspx',
    format: 'rss',
    description: 'Recent Supreme Court opinions'
  },

  // =========================================================================
  // Data & Open Data
  // =========================================================================

  dataGov: {
    id: 'dataGov',
    name: 'Data.gov Updates',
    category: 'data',
    url: 'https://catalog.data.gov/feeds/dataset.atom',
    format: 'atom',
    description: 'New datasets on Data.gov'
  },

  // =========================================================================
  // Research & Academic
  // =========================================================================

  arxivCS: {
    id: 'arxivCS',
    name: 'arXiv - Computer Science',
    category: 'academic',
    url: 'https://rss.arxiv.org/rss/cs',
    format: 'rss',
    description: 'New computer science papers on arXiv'
  },

  arxivAI: {
    id: 'arxivAI',
    name: 'arXiv - AI',
    category: 'academic',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    format: 'rss',
    description: 'New AI papers on arXiv'
  },

  arxivLG: {
    id: 'arxivLG',
    name: 'arXiv - Machine Learning',
    category: 'academic',
    url: 'https://rss.arxiv.org/rss/cs.LG',
    format: 'rss',
    description: 'New machine learning papers on arXiv'
  },

  // =========================================================================
  // Custom (template)
  // =========================================================================

  custom: {
    id: 'custom',
    name: 'Custom Feed',
    category: 'custom',
    requiresUrl: true,
    description: 'Add any RSS or Atom feed URL'
  }
};

/**
 * Pre-configured API templates for common services
 */
const APITemplates = {
  // =========================================================================
  // Development & Code
  // =========================================================================

  github_issues: {
    id: 'github_issues',
    name: 'GitHub Issues',
    category: 'development',
    auth: { type: 'bearer', tokenEnvVar: 'GITHUB_TOKEN' },
    configTemplate: {
      endpoint: 'https://api.github.com/repos/{owner}/{repo}/issues',
      method: 'GET',
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      pagination: { type: 'link-header' },
      recordsPath: null // Response is the array
    },
    variables: [
      { name: 'owner', label: 'Repository Owner', required: true },
      { name: 'repo', label: 'Repository Name', required: true }
    ],
    schemaMapping: {
      'number': 'issue_number',
      'title': 'title',
      'state': 'status',
      'body': 'description',
      'user.login': 'author',
      'created_at': 'created',
      'updated_at': 'updated',
      'html_url': 'url',
      'labels': 'labels'
    }
  },

  github_pulls: {
    id: 'github_pulls',
    name: 'GitHub Pull Requests',
    category: 'development',
    auth: { type: 'bearer', tokenEnvVar: 'GITHUB_TOKEN' },
    configTemplate: {
      endpoint: 'https://api.github.com/repos/{owner}/{repo}/pulls',
      method: 'GET',
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      pagination: { type: 'link-header' }
    },
    variables: [
      { name: 'owner', label: 'Repository Owner', required: true },
      { name: 'repo', label: 'Repository Name', required: true }
    ],
    schemaMapping: {
      'number': 'pr_number',
      'title': 'title',
      'state': 'status',
      'body': 'description',
      'user.login': 'author',
      'created_at': 'created',
      'merged_at': 'merged',
      'html_url': 'url'
    }
  },

  // =========================================================================
  // Project Management
  // =========================================================================

  airtable_table: {
    id: 'airtable_table',
    name: 'Airtable Table',
    category: 'project_management',
    auth: { type: 'bearer', tokenEnvVar: 'AIRTABLE_TOKEN' },
    configTemplate: {
      endpoint: 'https://api.airtable.com/v0/{baseId}/{tableId}',
      method: 'GET',
      pagination: {
        type: 'cursor',
        cursorPath: 'offset',
        cursorParam: 'offset'
      },
      recordsPath: 'records'
    },
    variables: [
      { name: 'baseId', label: 'Base ID', required: true },
      { name: 'tableId', label: 'Table Name or ID', required: true }
    ],
    schemaMapping: null // Airtable has dynamic schema
  },

  notion_database: {
    id: 'notion_database',
    name: 'Notion Database',
    category: 'project_management',
    auth: { type: 'bearer', tokenEnvVar: 'NOTION_TOKEN' },
    configTemplate: {
      endpoint: 'https://api.notion.com/v1/databases/{databaseId}/query',
      method: 'POST',
      headers: { 'Notion-Version': '2022-06-28' },
      pagination: {
        type: 'cursor',
        cursorPath: 'next_cursor',
        cursorParam: 'start_cursor'
      },
      recordsPath: 'results'
    },
    variables: [
      { name: 'databaseId', label: 'Database ID', required: true }
    ]
  },

  linear_issues: {
    id: 'linear_issues',
    name: 'Linear Issues',
    category: 'project_management',
    auth: { type: 'bearer', tokenEnvVar: 'LINEAR_TOKEN' },
    configTemplate: {
      endpoint: 'https://api.linear.app/graphql',
      method: 'POST',
      body: {
        query: `query { issues { nodes { id title state { name } priority createdAt updatedAt } } }`
      },
      recordsPath: 'data.issues.nodes'
    },
    variables: []
  },

  // =========================================================================
  // Public Data APIs
  // =========================================================================

  jsonplaceholder_posts: {
    id: 'jsonplaceholder_posts',
    name: 'JSONPlaceholder Posts (Demo)',
    category: 'demo',
    auth: null,
    configTemplate: {
      endpoint: 'https://jsonplaceholder.typicode.com/posts',
      method: 'GET'
    },
    variables: [],
    description: 'Demo API for testing - returns fake blog posts'
  },

  jsonplaceholder_users: {
    id: 'jsonplaceholder_users',
    name: 'JSONPlaceholder Users (Demo)',
    category: 'demo',
    auth: null,
    configTemplate: {
      endpoint: 'https://jsonplaceholder.typicode.com/users',
      method: 'GET'
    },
    variables: [],
    description: 'Demo API for testing - returns fake user data'
  },

  // =========================================================================
  // Custom (template)
  // =========================================================================

  custom: {
    id: 'custom',
    name: 'Custom API',
    category: 'custom',
    requiresConfig: true,
    description: 'Configure a custom REST API endpoint'
  }
};

// ============================================================================
// SECTION V: Feed Discovery
// ============================================================================

/**
 * Discover RSS/Atom feeds from a webpage URL
 */
class FeedDiscoverer {
  /**
   * Common feed paths to try
   */
  static COMMON_PATHS = [
    '/feed',
    '/feeds/posts/default',
    '/rss',
    '/rss.xml',
    '/feed.xml',
    '/atom.xml',
    '/index.xml',
    '/feed/rss',
    '/feed/atom',
    '/.rss',
    '/blog/feed',
    '/blog/rss'
  ];

  /**
   * Discover feeds from a URL
   * @param {string} url - URL to check for feeds
   * @returns {Promise<{ feeds: Array, discoveryMethod: string }>}
   */
  async discover(url) {
    const feeds = [];

    try {
      // First, try to fetch the URL and look for <link> tags
      const response = await fetch(url, {
        headers: { 'User-Agent': 'EO-Lake/1.0 Feed Discoverer' }
      });

      if (response.ok) {
        const html = await response.text();

        // Check if URL itself is a feed
        if (this._isFeedContent(html)) {
          return {
            feeds: [{
              url: url,
              title: 'Feed',
              type: this._detectFeedType(html)
            }],
            discoveryMethod: 'direct'
          };
        }

        // Look for <link> tags pointing to feeds
        const linkFeeds = this._extractFeedLinks(html, url);
        feeds.push(...linkFeeds);

        if (feeds.length > 0) {
          return { feeds, discoveryMethod: 'link_tags' };
        }
      }
    } catch (e) {
      // Continue to try common paths
    }

    // Try common feed paths
    const baseUrl = new URL(url).origin;
    for (const path of FeedDiscoverer.COMMON_PATHS) {
      try {
        const feedUrl = baseUrl + path;
        const response = await fetch(feedUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'EO-Lake/1.0 Feed Discoverer' }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
            feeds.push({
              url: feedUrl,
              title: `Feed at ${path}`,
              type: contentType.includes('atom') ? 'atom' : 'rss'
            });
          }
        }
      } catch (e) {
        // Ignore errors for individual paths
      }
    }

    return {
      feeds,
      discoveryMethod: feeds.length > 0 ? 'common_paths' : 'none'
    };
  }

  /**
   * Check if content is a feed
   */
  _isFeedContent(text) {
    const trimmed = text.trim().toLowerCase();
    return (
      trimmed.startsWith('<?xml') ||
      trimmed.includes('<rss') ||
      trimmed.includes('<feed') ||
      trimmed.includes('<channel>')
    );
  }

  /**
   * Detect feed type from content
   */
  _detectFeedType(text) {
    if (text.includes('<feed') && text.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      return 'atom';
    }
    return 'rss';
  }

  /**
   * Extract feed links from HTML
   */
  _extractFeedLinks(html, baseUrl) {
    const feeds = [];
    const linkRegex = /<link[^>]+rel=["'](?:alternate|feed)["'][^>]*>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const linkTag = match[0];

      // Check for feed type
      const typeMatch = linkTag.match(/type=["']([^"']+)["']/i);
      const type = typeMatch ? typeMatch[1] : '';

      if (type.includes('rss') || type.includes('atom') || type.includes('xml')) {
        const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
        const titleMatch = linkTag.match(/title=["']([^"']+)["']/i);

        if (hrefMatch) {
          let feedUrl = hrefMatch[1];

          // Resolve relative URLs
          if (!feedUrl.startsWith('http')) {
            feedUrl = new URL(feedUrl, baseUrl).toString();
          }

          feeds.push({
            url: feedUrl,
            title: titleMatch ? titleMatch[1] : 'Feed',
            type: type.includes('atom') ? 'atom' : 'rss'
          });
        }
      }
    }

    return feeds;
  }
}

// ============================================================================
// SECTION VI: Source Integration
// ============================================================================

/**
 * Create source configuration for RSS/API imports
 */
function createFeedSourceConfig(feedConfig) {
  return {
    sourceType: 'api',
    locator: {
      type: 'rss',
      url: feedConfig.url,
      format: feedConfig.format || 'rss',
      feedId: feedConfig.id
    },
    provenance: {
      identity_kind: 'observation',
      identity_scope: 'composite',
      designation_operator: 'rec',
      designation_mechanism: `RSS feed import from ${feedConfig.url}`,
      authority_class: 'pipeline',
      boundary_type: '-1', // Unbounded - feed grows
      boundary_basis: 'domain',
      container_stability: 'mutable',
      temporal_mode: '+1', // Dynamic - changes over time
      temporal_justification: 'Feed content updates periodically'
    }
  };
}

/**
 * Create source configuration for API imports
 */
function createAPISourceConfig(apiConfig, templateId = null) {
  const template = templateId ? APITemplates[templateId] : null;

  return {
    sourceType: 'api',
    locator: {
      type: 'api',
      endpoint: apiConfig.endpoint,
      method: apiConfig.method || 'GET',
      templateId: templateId,
      templateName: template?.name
    },
    provenance: {
      identity_kind: 'observation',
      identity_scope: 'composite',
      designation_operator: 'rec',
      designation_mechanism: `API import from ${apiConfig.endpoint}`,
      authority_class: 'pipeline',
      boundary_type: apiConfig.pagination ? '-1' : '+1', // Unbounded if paginated
      boundary_basis: 'system',
      container_stability: 'mutable',
      temporal_mode: '+1', // Dynamic
      temporal_justification: 'API data may change between fetches'
    },
    apiConfig: {
      ...apiConfig,
      fetchedAt: null // Will be set on import
    }
  };
}

/**
 * Fetch and parse an RSS feed, returning data ready for source creation
 * @param {string} url - Feed URL
 * @returns {Promise<Object>} Parsed feed data
 */
async function fetchRSSFeed(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'EO-Lake/1.0',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: HTTP ${response.status}`);
  }

  const text = await response.text();
  const parser = new RSSParser();
  const result = parser.parse(text);

  return {
    ...result,
    sourceUrl: url,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Fetch data from an API endpoint, returning data ready for source creation
 * @param {Object} config - API configuration
 * @returns {Promise<Object>} Parsed API data
 */
async function fetchAPIData(config) {
  const fetcher = new APIFetcher();
  const result = await fetcher.fetch(config);

  return {
    ...result,
    fetchedAt: new Date().toISOString()
  };
}

// ============================================================================
// SECTION VII: Sync Status Tracking
// ============================================================================

/**
 * Sync status for feed/API sources
 */
const SyncStatus = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed'
};

/**
 * Create sync metadata for a source
 */
function createSyncMetadata(sourceConfig) {
  return {
    syncEnabled: false,
    syncStrategy: 'manual', // 'manual' | 'scheduled' | 'webhook'
    syncInterval: null, // milliseconds, if scheduled
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncRecordCount: 0,
    lastSyncNewRecords: 0,
    lastSyncError: null,
    nextScheduledSync: null,
    syncHistory: [],
    sourceUrl: sourceConfig.locator?.url || sourceConfig.locator?.endpoint
  };
}

/**
 * Record a sync event
 */
function recordSyncEvent(syncMetadata, event) {
  const syncEvent = {
    timestamp: new Date().toISOString(),
    status: event.status,
    recordsTotal: event.recordsTotal || 0,
    recordsNew: event.recordsNew || 0,
    recordsUpdated: event.recordsUpdated || 0,
    error: event.error || null,
    duration: event.duration || 0
  };

  syncMetadata.lastSyncAt = syncEvent.timestamp;
  syncMetadata.lastSyncStatus = syncEvent.status;
  syncMetadata.lastSyncRecordCount = syncEvent.recordsTotal;
  syncMetadata.lastSyncNewRecords = syncEvent.recordsNew;
  syncMetadata.lastSyncError = syncEvent.error;

  // Keep last 50 sync events
  syncMetadata.syncHistory = [syncEvent, ...syncMetadata.syncHistory].slice(0, 50);

  return syncMetadata;
}

// ============================================================================
// SECTION VIII: Exports
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Configuration
    APISourceConfig,

    // Parsers
    RSSParser,
    APIFetcher,

    // Registries
    RSSFeeds,
    APITemplates,

    // Discovery
    FeedDiscoverer,

    // Source configuration
    createFeedSourceConfig,
    createAPISourceConfig,

    // Fetch functions
    fetchRSSFeed,
    fetchAPIData,

    // Sync tracking
    SyncStatus,
    createSyncMetadata,
    recordSyncEvent
  };
}

if (typeof window !== 'undefined') {
  window.EOAPISources = {
    // Configuration
    APISourceConfig,

    // Parsers
    RSSParser,
    APIFetcher,

    // Registries
    RSSFeeds,
    APITemplates,

    // Discovery
    FeedDiscoverer,

    // Source configuration
    createFeedSourceConfig,
    createAPISourceConfig,

    // Fetch functions
    fetchRSSFeed,
    fetchAPIData,

    // Sync tracking
    SyncStatus,
    createSyncMetadata,
    recordSyncEvent
  };

  // Also expose individual classes
  window.RSSParser = RSSParser;
  window.APIFetcher = APIFetcher;
  window.FeedDiscoverer = FeedDiscoverer;
  window.RSSFeeds = RSSFeeds;
  window.APITemplates = APITemplates;
}
