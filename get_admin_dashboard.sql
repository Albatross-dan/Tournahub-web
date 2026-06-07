-- Fix for Admin Dashboard RPC function with correct aggregations
CREATE OR REPLACE FUNCTION public.get_admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users bigint;
  v_active_users bigint;
  v_banned_users bigint;
  v_suspended_users bigint;
  v_new_today bigint;
  v_new_this_week bigint;
  
  v_total_tournaments bigint;
  v_ongoing_tournaments bigint;
  v_completed_tournaments bigint;
  v_total_prize_pool numeric;
  
  v_total_matches bigint;
  v_pending_verifications bigint;
  
  v_total_platform_revenue numeric;
  v_thirty_day_revenue numeric;
  
  v_disputed_matches bigint;
  v_awaiting_disputes bigint;
  v_no_shows bigint;
  v_abandoned_matches bigint;
  
  v_recent_notifications jsonb;
  v_recent_actions jsonb;
BEGIN
  -- Users Stats
  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_active_users FROM public.profiles WHERE status = 'active' OR status IS NULL;
  SELECT count(*) INTO v_banned_users FROM public.profiles WHERE status = 'banned';
  SELECT count(*) INTO v_suspended_users FROM public.profiles WHERE status = 'suspended';
  SELECT count(*) INTO v_new_today FROM public.profiles WHERE created_at >= (now() - interval '1 day');
  SELECT count(*) INTO v_new_this_week FROM public.profiles WHERE created_at >= (now() - interval '7 days');

  -- Tournaments Stats
  SELECT count(*) INTO v_total_tournaments FROM public.tournaments;
  SELECT count(*) INTO v_ongoing_tournaments FROM public.tournaments WHERE status = 'ongoing';
  SELECT count(*) INTO v_completed_tournaments FROM public.tournaments WHERE status = 'completed';
  SELECT coalesce(sum(prize_pool), 0) INTO v_total_prize_pool FROM public.tournaments;

  -- Matches Stats
  SELECT count(*) INTO v_total_matches FROM public.matches;
  SELECT count(*) INTO v_pending_verifications FROM public.match_results WHERE status = 'submitted';

  -- Financial Stats
  SELECT coalesce(sum(amount_usd), 0) INTO v_total_platform_revenue 
  FROM public.platform_revenue 
  WHERE status = 'completed';
  
  SELECT coalesce(sum(amount_usd), 0) INTO v_thirty_day_revenue 
  FROM public.platform_revenue 
  WHERE status = 'completed' AND created_at >= (now() - interval '30 days');

  -- Disputes Stats
  SELECT count(*) INTO v_disputed_matches FROM public.matches WHERE status = 'disputed';
  
  SELECT count(*) INTO v_awaiting_disputes 
  FROM public.matches 
  WHERE status = 'disputed';
  
  SELECT count(*) INTO v_no_shows FROM public.match_no_show_reports;
  
  SELECT count(*) INTO v_abandoned_matches FROM public.matches WHERE status = 'abandoned';

  -- Recent Admin Notifications (Broadcasts / System alerts)
  SELECT jsonb_agg(sub) INTO v_recent_notifications FROM (
    SELECT id, title, body, priority, category, created_at
    FROM public.notifications
    WHERE user_id IS NULL OR category = 'announcement' or priority = 'urgent'
    ORDER BY created_at DESC
    LIMIT 5
  ) sub;

  -- Recent Moderation Activity Feed
  SELECT jsonb_agg(sub2) INTO v_recent_actions FROM (
    SELECT l.id, l.action_type, l.reason, l.created_at,
           adm.username AS admin_username,
           tgt.username AS target_username
    FROM public.moderation_logs l
    LEFT JOIN public.profiles adm ON adm.id = l.admin_id
    LEFT JOIN public.profiles tgt ON tgt.id = l.target_id
    ORDER BY l.created_at DESC
    LIMIT 10
  ) sub2;

  RETURN jsonb_build_object(
    'users', jsonb_build_object(
      'total', v_total_users,
      'active', v_active_users,
      'banned', v_banned_users,
      'suspended', v_suspended_users,
      'new_today', v_new_today,
      'new_week', v_new_this_week
    ),
    'tournaments', jsonb_build_object(
      'total', v_total_tournaments,
      'ongoing', v_ongoing_tournaments,
      'completed', v_completed_tournaments,
      'total_prize_pool', v_total_prize_pool
    ),
    'matches', jsonb_build_object(
      'total', v_total_matches,
      'pending_verifications', v_pending_verifications
    ),
    'financial', jsonb_build_object(
      'total_platform_revenue', v_total_platform_revenue,
      'thirty_day_revenue', v_thirty_day_revenue
    ),
    'disputes', jsonb_build_object(
      'disputed', v_disputed_matches,
      'awaiting', v_awaiting_disputes,
      'no_shows', v_no_shows,
      'abandoned', v_abandoned_matches
    ),
    'recent_notifications', coalesce(v_recent_notifications, '[]'::jsonb),
    'recent_actions', coalesce(v_recent_actions, '[]'::jsonb),
    'generated_at', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
