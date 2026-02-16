import { supabase } from '../config/supabase.js';

async function getPreviousCrawlSession(websiteId, currentCrawlSessionId) {
  try {
    const { data, error } = await supabase
      .from('crawl_sessions')
      .select('*')
      .eq('website_id', websiteId)
      .neq('id', currentCrawlSessionId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching previous crawl session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch previous crawl session:', error.message);
    return null;
  }
}

async function getPagesByUrl(crawlSessionId) {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('crawl_session_id', crawlSessionId);

    if (error) {
      console.error('Error fetching pages:', error);
      return [];
    }

    const pageMap = new Map();
    (data || []).forEach(page => {
      pageMap.set(page.url, page);
    });

    return pageMap;
  } catch (error) {
    console.error('Failed to fetch pages:', error.message);
    return new Map();
  }
}

async function getPerformanceMetrics(pageId) {
  try {
    const { data, error } = await supabase
      .from('page_performance_metrics')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching performance metrics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error.message);
    return null;
  }
}

async function createChangeEvent(pageId, crawlSessionId, changeType, previousValue, newValue, severity, changePercentage = null) {
  try {
    const { data, error } = await supabase
      .from('change_events')
      .insert({
        page_id: pageId,
        crawl_session_id: crawlSessionId,
        change_type: changeType,
        previous_value: previousValue,
        new_value: newValue,
        severity: severity,
        change_percentage: changePercentage
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating change event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to create change event:', error.message);
    return null;
  }
}

function determineSeverity(changeType, changePercentage) {
  if (changeType === 'meta_robots_change' || changeType === 'canonical_change') {
    return 'high';
  }

  if (changeType === 'http_status_change') {
    return 'critical';
  }

  if (changeType === 'traffic_anomaly') {
    if (changePercentage && Math.abs(changePercentage) >= 50) {
      return 'critical';
    }
    if (changePercentage && Math.abs(changePercentage) >= 30) {
      return 'high';
    }
    return 'medium';
  }

  if (changeType === 'performance_drop') {
    if (changePercentage && Math.abs(changePercentage) >= 40) {
      return 'high';
    }
    return 'medium';
  }

  if (changeType === 'lcp_increase' || changeType === 'cls_increase') {
    if (changePercentage && changePercentage >= 50) {
      return 'high';
    }
    if (changePercentage && changePercentage >= 30) {
      return 'medium';
    }
    return 'low';
  }

  if (changeType === 'title_change') {
    return 'medium';
  }

  return 'low';
}

async function detectPageChanges(currentPage, previousPage, currentCrawlSessionId) {
  const changes = [];

  if (!currentPage || !previousPage) {
    return changes;
  }

  if (currentPage.canonical_url !== previousPage.canonical_url) {
    const severity = determineSeverity('canonical_change');
    const changeEvent = await createChangeEvent(
      currentPage.id,
      currentCrawlSessionId,
      'canonical_change',
      previousPage.canonical_url || 'none',
      currentPage.canonical_url || 'none',
      severity
    );
    if (changeEvent) changes.push(changeEvent);
  }

  if (currentPage.meta_robots !== previousPage.meta_robots) {
    const severity = determineSeverity('meta_robots_change');
    const changeEvent = await createChangeEvent(
      currentPage.id,
      currentCrawlSessionId,
      'meta_robots_change',
      previousPage.meta_robots || 'none',
      currentPage.meta_robots || 'none',
      severity
    );
    if (changeEvent) changes.push(changeEvent);
  }

  if (currentPage.title !== previousPage.title && currentPage.title && previousPage.title) {
    const severity = determineSeverity('title_change');
    const changeEvent = await createChangeEvent(
      currentPage.id,
      currentCrawlSessionId,
      'title_change',
      previousPage.title.substring(0, 200),
      currentPage.title.substring(0, 200),
      severity
    );
    if (changeEvent) changes.push(changeEvent);
  }

  if (currentPage.http_status !== previousPage.http_status) {
    const severity = determineSeverity('http_status_change');
    const changeEvent = await createChangeEvent(
      currentPage.id,
      currentCrawlSessionId,
      'http_status_change',
      String(previousPage.http_status || 'unknown'),
      String(currentPage.http_status || 'unknown'),
      severity
    );
    if (changeEvent) changes.push(changeEvent);
  }

  return changes;
}

async function detectPerformanceChanges(currentPage, previousPage, currentCrawlSessionId) {
  const changes = [];

  if (!currentPage || !previousPage) {
    return changes;
  }

  const currentMetrics = await getPerformanceMetrics(currentPage.id);
  const previousMetrics = await getPerformanceMetrics(previousPage.id);

  if (!currentMetrics || !previousMetrics) {
    return changes;
  }

  if (currentMetrics.performance_score !== null && previousMetrics.performance_score !== null) {
    const scoreDrop = previousMetrics.performance_score - currentMetrics.performance_score;
    const percentageChange = (scoreDrop / previousMetrics.performance_score) * 100;

    if (percentageChange > 20) {
      const severity = determineSeverity('performance_drop', percentageChange);
      const changeEvent = await createChangeEvent(
        currentPage.id,
        currentCrawlSessionId,
        'performance_drop',
        String(previousMetrics.performance_score),
        String(currentMetrics.performance_score),
        severity,
        percentageChange.toFixed(2)
      );
      if (changeEvent) changes.push(changeEvent);
    }
  }

  if (currentMetrics.lcp !== null && previousMetrics.lcp !== null) {
    const lcpIncrease = ((currentMetrics.lcp - previousMetrics.lcp) / previousMetrics.lcp) * 100;

    if (lcpIncrease > 30) {
      const severity = determineSeverity('lcp_increase', lcpIncrease);
      const changeEvent = await createChangeEvent(
        currentPage.id,
        currentCrawlSessionId,
        'lcp_increase',
        String(previousMetrics.lcp),
        String(currentMetrics.lcp),
        severity,
        lcpIncrease.toFixed(2)
      );
      if (changeEvent) changes.push(changeEvent);
    }
  }

  if (currentMetrics.cls !== null && previousMetrics.cls !== null) {
    const clsIncrease = ((currentMetrics.cls - previousMetrics.cls) / previousMetrics.cls) * 100;

    if (clsIncrease > 30) {
      const severity = determineSeverity('cls_increase', clsIncrease);
      const changeEvent = await createChangeEvent(
        currentPage.id,
        currentCrawlSessionId,
        'cls_increase',
        String(previousMetrics.cls),
        String(currentMetrics.cls),
        severity,
        clsIncrease.toFixed(2)
      );
      if (changeEvent) changes.push(changeEvent);
    }
  }

  return changes;
}

async function runChangeDetection(currentCrawlSessionId, websiteId) {
  try {
    console.log(`\n🔍 Running change detection for crawl session: ${currentCrawlSessionId}`);

    const previousCrawlSession = await getPreviousCrawlSession(websiteId, currentCrawlSessionId);

    if (!previousCrawlSession) {
      console.log('   ℹ️  No previous crawl session found, skipping change detection');
      return {
        success: true,
        changes: [],
        message: 'No previous crawl to compare with'
      };
    }

    console.log(`   📊 Comparing with previous crawl: ${previousCrawlSession.id}`);

    const currentPages = await getPagesByUrl(currentCrawlSessionId);
    const previousPages = await getPagesByUrl(previousCrawlSession.id);

    let totalChanges = 0;
    const changesByType = {};

    for (const [url, currentPage] of currentPages) {
      const previousPage = previousPages.get(url);

      if (!previousPage) {
        continue;
      }

      const pageChanges = await detectPageChanges(currentPage, previousPage, currentCrawlSessionId);
      const performanceChanges = await detectPerformanceChanges(currentPage, previousPage, currentCrawlSessionId);

      const allChanges = [...pageChanges, ...performanceChanges];

      allChanges.forEach(change => {
        totalChanges++;
        changesByType[change.change_type] = (changesByType[change.change_type] || 0) + 1;
      });
    }

    console.log(`   ✅ Change detection complete: ${totalChanges} changes detected`);

    if (totalChanges > 0) {
      console.log('   📋 Changes by type:');
      Object.entries(changesByType).forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}`);
      });
    }

    return {
      success: true,
      changes: totalChanges,
      changesByType: changesByType,
      previousCrawlSession: previousCrawlSession.id
    };
  } catch (error) {
    console.error('❌ Change detection failed:', error.message);
    return {
      success: false,
      error: error.message,
      changes: 0
    };
  }
}

async function getChangeEventsByCrawlSession(crawlSessionId) {
  try {
    const { data, error } = await supabase
      .from('change_events')
      .select(`
        *,
        pages (
          url,
          title,
          page_type
        )
      `)
      .eq('crawl_session_id', crawlSessionId)
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('Error fetching change events:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch change events:', error.message);
    return [];
  }
}

async function getChangeEventsByWebsite(websiteId, limit = 100) {
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
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching change events by website:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch change events by website:', error.message);
    return [];
  }
}

export default {
  getPreviousCrawlSession,
  detectPageChanges,
  detectPerformanceChanges,
  runChangeDetection,
  createChangeEvent,
  getChangeEventsByCrawlSession,
  getChangeEventsByWebsite,
  determineSeverity
};
