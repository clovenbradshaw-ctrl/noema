/**
 * EO Definition API - External API integrations for definition lookups
 *
 * Provides unified interface for searching:
 * - Concept URIs: Wikidata, DBpedia, LOV, Schema.org
 * - Regulatory Sources: eCFR, Federal Register, US Code
 * - Authority lookups via Wikidata
 *
 * All APIs return normalized results for easy consumption.
 */

// ============================================================================
// SECTION I: Configuration
// ============================================================================

const DefinitionAPIConfig = {
  // Request timeouts
  TIMEOUT_MS: 15000,

  // Cache settings (in-memory cache for session)
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // Rate limiting
  MIN_REQUEST_INTERVAL_MS: 100,

  // Result limits
  DEFAULT_LIMIT: 10
};

// ============================================================================
// SECTION II: Concept URI APIs
// ============================================================================

/**
 * Unified concept search result format
 * @typedef {Object} ConceptResult
 * @property {string} uri - Full URI for the concept
 * @property {string} id - Local identifier
 * @property {string} label - Human-readable label
 * @property {string} description - Short description
 * @property {string} source - Source name (Wikidata, DBpedia, etc.)
 * @property {Object} [details] - Additional metadata from source
 */

const ConceptAPIs = {
  /**
   * Wikidata - Largest open knowledge base
   * https://www.wikidata.org/wiki/Wikidata:Data_access
   */
  wikidata: {
    name: 'Wikidata',
    type: 'api',
    baseUrl: 'https://www.wikidata.org/w/api.php',

    /**
     * Search Wikidata entities
     * @param {string} query - Search term
     * @param {Object} options - { limit, language }
     * @returns {Promise<ConceptResult[]>}
     */
    async search(query, options = {}) {
      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;
      const language = options.language || 'en';

      const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: query,
        language: language,
        limit: limit.toString(),
        format: 'json',
        origin: '*'
      });

      const response = await fetchWithTimeout(
        `${this.baseUrl}?${params}`,
        { method: 'GET' },
        DefinitionAPIConfig.TIMEOUT_MS
      );

      const data = await response.json();

      return (data.search || []).map(entity => ({
        uri: `http://www.wikidata.org/entity/${entity.id}`,
        id: entity.id,
        label: entity.label || entity.id,
        description: entity.description || '',
        source: 'Wikidata',
        details: {
          aliases: entity.aliases || [],
          concepturi: entity.concepturi,
          match: entity.match
        }
      }));
    },

    /**
     * Get detailed entity information including claims
     * @param {string} entityId - Wikidata entity ID (e.g., Q5)
     * @returns {Promise<Object>}
     */
    async getDetails(entityId) {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityId,
        languages: 'en',
        format: 'json',
        origin: '*'
      });

      const response = await fetchWithTimeout(
        `${this.baseUrl}?${params}`,
        { method: 'GET' },
        DefinitionAPIConfig.TIMEOUT_MS
      );

      const data = await response.json();
      const entity = data.entities?.[entityId];

      if (!entity) return null;

      const details = {
        id: entityId,
        label: entity.labels?.en?.value || entityId,
        description: entity.descriptions?.en?.value || '',
        aliases: (entity.aliases?.en || []).map(a => a.value),
        instanceOf: [],      // P31
        subclassOf: [],      // P279
        jurisdiction: null,  // P17 (country)
        officialWebsite: null, // P856
        inception: null      // P571
      };

      // Extract key claims
      const claims = entity.claims || {};

      // P31 = instance of
      if (claims.P31) {
        details.instanceOf = claims.P31.slice(0, 5).map(c => ({
          id: c.mainsnak?.datavalue?.value?.id,
          label: null // Would need another lookup
        })).filter(c => c.id);
      }

      // P279 = subclass of
      if (claims.P279) {
        details.subclassOf = claims.P279.slice(0, 5).map(c => ({
          id: c.mainsnak?.datavalue?.value?.id,
          label: null
        })).filter(c => c.id);
      }

      // P17 = country
      if (claims.P17?.[0]) {
        details.jurisdiction = claims.P17[0].mainsnak?.datavalue?.value?.id;
      }

      // P856 = official website
      if (claims.P856?.[0]) {
        details.officialWebsite = claims.P856[0].mainsnak?.datavalue?.value;
      }

      // P571 = inception
      if (claims.P571?.[0]) {
        const timeValue = claims.P571[0].mainsnak?.datavalue?.value?.time;
        if (timeValue) {
          details.inception = timeValue.replace(/^\+/, '').split('T')[0];
        }
      }

      return details;
    },

    /**
     * Search for organizations/authorities specifically
     * @param {string} query
     * @returns {Promise<ConceptResult[]>}
     */
    async searchAuthorities(query) {
      // Search with instance-of filter for organizations
      const results = await this.search(query, { limit: 15 });

      // Filter and prioritize organizational entities
      const orgKeywords = ['department', 'agency', 'bureau', 'office', 'administration', 'commission', 'board'];

      return results.sort((a, b) => {
        const aIsOrg = orgKeywords.some(k =>
          a.label.toLowerCase().includes(k) || a.description.toLowerCase().includes(k)
        );
        const bIsOrg = orgKeywords.some(k =>
          b.label.toLowerCase().includes(k) || b.description.toLowerCase().includes(k)
        );
        if (aIsOrg && !bIsOrg) return -1;
        if (!aIsOrg && bIsOrg) return 1;
        return 0;
      }).slice(0, 10);
    }
  },

  /**
   * DBpedia - Wikipedia structured data
   * https://wiki.dbpedia.org/lookup
   */
  dbpedia: {
    name: 'DBpedia',
    type: 'api',
    baseUrl: 'https://lookup.dbpedia.org/api/search',

    async search(query, options = {}) {
      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;

      const params = new URLSearchParams({
        query: query,
        format: 'json',
        maxResults: limit.toString()
      });

      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}?${params}`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );

        const data = await response.json();

        return (data.docs || []).map(doc => ({
          uri: doc.resource?.[0] || '',
          id: (doc.resource?.[0] || '').split('/').pop(),
          label: stripHtml(doc.label?.[0] || ''),
          description: stripHtml(doc.comment?.[0] || '').substring(0, 200),
          source: 'DBpedia',
          details: {
            categories: doc.category || [],
            types: doc.type || []
          }
        }));
      } catch (error) {
        console.warn('DBpedia search failed:', error);
        return [];
      }
    }
  },

  /**
   * LOV - Linked Open Vocabularies
   * https://lov.linkeddata.es/dataset/lov/api
   */
  lov: {
    name: 'LOV',
    type: 'api',
    baseUrl: 'https://lov.linkeddata.es/dataset/lov/api/v2',

    async search(query, options = {}) {
      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;

      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/term/search?q=${encodeURIComponent(query)}`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );

        const data = await response.json();

        return (data.results || []).slice(0, limit).map(r => ({
          uri: r.uri?.[0] || '',
          id: r.localName?.[0] || '',
          label: r.prefixedName?.[0] || r.localName?.[0] || '',
          description: `Vocabulary: ${r['vocabulary.prefix']?.[0] || 'unknown'}`,
          source: 'LOV',
          details: {
            vocabulary: r['vocabulary.prefix']?.[0],
            vocabularyUri: r['vocabulary.uri']?.[0],
            type: r.type?.[0]
          }
        }));
      } catch (error) {
        console.warn('LOV search failed:', error);
        return [];
      }
    },

    /**
     * Search for vocabularies (ontologies)
     */
    async searchVocabularies(query) {
      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/vocabulary/search?q=${encodeURIComponent(query)}`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );

        const data = await response.json();

        return (data.results || []).slice(0, 10).map(v => ({
          uri: v.uri,
          prefix: v.prefix,
          title: v.titles?.[0]?.value || v.prefix,
          description: v.descriptions?.[0]?.value || '',
          source: 'LOV'
        }));
      } catch (error) {
        console.warn('LOV vocabulary search failed:', error);
        return [];
      }
    }
  },

  /**
   * Schema.org - Web vocabulary (static, no API)
   */
  schemaOrg: {
    name: 'Schema.org',
    type: 'static',

    // Common Schema.org types and properties
    vocabulary: [
      // Types
      { id: 'Thing', type: 'Type', desc: 'The most generic type' },
      { id: 'Person', type: 'Type', desc: 'A person (alive, dead, undead, or fictional)' },
      { id: 'Organization', type: 'Type', desc: 'An organization such as a school, NGO, corporation, club, etc.' },
      { id: 'GovernmentOrganization', type: 'Type', desc: 'A governmental organization or agency' },
      { id: 'Place', type: 'Type', desc: 'Entities that have a physical location' },
      { id: 'Event', type: 'Type', desc: 'An event happening at a certain time and location' },
      { id: 'Action', type: 'Type', desc: 'An action performed by an agent' },
      { id: 'CreativeWork', type: 'Type', desc: 'The most generic kind of creative work' },
      { id: 'Product', type: 'Type', desc: 'Any offered product or service' },
      { id: 'Intangible', type: 'Type', desc: 'A utility class for things like quantities and structured values' },
      { id: 'MonetaryAmount', type: 'Type', desc: 'A monetary value or range' },
      { id: 'QuantitativeValue', type: 'Type', desc: 'A point value or interval for quantitative measurements' },
      { id: 'PropertyValue', type: 'Type', desc: 'A property-value pairing' },
      { id: 'PostalAddress', type: 'Type', desc: 'The mailing address' },
      { id: 'ContactPoint', type: 'Type', desc: 'A contact point' },
      { id: 'GeoCoordinates', type: 'Type', desc: 'Geographic coordinates' },
      { id: 'Duration', type: 'Type', desc: 'Quantity, e.g. 1 hour' },
      { id: 'DateTime', type: 'Type', desc: 'A combination of date and time' },
      // Properties
      { id: 'identifier', type: 'Property', desc: 'The identifier property' },
      { id: 'name', type: 'Property', desc: 'The name of the item' },
      { id: 'description', type: 'Property', desc: 'A description of the item' },
      { id: 'url', type: 'Property', desc: 'URL of the item' },
      { id: 'status', type: 'Property', desc: 'The status of something' },
      { id: 'startDate', type: 'Property', desc: 'The start date and time' },
      { id: 'endDate', type: 'Property', desc: 'The end date and time' },
      { id: 'dateCreated', type: 'Property', desc: 'Date of creation' },
      { id: 'dateModified', type: 'Property', desc: 'Date of last modification' },
      { id: 'location', type: 'Property', desc: 'The location of the event/organization' },
      { id: 'address', type: 'Property', desc: 'Physical address of the item' },
      { id: 'memberOf', type: 'Property', desc: 'Organization the person/org is a member of' },
      { id: 'category', type: 'Property', desc: 'A category for the item' },
      { id: 'value', type: 'Property', desc: 'The value of a QuantitativeValue' },
      { id: 'unitCode', type: 'Property', desc: 'The unit of measurement' }
    ],

    async search(query, options = {}) {
      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;
      const q = query.toLowerCase();

      return this.vocabulary
        .filter(item =>
          item.id.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q)
        )
        .slice(0, limit)
        .map(item => ({
          uri: `https://schema.org/${item.id}`,
          id: item.id,
          label: item.id,
          description: `[${item.type}] ${item.desc}`,
          source: 'Schema.org',
          details: {
            type: item.type
          }
        }));
    }
  }
};

