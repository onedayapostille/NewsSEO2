# Phase 4: Monitoring & Change Detection Engine - Implementation Summary

## Overview

Phase 4 adds comprehensive monitoring and change detection capabilities, comparing crawls over time and detecting anomalies in traffic patterns. All detection uses threshold-based logic (no ML/AI).

## Completed Tasks

### ✅ 1. Database Table Created

**Table:** `change_events`

```sql
CREATE TABLE change_events (
  id uuid PRIMARY KEY,
  page_id uuid REFERENCES pages(id),
  crawl_session_id uuid REFERENCES crawl_sessions(id),
  change_type text NOT NULL,
  previous_value text,
  new_value text,
  severity text NOT NULL DEFAULT 'medium',
  detected_at timestamptz DEFAULT now(),
  change_percentage numeric
);
```

**Change Types:**
- `canonical_change` - Canonical URL changed
- `meta_robots_change` - Meta robots tag changed
- `title_change` - Page title changed
- `http_status_change` - HTTP status code changed
- `performance_drop` - Performance score dropped >20%
- `lcp_increase` - Largest Contentful Paint increased >30%
- `cls_increase` - Cumulative Layout Shift increased >30%
- `inp_increase` - Interaction to Next Paint increased >30%
- `traffic_anomaly` - Clicks dropped >30% vs 7-day average
- `content_change` - Significant content change detected

**Severity Levels:**
- `low` - Minor changes, informational
- `medium` - Notable changes requiring attention
- `high` - Significant changes requiring urgent review
- `critical` - Critical changes requiring immediate action

**Features:**
- Indexes on page_id, crawl_session_id, change_type, severity, detected_at
- RLS policies enabled for data security
- Cascade delete when pages/sessions are removed
- Tracks percentage change for metric-based detections

### ✅ 2. Change Detection Service

**File:** `server/services/changeDetectionService.js`

**Core Functions:**

#### `runChangeDetection(currentCrawlSessionId, websiteId)`
Main function to detect all changes between crawls.

**Process:**
1. Finds previous completed crawl session for the website
2. Compares pages by URL between current and previous crawl
3. Detects content changes (canonical, meta robots, title, HTTP status)
4. Detects performance changes (score drops, LCP/CLS increases)
5. Creates change_events records for each detection
6. Returns summary of changes detected

**Detections:**

**Content Changes:**
- Canonical URL change → Severity: HIGH
- Meta robots change → Severity: HIGH
- Title change → Severity: MEDIUM
- HTTP status change → Severity: CRITICAL

**Performance Changes:**
- Performance score drop >20% → Severity: MEDIUM/HIGH
- LCP increase >30% → Severity: LOW/MEDIUM/HIGH
- CLS increase >30% → Severity: LOW/MEDIUM/HIGH

**Detection Thresholds:**
```javascript
Performance Drop:
  > 40% → HIGH
  > 20% → MEDIUM

LCP/CLS Increase:
  > 50% → HIGH
  > 30% → MEDIUM
  < 30% → LOW
```

#### `getChangeEventsByCrawlSession(crawlSessionId)`
Retrieves all change events for a specific crawl session.

#### `getChangeEventsByWebsite(websiteId, limit)`
Retrieves recent change events for a website.

### ✅ 3. Anomaly Detection Service

**File:** `server/services/anomalyDetectionService.js`

**Core Functions:**

#### `runAnomalyDetectionForCrawlSession(crawlSessionId)`
Detects traffic anomalies for all pages in a crawl session.

**Process:**
1. Gets all pages from the crawl session
2. For each page, fetches last 7 days of url_metrics
3. Calculates 7-day average clicks (excluding latest day)
4. Compares latest day clicks to average
5. If drop >30%, creates traffic_anomaly change event

**Detection Logic:**
```javascript
averageClicks = sum(last 6 days) / 6
currentClicks = today's clicks
clicksDrop = ((averageClicks - currentClicks) / averageClicks) * 100

if (clicksDrop > 30%) {
  severity = determineSeverity(clicksDrop)
  createChangeEvent('traffic_anomaly', ...)
}
```

**Severity Determination:**
- Drop ≥50% → CRITICAL
- Drop ≥30% → HIGH
- Drop <30% → MEDIUM

#### `detectTrafficAnomalies(pageId, crawlSessionId)`
Detects traffic anomalies for a specific page.

