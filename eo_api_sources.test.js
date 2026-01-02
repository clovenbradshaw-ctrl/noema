/**
 * EO API Sources - Test Suite
 *
 * Tests for RSS/Atom parsing, API fetching, and source configuration
 */

const {
  RSSParser,
  APIFetcher,
  FeedDiscoverer,
  RSSFeeds,
  APITemplates,
  createFeedSourceConfig,
  createAPISourceConfig,
  createSyncMetadata,
  recordSyncEvent,
  SyncStatus
} = require('./eo_api_sources.js');

// ============================================================================
// Test Utilities
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n    Expected: ${expected}\n    Actual: ${actual}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(message || 'Expected true but got false');
  }
}

function assertFalse(value, message = '') {
  if (value) {
    throw new Error(message || 'Expected false but got true');
  }
}

function assertContains(array, value, message = '') {
  if (!array.includes(value)) {
    throw new Error(message || `Expected array to contain ${value}`);
  }
}

function assertHasProperty(obj, prop, message = '') {
  if (!(prop in obj)) {
    throw new Error(message || `Expected object to have property "${prop}"`);
  }
}

// ============================================================================
// Sample Feed Data
// ============================================================================

const SAMPLE_RSS_2_0 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    <language>en-us</language>
    <lastBuildDate>Mon, 01 Jan 2024 12:00:00 GMT</lastBuildDate>
    <item>
      <title>First Post</title>
      <link>https://example.com/post/1</link>
      <description>This is the first post</description>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <guid>https://example.com/post/1</guid>
      <dc:creator>John Doe</dc:creator>
      <category>Technology</category>
      <category>News</category>
      <content:encoded><![CDATA[<p>Full content of the first post</p>]]></content:encoded>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/post/2</link>
      <description><![CDATA[This is the <b>second</b> post]]></description>
      <pubDate>Mon, 01 Jan 2024 11:00:00 GMT</pubDate>
      <author>jane@example.com</author>
      <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" length="12345"/>
    </item>
  </channel>
</rss>`;

const SAMPLE_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com" rel="alternate"/>
  <link href="https://example.com/feed.atom" rel="self"/>
  <id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>
  <updated>2024-01-01T12:00:00Z</updated>
  <subtitle>A test Atom feed</subtitle>
  <author>
    <name>John Doe</name>
    <email>john@example.com</email>
  </author>
  <entry>
    <title>Atom Entry 1</title>
    <link href="https://example.com/entry/1" rel="alternate"/>
    <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
    <published>2024-01-01T10:00:00Z</published>
    <updated>2024-01-01T10:30:00Z</updated>
    <author>
      <name>Jane Smith</name>
    </author>
    <summary>Summary of entry 1</summary>
    <content type="html"><![CDATA[<p>Full content of entry 1</p>]]></content>
    <category term="Tech"/>
    <category term="Updates"/>
  </entry>
  <entry>
    <title>Atom Entry 2</title>
    <link href="https://example.com/entry/2"/>
    <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6b</id>
    <updated>2024-01-01T11:00:00Z</updated>
    <summary>Summary of entry 2</summary>
  </entry>
</feed>`;

// ============================================================================
// RSS Parser Tests
// ============================================================================

console.log('\n== RSSParser Tests ==\n');

test('RSSParser - detects RSS format', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.feedFormat, 'rss', 'Should detect RSS format');
});

test('RSSParser - detects Atom format', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_ATOM);
  assertEqual(result.feedFormat, 'atom', 'Should detect Atom format');
});

test('RSSParser - parses RSS items correctly', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.rows.length, 2, 'Should parse 2 items');
  assertEqual(result.rows[0].title, 'First Post', 'First item title should match');
  assertEqual(result.rows[1].title, 'Second Post', 'Second item title should match');
});

test('RSSParser - parses RSS channel info', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.feedInfo.title, 'Test Feed', 'Feed title should match');
  assertEqual(result.feedInfo.description, 'A test RSS feed', 'Feed description should match');
});

test('RSSParser - extracts dc:creator as author', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.rows[0].author, 'John Doe', 'Should extract dc:creator');
});

test('RSSParser - parses multiple categories', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.rows[0].categories, 'Technology, News', 'Should parse multiple categories');
});

test('RSSParser - extracts content:encoded', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.rows[0].content, '<p>Full content of the first post</p>', 'Should extract encoded content');
});

test('RSSParser - parses enclosure', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.rows[1].enclosureUrl, 'https://example.com/audio.mp3', 'Should parse enclosure URL');
  assertEqual(result.rows[1].enclosureType, 'audio/mpeg', 'Should parse enclosure type');
});

