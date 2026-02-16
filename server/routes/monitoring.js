import express from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import changeDetectionService from '../services/changeDetectionService.js';
import anomalyDetectionService from '../services/anomalyDetectionService.js';

const router = express.Router();

router.get('/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { days = 30 } = req.query;

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (websiteError) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data: recentCrawls, error: crawlsError } = await supabase
      .from('crawl_sessions')
      .select('*')
      .eq('website_id', websiteId)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (crawlsError) throw crawlsError;

    const recentChanges = await changeDetectionService.getChangeEventsByWebsite(websiteId, 100);

    const recentAnomalies = await anomalyDetectionService.getRecentAnomalies(websiteId, 50);

    const changeBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const changeByType = {};

    recentChanges.forEach(change => {
      changeBySeverity[change.severity] = (changeBySeverity[change.severity] || 0) + 1;
      changeByType[change.change_type] = (changeByType[change.change_type] || 0) + 1;
    });

    const { data: totalPages, error: pagesError } = await supabase
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .in('crawl_session_id', recentCrawls.map(c => c.id));

    const pageCount = totalPages ? totalPages.length : 0;

    const summaryStats = {
      total_crawls: recentCrawls.length,
      total_changes: recentChanges.length,
      total_anomalies: recentAnomalies.length,
      total_pages_monitored: pageCount,
      changes_by_severity: changeBySeverity,
      changes_by_type: changeByType,
      critical_issues: changeBySeverity.critical + recentAnomalies.filter(a => a.severity === 'critical').length,
      high_issues: changeBySeverity.high + recentAnomalies.filter(a => a.severity === 'high').length
    };

    const recentCriticalChanges = recentChanges
      .filter(change => change.severity === 'critical' || change.severity === 'high')
      .slice(0, 20);

    res.json({
      website: {
        id: website.id,
        domain: website.domain,
        display_name: website.display_name
      },
      summary: summaryStats,
      recent_changes: recentCriticalChanges,
      recent_anomalies: recentAnomalies.slice(0, 20),
      recent_crawls: recentCrawls.slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:websiteId/changes', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { limit = 100, change_type, severity } = req.query;

    let changes = await changeDetectionService.getChangeEventsByWebsite(websiteId, parseInt(limit));

    if (change_type) {
      changes = changes.filter(c => c.change_type === change_type);
    }

    if (severity) {
      changes = changes.filter(c => c.severity === severity);
    }

    res.json(changes);
  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:websiteId/anomalies', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { days = 30 } = req.query;

    const anomalies = await anomalyDetectionService.getAnomaliesByWebsite(websiteId, parseInt(days));

    res.json(anomalies);
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/crawl/:crawlSessionId/detect-changes', async (req, res) => {
  try {
    const { crawlSessionId } = req.params;

    const { data: crawlSession, error: sessionError } = await supabase
      .from('crawl_sessions')
      .select('*')
      .eq('id', crawlSessionId)
      .single();

    if (sessionError) {
      return res.status(404).json({ error: 'Crawl session not found' });
    }

    const result = await changeDetectionService.runChangeDetection(
      crawlSessionId,
      crawlSession.website_id
    );

    res.json(result);
  } catch (error) {
    console.error('Error running change detection:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/crawl/:crawlSessionId/detect-anomalies', async (req, res) => {
  try {
    const { crawlSessionId } = req.params;

    const { data: crawlSession, error: sessionError } = await supabase
      .from('crawl_sessions')
      .select('*')
      .eq('id', crawlSessionId)
      .single();

    if (sessionError) {
      return res.status(404).json({ error: 'Crawl session not found' });
    }

    const result = await anomalyDetectionService.runAnomalyDetectionForCrawlSession(crawlSessionId);

    res.json(result);
  } catch (error) {
    console.error('Error running anomaly detection:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/crawl/:crawlSessionId/changes', async (req, res) => {
  try {
    const { crawlSessionId } = req.params;

    const changes = await changeDetectionService.getChangeEventsByCrawlSession(crawlSessionId);

    res.json(changes);
  } catch (error) {
    console.error('Error fetching crawl session changes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
