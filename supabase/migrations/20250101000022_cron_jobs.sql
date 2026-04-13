SELECT cron.schedule('expire-intros', '0 3 * * 0',
  $$ UPDATE public.introductions SET status='expired'
     WHERE status='pending' AND expires_at < NOW() $$);

SELECT cron.schedule('update-startup-counts', '30 0 * * *',
  $$ UPDATE public.startup_applications sa SET
       total_views          = (SELECT COUNT(*) FROM public.profile_views  WHERE startup_id = sa.id),
       total_bookmarks      = (SELECT COUNT(*) FROM public.bookmarks      WHERE startup_id = sa.id),
       total_intros         = (SELECT COUNT(*) FROM public.introductions  WHERE startup_id = sa.id AND status != 'declined'),
       total_deck_downloads = (SELECT COUNT(*) FROM public.deck_downloads WHERE startup_id = sa.id)
     WHERE status = 'approved' $$);

SELECT cron.schedule('cleanup-notifications', '0 4 * * 1',
  $$ DELETE FROM public.notifications WHERE read = true AND created_at < NOW() - INTERVAL '30 days' $$);

SELECT cron.schedule('cleanup-raw-articles', '0 4 * * 0',
  $$ DELETE FROM public.raw_articles WHERE indexed_at < NOW() - INTERVAL '30 days' $$);

SELECT cron.schedule('investor-response-rate', '0 2 * * 0', $$
  UPDATE public.investor_profiles ip SET response_rate = (
    SELECT CASE
      WHEN COUNT(*) FILTER (WHERE status != 'pending')::float / NULLIF(COUNT(*),0) > 0.7 THEN 'High'
      WHEN COUNT(*) FILTER (WHERE status != 'pending')::float / NULLIF(COUNT(*),0) > 0.4 THEN 'Medium'
      ELSE 'Low' END
    FROM public.introductions
    WHERE investor_id = ip.user_id
      AND initiated_at > NOW() - INTERVAL '90 days'
  ) $$);