test('RSSParser - handles CDATA in description', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertEqual(result.rows[1].description, 'This is the <b>second</b> post', 'Should unwrap CDATA');
});

test('RSSParser - parses Atom entries correctly', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_ATOM);
  assertEqual(result.rows.length, 2, 'Should parse 2 entries');
  assertEqual(result.rows[0].title, 'Atom Entry 1', 'First entry title should match');
});

test('RSSParser - extracts Atom link correctly', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_ATOM);
  assertEqual(result.rows[0].link, 'https://example.com/entry/1', 'Should extract alternate link');
});

test('RSSParser - parses Atom categories', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_ATOM);
  assertEqual(result.rows[0].categories, 'Tech, Updates', 'Should parse Atom categories');
});

test('RSSParser - normalizes Atom fields to RSS names', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_ATOM);
  assertHasProperty(result.rows[0], 'pubDate', 'Should have pubDate field');
  assertHasProperty(result.rows[0], 'guid', 'Should have guid field');
  assertHasProperty(result.rows[0], 'description', 'Should have description field');
});

test('RSSParser - includes standard headers', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_RSS_2_0);
  assertContains(result.headers, 'title', 'Headers should include title');
  assertContains(result.headers, 'link', 'Headers should include link');
  assertContains(result.headers, 'description', 'Headers should include description');
  assertContains(result.headers, 'pubDate', 'Headers should include pubDate');
  assertContains(result.headers, 'guid', 'Headers should include guid');
});

test('RSSParser - parses dates to ISO format', () => {
  const parser = new RSSParser();
  const result = parser.parse(SAMPLE_ATOM);
  assertTrue(result.rows[0].pubDate.includes('2024-01-01'), 'Should parse date');
  assertTrue(result.rows[0].pubDate.includes('T'), 'Should be ISO format');
});

// ============================================================================
// Registry Tests
// ============================================================================

console.log('\n== Registry Tests ==\n');

test('RSSFeeds - has required properties', () => {
  for (const [id, feed] of Object.entries(RSSFeeds)) {
    assertHasProperty(feed, 'id', `Feed ${id} should have id`);
    assertHasProperty(feed, 'name', `Feed ${id} should have name`);
    assertHasProperty(feed, 'category', `Feed ${id} should have category`);
    if (id !== 'custom') {
      assertHasProperty(feed, 'url', `Feed ${id} should have url`);
    }
  }
});

test('RSSFeeds - has common feed sources', () => {
  assertHasProperty(RSSFeeds, 'hackernews', 'Should have Hacker News');
  assertHasProperty(RSSFeeds, 'arxivCS', 'Should have arXiv CS');
  assertHasProperty(RSSFeeds, 'federalRegisterRules', 'Should have Federal Register');
});

test('APITemplates - has required properties', () => {
  for (const [id, template] of Object.entries(APITemplates)) {
    assertHasProperty(template, 'id', `Template ${id} should have id`);
    assertHasProperty(template, 'name', `Template ${id} should have name`);
    assertHasProperty(template, 'category', `Template ${id} should have category`);
  }
});

test('APITemplates - has GitHub templates', () => {
  assertHasProperty(APITemplates, 'github_issues', 'Should have GitHub Issues');
  assertHasProperty(APITemplates, 'github_pulls', 'Should have GitHub PRs');
});

test('APITemplates - GitHub template has correct config', () => {
  const gh = APITemplates.github_issues;
  assertHasProperty(gh, 'configTemplate', 'Should have configTemplate');
  assertHasProperty(gh.configTemplate, 'endpoint', 'configTemplate should have endpoint');
  assertTrue(gh.configTemplate.endpoint.includes('api.github.com'), 'Should use GitHub API');
});

test('APITemplates - has demo templates', () => {
  assertHasProperty(APITemplates, 'jsonplaceholder_posts', 'Should have demo API');
  assertEqual(APITemplates.jsonplaceholder_posts.auth, null, 'Demo API should not require auth');
});

// ============================================================================
// Source Configuration Tests
// ============================================================================

console.log('\n== Source Configuration Tests ==\n');

test('createFeedSourceConfig - creates valid config', () => {
  const config = createFeedSourceConfig({
    id: 'hackernews',
    url: 'https://news.ycombinator.com/rss',
    format: 'rss'
  });

  assertEqual(config.sourceType, 'api', 'Source type should be api');
  assertHasProperty(config, 'locator', 'Should have locator');
  assertHasProperty(config, 'provenance', 'Should have provenance');
});

