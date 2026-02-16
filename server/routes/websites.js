import express from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = express.Router();

// Middleware to check database availability
const checkDb = (req, res, next) => {
  if (!isSupabaseConfigured || !supabase) {
    return res.status(503).json({ 
      error: 'Database not configured',
      message: 'Supabase environment variables are not set'
    });
  }
  next();
};

router.get('/', checkDb, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', checkDb, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching website:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', checkDb, async (req, res) => {
  try {
    const { domain, display_name } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const { data, error } = await supabase
      .from('websites')
      .insert({ domain, display_name: display_name || domain })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating website:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', checkDb, async (req, res) => {
  try {
    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get crawl sessions for a specific website
router.get('/:id/sessions', checkDb, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crawl_sessions')
      .select('*')
      .eq('website_id', req.params.id)
      .order('started_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching crawl sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
