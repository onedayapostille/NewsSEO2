# Semantic Analysis Integration Guide - Phase 3

## Overview

Phase 3 adds OpenAI-powered semantic intelligence to analyze article content, extracting intent classification, entities, and quality scores.

## Key Features

- **Selective Analysis**: Only analyzes pages classified as "article"
- **Token Optimization**: Sends max 1200 tokens to minimize API costs
- **One-Time Analysis**: Runs only once per page per crawl session
- **Graceful Degradation**: Skips analysis if OpenAI API key not configured
- **Non-Blocking**: Never crashes the crawl on API failure

## Database Schema

### Table: `page_semantic_analysis`

```sql
CREATE TABLE page_semantic_analysis (
  id uuid PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES pages(id),
  intent_type text,                    -- informational, commercial, navigational
  entities_json jsonb DEFAULT '[]',    -- Top 10 named entities
  content_depth_score numeric,         -- 0-100
  topical_relevance_score numeric,     -- 0-100
  eeat_score_estimate numeric,         -- 0-100
  created_at timestamptz DEFAULT now()
);
```

## Service: semanticService.js

Located at: `server/services/semanticService.js`

### Core Functions

#### `analyzeArticleContent(html, title)`

Analyzes article content using OpenAI API.

**Parameters:**
- `html` - Full HTML content of the page
- `title` - Page title

**Returns:**
```javascript
{
  intent_type: "informational|commercial|navigational",
  entities: ["entity1", "entity2", ...],  // Max 10
  content_depth_score: 0-100,
  topical_relevance_score: 0-100,
  eeat_score_estimate: 0-100
}
```

**Token Optimization:**
- Removes scripts, styles, navigation, headers, footers
- Extracts only visible text
- Limits to ~1200 tokens (4800 characters)
- Uses gpt-4o-mini for cost efficiency

#### `analyzeAndSaveArticle(pageId, html, title, pageType)`

**Main integration function** - handles the complete workflow:

1. Checks if page is an article (returns null if not)
2. Checks if OpenAI is configured (skips if not)
3. Checks if analysis already exists (prevents duplicates)
4. Analyzes content with OpenAI
5. Saves results to database
6. Logs progress

**Usage:**
```javascript
import semanticService from './services/semanticService.js';

// After saving page to database
await semanticService.analyzeAndSaveArticle(
  page.id,
  html,
  page.title,
  page.page_type
);
```

## Integration into Existing Crawler

### Option 1: Direct Integration (Recommended)

Add semantic analysis after saving the page record:

```javascript
import semanticService from './services/semanticService.js';

async function crawlPage(url, crawlSessionId) {
  // 1. Fetch HTML
  const response = await fetch(url);
  const html = await response.text();

  // 2. Extract page data
  const pageData = {
    crawl_session_id: crawlSessionId,
    url: url,
    title: extractTitle(html),
    page_type: classifyPageType(url, html),
    // ... other fields
  };

  // 3. Save page to database
  const { data: page } = await supabase
    .from('pages')
    .insert(pageData)
    .select()
    .single();

  // 4. Run performance metrics (Phase 2)
  try {
    await performanceService.fetchAndSavePerformanceMetrics(
      page.id,
      crawlSessionId,
      url
    );
  } catch (error) {
    console.warn(`Performance metrics failed: ${error.message}`);
  }

  // 5. Run semantic analysis (Phase 3) - ARTICLE PAGES ONLY
  try {
    await semanticService.analyzeAndSaveArticle(
      page.id,
      html,
      page.title,
      page.page_type
    );
  } catch (error) {
    console.warn(`Semantic analysis failed: ${error.message}`);
  }

  return page;
}
```

### Option 2: Post-Crawl Batch Processing

If you prefer to run semantic analysis after the crawl completes:

```javascript
import semanticService from './services/semanticService.js';

async function runSemanticAnalysisForSession(crawlSessionId) {
  // Get all article pages without semantic analysis
  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .eq('crawl_session_id', crawlSessionId)
    .eq('page_type', 'article');

  for (const page of pages) {
    // Check if already analyzed
    const existing = await semanticService.getSemanticAnalysisByPage(page.id);
    if (existing) continue;

    // Re-fetch the HTML if not stored
    const response = await fetch(page.url);
    const html = await response.text();

    // Analyze
    await semanticService.analyzeAndSaveArticle(
      page.id,
      html,
      page.title,
      page.page_type
    );

    // Rate limiting: wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## Configuration

### Required Environment Variable

Add to `.env`:

```env
OPENAI_API_KEY=sk-proj-...
```

### Optional: Model Selection

```env
OPENAI_MODEL=gpt-4o-mini
```

**Cost comparison:**
- `gpt-4o-mini`: $0.150 per 1M input tokens (recommended)
- `gpt-4o`: $2.50 per 1M input tokens
- `gpt-3.5-turbo`: $0.50 per 1M input tokens

### Checking Configuration

```javascript
import semanticService from './services/semanticService.js';