#### `getAnomaliesByWebsite(websiteId, days)`
Retrieves all traffic anomalies for a website within timeframe.

### ✅ 4. Monitoring API Endpoints

**File:** `server/routes/monitoring.js`

#### `GET /api/monitoring/:websiteId`
Main monitoring dashboard endpoint.

**Response:**
```json
{
  "website": {
    "id": "uuid",
    "domain": "example.com",
    "display_name": "Example News"
  },
  "summary": {
    "total_crawls": 10,
    "total_changes": 45,
    "total_anomalies": 3,
    "total_pages_monitored": 250,
    "changes_by_severity": {
      "critical": 2,
      "high": 8,
      "medium": 20,
      "low": 15
    },
    "changes_by_type": {
      "title_change": 12,
      "canonical_change": 3,
      "performance_drop": 10,
      "lcp_increase": 15,
      "traffic_anomaly": 5
    },
    "critical_issues": 5,
    "high_issues": 13
  },
  "recent_changes": [...],
  "recent_anomalies": [...],
  "recent_crawls": [...]
}
```

**Query Parameters:**
- `days` - Number of days to include (default: 30)

#### `GET /api/monitoring/:websiteId/changes`
Get all changes for a website with filtering.

**Query Parameters:**
- `limit` - Max results (default: 100)
- `change_type` - Filter by change type
- `severity` - Filter by severity

**Response:** Array of change events

#### `GET /api/monitoring/:websiteId/anomalies`
Get all traffic anomalies for a website.

**Query Parameters:**
- `days` - Number of days to include (default: 30)

**Response:** Array of traffic anomaly events

#### `POST /api/monitoring/crawl/:crawlSessionId/detect-changes`
Manually trigger change detection for a crawl session.

**Response:**
```json
{
  "success": true,
  "changes": 12,
  "changesByType": {
    "title_change": 5,
    "performance_drop": 7
  },
  "previousCrawlSession": "uuid"
}
```

#### `POST /api/monitoring/crawl/:crawlSessionId/detect-anomalies`
Manually trigger anomaly detection for a crawl session.

**Response:**
```json
{
  "success": true,
  "anomalies": 3
}
```

#### `GET /api/monitoring/crawl/:crawlSessionId/changes`
Get all changes detected in a specific crawl session.

**Response:** Array of change events

### ✅ 5. Integration with Crawler

**File:** `server/services/crawlerIntegrationExample.js` (updated)

After crawl completes:
```javascript
// Run change detection
try {
  const changeResult = await changeDetectionService.runChangeDetection(
    session.id,
    websiteId
  );
  console.log(`📊 Change detection: ${changeResult.changes} changes detected`);
} catch (error) {
  console.warn(`⚠️  Change detection failed (non-fatal): ${error.message}`);
}

// Run anomaly detection
try {
  const anomalyResult = await anomalyDetectionService.runAnomalyDetectionForCrawlSession(
    session.id
  );
  console.log(`🔔 Anomaly detection: ${anomalyResult.anomalies} anomalies detected`);
} catch (error) {
  console.warn(`⚠️  Anomaly detection failed (non-fatal): ${error.message}`);
}
```

## Detection Thresholds Summary

| Detection Type | Threshold | Severity Logic |
|----------------|-----------|----------------|
| Canonical Change | Any change | HIGH |
| Meta Robots Change | Any change | HIGH |
| Title Change | Any change | MEDIUM |
| HTTP Status Change | Any change | CRITICAL |
| Performance Drop | >20% decrease | ≥40%: HIGH, ≥20%: MEDIUM |
| LCP Increase | >30% increase | ≥50%: HIGH, ≥30%: MEDIUM, <30%: LOW |
| CLS Increase | >30% increase | ≥50%: HIGH, ≥30%: MEDIUM, <30%: LOW |
| Traffic Anomaly | >30% click drop vs 7-day avg | ≥50%: CRITICAL, ≥30%: HIGH |

## Backward Compatibility

✅ **Fully backward compatible:**
- Change detection runs ONLY if previous crawl exists
- If no previous crawl, returns success with message "No previous crawl to compare with"
- All errors are caught and logged as warnings
- Never crashes the crawl process
- Works with existing tables (crawl_sessions, pages, page_performance_metrics, url_metrics)

## Error Handling

The monitoring system is completely optional and non-blocking:

