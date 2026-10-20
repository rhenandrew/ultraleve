(function(root) {
  function videoId(value) {
    if (/^[\w-]{11}$/.test(value)) return value;
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:') return null;
      if (u.hostname === 'youtu.be') return videoId(u.pathname.slice(1));
      if (!['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)) return null;
      const id = u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    } catch { return null; }
  }
  function safeUrl(value) {
    if (!value) return '';
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
  }
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  }
  function nextMonth(date) {
    const [y,m,d] = date.split('-').map(Number);
    const last = new Date(Date.UTC(y,m+1,0)).getUTCDate();
    return new Date(Date.UTC(y,m,Math.min(d,last))).toISOString().slice(0,10);
  }
  function showStatus(show, today) {
    if (show.date < today && today > nextMonth(show.date)) return 'archived';
    if (show.cancelled) return 'Cancelado';
    return show.date < today ? 'Realizado' : 'Em breve';
  }
  function validate(data) {
    if (!data || !Array.isArray(data.music) || !Array.isArray(data.shows) || data.music.length > 100 || data.shows.length > 500) throw Error('Conteúdo inválido.');
    const ids = new Set();
    const text = (v,max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
    const checkId = id => { if (!text(id,80) || !/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw Error('Identificador inválido ou duplicado.'); ids.add(id); };
    return {
      music: data.music.map(item => { checkId(item.id); if (!text(item.title,160) || !/^[\w-]{11}$/.test(item.videoId)) throw Error('Confira o título e o YouTube.'); return {id:item.id,title:item.title.trim(),videoId:item.videoId}; }),
      shows: data.shows.map(item => { checkId(item.id); if (!validDate(item.date) || !text(item.place,160) || !text(item.city,160) || (item.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) || safeUrl(item.tickets || '') === null || typeof item.cancelled !== 'boolean') throw Error('Confira os dados do show.'); return {id:item.id,date:item.date,time:item.time || '',place:item.place.trim(),city:item.city.trim(),tickets:safeUrl(item.tickets || ''),cancelled:item.cancelled}; })
    };
  }
  const model = {videoId,safeUrl,validate,showStatus,nextMonth};
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  else root.BandModel = model;
})(typeof window !== 'undefined' ? window : globalThis);