// ============================================================================
// SECTION III: Regulatory APIs
// ============================================================================

/**
 * Unified regulatory search result format
 * @typedef {Object} RegulatoryResult
 * @property {string} title - Document/section title
 * @property {string} citation - Legal citation
 * @property {string} snippet - Text excerpt
 * @property {string} url - Source URL
 * @property {string} source - Source name
 * @property {Object} meta - Source-specific metadata
 */

const RegulatoryAPIs = {
  /**
   * eCFR - Electronic Code of Federal Regulations
   * https://www.ecfr.gov/developers/documentation/api/v1
   */
  ecfr: {
    name: 'eCFR',
    type: 'api',
    baseUrl: 'https://www.ecfr.gov/api',

    /**
     * Search eCFR
     * @param {string} query
     * @param {Object} options - { title, limit }
     * @returns {Promise<RegulatoryResult[]>}
     */
    async search(query, options = {}) {
      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;

      const params = new URLSearchParams({
        query: query,
        per_page: limit.toString()
      });

      // Filter by CFR title if specified (e.g., title 24 for HUD)
      if (options.title) {
        params.append('title', options.title);
      }

      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/search/v1/results?${params}`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );

        const data = await response.json();

        return (data.results || []).map(r => ({
          title: r.hierarchy_headings?.join(' > ') || r.headings?.title || 'Untitled',
          citation: this._buildCitation(r),
          snippet: r.full_text_excerpt || r.snippet || '',
          url: r.url || this._buildUrl(r),
          source: 'eCFR',
          meta: {
            cfrTitle: r.title,
            part: r.part,
            section: r.section,
            subpart: r.subpart,
            hierarchy: r.hierarchy_headings,
            structureIndex: r.structure_index,
            startDate: r.start_date
          }
        }));
      } catch (error) {
        console.warn('eCFR search failed:', error);
        return [];
      }
    },

    _buildCitation(result) {
      const parts = [];
      if (result.title) parts.push(`${result.title} CFR`);
      if (result.part) parts.push(result.part);
      if (result.section) parts.push(`.${result.section}`);
      return parts.join(' ') || 'CFR';
    },

    _buildUrl(result) {
      if (!result.title || !result.part) return 'https://www.ecfr.gov';
      let url = `https://www.ecfr.gov/current/title-${result.title}/part-${result.part}`;
      if (result.section) {
        url += `/section-${result.part}.${result.section}`;
      }
      return url;
    },

    /**
     * Get structure/table of contents for a CFR title
     */
    async getTitleStructure(titleNumber) {
      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/versioner/v1/structure/${new Date().toISOString().split('T')[0]}/title-${titleNumber}.json`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );
        return await response.json();
      } catch (error) {
        console.warn('eCFR structure fetch failed:', error);
        return null;
      }
    }
  },

  /**
   * Federal Register - Daily journal of the US Government
   * https://www.federalregister.gov/developers/api/v1
   */
  federalRegister: {
    name: 'Federal Register',
    type: 'api',
    baseUrl: 'https://www.federalregister.gov/api/v1',

    async search(query, options = {}) {
      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;

      const params = new URLSearchParams({
        'conditions[term]': query,
        per_page: limit.toString(),
        order: 'relevance'
      });

      // Optional filters
      if (options.agencies) {
        options.agencies.forEach(a => params.append('conditions[agencies][]', a));
      }
      if (options.type) {
        params.append('conditions[type][]', options.type);
      }
      if (options.dateFrom) {
        params.append('conditions[publication_date][gte]', options.dateFrom);
      }

      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/documents.json?${params}`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );

        const data = await response.json();

        return (data.results || []).map(r => ({
          title: r.title || 'Untitled',
          citation: r.citation || r.document_number || '',
          snippet: r.abstract || r.excerpt || '',
          url: r.html_url || r.url || '',
          source: 'Federal Register',
          meta: {
            documentNumber: r.document_number,
            type: r.type,
            agencies: r.agencies?.map(a => ({
              name: a.name,
              id: a.id,
              slug: a.slug
            })) || [],
            publicationDate: r.publication_date,
            effectiveDate: r.effective_on,
            cfrReferences: r.cfr_references || [],
            topics: r.topics || [],
            docketIds: r.docket_ids || [],
            pdfUrl: r.pdf_url,
            rawTextUrl: r.raw_text_url
          }
        }));
      } catch (error) {
        console.warn('Federal Register search failed:', error);
        return [];
      }
    },

    /**
     * Get a specific document by document number
     */
    async getDocument(documentNumber) {
      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/documents/${documentNumber}.json`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );
        return await response.json();
      } catch (error) {
        console.warn('Federal Register document fetch failed:', error);
        return null;
      }
    },

    /**
     * Get list of agencies
     */
    async getAgencies() {
      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/agencies.json`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );
        return await response.json();
      } catch (error) {
        console.warn('Federal Register agencies fetch failed:', error);
        return [];
      }
    }
  },

  /**
   * US Code - Federal statutes (via Cornell LII)
   * Note: Cornell LII doesn't have a public API, so we construct search URLs
   */
  usCode: {
    name: 'US Code',
    type: 'link-builder',
    baseUrl: 'https://www.law.cornell.edu/uscode',

    async search(query, options = {}) {
      // Build search URL for Cornell LII
      const searchUrl = `https://www.law.cornell.edu/uscode/text?query=${encodeURIComponent(query)}`;

      // Return a single result that links to the search
      return [{
        title: `Search US Code for "${query}"`,
        citation: 'U.S.C.',
        snippet: 'Click to search Cornell Legal Information Institute',
        url: searchUrl,
        source: 'US Code (Cornell LII)',
        meta: {
          searchQuery: query,
          isExternalSearch: true
        }
      }];
    },

    /**
     * Build direct link to a US Code section
     * @param {string} title - Title number
     * @param {string} section - Section number
     */
    buildSectionUrl(title, section) {
      return `https://www.law.cornell.edu/uscode/text/${title}/${section}`;
    }
  },

  /**
   * GovInfo - Official US Government publications
   * https://api.govinfo.gov/docs/
   */
  govInfo: {
    name: 'GovInfo',
    type: 'api',
    baseUrl: 'https://api.govinfo.gov',

    // Note: GovInfo requires an API key
    // Users should set this via DefinitionAPI.configure({ govInfoApiKey: '...' })
    apiKey: null,

    async search(query, options = {}) {
      if (!this.apiKey) {
        console.warn('GovInfo API key not configured');
        return [];
      }

      const limit = options.limit || DefinitionAPIConfig.DEFAULT_LIMIT;

      const params = new URLSearchParams({
        query: query,
        pageSize: limit.toString(),
        api_key: this.apiKey
      });

      if (options.collection) {
        params.append('collection', options.collection);
      }

      try {
        const response = await fetchWithTimeout(
          `${this.baseUrl}/search?${params}`,
          { method: 'GET' },
          DefinitionAPIConfig.TIMEOUT_MS
        );

        const data = await response.json();

        return (data.results || []).map(r => ({
          title: r.title || 'Untitled',
          citation: r.packageId || '',
          snippet: r.description || '',
          url: r.download?.pdfLink || r.url || '',
          source: 'GovInfo',
          meta: {
            collection: r.collectionCode,
            dateIssued: r.dateIssued,
            government: r.governmentAuthor,
            category: r.category
          }
        }));
      } catch (error) {
        console.warn('GovInfo search failed:', error);
        return [];
      }
    }
  }
};

