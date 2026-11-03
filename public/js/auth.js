/* iterawin – login and create account */
const q = new URLSearchParams(location.search);
const msg = $('#authMsg'), loginF = $('#loginForm'), regF = $('#regForm');
const safeNext = () => { const n = q.get('next') || ''; return /^\/?[a-z]+\.html(#[a-z0-9-]+)?$/i.test(n) ? n.replace(/^\//, '') : ''; };
const go = u => { location.href = safeNext() || (u && u.role === 'owner' ? 'admin.html' : 'index.html'); };

function show(tab){
  const reg = tab === 'register';
  loginF.hidden = reg; regF.hidden = !reg;
  $('#tabLogin').setAttribute('aria-pressed', !reg); $('#tabReg').setAttribute('aria-pressed', reg);
  msg.textContent = ''; msg.className = '';
}
$('#tabLogin').onclick = () => show('login');
$('#tabReg').onclick = () => show('register');
const fail = t => { msg.className = 'err'; msg.textContent = t; };

async function submit(form, path, body){
  const btn = form.querySelector('button[type=submit]'), label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Please wait…'; msg.textContent = ''; msg.className = '';
  const r = await api(path, {method: 'POST', body});
  btn.disabled = false; btn.textContent = label;
  if (!r.ok) return fail(r.data.error || 'Something went wrong. Please try again.');
  if (r.data.pending) { msg.className = 'ok'; msg.textContent = r.data.message; form.reset(); return; }
  go(r.data.user);
}
loginF.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (!f.email.value.trim() || !f.password.value) return fail('Please enter your email and password.');
  submit(f, '/api/login', {email: f.email.value, password: f.password.value});
});
regF.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (f.name.value.trim().length < 2) return fail('Please enter your name.');
  if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) return fail('Please enter a valid email.');
  if (f.password.value.length < 8) return fail('Password must be at least 8 characters.');
  if (f.password.value !== f.confirm.value) return fail('The two passwords do not match.');
  submit(f, '/api/register', {name: f.name.value, email: f.email.value, password: f.password.value});
});
READY.then(() => { if (USER) go(USER); else if (q.get('tab') === 'register') show('register'); });
