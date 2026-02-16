import { supabase } from '../config/supabase.js';
import performanceService from './performanceService.js';
import semanticService from './semanticService.js';
import changeDetectionService from './changeDetectionService.js';
import anomalyDetectionService from './anomalyDetectionService.js';

async function crawlPageWithIntelligence(url, crawlSessionId) {
  try {
    console.log(`   🔍 Crawling: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsSeoCrawler/1.0)'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });

    const html = await response.text();

    const pageData = {
      crawl_session_id: crawlSessionId,
      url: url,
      http_status: response.status,
      title: extractTitle(html),
      title_length: extractTitle(html)?.length || 0,
      page_type: classifyPageType(url, html),
      word_count: countWords(html),
      h1_tags: JSON.stringify(extractH1Tags(html)),
      h1_count: extractH1Tags(html).length
    };

    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert(pageData)
      .select()
      .single();

    if (pageError) {
      console.error('   ❌ Failed to save page:', pageError.message);
      return null;
    }

    console.log(`   ✅ Page saved (ID: ${page.id}, Type: ${page.page_type})`);

    try {
      await performanceService.fetchAndSavePerformanceMetrics(
        page.id,
        crawlSessionId,
        url
      );
    } catch (perfError) {
      console.warn(`   ⚠️  Performance metrics failed (non-fatal): ${perfError.message}`);
    }

    try {
      await semanticService.analyzeAndSaveArticle(
        page.id,
        html,
        page.title,
        page.page_type
      );
    } catch (semError) {
      console.warn(`   ⚠️  Semantic analysis failed (non-fatal): ${semError.message}`);
    }

    return page;
  } catch (error) {
    console.error(`   ❌ Crawl error for ${url}:`, error.message);

    try {
      const { data: page } = await supabase
        .from('pages')
        .insert({
          crawl_session_id: crawlSessionId,
          url: url,
          crawl_error: error.message
        })
        .select()
        .single();

      if (page) {
        await performanceService.savePerformanceMetrics(page.id, crawlSessionId, url, {});
      }
    } catch (saveError) {
      console.error(`   ❌ Failed to save error page:`, saveError.message);
    }

    return null;
  }
}

async function startIntelligentCrawl(websiteId, crawlLimit = 10) {
  try {
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (websiteError) throw websiteError;

    const { data: session, error: sessionError } = await supabase
      .from('crawl_sessions')
      .insert({
        website_id: websiteId,
        crawl_limit: crawlLimit,
        status: 'running'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    console.log(`\n🚀 Starting intelligent crawl session: ${session.id}`);
    console.log(`   Website: ${website.domain}`);
    console.log(`   Limit: ${crawlLimit} pages`);
    console.log(`   Performance Metrics: ${performanceService ? 'Enabled' : 'Disabled'}`);
    console.log(`   Semantic Analysis: ${semanticService.isOpenAIConfigured() ? 'Enabled (articles only)' : 'Disabled'}`);

    const baseUrl = website.domain.startsWith('http')
      ? website.domain
      : `https://${website.domain}`;

    const urlsToCrawl = [baseUrl];
    const crawledUrls = new Set();
    let pagesCrawled = 0;
    let pagesFailed = 0;

    while (urlsToCrawl.length > 0 && pagesCrawled < crawlLimit) {
      const url = urlsToCrawl.shift();

      if (crawledUrls.has(url)) continue;
      crawledUrls.add(url);

      const page = await crawlPageWithIntelligence(url, session.id);

      if (page) {
        pagesCrawled++;
      } else {
        pagesFailed++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await supabase
      .from('crawl_sessions')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        pages_crawled: pagesCrawled,
        pages_failed: pagesFailed
      })
      .eq('id', session.id);

    console.log(`\n✅ Intelligent crawl session completed: ${session.id}`);
    console.log(`   Pages crawled: ${pagesCrawled}`);
    console.log(`   Pages failed: ${pagesFailed}`);

    try {
      const changeResult = await changeDetectionService.runChangeDetection(session.id, websiteId);
      console.log(`   📊 Change detection: ${changeResult.changes} changes detected`);
    } catch (changeError) {
      console.warn(`   ⚠️  Change detection failed (non-fatal): ${changeError.message}`);
    }

    try {
      const anomalyResult = await anomalyDetectionService.runAnomalyDetectionForCrawlSession(session.id);
      console.log(`   🔔 Anomaly detection: ${anomalyResult.anomalies} anomalies detected`);
    } catch (anomalyError) {
      console.warn(`   ⚠️  Anomaly detection failed (non-fatal): ${anomalyError.message}`);
    }

    return session;
  } catch (error) {
    console.error('Intelligent crawl error:', error);
    throw error;
  }
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractH1Tags(html) {
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
  if (!h1Matches) return [];
  return h1Matches.map(h1 => h1.replace(/<\/?h1[^>]*>/gi, '').trim());
}

function countWords(html) {
  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.split(/\s+/).length;
}

function classifyPageType(url, html) {
  if (url.includes('/article/') || url.includes('/news/') || url.includes('/blog/')) {
    return 'article';
  }
  if (url.includes('/category/') || url.includes('/section/')) {
    return 'category';
  }
  if (url.includes('/page/') || url.includes('?page=')) {
    return 'pagination';
  }
  if (url.includes('/search') || url.includes('?s=') || url.includes('?q=')) {
    return 'search';
  }
  if (url.includes('/tag/') || url.includes('/topic/')) {
    return 'tag';
  }
  if (url.includes('/amp/') || url.endsWith('/amp')) {
    return 'amp';
  }

  const pathParts = new URL(url).pathname.split('/').filter(p => p);
  if (pathParts.length === 0) {
    return 'homepage';
  }

  return 'unknown';
}

export default {
  crawlPageWithIntelligence,
  startIntelligentCrawl
};
