import { supabase } from '../config/supabase.js';

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function fetchPageSpeedMetrics(url) {
  try {
    const params = new URLSearchParams({
      url: url,
      category: 'performance',
      strategy: 'mobile'
    });

    const apiUrl = process.env.PAGESPEED_API_KEY
      ? `${PSI_API_URL}?${params}&key=${process.env.PAGESPEED_API_KEY}`
      : `${PSI_API_URL}?${params}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('PageSpeed API rate limit exceeded');
      }
      throw new Error(`PageSpeed API error: ${response.status}`);
    }

    const data = await response.json();

    const metrics = data.lighthouseResult?.audits;
    const performanceScore = data.lighthouseResult?.categories?.performance?.score;

    if (!metrics) {
      return null;
    }

    return {
      lcp: metrics['largest-contentful-paint']?.numericValue
        ? (metrics['largest-contentful-paint'].numericValue / 1000).toFixed(3)
        : null,
      cls: metrics['cumulative-layout-shift']?.numericValue
        ? parseFloat(metrics['cumulative-layout-shift'].numericValue.toFixed(3))
        : null,
      inp: metrics['interaction-to-next-paint']?.numericValue
        ? parseFloat(metrics['interaction-to-next-paint'].numericValue.toFixed(0))
        : null,
      ttfb: metrics['server-response-time']?.numericValue
        ? (metrics['server-response-time'].numericValue / 1000).toFixed(3)
        : null,
      performance_score: performanceScore ? Math.round(performanceScore * 100) : null
    };
  } catch (error) {
    console.warn(`⚠️  PageSpeed API failed for ${url}:`, error.message);
    return null;
  }
}

async function savePerformanceMetrics(pageId, crawlSessionId, url, metrics = {}) {
  try {
    const { data, error } = await supabase
      .from('page_performance_metrics')
      .insert({
        page_id: pageId,
        crawl_session_id: crawlSessionId,
        lcp: metrics.lcp || null,
        cls: metrics.cls || null,
        inp: metrics.inp || null,
        ttfb: metrics.ttfb || null,
        performance_score: metrics.performance_score || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving performance metrics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to save performance metrics:', error.message);
    return null;
  }
}

async function getPerformanceMetricsByPage(pageId) {
  try {
    const { data, error } = await supabase
      .from('page_performance_metrics')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching performance metrics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error.message);
    return [];
  }
}

async function getPerformanceMetricsByCrawlSession(crawlSessionId) {
  try {
    const { data, error } = await supabase
      .from('page_performance_metrics')
      .select(`
        *,
        pages (
          url,
          page_type,
          title
        )
      `)
      .eq('crawl_session_id', crawlSessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching crawl session performance metrics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch crawl session performance metrics:', error.message);
    return [];
  }
}

async function deletePerformanceMetricsByPage(pageId) {
  try {
    const { error } = await supabase
      .from('page_performance_metrics')
      .delete()
      .eq('page_id', pageId);

    if (error) {
      console.error('Error deleting performance metrics:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete performance metrics:', error.message);
    return false;
  }
}

async function fetchAndSavePerformanceMetrics(pageId, crawlSessionId, url) {
  try {
    console.log(`   📊 Fetching PageSpeed metrics for: ${url}`);

    const metrics = await fetchPageSpeedMetrics(url);

    if (metrics) {
      const result = await savePerformanceMetrics(pageId, crawlSessionId, url, metrics);

      if (result) {
        console.log(`   ✅ Performance metrics saved (Score: ${metrics.performance_score || 'N/A'})`);
        return result;
      } else {
        console.log(`   ⚠️  Performance metrics fetched but not saved`);
      }
    } else {
      console.log(`   ⚠️  Could not fetch performance metrics, saving null values`);
      await savePerformanceMetrics(pageId, crawlSessionId, url, {});
    }

    return null;
  } catch (error) {
    console.warn(`   ⚠️  Performance metrics error: ${error.message}`);
    await savePerformanceMetrics(pageId, crawlSessionId, url, {});
    return null;
  }
}

export default {
  fetchPageSpeedMetrics,
  savePerformanceMetrics,
  getPerformanceMetricsByPage,
  getPerformanceMetricsByCrawlSession,
  deletePerformanceMetricsByPage,
  fetchAndSavePerformanceMetrics
};
