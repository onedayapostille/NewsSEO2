# Monitoring & Change Detection - Quick Start Guide

## Overview

The monitoring system automatically tracks changes between crawls and detects traffic anomalies using threshold-based logic.

## Automatic Execution

Change detection and anomaly detection run **automatically** after each crawl completes:

```javascript
// This happens automatically in crawlerIntegrationExample.js

// 1. Crawl completes
await supabase.from('crawl_sessions').update({ status: 'completed' }).eq('id', sessionId);

// 2. Change detection runs automatically
const changeResult = await changeDetectionService.runChangeDetection(sessionId, websiteId);
// Output: "📊 Change detection: 12 changes detected"

// 3. Anomaly detection runs automatically
const anomalyResult = await anomalyDetectionService.runAnomalyDetectionForCrawlSession(sessionId);
// Output: "🔔 Anomaly detection: 3 anomalies detected"
```

## What Gets Detected

### Content Changes
- ✅ Canonical URL changes
- ✅ Meta robots tag changes
- ✅ Title changes
- ✅ HTTP status code changes

### Performance Changes
- ✅ Performance score drops >20%
- ✅ LCP increases >30%
- ✅ CLS increases >30%

### Traffic Anomalies
- ✅ Click drops >30% vs 7-day average

## Viewing Results

### Dashboard - Get Everything for a Website

```bash
GET /api/monitoring/:websiteId
```

**Response:**
```json
{
  "website": {
    "id": "uuid",
    "domain": "example.com"
  },
  "summary": {
    "total_changes": 45,
    "total_anomalies": 3,
    "critical_issues": 5,
    "high_issues": 13,
    "changes_by_type": {
      "title_change": 12,
      "performance_drop": 10,
      "traffic_anomaly": 5
    }
  },
  "recent_changes": [...],
  "recent_anomalies": [...]
}
```

### Get All Changes

```bash
GET /api/monitoring/:websiteId/changes
```

**Filters:**
- `?limit=100` - Max results
- `?change_type=performance_drop` - Filter by type
- `?severity=critical` - Filter by severity

### Get Traffic Anomalies Only

```bash
GET /api/monitoring/:websiteId/anomalies
```

**Filters:**
- `?days=7` - Last N days

### Get Changes for Specific Crawl

```bash
GET /api/monitoring/crawl/:crawlSessionId/changes
```

## Manual Execution

Trigger detection manually if needed:

### Manually Detect Changes

```bash
POST /api/monitoring/crawl/:crawlSessionId/detect-changes
```

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

### Manually Detect Anomalies

```bash
POST /api/monitoring/crawl/:crawlSessionId/detect-anomalies
```

**Response:**
```json
{
  "success": true,
  "anomalies": 3
}
```

## Severity Levels

### Critical 🔴
- HTTP status changes (404, 500, etc.)
- Traffic drops ≥50%

**Action:** Immediate attention required

### High 🟠
- Canonical URL changes
- Meta robots changes
- Performance drops ≥40%
- Traffic drops ≥30%

**Action:** Review urgently

### Medium 🟡
- Title changes
- Performance drops ≥20%
- LCP/CLS increases ≥30%

**Action:** Review soon

### Low 🟢
- Minor LCP/CLS increases <30%

**Action:** Monitor

## Change Types Reference

| Change Type | Description | Typical Severity |
|-------------|-------------|------------------|
| `canonical_change` | Canonical URL modified | HIGH |
| `meta_robots_change` | Meta robots tag changed | HIGH |
| `title_change` | Page title changed | MEDIUM |
| `http_status_change` | Status code changed | CRITICAL |
| `performance_drop` | Performance score dropped | MEDIUM/HIGH |
| `lcp_increase` | LCP worsened | LOW/MEDIUM/HIGH |
| `cls_increase` | CLS worsened | LOW/MEDIUM/HIGH |
| `traffic_anomaly` | Traffic dropped significantly | HIGH/CRITICAL |

## Thresholds

### Performance Drop
- **Trigger:** Performance score drops >20%
- **High Severity:** Drop ≥40%
- **Medium Severity:** Drop ≥20%

### LCP Increase
- **Trigger:** LCP increases >30%
- **High Severity:** Increase ≥50%
- **Medium Severity:** Increase ≥30%
- **Low Severity:** Increase <30%

### CLS Increase
- **Trigger:** CLS increases >30%
- **High Severity:** Increase ≥50%
- **Medium Severity:** Increase ≥30%
- **Low Severity:** Increase <30%

### Traffic Anomaly
- **Trigger:** Clicks drop >30% vs 7-day average
- **Critical Severity:** Drop ≥50%
- **High Severity:** Drop ≥30%