if (semanticService.isOpenAIConfigured()) {
  console.log('✅ OpenAI API configured');
} else {
  console.log('⚠️  OpenAI API not configured, semantic analysis will be skipped');
}
```

## API Endpoints

### GET /api/crawl/session/:sessionId/semantic

Retrieve all semantic analyses for a crawl session (article pages only).

**Response:**
```json
[
  {
    "id": "uuid",
    "page_id": "uuid",
    "intent_type": "informational",
    "entities_json": "[\"OpenAI\", \"GPT-4\", \"Machine Learning\"]",
    "content_depth_score": 85,
    "topical_relevance_score": 92,
    "eeat_score_estimate": 78,
    "created_at": "2024-01-01T00:00:00Z",
    "pages": {
      "id": "uuid",
      "url": "https://example.com/article",
      "title": "Understanding AI",
      "page_type": "article"
    }
  }
]
```

### GET /api/crawl/page/:pageId/semantic

Retrieve semantic analysis for a specific page.

**Response:**
```json
{
  "id": "uuid",
  "page_id": "uuid",
  "intent_type": "informational",
  "entities_json": "[\"OpenAI\", \"GPT-4\"]",
  "content_depth_score": 85,
  "topical_relevance_score": 92,
  "eeat_score_estimate": 78,
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Behavior Details

### What Gets Analyzed

✅ **Analyzed:**
- Pages with `page_type = "article"`
- Pages not previously analyzed
- When OpenAI API key is configured

❌ **Skipped:**
- Non-article pages (homepage, category, pagination, etc.)
- Pages already analyzed in previous crawls
- When OpenAI API key is not configured

### Analysis Metrics

#### Intent Type

- **informational**: Educational content, news articles, how-to guides
- **commercial**: Product reviews, comparisons, buying guides
- **navigational**: Brand pages, about pages, contact pages

#### Entities

Top 10 most important named entities:
- People (e.g., "Elon Musk")
- Organizations (e.g., "OpenAI")
- Locations (e.g., "San Francisco")
- Events (e.g., "World Cup 2024")
- Concepts (e.g., "Machine Learning")

#### Content Depth Score (0-100)

Measures comprehensiveness and thoroughness:
- 0-30: Shallow, thin content
- 31-60: Moderate depth
- 61-85: Good depth
- 86-100: Exceptional depth

#### Topical Relevance Score (0-100)

Measures focus and topic consistency:
- 0-30: Scattered, unfocused
- 31-60: Moderately focused
- 61-85: Well-focused
- 86-100: Laser-focused on single topic

#### E-E-A-T Score Estimate (0-100)

Estimates Experience, Expertise, Authoritativeness, Trustworthiness signals:
- 0-30: Weak signals
- 31-60: Moderate signals
- 61-85: Strong signals
- 86-100: Exceptional signals

## Error Handling

The semantic analysis layer is **completely optional and non-blocking**:

1. ✅ OpenAI API not configured → Skips analysis, logs info
2. ✅ Page not an article → Skips analysis, logs info
3. ✅ Already analyzed → Skips analysis, logs info
4. ✅ API rate limit → Logs warning, returns null
5. ✅ API authentication fails → Logs warning, returns null
6. ✅ Invalid response → Logs warning, returns null
7. ✅ Network error → Logs warning, returns null

**The crawl NEVER fails due to semantic analysis issues.**

## Cost Estimation

### Per Article Analysis

- Input: ~1200 tokens (visible text)
- Output: ~200 tokens (JSON response)
- Total: ~1400 tokens per article

**Cost with gpt-4o-mini:**
- Input: 1200 tokens × $0.150 / 1M = $0.00018
- Output: 200 tokens × $0.600 / 1M = $0.00012
- **Total per article: ~$0.0003 (0.03 cents)**

### Cost Examples

- 100 articles: $0.03
- 1,000 articles: $0.30
- 10,000 articles: $3.00

### Optimization Tips

1. **Use gpt-4o-mini** (already default) - 10x cheaper than gpt-4o
2. **Batch processing** - Analyze only new articles
3. **Caching** - Store results, don't re-analyze
4. **Selective crawling** - Focus on important articles first

## Testing

### Test Semantic Service Directly

```javascript
import semanticService from './services/semanticService.js';

// Test analysis
const html = '<html><body><h1>Test Article</h1><p>Content here...</p></body></html>';
const analysis = await semanticService.analyzeArticleContent(html, 'Test Article');
console.log(analysis);
```

### Test via API

```bash
# Get semantic analyses for a crawl session
curl http://localhost:3001/api/crawl/session/{SESSION_ID}/semantic

# Get semantic analysis for a specific page
curl http://localhost:3001/api/crawl/page/{PAGE_ID}/semantic
```

### Verify OpenAI Configuration

```bash
# Check if OpenAI is configured (via Node.js)
node -e "console.log(process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured')"
```

## Troubleshooting

### All analyses return null

**Possible causes:**
1. OpenAI API key not set
2. Invalid API key
3. No article pages in crawl
4. Pages already analyzed

**Solution:** Check logs for specific error messages

### "OpenAI API authentication failed"

**Cause:** Invalid API key

**Solution:** Verify API key at https://platform.openai.com/api-keys

### "OpenAI API rate limit exceeded"

**Cause:** Too many requests too quickly

**Solution:**
1. Add delays between requests
2. Upgrade OpenAI plan for higher limits
3. Use batch processing instead of real-time

### Semantic analysis is slow

**Cause:** OpenAI API calls add 2-5 seconds per article

**Solutions:**
1. Use post-crawl batch processing
2. Implement parallel processing (advanced)
3. Make semantic analysis optional via feature flag

## Integration with Future Phases

This semantic layer provides the foundation for:

### Phase 4: Anomaly Detection & Google Updates

- Track content depth score changes over time
- Detect significant drops in E-E-A-T signals
- Correlate entity changes with traffic drops
- Identify intent drift

### Phase 5: Competitive Analysis

- Compare E-E-A-T scores across competitors
- Analyze entity coverage gaps
- Benchmark content depth
- Identify intent optimization opportunities

## Notes

- Semantic analyses are stored separately from page data
- Old analyses are NOT deleted when pages are re-crawled
- Time-series analysis is possible using `created_at`
- Entities are stored as JSON for flexible querying
- RLS policies ensure data security
- Analysis focuses on article pages only (most valuable for SEO)
