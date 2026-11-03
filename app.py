"""iterawin backend: Flask + Oracle. Serves the site and a login-protected API."""
import os, re, json, time, secrets
from datetime import timedelta
from pathlib import Path
from functools import wraps
from urllib.parse import quote
try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass
from flask import Flask, request, session, jsonify, send_from_directory, redirect, g
from werkzeug.security import generate_password_hash, check_password_hash
import db

BASE = Path(__file__).parent
PUBLIC, PROTECTED = BASE / 'public', BASE / 'protected'
MEMBER_PAGES = {'technologies.html', 'projects.html', 'motivation.html', 'articles.html', 'blogs.html', 'videos.html'}
OWNER_PAGES = {'admin.html'}
KINDS = {'tech': 'tech', 'projects': 'project', 'posts': 'post'}   # URL name -> database kind
PROD = os.getenv('PRODUCTION') == '1'

app = Flask(__name__, static_folder=None)
if PROD and not os.getenv('SECRET_KEY'):
    raise RuntimeError('Set SECRET_KEY in production.')
app.secret_key = os.getenv('SECRET_KEY') or secrets.token_hex(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', SESSION_COOKIE_SECURE=PROD,
                  PERMANENT_SESSION_LIFETIME=timedelta(days=7), MAX_CONTENT_LENGTH=64 * 1024)
if PROD:
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
if db.KIND == 'sqlite':
    db.init()

DUMMY_HASH = generate_password_hash('not-a-real-password')
_fails = {}
def too_many(key, limit=8, window=600):
    now = time.time(); _fails[key] = [t for t in _fails.get(key, []) if now - t < window]
    return len(_fails[key]) >= limit
def note_fail(key): _fails.setdefault(key, []).append(time.time())

# ---------- security ----------
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com; "
       "frame-src https://www.youtube-nocookie.com; connect-src 'self' https://api.open-meteo.com https://api.web3forms.com; "
       "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'")

@app.before_request
def csrf_guard():       # cross-site pages cannot send this custom header without our permission
    if request.method in ('POST', 'PUT', 'DELETE') and request.path.startswith('/api/'):
        if request.headers.get('X-Requested-With') != 'iterawin':
            return jsonify(error='Bad request.'), 400

@app.after_request
def headers(r):
    r.headers.update({'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff',
                      'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin'})
    if request.path.startswith('/api/'):
        r.headers['Cache-Control'] = 'no-store'
    return r

# ---------- users ----------
def current_user():
    if 'user' in g: return g.user
    u = None
    if session.get('uid'):
        u = db.one("SELECT id, full_name, email, user_role, is_active FROM app_users WHERE id = :id", id=session['uid'])
        if not u or not u['is_active']:
            session.clear(); u = None
    g.user = u
    return u

def pub(u): return {'id': u['id'], 'name': u['full_name'], 'email': u['email'], 'role': u['user_role']}

def need_login(owner=False):
    def deco(f):
        @wraps(f)
        def w(*a, **k):
            u = current_user()
            if not u: return jsonify(error='Please log in.'), 401
            if owner and u['user_role'] != 'owner': return jsonify(error='Owner only.'), 403
            return f(*a, **k)
        return w
    return deco

@app.get('/api/me')
def me():
    u = current_user()
    return jsonify(user=pub(u) if u else None)

@app.post('/api/register')
def register():
    d = request.get_json(silent=True) or {}
    name, email, pw = str(d.get('name', '')).strip(), str(d.get('email', '')).strip().lower(), str(d.get('password', ''))
    if not 2 <= len(name) <= 100: return jsonify(error='Please enter your name.'), 400
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email) or len(email) > 254: return jsonify(error='Please enter a valid email.'), 400
    if not 8 <= len(pw) <= 128: return jsonify(error='Password must be 8 to 128 characters.'), 400
    approval = os.getenv('REQUIRE_APPROVAL') == '1'
    try:
        uid = db.insert("INSERT INTO app_users (full_name, email, password_hash, user_role, is_active) VALUES (:n, :e, :h, 'client', :a)",
                        n=name, e=email, h=generate_password_hash(pw), a=0 if approval else 1)
    except db.IntegrityErrors:
        return jsonify(error='This email is already registered. Please log in.'), 409
    if approval:
        return jsonify(pending=True, message='Account created. You can log in after the owner approves it.'), 201
    session.clear(); session['uid'] = uid; session.permanent = True
    return jsonify(user={'id': uid, 'name': name, 'email': email, 'role': 'client'}), 201

@app.post('/api/login')
def login():
    d = request.get_json(silent=True) or {}
    email, pw = str(d.get('email', '')).strip().lower(), str(d.get('password', ''))
    key = f"{request.remote_addr}|{email}"
    if too_many(key): return jsonify(error='Too many attempts. Please try again in a few minutes.'), 429
    u = db.one("SELECT id, full_name, email, user_role, is_active, password_hash FROM app_users WHERE email = :e", e=email)
    if not check_password_hash(u['password_hash'] if u else DUMMY_HASH, pw) or not u:
        note_fail(key); return jsonify(error='Wrong email or password.'), 401
    if not u['is_active']:
        return jsonify(error='Your account is waiting for approval or has been disabled.'), 403
    session.clear(); session['uid'] = u['id']; session.permanent = True
    db.run("UPDATE app_users SET last_login = CURRENT_TIMESTAMP WHERE id = :id", id=u['id'])
    return jsonify(user=pub(u))

@app.post('/api/logout')
def logout():
    session.clear()
    return jsonify(ok=True)

