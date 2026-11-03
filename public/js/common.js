/* iterawin – shared helpers, header/footer, popups. Used by every page. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
const todayKey = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0'); };
const ICON   = {motivation:'🔥', article:'📰', blog:'📝', video:'▶'};
const LABEL  = {motivation:'Motivation', article:'Article', blog:'Blog', video:'Video'};
const PLURAL = {motivation:'Motivation', article:'Articles', blog:'Blogs', video:'Videos'};
const PAGES  = {motivation:'motivation.html', article:'articles.html', blog:'blogs.html', video:'videos.html'};
const PAGE = (location.pathname.split('/').pop() || 'index').replace('.html', '');
const contactUrl = (topic, msg) => 'index.html?topic=' + encodeURIComponent(topic) + (msg ? '&msg=' + encodeURIComponent(msg) : '') + '#contact';
let TECH = [], PROJECTS = [], POSTS = [], sortedPosts = [], USER = null;
const LOCKED = () => !USER;
const OPEN = {};

/* talk to the Python backend (same origin, cookie session) */
async function api(path, opt = {}){
  const o = {method: opt.method || 'GET', credentials: 'same-origin', headers: {'X-Requested-With': 'iterawin'}};
  if (opt.body !== undefined) { o.body = JSON.stringify(opt.body); o.headers['Content-Type'] = 'application/json'; }
  try {
    const r = await fetch(path, o); let data = {};
    try { data = await r.json(); } catch (e) {}
    return {ok: r.ok, status: r.status, data};
  } catch (e) { return {ok: false, status: 0, data: {error: 'Cannot reach the server.'}}; }
}

