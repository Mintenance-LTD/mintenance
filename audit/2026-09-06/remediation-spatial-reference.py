"""Rolled-back native database role checks for immutable PostGIS reference data."""
import subprocess

for role in ['anon', 'authenticated', 'service_role']:
    sql = f"""BEGIN;
SET LOCAL ROLE {role};
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.spatial_ref_sys WHERE srid=4326) THEN
  RAISE EXCEPTION 'Reference reads broken'; END IF;
 IF public.ST_SRID(public.ST_Transform(public.ST_SetSRID(public.ST_MakePoint(-0.1,51.5),4326),3857))<>3857 THEN
  RAISE EXCEPTION 'Coordinate transformation broken'; END IF;
 BEGIN
  INSERT INTO public.spatial_ref_sys(srid,auth_name,auth_srid,srtext,proj4text)
  SELECT 990999,'Synthetic audit',990999,srtext,proj4text FROM public.spatial_ref_sys WHERE srid=4326;
  RAISE EXCEPTION 'Client insertion allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.spatial_ref_sys SET auth_name='Synthetic audit' WHERE srid=4326;
  RAISE EXCEPTION 'Client update allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.spatial_ref_sys WHERE srid=4326;
  RAISE EXCEPTION 'Client deletion allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN TRUNCATE public.spatial_ref_sys;
  RAISE EXCEPTION 'Client truncate allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
"""
    result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-v','ON_ERROR_STOP=1'],input=sql,text=True,encoding='utf-8',capture_output=True,timeout=40)
    if result.returncode:
        print(result.stderr)
        raise SystemExit(result.returncode)
print('PASS: anonymous, authenticated and service roles can read/transform coordinates; insert/update/delete/truncate are denied; all rolled back.')