test('createFeedSourceConfig - sets correct locator', () => {
  const config = createFeedSourceConfig({
    id: 'test',
    url: 'https://example.com/feed',
    format: 'rss'
  });

  assertEqual(config.locator.type, 'rss', 'Locator type should be rss');
  assertEqual(config.locator.url, 'https://example.com/feed', 'URL should match');
});

test('createFeedSourceConfig - sets unbounded boundary', () => {
  const config = createFeedSourceConfig({
    id: 'test',
    url: 'https://example.com/feed'
  });

  assertEqual(config.provenance.boundary_type, '-1', 'Should be unbounded (feeds grow)');
  assertEqual(config.provenance.temporal_mode, '+1', 'Should be dynamic');
});

test('createAPISourceConfig - creates valid config', () => {
  const config = createAPISourceConfig({
    endpoint: 'https://api.example.com/data',
    method: 'GET'
  });

  assertEqual(config.sourceType, 'api', 'Source type should be api');
  assertHasProperty(config, 'locator', 'Should have locator');
  assertHasProperty(config, 'provenance', 'Should have provenance');
  assertHasProperty(config, 'apiConfig', 'Should have apiConfig');
});

test('createAPISourceConfig - sets correct locator for API', () => {
  const config = createAPISourceConfig({
    endpoint: 'https://api.example.com/users',
    method: 'POST'
  });

  assertEqual(config.locator.type, 'api', 'Locator type should be api');
  assertEqual(config.locator.endpoint, 'https://api.example.com/users', 'Endpoint should match');
  assertEqual(config.locator.method, 'POST', 'Method should match');
});

test('createAPISourceConfig - includes template info', () => {
  const config = createAPISourceConfig(
    { endpoint: 'https://api.github.com/repos/test/test/issues' },
    'github_issues'
  );

  assertEqual(config.locator.templateId, 'github_issues', 'Should include template ID');
  assertEqual(config.locator.templateName, 'GitHub Issues', 'Should include template name');
});

// ============================================================================
// Sync Metadata Tests
// ============================================================================

console.log('\n== Sync Metadata Tests ==\n');

test('createSyncMetadata - creates default metadata', () => {
  const meta = createSyncMetadata({
    locator: { url: 'https://example.com/feed' }
  });

  assertEqual(meta.syncEnabled, false, 'Sync should be disabled by default');
  assertEqual(meta.syncStrategy, 'manual', 'Strategy should be manual');
  assertEqual(meta.lastSyncAt, null, 'No last sync initially');
  assertEqual(meta.sourceUrl, 'https://example.com/feed', 'Should store source URL');
});

test('recordSyncEvent - updates metadata correctly', () => {
  let meta = createSyncMetadata({ locator: { url: 'https://example.com' } });

  meta = recordSyncEvent(meta, {
    status: SyncStatus.SUCCESS,
    recordsTotal: 50,
    recordsNew: 10,
    duration: 1500
  });

  assertEqual(meta.lastSyncStatus, SyncStatus.SUCCESS, 'Status should be updated');
  assertEqual(meta.lastSyncRecordCount, 50, 'Record count should be updated');
  assertEqual(meta.lastSyncNewRecords, 10, 'New records should be updated');
  assertTrue(meta.lastSyncAt !== null, 'Sync time should be set');
  assertEqual(meta.syncHistory.length, 1, 'Should have one history entry');
});

test('recordSyncEvent - maintains history limit', () => {
  let meta = createSyncMetadata({ locator: { url: 'https://example.com' } });

  // Add 60 events
  for (let i = 0; i < 60; i++) {
    meta = recordSyncEvent(meta, {
      status: SyncStatus.SUCCESS,
      recordsTotal: i
    });
  }

  assertEqual(meta.syncHistory.length, 50, 'Should keep only last 50 events');
  assertEqual(meta.syncHistory[0].recordsTotal, 59, 'Most recent should be first');
});

test('recordSyncEvent - records errors', () => {
  let meta = createSyncMetadata({ locator: { url: 'https://example.com' } });

  meta = recordSyncEvent(meta, {
    status: SyncStatus.FAILED,
    error: 'Network timeout'
  });

  assertEqual(meta.lastSyncStatus, SyncStatus.FAILED, 'Status should be failed');
  assertEqual(meta.lastSyncError, 'Network timeout', 'Error should be recorded');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n==========================================');
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('==========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
