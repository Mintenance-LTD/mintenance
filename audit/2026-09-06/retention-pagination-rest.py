"""Exercise archive pagination through isolated PostgREST; remove only this run's fixtures."""
import json
import re
import subprocess
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE = 'http://127.0.0.1:55321/rest/v1/'
service = re.findall(r"eyJ[^'\s]+", Path('apps/web/test/integration/supabase-test-client.ts').read_text())[1]
job = str(uuid.uuid4())


def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906',
                             'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'],
                            input=query, text=True, capture_output=True, timeout=30)
    if result.returncode:
        raise RuntimeError('Isolated fixture operation failed: ' + result.stderr)


try:
    for table, column, count in [('retained_contract_records', 'contract_id', 105),
                                 ('retained_dispute_records', 'dispute_id', 53)]:
        sql(f"INSERT INTO public.{table}({column},job_id,participant_ids,evidence,archived_at) "
            f"SELECT gen_random_uuid(),'{job}',ARRAY[]::uuid[],'{{}}'::jsonb,'2026-09-24T09:00:00.123456Z' FROM generate_series(1,{count});")
        seen, cursor = set(), None
        while True:
            query = {'select': f'id:{column},archived_at,review_due_at', 'job_id': 'eq.' + job,
                     'order': f'archived_at.asc,{column}.asc', 'limit': '51'}
            if cursor:
                query['or'] = (f"(archived_at.gt.{cursor['archived_at']},and(archived_at.eq."
                               f"{cursor['archived_at']},{column}.gt.{cursor['id']}))")
            request = urllib.request.Request(BASE + table + '?' + urllib.parse.urlencode(query),
                                             headers={'apikey': service, 'Authorization': 'Bearer ' + service})
            with urllib.request.urlopen(request, timeout=20) as response:
                rows = json.load(response)
            page = rows[:50]
            assert all(row['id'] not in seen for row in page), 'Repeated archive record'
            seen.update(row['id'] for row in page)
            if page:
                cursor = page[-1]
                # A review of an already displayed record must not shift the next batch.
                sql(f"UPDATE public.{table} SET review_due_at=now()+interval '90 days' WHERE {column}='{cursor['id']}';")
            if len(rows) <= 50:
                break
        assert len(seen) == count, 'Archive records skipped'
    print('PASS: 105 contracts and 53 disputes across real REST pages; tied microsecond timestamps; review-date changes do not skip or duplicate records.')
finally:
    sql(f"DELETE FROM public.retained_contract_records WHERE job_id='{job}'; DELETE FROM public.retained_dispute_records WHERE job_id='{job}';")