/* ---------- header, mobile bar, footer ---------- */
const NAV = [['Services','index.html#services'],['Learn','technologies.html'],['Projects','projects.html'],['Motivation','motivation.html'],['Articles','articles.html'],['Blogs','blogs.html'],['Videos','videos.html'],['Contact','index.html#contact']];
const onPage = h => !h.includes('#') && h.replace('.html','') === PAGE;
function layout(){
  const h = $('#siteHeader');
  if (h) h.outerHTML = `<header><div class="wrap nav">
    <a class="logo" href="index.html">itera<b>win</b></a>
    <nav aria-label="Main"><ul>${NAV.map(([t,l]) => `<li><a href="${l}"${onPage(l) ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav>
    <div class="tools"><span class="mini-clock" id="miniClock" aria-hidden="true"></span>
      ${USER ? `${USER.role === 'owner' ? '<a class="btn-small" href="admin.html">Admin</a>' : ''}<span class="who">Hi, ${esc(USER.name.split(' ')[0])}</span><button class="btn-small" id="logout">Logout</button>` : '<a class="btn-small" href="login.html">Login</a>'}
      <button class="icon-btn" id="theme" aria-label="Toggle dark mode">🌓</button></div>
  </div></header>`;
  const f = $('#siteFooter');
  if (f) {
    const read = ['motivation','articles','blogs','videos'].includes(PAGE);
    const tabs = [['🏠','Home','index.html',PAGE==='index'],['💻','Learn','technologies.html',PAGE==='technologies'],['🛒','Projects','projects.html',PAGE==='projects'],['📖','Read','motivation.html',read],['✉️','Contact','index.html#contact',false]];
    f.outerHTML = `<footer><div class="wrap">© ${new Date().getFullYear()} iterawin. All rights reserved.</div></footer>
    <nav class="tabbar" aria-label="Quick">${tabs.map(([i,t,l,a]) => `<a href="${l}"${a ? ' aria-current="page"' : ''}><span>${i}</span>${t}</a>`).join('')}</nav>`;
  }
  $('#theme').onclick = () => {
    const r = document.documentElement;
    const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark';
  };
  const mini = () => { $('#miniClock').textContent = new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'}); };
  mini(); setInterval(mini, 1000);
  const lo = $('#logout');
  if (lo) lo.onclick = async () => { await api('/api/logout', {method: 'POST'}); location.href = 'index.html'; };
}

/* ---------- popup ---------- */
document.body.insertAdjacentHTML('beforeend', '<dialog id="modal" aria-labelledby="mTitle"><div class="mhead"><span class="meta" id="mMeta"></span><button class="icon-btn" id="mClose" aria-label="Close">✕</button></div><div class="mbody" id="mBody"></div></dialog>');
const modal = $('#modal');
function openModal(meta, html, key){
  $('#mMeta').textContent = meta; $('#mBody').innerHTML = html;
  modal.showModal(); modal.scrollTop = 0;
  if (key) history.replaceState(null, '', location.pathname + location.search + '#' + key);
}
$('#mClose').onclick = () => modal.close();
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });
modal.addEventListener('close', () => {
  $('#mBody').innerHTML = '';
  if (/^#(t|pr|po)-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
});

function lockModal(){
  const next = PAGE + '.html';
  openModal('Members only', `<h2 id="mTitle">🔒 Login to open this</h2>
    <p>Create a free account or log in to see full details of technologies, projects, articles, blogs and videos.</p>
    <div class="actions"><a class="btn btn-sky" href="login.html?next=${next}">Login</a>
    <a class="btn btn-ghost" href="login.html?tab=register&next=${next}">Create account</a></div>`);
}
const list = a => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
const tagsOf = a => `<div class="tags">${a.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
const priceText = p => p.price === 'Free' ? 'Free' : esc(p.currency) + Number(p.price).toLocaleString('en-IN');
const videoEmbed = (id, title) => id
  ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="${esc(title)}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
  : `<p class="note">The video is coming soon.</p>`;

function techModal(t){
  openModal('Technology · ' + t.level + ' · ' + t.duration, `
    <h2 id="mTitle">${esc(t.icon)} ${esc(t.name)}</h2>
    <h3>What is ${esc(t.name)}?</h3><p>${esc(t.meaning)}</p>
    <h3>Why learn it</h3><p>${esc(t.why)}</p>
    <h3>What you will learn</h3>${list(t.learn)}
    ${t.example ? `<h3>Example</h3><pre><code>${esc(t.example)}</code></pre>` : ''}
    <div class="actions"><a class="btn btn-sky" data-close href="${contactUrl('Learn a technology', 'I want to learn ' + t.name + '.')}">Join this course</a></div>`, 't-' + slug(t.name));
}
function projectModal(p){
  openModal('Project · ' + p.level, `
    <h2 id="mTitle">${esc(p.icon)} ${esc(p.name)}</h2>
    ${p.youtubeId ? videoEmbed(p.youtubeId, p.name) : ''}
    <h3>About this project</h3><p>${esc(p.overview)}</p>
    <h3>Features</h3>${list(p.features)}
    <h3>Technology used</h3>${tagsOf(p.stack)}
    <h3>What you get</h3>${list(p.includes)}
    <h3>Best for</h3><p>${esc(p.suitable)}</p>
    <div class="actions"><span class="price">${priceText(p)}</span>
      ${p.demoUrl ? `<a class="btn btn-ghost" href="${esc(p.demoUrl)}" target="_blank" rel="noopener">Live demo</a>` : ''}
      <a class="btn btn-sky" data-close href="${contactUrl('College project', (p.price === 'Free' ? 'I want the ' : 'I want to buy the ') + p.name + '.')}">${p.price === 'Free' ? 'Get it free' : 'Buy this project'}</a></div>`, 'pr-' + slug(p.name));
}
function postModal(p){
  openModal(LABEL[p.type] + ' · ' + fmt(p.date), `
    <h2 id="mTitle">${esc(p.title)}</h2>
    ${p.type === 'video' ? videoEmbed(p.youtubeId, p.title) : ''}
    ${(p.body || []).map(t => `<p>${esc(t)}</p>`).join('')}`, 'po-' + slug(p.title));
}

/* key → opener, so any card or link can open any popup, and #links work */
const READY = (async () => {
  const me = await api('/api/me'); USER = me.data.user || null;
  layout();
  const res = await api(USER ? '/api/content' : '/api/preview');
  if (res.status === 401) USER = null;
  const d = res.data || {};
  TECH = d.tech || []; PROJECTS = d.projects || []; POSTS = d.posts || [];
  sortedPosts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const reg = (key, fn) => OPEN[key] = USER ? fn : lockModal;
  TECH.forEach(t => reg('t-' + slug(t.name), () => techModal(t)));
  PROJECTS.forEach(p => reg('pr-' + slug(p.name), () => projectModal(p)));
  POSTS.forEach(p => reg('po-' + slug(p.title), () => postModal(p)));
  if (location.hash && OPEN[location.hash.slice(1)]) OPEN[location.hash.slice(1)]();
})();
function bind(el){
  el.querySelectorAll('[data-k]').forEach(c => {
    const go = () => OPEN[c.dataset.k]();
    c.onclick = go;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
}

/* ---------- card renderers (home and list pages) ---------- */
function renderTech(el, items){
  el.innerHTML = items.map(t => `<div class="card tcard" role="button" tabindex="0" data-k="t-${slug(t.name)}"><div class="cbody">
    <div class="ico" aria-hidden="true">${esc(t.icon)}</div><h3>${esc(t.name)}</h3>
    <span class="lvl">${esc(t.level)} · ${esc(t.duration)}</span>${tagsOf(t.topics)}
    <span class="hint">${LOCKED() ? '🔒 Login to open' : `What is ${esc(t.name)}? Open`}</span></div></div>`).join('');
  bind(el);
}
function renderProjects(el, items){
  if (!items.length) { el.innerHTML = '<p class="empty">No projects here yet.</p>'; return; }
  el.innerHTML = items.map(p => `<div class="card pcard" role="button" tabindex="0" data-k="pr-${slug(p.name)}">
    <div class="thumb" aria-hidden="true">${esc(p.icon)}</div><div class="cbody">${tagsOf(p.tags)}
    <h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p>
    <div class="buy"><span class="price">${priceText(p)}</span><span class="hint">${LOCKED() ? '🔒 Login to open' : 'View demo and details'}</span></div></div></div>`).join('');
  bind(el);
}
function renderPosts(el, items){
  if (!items.length) { el.innerHTML = '<p class="empty">Nothing here yet. Add posts in js/data.js.</p>'; return; }
  const tk = todayKey();
  el.innerHTML = items.map(p => {
    const thumb = p.type === 'video' && p.youtubeId
      ? `<div class="thumb" style="background-image:url(https://i.ytimg.com/vi/${esc(p.youtubeId)}/hqdefault.jpg)"><span class="play">▶</span></div>`
      : `<div class="thumb" aria-hidden="true">${ICON[p.type]}</div>`;
    return `<div class="card" role="button" tabindex="0" data-k="po-${slug(p.title)}">${thumb}<div class="cbody">
      <span class="meta">${LABEL[p.type]} · ${fmt(p.date)}${p.date === tk ? '<span class="new">Today</span>' : ''}</span>
      <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div></div>`;
  }).join('');
  bind(el);
}

