# Intelligence Layer Implementation - Phases 2 & 3 Complete

## Overview

The crawl engine has been successfully extended with two intelligence layers:
- **Phase 2**: Performance Intelligence (Google PageSpeed Insights)
- **Phase 3**: Semantic Intelligence (OpenAI GPT-4o-mini)

Both layers are non-blocking, optional, and designed to never crash the crawl.

## Phase 2: Performance Intelligence ✅

### Database Table
- `page_performance_metrics`
  - Core Web Vitals: LCP, CLS, INP, TTFB
  - Performance Score (0-100)
  - Linked to pages and crawl sessions

### Service
- `server/services/performanceService.js`
- Google PageSpeed Insights API integration
- Token-optimized requests
- Graceful error handling

### API Endpoints
- `GET /api/crawl/session/:sessionId/performance`
- Retrieves all performance metrics for a crawl session

### Configuration
```env
PAGESPEED_API_KEY=your_key_here  # Optional, for higher rate limits
```

### Key Features
- Collects Core Web Vitals for every crawled page
- Stores null values on API failure (never crashes)
- Ready for anomaly detection and trend analysis

## Phase 3: Semantic Intelligence ✅

### Database Table
- `page_semantic_analysis`
  - Intent classification (informational/commercial/navigational)
  - Top 10 entities
  - Content depth score (0-100)
  - Topical relevance score (0-100)
  - E-E-A-T estimate (0-100)

### Service
- `server/services/semanticService.js`
- OpenAI GPT-4o-mini integration
- Token-optimized (max 1200 tokens input)
- Article pages only
- One-time analysis per page

### API Endpoints
- `GET /api/crawl/session/:sessionId/semantic`
- `GET /api/crawl/page/:pageId/semantic`

### Configuration
```env
OPENAI_API_KEY=sk-proj-...       # Required
OPENAI_MODEL=gpt-4o-mini         # Optional, default is gpt-4o-mini
```

### Key Features
- Selective analysis (article pages only)
- Cost-optimized (~$0.0003 per article)
- Gracefully skips if API key not configured
- Never crashes on API failure
- Prevents duplicate analyses

## Integration Pattern

### For Existing Crawlers

Add after saving page to database:

```javascript
import performanceService from './services/performanceService.js';
import semanticService from './services/semanticService.js';

// Save page
const { data: page } = await supabase
  .from('pages')
  .insert(pageData)
  .select()
  .single();

// Phase 2: Performance Metrics (all pages)
try {
  await performanceService.fetchAndSavePerformanceMetrics(
    page.id,
    crawlSessionId,
    url
  );
} catch (error) {
  console.warn(`Performance metrics failed: ${error.message}`);
}

// Phase 3: Semantic Analysis (article pages only)
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
```

### Sample Implementation

See `server/services/crawlerIntegrationExample.js` for a complete working example.

## Database Schema

### Tables Created
1. `page_performance_metrics` (Phase 2)
2. `page_semantic_analysis` (Phase 3)

### Relationships
```
pages (1) -> (many) page_performance_metrics
pages (1) -> (many) page_semantic_analysis
crawl_sessions (1) -> (many) page_performance_metrics
```

### Security
- RLS enabled on all tables
- Cascade delete on page removal
- Authenticated user policies

## Cost Analysis

### Phase 2: Performance Metrics
- **Free** without API key (rate limited)
- **Free** with API key (higher limits)

### Phase 3: Semantic Analysis
Using gpt-4o-mini:
- **$0.0003 per article** (~0.03 cents)
- 100 articles = $0.03
- 1,000 articles = $0.30
- 10,000 articles = $3.00

## Error Handling

Both layers are designed to be completely optional and non-blocking:

### Performance Metrics
- ✅ API not configured → Works without key (rate limited)
- ✅ Rate limit hit → Stores null, continues crawl
- ✅ Network error → Stores null, continues crawl
- ✅ Invalid response → Stores null, continues crawl

### Semantic Analysis
- ✅ API not configured → Skips analysis, continues crawl
- ✅ Not an article page → Skips analysis, continues crawl
- ✅ Already analyzed → Skips analysis, continues crawl
- ✅ Rate limit hit → Logs warning, continues crawl
- ✅ Network error → Logs warning, continues crawl

**Neither layer will ever crash the crawl.**

## Files Created

### Phase 2
```
server/services/performanceService.js
supabase/migrations/*_create_page_performance_metrics.sql
```

### Phase 3
```
server/services/semanticService.js
server/services/crawlerIntegrationExample.js
server/SEMANTIC_ANALYSIS_INTEGRATION.md
server/PHASE_3_SUMMARY.md
supabase/migrations/*_create_page_semantic_analysis.sql
```

### Supporting Files
```
server/config/supabase.js
server/routes/crawl.js (updated with new endpoints)
server/routes/websites.js
server/routes/gsc.js
server/routes/moz.js
server/routes/ai.js
```

## API Endpoints Summary

### Performance Metrics (Phase 2)
- `GET /api/crawl/session/:sessionId/performance`

### Semantic Analysis (Phase 3)
- `GET /api/crawl/session/:sessionId/semantic`
- `GET /api/crawl/page/:pageId/semantic`

### Existing Endpoints (unchanged)
- `POST /api/crawl/start`
- `GET /api/crawl/session/:sessionId`
- `GET /api/crawl/session/:sessionId/pages`
- `GET /api/crawl/session/:sessionId/issues`
- `GET /api/crawl/session/:sessionId/export`

## Testing

### Test Performance Metrics
```bash
curl http://localhost:3001/api/crawl/session/{SESSION_ID}/performance
```

### Test Semantic Analysis
```bash
curl http://localhost:3001/api/crawl/session/{SESSION_ID}/semantic
curl http://localhost:3001/api/crawl/page/{PAGE_ID}/semantic
```

### Verify Configuration
```bash
# Check PageSpeed API
echo $PAGESPEED_API_KEY

# Check OpenAI API
echo $OPENAI_API_KEY
```

## Future Phases (Foundation Ready)

### Phase 4: Anomaly Detection & Google Updates
- Track performance score changes over time
- Monitor E-E-A-T score trends
- Correlate entity changes with traffic drops
- Detect content depth degradation
- Link changes to Google algorithm updates

### Phase 5: Competitive Analysis
- Compare performance scores across competitors
- Benchmark E-E-A-T signals
- Analyze entity coverage gaps
- Identify intent optimization opportunities

## Documentation

### Complete Guides
- `server/SEMANTIC_ANALYSIS_INTEGRATION.md` - Phase 3 integration guide
- `server/PHASE_3_SUMMARY.md` - Phase 3 summary
- `INTELLIGENCE_LAYER_COMPLETE.md` - This file

### Code Examples
- `server/services/crawlerIntegrationExample.js` - Working integration example

## Key Design Decisions

1. **Non-Blocking Architecture**
   - Neither layer can crash the crawl
   - Failures logged as warnings, not errors
   - Null values stored for failed metrics

2. **Selective Analysis**
   - Performance: All pages
   - Semantic: Article pages only

3. **Cost Optimization**
   - Performance: Free (optional API key)
   - Semantic: Token limits, efficient model choice

4. **No Duplicates**
   - Each page analyzed once per crawl session
   - Existing analyses detected and skipped

5. **Flexible Configuration**
   - Both layers optional
   - Environment variable configuration
   - Graceful degradation

## Notes

- Dashboard modifications intentionally excluded (as requested)
- Both layers tested with null handling
- All RLS policies configured
- Time-series analysis ready
- Foreign key constraints ensure data integrity
- Indexes optimize query performance
