"""Synthetic local Auth verification; credentials are captured in memory and never printed."""
import json
import secrets
import subprocess
import urllib.request
import urllib.error
import uuid

status = subprocess.run(['node', 'C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js', '--offline', 'supabase', 'status', '--workdir', 'audit/2026-09-06/isolated-stack', '--output', 'env'], text=True, capture_output=True)
if status.returncode: raise RuntimeError('Unable to read isolated stack status')
env = {}
for line in status.stdout.splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip().strip('"')
base = env.get('API_URL', '')
if base.rstrip('/') != 'http://127.0.0.1:55321': raise RuntimeError('Refusing non-isolated Auth URL')
service = env['SERVICE_ROLE_KEY']
anon = env['ANON_KEY']

def api(path, method='GET', payload=None, token=None, admin=False):
    headers = {'apikey': service if admin else anon, 'Content-Type': 'application/json'}
    if admin or token: headers['Authorization'] = 'Bearer ' + (service if admin else token)
    req = urllib.request.Request(base + path, method=method, headers=headers, data=None if payload is None else json.dumps(payload).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        # Do not include provider response bodies or credentials in diagnostics.
        body = json.loads(error.read() or b'{}')
        return error.code, {'code': body.get('code'), 'error_code': body.get('error_code')}

def sql(query):
    result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if result.returncode: raise RuntimeError('Isolated Auth diagnostic SQL failed')
    return result.stdout.strip()

user = None
try:
    email = 'audit-deletion-' + str(uuid.uuid4()) + '@example.invalid'
    password = secrets.token_urlsafe(40) + 'Aa1!'
    code, created = api('/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},admin=True)
    if code not in (200,201): raise RuntimeError('Synthetic Auth creation failed: HTTP ' + str(code))
    user = str(uuid.UUID((created.get('user') or created)['id']))
    code, session = api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
    if code != 200: raise RuntimeError('Synthetic Auth login failed: HTTP ' + str(code))
    operation = sql(f"SELECT public.delete_account_with_recovery('{user}')")
    step = json.loads(sql(f"SELECT public.claim_account_cleanup_step('{operation}')"))
    assert step['kind']=='auth_user' and step['resource_id']==user
    code, deleted = api('/auth/v1/admin/users/' + user,'DELETE',admin=True)
    if code != 200: raise RuntimeError('Synthetic credential removal failed: HTTP ' + str(code))
    code, absent = api('/auth/v1/admin/users/' + user, admin=True)
    assert code == 404 and (absent.get('error_code') or absent.get('code')) == 'user_not_found', 'Deleted account absence was not confirmed'
    sql(f"SELECT public.finish_account_cleanup_step('{step['id']}','{step['lease_token']}','completed')")
    code, _ = api('/auth/v1/user',token=session['access_token'])
    assert code >= 400, 'Deleted account access token still passed Auth user verification'
    code, _ = api('/auth/v1/token?grant_type=refresh_token','POST',{'refresh_token':session['refresh_token']})
    assert code >= 400, 'Deleted account refresh token still issued a session'
    assert sql(f"SELECT status FROM public.account_deletion_cleanup_steps WHERE operation_id='{operation}'")=='completed'
    print('PASS: local Auth confirms account absence, rejects the old access/refresh session, and reconciles the durable cleanup step')
finally:
    if user:
        try:
            api('/auth/v1/admin/users/' + user,'DELETE',admin=True)
        finally:
            sql(f"DELETE FROM public.account_deletion_operations WHERE user_id='{user}'; DELETE FROM auth.users WHERE id='{user}';")
