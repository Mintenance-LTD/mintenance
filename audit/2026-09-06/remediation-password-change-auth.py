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
    email = 'audit-password-change-' + str(uuid.uuid4()) + '@example.invalid'
    password = secrets.token_urlsafe(40) + 'Aa1!'
    code, created = api('/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},admin=True)
    assert code in (200,201)
    user = str(uuid.UUID((created.get('user') or created)['id']))
    code, existing = api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
    assert code == 200
    code, proof = api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
    assert code == 200 and proof['user']['id'] == user
    code, _ = api('/auth/v1/logout?scope=local','POST',token=proof['access_token'])
    assert code in (200,204)
    code, operation = api('/rest/v1/rpc/begin_password_change','POST',{'p_user_id':user,'p_expected_revoked_at':None},admin=True)
    assert code == 200
    operation = str(uuid.UUID(operation))
    new_password = secrets.token_urlsafe(40) + 'Bb2!'
    code, changed = api('/auth/v1/admin/users/'+user,'PUT',{'password':new_password},admin=True)
    assert code == 200 and (changed.get('user') or changed)['id'] == user
    code, _ = api('/rest/v1/rpc/finish_password_change','POST',{'p_operation_id':operation},admin=True)
    assert code in (200,204)
    assert sql(f"SELECT completed_at IS NOT NULL FROM public.password_change_revocations WHERE id='{operation}'") == 't'
    code, _ = api('/auth/v1/token?grant_type=refresh_token','POST',{'refresh_token':existing['refresh_token']})
    assert code == 400, 'Old provider session remained refreshable'
    code, _ = api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
    assert code == 400, 'Old password remained valid'
    code, _ = api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':new_password})
    assert code == 200, 'New password login failed'
    print('PASS: real local password verification, durable begin, Auth update, cleanup finish and new-password login; old password/refresh rejected')
finally:
    if user:
        try: api('/auth/v1/admin/users/'+user,'DELETE',admin=True)
        finally: sql(f"DELETE FROM auth.users WHERE id='{user}'")
