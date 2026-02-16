import { supabase } from '../config/supabase.js';
import changeDetectionService from './changeDetectionService.js';

async function getUrlMetricsForPage(pageId, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('url_metrics')
      .select('*')
      .eq('page_id', pageId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching URL metrics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch URL metrics:', error.message);
    return [];
  }
}

async function getUrlMetricsByUrl(url, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('url_metrics')
      .select('*')
      .eq('url', url)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching URL metrics by URL:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch URL metrics by URL:', error.message);
    return [];
  }
}

function calculateAverage(metrics, field) {
  if (!metrics || metrics.length === 0) {
    return 0;
  }

  const sum = metrics.reduce((acc, metric) => acc + (metric[field] || 0), 0);
  return sum / metrics.length;
}

async function detectTrafficAnomalies(pageId, crawlSessionId) {
  try {
    const recentMetrics = await getUrlMetricsForPage(pageId, 7);

    if (recentMetrics.length < 2) {
      return null;
    }

    const latestMetric = recentMetrics[0];
    const previousMetrics = recentMetrics.slice(1);

    const averageClicks = calculateAverage(previousMetrics, 'clicks');
    const currentClicks = latestMetric.clicks || 0;

    if (averageClicks === 0) {
      return null;
    }

    const clicksDrop = ((averageClicks - currentClicks) / averageClicks) * 100;

    if (clicksDrop > 30) {
      const { data: page } = await supabase
        .from('pages')
        .select('id')
        .eq('id', pageId)
        .maybeSingle();

      if (!page) {
        return null;
      }

      const severity = changeDetectionService.determineSeverity('traffic_anomaly', clicksDrop);

      const changeEvent = await changeDetectionService.createChangeEvent(
        pageId,
        crawlSessionId,
        'traffic_anomaly',
        averageClicks.toFixed(2),
        currentClicks.toFixed(2),
        severity,
        clicksDrop.toFixed(2)
      );

      return changeEvent;
    }

    return null;
  } catch (error) {
    console.error('Failed to detect traffic anomalies:', error.message);
    return null;
  }
}

async function detectTrafficAnomaliesByUrl(url, crawlSessionId) {
  try {
    const recentMetrics = await getUrlMetricsByUrl(url, 7);

    if (recentMetrics.length < 2) {
      return null;
    }

    const latestMetric = recentMetrics[0];
    const previousMetrics = recentMetrics.slice(1);

    const averageClicks = calculateAverage(previousMetrics, 'clicks');
    const currentClicks = latestMetric.clicks || 0;

    if (averageClicks === 0) {
      return null;
    }

    const clicksDrop = ((averageClicks - currentClicks) / averageClicks) * 100;

    if (clicksDrop > 30) {
      const { data: page } = await supabase
        .from('pages')
        .select('id')
        .eq('url', url)
        .eq('crawl_session_id', crawlSessionId)
        .maybeSingle();

      if (!page) {
        return null;
      }

      const severity = changeDetectionService.determineSeverity('traffic_anomaly', clicksDrop);

      const changeEvent = await changeDetectionService.createChangeEvent(
        page.id,
        crawlSessionId,
        'traffic_anomaly',
        averageClicks.toFixed(2),
        currentClicks.toFixed(2),
        severity,
        clicksDrop.toFixed(2)
      );

      return changeEvent;
    }

    return null;
  } catch (error) {
    console.error('Failed to detect traffic anomalies by URL:', error.message);
    return null;
  }
}

async function runAnomalyDetectionForCrawlSession(crawlSessionId) {
  try {
    console.log(`\n🔔 Running anomaly detection for crawl session: ${crawlSessionId}`);

    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('id, url')
      .eq('crawl_session_id', crawlSessionId);

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      return { success: false, anomalies: 0 };
    }

    if (!pages || pages.length === 0) {
      console.log('   ℹ️  No pages found for anomaly detection');
      return { success: true, anomalies: 0 };
    }

    let anomaliesDetected = 0;

    for (const page of pages) {
      const anomaly = await detectTrafficAnomalies(page.id, crawlSessionId);
      if (anomaly) {
        anomaliesDetected++;
      }
    }

    console.log(`   ✅ Anomaly detection complete: ${anomaliesDetected} anomalies detected`);

    return {
      success: true,
      anomalies: anomaliesDetected
    };
  } catch (error) {
    console.error('❌ Anomaly detection failed:', error.message);
    return {
      success: false,
      error: error.message,
      anomalies: 0
    };
  }
}

async function getAnomaliesByWebsite(websiteId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('change_events')
      .select(`
        *,
        pages!inner (
          url,
          title,
          crawl_session_id
        ),
        crawl_sessions!inner (
          website_id
        )
      `)
      .eq('crawl_sessions.website_id', websiteId)
      .eq('change_type', 'traffic_anomaly')
      .gte('detected_at', startDate.toISOString())
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('Error fetching anomalies by website:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch anomalies by website:', error.message);
    return [];
  }
}

async function getRecentAnomalies(websiteId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('change_events')
      .select(`
        *,
        pages!inner (
          url,
          title,
          page_type,
          crawl_session_id
        ),
        crawl_sessions!inner (
          website_id
        )
      `)
      .eq('crawl_sessions.website_id', websiteId)
      .eq('change_type', 'traffic_anomaly')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent anomalies:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch recent anomalies:', error.message);
    return [];
  }
}

export default {
  getUrlMetricsForPage,
  getUrlMetricsByUrl,
  calculateAverage,
  detectTrafficAnomalies,
  detectTrafficAnomaliesByUrl,
  runAnomalyDetectionForCrawlSession,
  getAnomaliesByWebsite,
  getRecentAnomalies
};
