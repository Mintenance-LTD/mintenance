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

import base64

def verify_context(session):
    code, identity = api('/auth/v1/user', token=session['access_token'])
    assert code == 200 and identity['id'] == user, 'Auth identity was not verified'
    payload = session['access_token'].split('.')[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    assert claims['sub'] == user
    session_id = str(uuid.UUID(claims['session_id']))
    code, context = api('/rest/v1/rpc/verified_mobile_session_context', 'POST', {
        'p_user_id': user, 'p_session_id': session_id, 'p_issued_at': claims['iat']
    }, admin=True)
    assert code == 200, 'Session context lookup failed'
    return context

user = None
try:
    email = 'audit-mobile-revoke-' + str(uuid.uuid4()) + '@example.invalid'
    password = secrets.token_urlsafe(40) + 'Aa1!'
    code, created = api('/auth/v1/admin/users', 'POST', {'email':email,'password':password,'email_confirm':True}, admin=True)
    assert code in (200,201), 'Synthetic Auth creation failed'
    user = str(uuid.UUID((created.get('user') or created)['id']))
    credentials = {'email':email,'password':password}
    code, session = api('/auth/v1/token?grant_type=password', 'POST', credentials)
    assert code == 200 and len(verify_context(session)) == 1, 'Initial session rejected'
    sql(f"SELECT public.revoke_web_sessions_atomic('{user}')")
    assert verify_context(session) == [], 'Old token remained authorized'
    code, refreshed = api('/auth/v1/token?grant_type=refresh_token', 'POST', {'refresh_token':session['refresh_token']})
    assert code == 200, 'Provider refresh could not be exercised'
    assert verify_context(refreshed) == [], 'Refreshed old session bypassed revocation'
    code, fresh = api('/auth/v1/token?grant_type=password', 'POST', credentials)
    assert code == 200 and len(verify_context(fresh)) == 1, 'Fresh password login rejected'
    print('PASS: real local Auth login accepted; revoked original and refreshed bearer contexts rejected; fresh login accepted')
finally:
    if user:
        try:
            api('/auth/v1/admin/users/' + user, 'DELETE', admin=True)
        finally:
            sql(f"DELETE FROM auth.users WHERE id='{user}'")
