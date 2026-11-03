/* iterawin – home page logic. Content lives in js/data.js, shared code in js/common.js */
$('#tagline').textContent = SITE.tagline;
['fbHero','fbBtn'].forEach(id => $('#'+id).href = SITE.facebook);
$('#ytBtn').href = SITE.youtube;

/* ---------- live date & time ---------- */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
function tick(){
  const n = new Date();
  $('#clock').innerHTML = esc(n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})) + (tz ? `<small>${esc(tz.replace('_',' '))}</small>` : '');
  const h = n.getHours();
  $('#greet').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  const line = n.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if ($('#dateLine').textContent !== line) { $('#dateLine').textContent = line; renderDaily(); }
}
tick(); setInterval(tick, 1000);

/* ---------- daily information ---------- */
function renderDaily(){
  const n = new Date(), d = Math.floor((n - new Date(n.getFullYear(),0,0)) / 864e5);
  const pick = a => a.length ? a[d % a.length] : '';
  $('#quote').textContent = pick(DAILY.thoughts);
  $('#motiveText').textContent = pick(DAILY.thoughts);
  $('#tip').textContent = pick(DAILY.tips);
  const t = POSTS.filter(p => p.date === todayKey()), box = $('#todayPosts');
  if (!t.length) { box.textContent = 'No new post yet today. Check back soon.'; return; }
  box.innerHTML = t.map((p,i) => `<a href="#posts" data-i="${i}">${esc(p.title)}</a>`).join('<br>');
  box.querySelectorAll('a').forEach(a => a.onclick = e => { e.preventDefault(); OPEN['po-' + slug(t[a.dataset.i].title)](); });
}

/* ---------- weather (Open-Meteo, free, no key) ---------- */
const WX = {0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Showers',82:'Heavy showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'};
async function loadWeather(){
  try{
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${SITE.latitude}&longitude=${SITE.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
    if(!r.ok) throw 0;
    const j = await r.json();
    $('#weather').textContent = Math.round(j.current.temperature_2m) + '°C';
    $('#weatherSub').textContent = `${WX[j.current.weather_code] || 'Weather'} in ${SITE.weatherPlace}. High ${Math.round(j.daily.temperature_2m_max[0])}°, low ${Math.round(j.daily.temperature_2m_min[0])}°.`;
  }catch(e){ $('#weather').textContent = '–'; $('#weatherSub').textContent = 'Weather is not available right now.'; }
}
loadWeather(); setInterval(loadWeather, 30 * 60 * 1000);

/* ---------- services ---------- */
$('#svcGrid').innerHTML = SERVICES.map(s => `
  <article class="svc"><div class="ico" aria-hidden="true">${s.icon}</div>
    <h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>${list(s.points)}
    <a class="btn btn-sky to-contact" href="#contact" data-topic="${esc(s.topic)}">${esc(s.cta)}</a></article>`).join('');
document.querySelectorAll('.to-contact').forEach(a => a.addEventListener('click', () => {
  if (a.dataset.topic) $('#contactForm').topic.value = a.dataset.topic;
}));

/* ---------- technologies, projects, posts (preview when logged out, full when logged in) ---------- */
let filter = 'all';
function drawPosts(){
  const types = ['all', ...new Set(sortedPosts.map(p => p.type))];
  $('#filters').innerHTML = types.map(t => `<button class="chip" aria-pressed="${t===filter}" data-t="${t}">${t==='all'?'All':PLURAL[t]}</button>`).join('');
  $('#filters').querySelectorAll('.chip').forEach(b => b.onclick = () => { filter = b.dataset.t; drawPosts(); });
  renderPosts($('#postGrid'), sortedPosts.filter(p => filter==='all' || p.type===filter));
}
READY.then(() => {
  $('#memberBar').hidden = !!USER;
  renderTech($('#techGrid'), TECH);
  renderProjects($('#projGrid'), PROJECTS);
  drawPosts();
  renderDaily();
  const p = sortedPosts[0];
  if (p) {
    $('#latest').innerHTML = `<small>Latest ${LABEL[p.type].toLowerCase()} · ${fmt(p.date)}</small><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><a href="#posts">${USER ? 'Open ' + (p.type==='video'?'video':'post') : '🔒 Login to open'}</a>`;
    $('#latest a').onclick = e => { e.preventDefault(); OPEN['po-' + slug(p.title)](); };
  }
});

/* ---------- contact form → email ---------- */
const form = $('#contactForm');
const q = new URLSearchParams(location.search);          /* links from other pages pre-fill the form */
if (q.get('topic')) form.topic.value = q.get('topic');
if (q.get('msg')) form.message.value = q.get('msg');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, msg = $('#formMsg'), btn = $('#sendBtn');
  const name = f.name.value.trim(), email = f.email.value.trim(), text = f.message.value.trim();
  msg.className = '';
  if (f.botcheck.value) return;
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !text) { msg.className = 'err'; msg.textContent = 'Please fill your name, a valid email and a message.'; return; }
  const subject = `iterawin: ${f.topic.value}`;
  if (!SITE.web3formsKey) {
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\nFrom: ${name} (${email})`)}`;
    msg.textContent = 'Opening your email app…';
    return;
  }
  btn.disabled = true; btn.textContent = 'Sending…';
  try{
    const r = await fetch('https://api.web3forms.com/submit', {
      method:'POST', headers:{'Content-Type':'application/json',Accept:'application/json'},
      body: JSON.stringify({ access_key: SITE.web3formsKey, subject, from_name: name, name, email, topic: f.topic.value, message: text })
    });
    if (!(await r.json()).success) throw 0;
    msg.className = 'ok'; msg.textContent = 'Message sent. I will reply to your email soon.'; f.reset();
  }catch(err){
    msg.className = 'err'; msg.textContent = `Could not send. Please email ${SITE.email} directly.`;
  }finally{ btn.disabled = false; btn.textContent = 'Send message'; }
});
