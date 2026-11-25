ALTER TABLE public.property_team_members
  ADD COLUMN invitation_notified_user_id uuid;

CREATE INDEX property_team_pending_email_idx
  ON public.property_team_members (lower(email)) WHERE status = 'pending';

-- Also discovers invitations sent before the recipient created their account.
CREATE FUNCTION public.sync_property_invitation_notifications(p_user uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH recipient AS (
    SELECT u.id, lower(u.email) AS email
    FROM auth.users u JOIN public.profiles p ON p.id = u.id
    WHERE u.id = p_user AND u.email_confirmed_at IS NOT NULL
      AND p.deleted_at IS NULL AND p.role = 'homeowner'
  ), pending AS (
    UPDATE public.property_team_members m
    SET invitation_notified_user_id = recipient.id
    FROM recipient
    WHERE m.status = 'pending' AND lower(m.email) = recipient.email
      AND (m.user_id IS NULL OR m.user_id = recipient.id)
      AND m.invitation_notified_user_id IS DISTINCT FROM recipient.id
    RETURNING m.id, m.property_id
  )
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  SELECT p_user, 'property_invitation', 'Property invitation',
    'You’ve been invited to ' || coalesce(nullif(left(btrim(p.property_name), 180), ''), 'a property') || '. Review your access before accepting.',
    '/properties/invitations?property=' || pending.property_id,
    jsonb_build_object('invitationId', pending.id)
  FROM pending JOIN public.properties p ON p.id = pending.property_id;
$$;

REVOKE ALL ON FUNCTION public.sync_property_invitation_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_property_invitation_notifications(uuid) TO service_role;

CREATE FUNCTION public.close_property_invitation_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.invitation_notified_user_id IS NULL OR OLD.status <> 'pending' THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'pending' THEN RETURN NULL; END IF;

  UPDATE public.notifications SET action_url = NULL, read = true,
    message = 'This invitation is no longer pending.'
  WHERE user_id = OLD.invitation_notified_user_id AND type = 'property_invitation'
    AND metadata->>'invitationId' = OLD.id::text;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.close_property_invitation_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER close_property_invitation_notification
  AFTER UPDATE OF status OR DELETE ON public.property_team_members
  FOR EACH ROW EXECUTE FUNCTION public.close_property_invitation_notification();
