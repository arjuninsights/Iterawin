/* iterawin – owner dashboard (all actions are re-checked on the server) */
const TABS = [['users','Students & clients'],['tech','Technologies'],['projects','Projects'],['posts','Posts']];
const TEMPLATE = {
  tech: {icon:"💡", name:"", level:"Beginner", duration:"4 weeks", topics:[""], meaning:"", why:"", learn:[""], example:""},
  projects: {icon:"📦", name:"", price:999, currency:"₹", tags:[""], desc:"", overview:"", features:[""], stack:[""], includes:[""], suitable:"", level:"Beginner", demoUrl:"", youtubeId:""},
  posts: {type:"blog", title:"", date:todayKey(), summary:"", body:[""], youtubeId:""}
};
let tab = 'users', editing = null;
const say = (t, ok) => { const m = $('#msg'); m.className = ok ? 'ok' : 'err'; m.textContent = t || ''; };

READY.then(() => {
  if (!USER || USER.role !== 'owner') { location.href = 'login.html'; return; }
  draw();
});

function draw(){
  $('#tabs').innerHTML = TABS.map(([k,t]) => `<button class="chip" aria-pressed="${k===tab}" data-k="${k}">${t}</button>`).join('');
  $('#tabs').querySelectorAll('.chip').forEach(b => b.onclick = () => { tab = b.dataset.k; editing = null; say(''); draw(); });
  tab === 'users' ? users() : content();
}

async function users(){
  const r = await api('/api/admin/users');
  if (!r.ok) return say(r.data.error || 'Could not load users.');
  $('#panel').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Last login</th><th>Status</th><th></th></tr></thead><tbody>
    ${r.data.users.map(u => `<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.user_role)}</td><td>${esc(u.created_at)}</td><td>${esc(u.last_login || '-')}</td>
    <td>${u.is_active ? 'Active' : 'Disabled'}</td>
    <td class="row-actions">${u.user_role === 'owner' ? '' : `<button class="btn-small" data-a="toggle" data-id="${u.id}" data-on="${u.is_active ? 0 : 1}">${u.is_active ? 'Disable' : 'Enable'}</button><button class="btn-small danger" data-a="del" data-id="${u.id}">Delete</button>`}</td></tr>`).join('')}
    </tbody></table></div>`;
  $('#panel').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const id = b.dataset.id;
    if (b.dataset.a === 'del') {
      if (!confirm('Delete this account? This cannot be undone.')) return;
      const x = await api('/api/admin/users/' + id, {method: 'DELETE'});
      return x.ok ? users() : say(x.data.error);
    }
    const x = await api('/api/admin/users/' + id, {method: 'POST', body: {is_active: b.dataset.on === '1'}});
    x.ok ? users() : say(x.data.error);
  });
}

async function content(){
  const r = await api('/api/admin/content/' + tab);
  if (!r.ok) return say(r.data.error || 'Could not load.');
  const items = r.data.items;
  if (editing) return editor();
  $('#panel').innerHTML = `<p><button class="btn btn-sky" id="add">Add new</button></p>
    <div class="tbl-wrap"><table class="tbl"><tbody>${items.map(it => `<tr><td>${esc(it.name || it.title)}</td><td class="muted">${esc(it.type || it.level || '')}</td>
    <td class="row-actions"><button class="btn-small" data-a="edit" data-id="${it.id}">Edit</button><button class="btn-small danger" data-a="del" data-id="${it.id}">Delete</button></td></tr>`).join('') || '<tr><td>Nothing here yet.</td></tr>'}</tbody></table></div>`;
  $('#add').onclick = () => { editing = {id: null, data: TEMPLATE[tab]}; content(); };
  $('#panel').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const id = +b.dataset.id, it = items.find(x => x.id === id);
    if (b.dataset.a === 'edit') { const {id: _, ...data} = it; editing = {id, data}; return content(); }
    if (!confirm('Delete this item?')) return;
    const x = await api(`/api/admin/content/${tab}/${id}`, {method: 'DELETE'});
    x.ok ? (say('Deleted.', true), content()) : say(x.data.error);
  });
}

function editor(){
  $('#panel').innerHTML = `<p class="muted">Edit the details below, then press Save. Keep the quotes and commas as they are.</p>
    <textarea id="json" class="code" rows="20" spellcheck="false">${esc(JSON.stringify(editing.data, null, 2))}</textarea>
    <p class="cta" style="margin-top:12px"><button class="btn btn-sky" id="save">Save</button><button class="btn btn-ghost" id="cancel">Cancel</button></p>`;
  $('#cancel').onclick = () => { editing = null; say(''); content(); };
  $('#save').onclick = async () => {
    let data;
    try { data = JSON.parse($('#json').value); } catch (e) { return say('This is not valid JSON: ' + e.message); }
    const x = editing.id
      ? await api(`/api/admin/content/${tab}/${editing.id}`, {method: 'PUT', body: data})
      : await api('/api/admin/content/' + tab, {method: 'POST', body: data});
    if (!x.ok) return say(x.data.error || 'Could not save.');
    editing = null; say('Saved.', true); content();
  };
}
