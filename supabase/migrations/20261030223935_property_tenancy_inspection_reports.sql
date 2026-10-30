-- Selective deployment only after review. No invitations or backfill.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.property_tenancy_folders (
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 120),
 starts_on date NOT NULL,
 ends_on date CHECK (ends_on >= starts_on),
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id, property_id)
);
CREATE INDEX property_tenancy_folders_property_idx ON public.property_tenancy_folders(property_id, created_at DESC, id);
CREATE TABLE public.property_inspection_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
 folder_id uuid NOT NULL,
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
 inspected_on date NOT NULL,
 kind text NOT NULL CHECK (kind IN ('check_in','routine','check_out')),
 notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 10000),
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(folder_id, property_id) REFERENCES public.property_tenancy_folders(id, property_id) ON DELETE CASCADE,
 UNIQUE(id, property_id)
);
CREATE INDEX property_inspection_reports_folder_idx ON public.property_inspection_reports(property_id, folder_id, created_at DESC, id);
CREATE TABLE public.property_inspection_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 report_id uuid NOT NULL,
 property_id uuid NOT NULL,
 source_photo_id uuid REFERENCES public.property_room_photos(id) ON DELETE SET NULL,
 room_type text NOT NULL,
 file_name text NOT NULL,
 uploaded_at timestamptz,
 FOREIGN KEY(report_id, property_id) REFERENCES public.property_inspection_reports(id, property_id) ON DELETE CASCADE,
 UNIQUE(report_id, source_photo_id)
);
CREATE INDEX property_inspection_photos_source_idx ON public.property_inspection_photos(source_photo_id);
-- API-only: each read checks current owner / accepted membership. No client bypass.
ALTER TABLE public.property_tenancy_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inspection_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_tenancy_folders, public.property_inspection_reports, public.property_inspection_photos FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.property_tenancy_folders, public.property_inspection_reports, public.property_inspection_photos TO service_role;
GRANT UPDATE(label,starts_on,ends_on,revision) ON public.property_tenancy_folders TO service_role;
CREATE FUNCTION public.require_property_inspection_editor(p_actor uuid, p_property uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_owner uuid; v_role text;
BEGIN
 SELECT owner_id INTO v_owner FROM public.properties WHERE id=p_property FOR SHARE;
 IF p_actor IS NULL OR v_owner IS NULL THEN RAISE EXCEPTION 'Property access denied' USING ERRCODE='42501'; END IF;
 IF v_owner=p_actor THEN RETURN; END IF;
 SELECT role INTO v_role FROM public.property_team_members WHERE property_id=p_property AND user_id=p_actor AND status='accepted' FOR SHARE;
 IF v_role IS NULL OR v_role NOT IN ('admin','manager') THEN RAISE EXCEPTION 'Property access denied' USING ERRCODE='42501'; END IF;
END; $$;
CREATE FUNCTION public.create_property_tenancy_folder(p_actor uuid,p_property uuid,p_label text,p_starts date,p_ends date)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM public.require_property_inspection_editor(p_actor,p_property);
 INSERT INTO public.property_tenancy_folders(property_id,label,starts_on,ends_on,created_by)
 VALUES(p_property,btrim(p_label),p_starts,p_ends,p_actor) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
CREATE FUNCTION public.create_property_inspection_report(p_actor uuid,p_property uuid,p_folder uuid,p_title text,p_inspected date,p_kind text,p_notes text,p_photos uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid; v_count integer;
BEGIN
 PERFORM public.require_property_inspection_editor(p_actor,p_property);
 PERFORM 1 FROM public.property_tenancy_folders WHERE id=p_folder AND property_id=p_property;
 IF NOT FOUND THEN RAISE EXCEPTION 'Folder not found' USING ERRCODE='22023'; END IF;
 IF p_photos IS NULL OR cardinality(p_photos)>50 OR cardinality(p_photos)<>(SELECT count(DISTINCT id) FROM unnest(p_photos) id) THEN
 RAISE EXCEPTION 'Invalid photo selection' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.property_room_photos WHERE property_id=p_property AND id=ANY(p_photos) FOR SHARE;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>cardinality(p_photos) THEN RAISE EXCEPTION 'Photos must belong to this property' USING ERRCODE='22023'; END IF;
 INSERT INTO public.property_inspection_reports(property_id,folder_id,title,inspected_on,kind,notes,created_by)
 VALUES(p_property,p_folder,btrim(p_title),p_inspected,p_kind,p_notes,p_actor) RETURNING id INTO v_id;
 INSERT INTO public.property_inspection_photos(report_id,property_id,source_photo_id,room_type,file_name,uploaded_at)
 SELECT v_id,p_property,id,room_type,file_name,created_at FROM public.property_room_photos WHERE property_id=p_property AND id=ANY(p_photos);
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.require_property_inspection_editor(uuid,uuid),public.create_property_tenancy_folder(uuid,uuid,text,date,date),public.create_property_inspection_report(uuid,uuid,uuid,text,date,text,text,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.require_property_inspection_editor(uuid,uuid),public.create_property_tenancy_folder(uuid,uuid,text,date,date),public.create_property_inspection_report(uuid,uuid,uuid,text,date,text,text,uuid[]) TO service_role;

CREATE FUNCTION public.update_property_tenancy_folder(p_actor uuid,p_property uuid,p_folder uuid,p_revision integer,p_label text,p_starts date,p_ends date)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM public.require_property_inspection_editor(p_actor,p_property);
 UPDATE public.property_tenancy_folders SET label=btrim(p_label),starts_on=p_starts,ends_on=p_ends,revision=revision+1
 WHERE id=p_folder AND property_id=p_property AND revision=p_revision RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Folder changed; reload before saving' USING ERRCODE='40001'; END IF;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.update_property_tenancy_folder(uuid,uuid,uuid,integer,text,date,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_property_tenancy_folder(uuid,uuid,uuid,integer,text,date,date) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