# ---------- content ----------
TEASER = {'tech': ('icon', 'name', 'level', 'duration', 'topics'),
          'project': ('icon', 'name', 'price', 'currency', 'tags', 'desc'),
          'post': ('type', 'title', 'date', 'summary')}

def items(kind):
    rows = db.query("SELECT id, payload FROM content_items WHERE kind = :k ORDER BY id", k=kind)
    return [dict(json.loads(r['payload']), id=r['id']) for r in rows]

@app.get('/api/preview')            # public: names only, no details
def preview():
    out = {}
    for url, kind in KINDS.items():
        out[url] = [{k: it[k] for k in TEASER[kind] if k in it} for it in items(kind)]
    return jsonify(out)

@app.get('/api/content')            # members only: everything
@need_login()
def content():
    return jsonify({url: items(kind) for url, kind in KINDS.items()})

def check_item(kind, d):
    if not isinstance(d, dict): return 'Item must be a JSON object.'
    for k in {'tech': ['name', 'meaning'], 'project': ['name', 'price'], 'post': ['type', 'title', 'date']}[kind]:
        if d.get(k) in (None, ''): return f'"{k}" is required.'
    if kind == 'post':
        if d['type'] not in ('motivation', 'article', 'blog', 'video'): return 'type must be motivation, article, blog or video.'
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(d['date'])): return 'date must look like 2026-11-03.'
    if d.get('demoUrl') and not re.match(r'https?://', str(d['demoUrl'])): return 'demoUrl must start with http:// or https://'
    if d.get('youtubeId') and not re.fullmatch(r'[\w-]{6,20}', str(d['youtubeId'])): return 'youtubeId looks wrong.'
    if len(json.dumps(d)) > 20000: return 'Item is too large.'

def kind_or_404(name):
    return KINDS.get(name)

@app.get('/api/admin/content/<name>')
@need_login(owner=True)
def a_list(name):
    k = kind_or_404(name)
    return (jsonify(items=items(k)) if k else (jsonify(error='Unknown type.'), 404))

@app.post('/api/admin/content/<name>')
@need_login(owner=True)
def a_add(name):
    k, d = kind_or_404(name), request.get_json(silent=True)
    if not k: return jsonify(error='Unknown type.'), 404
    d = dict(d) if isinstance(d, dict) else d
    if isinstance(d, dict): d.pop('id', None)
    err = check_item(k, d)
    if err: return jsonify(error=err), 400
    nid = db.insert("INSERT INTO content_items (kind, payload) VALUES (:k, :payload)", k=k, payload=json.dumps(d, ensure_ascii=False))
    return jsonify(id=nid), 201

@app.put('/api/admin/content/<name>/<int:iid>')
@need_login(owner=True)
def a_edit(name, iid):
    k, d = kind_or_404(name), request.get_json(silent=True)
    if not k: return jsonify(error='Unknown type.'), 404
    if isinstance(d, dict): d.pop('id', None)
    err = check_item(k, d)
    if err: return jsonify(error=err), 400
    n = db.run("UPDATE content_items SET payload = :payload WHERE id = :id AND kind = :k", payload=json.dumps(d, ensure_ascii=False), id=iid, k=k)
    return jsonify(ok=True) if n else (jsonify(error='Not found.'), 404)

@app.delete('/api/admin/content/<name>/<int:iid>')
@need_login(owner=True)
def a_del(name, iid):
    k = kind_or_404(name)
    if not k: return jsonify(error='Unknown type.'), 404
    n = db.run("DELETE FROM content_items WHERE id = :id AND kind = :k", id=iid, k=k)
    return jsonify(ok=True) if n else (jsonify(error='Not found.'), 404)

# ---------- owner: users ----------
@app.get('/api/admin/users')
@need_login(owner=True)
def u_list():
    rows = db.query("SELECT id, full_name, email, user_role, is_active, created_at, last_login FROM app_users ORDER BY id")
    return jsonify(users=[{**r, 'created_at': str(r['created_at'] or '')[:16], 'last_login': str(r['last_login'] or '')[:16]} for r in rows])

@app.post('/api/admin/users/<int:uid>')
@need_login(owner=True)
def u_set(uid):
    if uid == current_user()['id']: return jsonify(error='You cannot change your own account here.'), 400
    d = request.get_json(silent=True) or {}
    n = db.run("UPDATE app_users SET is_active = :a WHERE id = :id AND user_role = 'client'", a=1 if d.get('is_active') else 0, id=uid)
    return jsonify(ok=True) if n else (jsonify(error='Not found.'), 404)

@app.delete('/api/admin/users/<int:uid>')
@need_login(owner=True)
def u_del(uid):
    if uid == current_user()['id']: return jsonify(error='You cannot delete yourself.'), 400
    n = db.run("DELETE FROM app_users WHERE id = :id AND user_role = 'client'", id=uid)
    return jsonify(ok=True) if n else (jsonify(error='Not found.'), 404)

# ---------- pages ----------
@app.get('/healthz')
def healthz(): return 'ok'

@app.get('/')
def home(): return send_from_directory(PUBLIC, 'index.html')

@app.get('/<path:name>')
def files(name):
    if name in MEMBER_PAGES or name in OWNER_PAGES:
        u = current_user()
        if not u: return redirect('/login.html?next=' + quote(name))
        if name in OWNER_PAGES and u['user_role'] != 'owner': return redirect('/index.html')
        r = send_from_directory(PROTECTED, name)
        r.headers['Cache-Control'] = 'private, no-store'      # back button after logout shows nothing
        return r
    return send_from_directory(PUBLIC, name)

if __name__ == '__main__':
    app.run(port=int(os.getenv('PORT', '5000')))
