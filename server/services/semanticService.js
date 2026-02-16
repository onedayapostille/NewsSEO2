import { supabase } from '../config/supabase.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_INPUT_TOKENS = 1200;

function isOpenAIConfigured() {
  return !!OPENAI_API_KEY;
}

function extractVisibleText(html) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const avgCharsPerToken = 4;
  const maxChars = MAX_INPUT_TOKENS * avgCharsPerToken;

  if (text.length > maxChars) {
    text = text.substring(0, maxChars);
  }

  return text;
}

async function analyzeArticleContent(html, title) {
  if (!isOpenAIConfigured()) {
    console.log('   ⚠️  OpenAI API not configured, skipping semantic analysis');
    return null;
  }

  try {
    const visibleText = extractVisibleText(html);

    if (!visibleText || visibleText.length < 100) {
      console.log('   ⚠️  Insufficient content for semantic analysis');
      return null;
    }

    const prompt = `Analyze this news article and provide a JSON response with the following structure:

{
  "intent_type": "informational|commercial|navigational",
  "entities": ["entity1", "entity2", ...],
  "content_depth_score": 0-100,
  "topical_relevance_score": 0-100,
  "eeat_score_estimate": 0-100
}

Guidelines:
- intent_type: Classify the primary user intent (informational=educational/news, commercial=product/service related, navigational=brand/location search)
- entities: Extract the top 10 most important named entities (people, organizations, locations, events, concepts)
- content_depth_score: Rate the depth and comprehensiveness of the content (0=shallow, 100=very deep and comprehensive)
- topical_relevance_score: Rate how focused the content is on its main topic (0=scattered, 100=highly focused)
- eeat_score_estimate: Estimate the Experience, Expertise, Authoritativeness, and Trustworthiness signals (0=weak signals, 100=strong signals)

Title: ${title || 'Untitled'}

Content: ${visibleText}

Respond ONLY with valid JSON, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO content analysis expert. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('OpenAI API authentication failed');
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const analysis = JSON.parse(content);

    const validIntents = ['informational', 'commercial', 'navigational'];
    if (!validIntents.includes(analysis.intent_type)) {
      analysis.intent_type = 'informational';
    }

    if (!Array.isArray(analysis.entities)) {
      analysis.entities = [];
    }
    analysis.entities = analysis.entities.slice(0, 10);

    analysis.content_depth_score = Math.max(0, Math.min(100, analysis.content_depth_score || 0));
    analysis.topical_relevance_score = Math.max(0, Math.min(100, analysis.topical_relevance_score || 0));
    analysis.eeat_score_estimate = Math.max(0, Math.min(100, analysis.eeat_score_estimate || 0));

    return {
      intent_type: analysis.intent_type,
      entities: analysis.entities,
      content_depth_score: analysis.content_depth_score,
      topical_relevance_score: analysis.topical_relevance_score,
      eeat_score_estimate: analysis.eeat_score_estimate
    };

  } catch (error) {
    console.warn(`   ⚠️  Semantic analysis failed: ${error.message}`);
    return null;
  }
}

async function saveSemanticAnalysis(pageId, analysis) {
  try {
    if (!analysis) {
      return null;
    }

    const { data, error } = await supabase
      .from('page_semantic_analysis')
      .insert({
        page_id: pageId,
        intent_type: analysis.intent_type,
        entities_json: JSON.stringify(analysis.entities),
        content_depth_score: analysis.content_depth_score,
        topical_relevance_score: analysis.topical_relevance_score,
        eeat_score_estimate: analysis.eeat_score_estimate
      })
      .select()
      .single();

    if (error) {
      console.error('   ❌ Failed to save semantic analysis:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('   ❌ Error saving semantic analysis:', error.message);
    return null;
  }
}

async function getSemanticAnalysisByPage(pageId) {
  try {
    const { data, error } = await supabase
      .from('page_semantic_analysis')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching semantic analysis:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch semantic analysis:', error.message);
    return null;
  }
}

async function getSemanticAnalysisByCrawlSession(crawlSessionId) {
  try {
    const { data, error } = await supabase
      .from('page_semantic_analysis')
      .select(`
        *,
        pages!inner (
          id,
          url,
          title,
          page_type,
          crawl_session_id
        )
      `)
      .eq('pages.crawl_session_id', crawlSessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching crawl session semantic analysis:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch crawl session semantic analysis:', error.message);
    return [];
  }
}

async function analyzeAndSaveArticle(pageId, html, title, pageType) {
  if (pageType !== 'article') {
    console.log('   ⏭️  Skipping semantic analysis (not an article page)');
    return null;
  }

  if (!isOpenAIConfigured()) {
    console.log('   ⏭️  Skipping semantic analysis (OpenAI not configured)');
    return null;
  }

  const existingAnalysis = await getSemanticAnalysisByPage(pageId);
  if (existingAnalysis) {
    console.log('   ⏭️  Semantic analysis already exists for this page');
    return existingAnalysis;
  }

  console.log('   🧠 Analyzing article content with OpenAI...');

  const analysis = await analyzeArticleContent(html, title);

  if (analysis) {
    const saved = await saveSemanticAnalysis(pageId, analysis);
    if (saved) {
      console.log(`   ✅ Semantic analysis saved (Intent: ${analysis.intent_type}, Depth: ${analysis.content_depth_score}, E-E-A-T: ${analysis.eeat_score_estimate})`);
      return saved;
    }
  } else {
    console.log('   ⚠️  Semantic analysis could not be performed');
  }

  return null;
}

export default {
  isOpenAIConfigured,
  analyzeArticleContent,
  saveSemanticAnalysis,
  getSemanticAnalysisByPage,
  getSemanticAnalysisByCrawlSession,
  analyzeAndSaveArticle
};
