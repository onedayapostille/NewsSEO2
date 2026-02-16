import express from 'express';
import { supabase } from '../config/supabase.js';
import performanceService from '../services/performanceService.js';
import semanticService from '../services/semanticService.js';

const router = express.Router();

router.post('/start', async (req, res) => {
  try {
    const { website_id, crawl_limit = 10 } = req.body;

    if (!website_id) {
      return res.status(400).json({ error: 'website_id is required' });
    }

    const { data: session, error: sessionError } = await supabase
      .from('crawl_sessions')
      .insert({
        website_id,
        crawl_limit,
        status: 'queued'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    console.log(`🚀 Crawl session ${session.id} queued`);
    console.log(`   Website ID: ${website_id}`);
    console.log(`   Crawl limit: ${crawl_limit}`);

    res.json(session);
  } catch (error) {
    console.error('Error starting crawl:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crawl_sessions')
      .select(`
        *,
        websites (
          domain,
          display_name
        )
      `)
      .eq('id', req.params.sessionId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching crawl session:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId/pages', async (req, res) => {
  try {
    const { page_type } = req.query;
    let query = supabase
      .from('pages')
      .select('*')
      .eq('crawl_session_id', req.params.sessionId)
      .order('created_at', { ascending: false });

    if (page_type) {
      query = query.eq('page_type', page_type);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId/issues', async (req, res) => {
  try {
    const { severity, issue_type } = req.query;
    let query = supabase
      .from('seo_issues')
      .select('*')
      .eq('crawl_session_id', req.params.sessionId)
      .order('severity', { ascending: true });

    if (severity) {
      query = query.eq('severity', severity);
    }
    if (issue_type) {
      query = query.eq('issue_type', issue_type);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const { data: session, error: sessionError } = await supabase
      .from('crawl_sessions')
      .select('*')
      .eq('id', req.params.sessionId)
      .single();

    if (sessionError) throw sessionError;

    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('crawl_session_id', req.params.sessionId);

    if (pagesError) throw pagesError;

    const { data: issues, error: issuesError } = await supabase
      .from('seo_issues')
      .select('*')
      .eq('crawl_session_id', req.params.sessionId);

    if (issuesError) throw issuesError;

    const exportData = {
      session,
      pages: pages || [],
      issues: issues || []
    };

    if (format === 'csv') {
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="crawl-${req.params.sessionId}.csv"`);
      res.send(csvData);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    console.error('Error exporting session:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId/performance', async (req, res) => {
  try {
    const metrics = await performanceService.getPerformanceMetricsByCrawlSession(req.params.sessionId);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId/semantic', async (req, res) => {
  try {
    const analysis = await semanticService.getSemanticAnalysisByCrawlSession(req.params.sessionId);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching semantic analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/page/:pageId/semantic', async (req, res) => {
  try {
    const analysis = await semanticService.getSemanticAnalysisByPage(req.params.pageId);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching page semantic analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

function convertToCSV(data) {
  const pages = data.pages || [];
  if (pages.length === 0) return 'No data';

  const headers = Object.keys(pages[0]).join(',');
  const rows = pages.map(page =>
    Object.values(page).map(val =>
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(',')
  );

  return [headers, ...rows].join('\n');
}

export default router;
