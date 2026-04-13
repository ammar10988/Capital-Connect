import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { NewsArticle } from '../types';

export function useNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (category?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('news_articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(30);
      if (category) query = query.eq('category', category);
      const { data, error: err } = await query;
      if (err) throw err;
      setArticles(data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

  return { articles, loading, error, fetchNews };
}