// ============================================================================
// SECTION IV: Unified Search Interface
// ============================================================================

/**
 * Main DefinitionAPI class - unified interface for all sources
 */
class DefinitionAPI {
  constructor() {
    this.cache = new Map();
    this.lastRequestTime = 0;
  }

  /**
   * Configure API settings
   */
  configure(options = {}) {
    if (options.govInfoApiKey) {
      RegulatoryAPIs.govInfo.apiKey = options.govInfoApiKey;
    }
    if (options.timeout) {
      DefinitionAPIConfig.TIMEOUT_MS = options.timeout;
    }
  }

  /**
   * Search concepts across multiple sources
   * @param {string} query
   * @param {Object} options - { sources: ['wikidata', 'dbpedia', ...], limit }
   * @returns {Promise<ConceptResult[]>}
   */
  async searchConcepts(query, options = {}) {
    const sources = options.sources || ['wikidata'];
    const results = [];

    const searches = sources.map(async (sourceName) => {
      const api = ConceptAPIs[sourceName];
      if (!api) {
        console.warn(`Unknown concept source: ${sourceName}`);
        return [];
      }

      const cacheKey = `concept:${sourceName}:${query}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < DefinitionAPIConfig.CACHE_TTL_MS) {
          return cached.data;
        }
      }

      try {
        const sourceResults = await api.search(query, options);
        this.cache.set(cacheKey, { data: sourceResults, timestamp: Date.now() });
        return sourceResults;
      } catch (error) {
        console.error(`Error searching ${sourceName}:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(searches);
    return allResults.flat();
  }

  /**
   * Search regulatory sources
   * @param {string} query
   * @param {Object} options - { sources: ['ecfr', 'federalRegister', ...], limit }
   * @returns {Promise<RegulatoryResult[]>}
   */
  async searchRegulatory(query, options = {}) {
    const sources = options.sources || ['ecfr'];
    const results = [];

    const searches = sources.map(async (sourceName) => {
      const api = RegulatoryAPIs[sourceName];
      if (!api) {
        console.warn(`Unknown regulatory source: ${sourceName}`);
        return [];
      }

      const cacheKey = `regulatory:${sourceName}:${query}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < DefinitionAPIConfig.CACHE_TTL_MS) {
          return cached.data;
        }
      }

      try {
        const sourceResults = await api.search(query, options);
        this.cache.set(cacheKey, { data: sourceResults, timestamp: Date.now() });
        return sourceResults;
      } catch (error) {
        console.error(`Error searching ${sourceName}:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(searches);
    return allResults.flat();
  }

  /**
   * Search for authorities (government agencies, organizations)
   * @param {string} query
   * @returns {Promise<ConceptResult[]>}
   */
  async searchAuthorities(query) {
    return ConceptAPIs.wikidata.searchAuthorities(query);
  }

  /**
   * Get detailed information about a Wikidata entity
   * @param {string} entityId
   * @returns {Promise<Object>}
   */
  async getWikidataDetails(entityId) {
    const cacheKey = `wikidata:details:${entityId}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < DefinitionAPIConfig.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const details = await ConceptAPIs.wikidata.getDetails(entityId);
    if (details) {
      this.cache.set(cacheKey, { data: details, timestamp: Date.now() });
    }
    return details;
  }

  /**
   * Get a Federal Register document by number
   * @param {string} documentNumber
   * @returns {Promise<Object>}
   */
  async getFederalRegisterDocument(documentNumber) {
    return RegulatoryAPIs.federalRegister.getDocument(documentNumber);
  }

  /**
   * Get eCFR title structure
   * @param {number} titleNumber
   * @returns {Promise<Object>}
   */
  async getECFRStructure(titleNumber) {
    return RegulatoryAPIs.ecfr.getTitleStructure(titleNumber);
  }

  /**
   * Search all sources (concept + regulatory)
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<{concepts: ConceptResult[], regulatory: RegulatoryResult[]}>}
   */
  async searchAll(query, options = {}) {
    const [concepts, regulatory] = await Promise.all([
      this.searchConcepts(query, {
        sources: options.conceptSources || ['wikidata', 'schemaOrg'],
        limit: options.limit
      }),
      this.searchRegulatory(query, {
        sources: options.regulatorySources || ['ecfr', 'federalRegister'],
        limit: options.limit
      })
    ]);

    return { concepts, regulatory };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get available sources
   */
  getSources() {
    return {
      concept: Object.keys(ConceptAPIs).map(key => ({
        id: key,
        name: ConceptAPIs[key].name,
        type: ConceptAPIs[key].type
      })),
      regulatory: Object.keys(RegulatoryAPIs).map(key => ({
        id: key,
        name: RegulatoryAPIs[key].name,
        type: RegulatoryAPIs[key].type
      }))
    };
  }
}

// ============================================================================
// SECTION V: Utility Functions
// ============================================================================

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
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
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtml(text) {
  return (text || '').replace(/<[^>]*>/g, '');
}

// ============================================================================
// SECTION VI: Exports
// ============================================================================

// Singleton instance
let _definitionAPI = null;

function getDefinitionAPI() {
  if (!_definitionAPI) {
    _definitionAPI = new DefinitionAPI();
  }
  return _definitionAPI;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.EO = window.EO || {};
  window.EO.DefinitionAPI = DefinitionAPI;
  window.EO.getDefinitionAPI = getDefinitionAPI;
  window.EO.ConceptAPIs = ConceptAPIs;
  window.EO.RegulatoryAPIs = RegulatoryAPIs;
  window.EO.DefinitionAPIConfig = DefinitionAPIConfig;
}

// Export for Node.js/ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DefinitionAPI,
    getDefinitionAPI,
    ConceptAPIs,
    RegulatoryAPIs,
    DefinitionAPIConfig
  };
}
