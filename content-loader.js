(async function() {
  const make = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
  try {
    let data;
    try {
      const response = await fetch('/api/content', {cache:'no-store'});
      if (!response.ok) throw Error('API indisponível');
      data = BandModel.validate(await response.json());
    } catch {
      const response = await fetch(new URL('content.json', location.href), {cache:'no-store'});
      if (!response.ok) throw Error('Conteúdo indisponível');
      data = BandModel.validate(await response.json());
    }
    window.bandContent = data;
    const grid = document.querySelector('.video-grid');
    grid.replaceChildren();
    data.music.forEach((item,index) => {
      const article = make('article'); const button = make('button'); button.type = 'button'; button.className = 'video-cover'; button.dataset.video = item.id; button.setAttribute('aria-label', 'Reproduzir ' + item.title);
      const image = make('img'); image.src = 'https://i.ytimg.com/vi/' + item.videoId + '/hqdefault.jpg'; image.alt = item.title; image.loading = 'lazy';
      const icon = make('i'); icon.dataset.lucide = 'play'; button.append(image,icon);
      const link = make('a','YouTube ↗'); link.href = 'https://www.youtube.com/watch?v=' + item.videoId; link.target = '_blank'; link.rel = 'noopener noreferrer';
      article.append(button,make('h3',String(index+1).padStart(2,'0') + ' / ' + item.title),link); grid.append(article);
    });
    if (!data.music.length) grid.append(make('p','Novas músicas em breve.'));
    document.querySelector('.playlist').replaceChildren();
    const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
    const list = document.getElementById('show-list'); list.replaceChildren();
    const shows = data.shows.filter(show => BandModel.showStatus(show,today) !== 'archived').sort((a,b) => (a.date < today)-(b.date < today) || (a.date < today ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    shows.forEach(show => {
      const state = BandModel.showStatus(show,today); const row = make('article'); row.className = 'show-row';
      const date = make('time',show.date.split('-').reverse().join('/') + (show.time ? ' · ' + show.time : '')); date.dateTime = show.date;
      const detail = make('div'); detail.append(make('h3',show.place),make('p',show.city));
      const badge = make('span',state); badge.className = 'show-state'; row.append(date,detail,badge);
      if (state === 'Em breve' && show.tickets) { const a = make('a','Ingressos ↗'); a.href = show.tickets; a.target = '_blank'; a.rel = 'noopener noreferrer'; row.append(a); }
      list.append(row);
    });
    if (!shows.length) list.append(make('p','Nenhuma data anunciada por aqui ainda.'));
  } catch {
    if (location.protocol !== 'file:') document.getElementById('playback-status').textContent = 'Não foi possível atualizar as músicas. Recarregue a página.';
  }
  const script = document.createElement('script'); script.src = 'script.js?v=20261020-voo-livre'; document.head.append(script);
})();