## Requirements

### For Change Detection
- At least 2 completed crawl sessions for the same website
- Pages must have matching URLs

### For Anomaly Detection
- At least 2 days of url_metrics data
- Clicks data populated from GSC

## Example Workflow

### 1. First Crawl
```bash
POST /api/crawl/start
{
  "website_id": "uuid",
  "crawl_limit": 50
}
```

**Result:** No change detection (no previous crawl to compare)

### 2. Second Crawl
```bash
POST /api/crawl/start
{
  "website_id": "uuid",
  "crawl_limit": 50
}
```

**Result:**
- Change detection runs automatically
- Compares with first crawl
- Detects 12 title changes, 3 performance drops
- Creates change_events records

### 3. View Results
```bash
GET /api/monitoring/{website_id}
```

**Result:**
- Shows all detected changes
- Summary stats by severity
- Recent critical issues highlighted

### 4. Filter Critical Issues
```bash
GET /api/monitoring/{website_id}/changes?severity=critical
```

**Result:** Only critical changes returned

## Common Use Cases

### 1. Monitor Production Deployment

After deploying code changes:

1. Run crawl
2. Check monitoring dashboard
3. Look for:
   - Performance drops
   - Status code changes
   - Canonical changes

### 2. Track Traffic Impact

After content updates:

1. Wait 7 days for traffic data
2. Run crawl
3. Check anomalies endpoint
4. Review traffic drops

### 3. Detect Accidental Changes

Regular monitoring:

1. Schedule daily/weekly crawls
2. Monitor dashboard for critical issues
3. Alert on HIGH/CRITICAL severity
4. Investigate and fix

### 4. Compare Before/After

For specific changes:

1. Run crawl before change
2. Make change
3. Run crawl after change
4. Compare via monitoring API
5. Analyze impact

## Integration with Alerts (Future)

The monitoring system provides the foundation for alerting:

```javascript
// Example: Email on critical changes
const { summary } = await fetch(`/api/monitoring/${websiteId}`).then(r => r.json());

if (summary.critical_issues > 0) {
  sendEmail({
    subject: `⚠️ ${summary.critical_issues} Critical Issues Detected`,
    body: `Check dashboard: ${dashboardUrl}`
  });
}
```

## Troubleshooting

### No Changes Detected

**Possible causes:**
1. First crawl (no previous crawl to compare)
2. No actual changes between crawls
3. URLs don't match exactly

**Solution:** Check crawl_sessions table for previous completed crawls

### No Anomalies Detected

**Possible causes:**
1. No url_metrics data
2. Less than 2 days of data
3. No significant traffic drops

**Solution:** Verify url_metrics table has data

### Detection Didn't Run

**Possible causes:**
1. Crawl didn't complete successfully
2. Error in detection service

**Solution:** Check server logs for errors

## Best Practices

1. **Run Regular Crawls**
   - Daily for active sites
   - Weekly for stable sites

2. **Monitor Critical Severity**
   - Set up alerts for CRITICAL changes
   - Review HIGH severity daily

3. **Review Medium Changes**
   - Weekly review of MEDIUM changes
   - Look for patterns

4. **Track Trends**
   - Export data regularly
   - Compare month-over-month

5. **Investigate Quickly**
   - Address CRITICAL within 24 hours
   - Address HIGH within 48 hours

## API Response Examples

### Change Event Object

```json
{
  "id": "uuid",
  "page_id": "uuid",
  "crawl_session_id": "uuid",
  "change_type": "performance_drop",
  "previous_value": "85",
  "new_value": "62",
  "severity": "high",
  "change_percentage": "27.06",
  "detected_at": "2024-01-15T10:30:00Z",
  "pages": {
    "url": "https://example.com/article",
    "title": "Breaking News",
    "page_type": "article"
  }
}
```

### Anomaly Event Object

```json
{
  "id": "uuid",
  "page_id": "uuid",
  "crawl_session_id": "uuid",
  "change_type": "traffic_anomaly",
  "previous_value": "1250.00",
  "new_value": "750.00",
  "severity": "high",
  "change_percentage": "40.00",
  "detected_at": "2024-01-15T10:30:00Z",
  "pages": {
    "url": "https://example.com/article",
    "title": "Popular Article"
  }
}
```

## Notes

- Change detection is backward compatible (works without previous crawls)
- Anomaly detection requires GSC data (url_metrics table)
- All detections are non-blocking (never crash the crawl)
- Threshold values can be adjusted in service files
- No ML/AI used - simple percentage comparisons
