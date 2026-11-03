/* iterawin – member list pages (technologies, projects, motivation, articles, blogs, videos) */
const kind = document.body.dataset.page;
const box = $('#list'), bar = $('#filters');

READY.then(() => {
  if (!USER) { location.href = 'login.html?next=' + encodeURIComponent(PAGE + '.html'); return; }
  if (kind === 'tech') {
    bar.remove();
    renderTech(box, TECH);
  } else if (kind === 'projects') {
    const tags = ['All', ...new Set(PROJECTS.flatMap(p => p.tags || []))];
    let cur = 'All';
    const draw = () => {
      bar.innerHTML = tags.map(t => `<button class="chip" aria-pressed="${t === cur}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
      bar.querySelectorAll('.chip').forEach(b => b.onclick = () => { cur = b.dataset.t; draw(); });
      renderProjects(box, cur === 'All' ? PROJECTS : PROJECTS.filter(p => (p.tags || []).includes(cur)));
    };
    draw();
  } else {
    bar.innerHTML = Object.keys(PAGES).map(t => `<a class="chip" href="${PAGES[t]}"${t === kind ? ' aria-current="page"' : ''}>${PLURAL[t]}</a>`).join('');
    renderPosts(box, sortedPosts.filter(p => p.type === kind));
  }
});
