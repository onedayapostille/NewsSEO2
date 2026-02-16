import express from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = express.Router();

router.get('/data/:websiteId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('moz_data')
      .select('*')
      .eq('website_id', req.params.websiteId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || null);
  } catch (error) {
    console.error('Error fetching Moz data:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/fetch/:websiteId', async (req, res) => {
  try {
    res.status(501).json({
      error: 'Moz integration not yet implemented',
      message: 'This endpoint will fetch data from Moz API'
    });
  } catch (error) {
    console.error('Error fetching Moz data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
