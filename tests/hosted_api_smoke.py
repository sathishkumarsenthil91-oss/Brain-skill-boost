"""Check deployed CORS and rejection of unauthenticated API requests (no credentials needed)."""
import concurrent.futures
import json
import os
import urllib.error
import urllib.request

base = os.environ.get('SUPABASE_URL', 'https://nzgisrrrbabedlntmcoc.supabase.co') + '/functions/v1/'
origin = os.environ.get('APP_ORIGIN', 'https://main.din4s9c8s9sn9.amplifyapp.com')
requested = {'authorization', 'apikey', 'content-type', 'x-client-info', 'x-retry-count', 'traceparent'}

def check(pair):
    function, method = pair
    headers = {'Origin': origin}
    if method == 'OPTIONS':
        headers.update({'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': ','.join(sorted(requested))})
    request = urllib.request.Request(base + function, headers=headers, method=method, data=b'{}' if method == 'POST' else None)
    try:
        response = urllib.request.urlopen(request, timeout=35)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.code
        if method == 'OPTIONS':
            allowed = {x.strip().lower() for x in response.headers.get('Access-Control-Allow-Headers', '').split(',')}
            assert status in (200, 204), (function, status)
            assert response.headers.get('Access-Control-Allow-Origin') in ('*', origin), function
            assert requested <= allowed, (function, requested - allowed)
        else:
            assert status == 401, (function, status)
    return {'function': function, 'method': method, 'status': status, 'result': 'PASS'}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(check, [(f, m) for f in ('ai-chat', 'app-api', 'database-access') for m in ('OPTIONS', 'POST')]):
            print(json.dumps(result), flush=True)