1. ✅ No previous crawl → Skips detection, logs info
2. ✅ No pages found → Skips detection, logs info
3. ✅ No url_metrics data → Skips anomaly detection
4. ✅ API errors → Logs warning, continues
5. ✅ Database errors → Logs warning, continues

**Monitoring never fails the crawl.**

## Use Cases

### 1. Detect Canonical Changes
Monitor for unexpected canonical URL changes that could impact rankings.

### 2. Track Performance Degradation
Detect when Core Web Vitals degrade beyond acceptable thresholds.

### 3. Identify Traffic Drops
Alert when page traffic drops significantly compared to historical averages.

### 4. Monitor Meta Robots Changes
Catch accidental noindex tags or robots changes.

### 5. Track Content Changes
Monitor title changes and content updates.

### 6. Detect Status Code Issues
Immediately alert on pages returning 404, 500, or other error codes.

## Testing

### Test Change Detection

```bash
# Run change detection for a crawl session
curl -X POST http://localhost:3001/api/monitoring/crawl/{CRAWL_SESSION_ID}/detect-changes

# Get changes for a crawl session
curl http://localhost:3001/api/monitoring/crawl/{CRAWL_SESSION_ID}/changes

# Get changes for a website
curl http://localhost:3001/api/monitoring/{WEBSITE_ID}/changes
```

### Test Anomaly Detection

```bash
# Run anomaly detection for a crawl session
curl -X POST http://localhost:3001/api/monitoring/crawl/{CRAWL_SESSION_ID}/detect-anomalies

# Get anomalies for a website
curl http://localhost:3001/api/monitoring/{WEBSITE_ID}/anomalies
```

### Test Monitoring Dashboard

```bash
# Get full monitoring data for a website
curl http://localhost:3001/api/monitoring/{WEBSITE_ID}

# Filter by timeframe
curl http://localhost:3001/api/monitoring/{WEBSITE_ID}?days=7
```

## Files Created

```
server/
├── services/
│   ├── changeDetectionService.js          # Change detection logic
│   ├── anomalyDetectionService.js         # Traffic anomaly detection
│   └── crawlerIntegrationExample.js       # Updated with monitoring
├── routes/
│   └── monitoring.js                      # Monitoring API endpoints
├── index.js                               # Updated with monitoring routes
└── PHASE_4_SUMMARY.md                     # This file

supabase/migrations/
└── [timestamp]_create_change_events.sql
```

## Database Schema

### New Table
- `change_events` (Phase 4)

### Relationships
```
pages (1) -> (many) change_events
crawl_sessions (1) -> (many) change_events
```

### Existing Tables Used
- `crawl_sessions` - To find previous crawl
- `pages` - To compare page attributes
- `page_performance_metrics` - To compare performance
- `url_metrics` - To calculate traffic averages

## Example Workflow

1. **Crawl Completes**
   - Crawl session status set to "completed"

2. **Change Detection Runs** (automatic)
   - Finds previous crawl session
   - Compares pages by URL
   - Detects content and performance changes
   - Creates change_events records

3. **Anomaly Detection Runs** (automatic)
   - Gets all pages from crawl
   - Fetches 7-day url_metrics for each page
   - Calculates averages
   - Detects traffic drops >30%
   - Creates traffic_anomaly events

4. **Dashboard Displays** (on-demand)
   - GET /api/monitoring/:websiteId
   - Shows summary stats
   - Lists recent critical changes
   - Shows traffic anomalies

## Key Design Decisions

1. **Threshold-Based Only**
   - No ML/AI models
   - Simple percentage comparisons
   - Easy to understand and debug

2. **Backward Compatible**
   - Gracefully handles missing data
   - Works with or without previous crawls
   - Never crashes on missing url_metrics

3. **Non-Blocking Architecture**
   - All detections run after crawl completes
   - Errors logged as warnings
   - Never fails the main crawl

4. **Flexible Severity**
   - Dynamic severity based on change magnitude
   - Critical/High/Medium/Low levels
   - Helps prioritize issues

5. **Comprehensive Coverage**
   - Content changes (canonical, meta robots, title)
   - Performance changes (Core Web Vitals)
   - Traffic anomalies (GSC data)
   - HTTP status changes

## Notes

- Change detection compares by URL (exact match)
- Requires at least 2 crawl sessions to detect changes
- Anomaly detection requires at least 2 days of url_metrics data
- All RLS policies configured for security
- Indexes optimize query performance
- Foreign key constraints ensure data integrity
- Dashboard modifications intentionally excluded (as requested)
