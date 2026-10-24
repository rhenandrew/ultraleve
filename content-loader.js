(async function() {
  const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
  const endpoint=['localhost','127.0.0.1'].includes(location.hostname)?'/api/content':'https://api.stream.dev.br/ultraleve/api/content';
  let lastContent='',refreshing=false;
  function render(data){
    const fingerprint=JSON.stringify(data);if(fingerprint===lastContent)return;lastContent=fingerprint;window.bandContent=data;
    const grid=document.querySelector('.video-grid');
    const existing=new Map([...grid.querySelectorAll('[data-music-id]')].map(el=>[el.dataset.musicId,el]));
    if(!existing.size)grid.replaceChildren();
    data.music.forEach((item,index)=>{
      let article=existing.get(item.id);
      if(article&&article.dataset.videoId!==item.videoId){article.remove();article=null;}
      if(!article){
        article=make('article');article.dataset.musicId=item.id;article.dataset.videoId=item.videoId;
        const button=make('button');button.type='button';button.className='video-cover';button.dataset.video=item.id;
        const image=make('img');image.src='https://i.ytimg.com/vi/'+item.videoId+'/hqdefault.jpg';image.loading='lazy';
        const icon=make('i');icon.dataset.lucide='play';button.append(image,icon);
        const link=make('a','YouTube ↗');link.href='https://www.youtube.com/watch?v='+item.videoId;link.target='_blank';link.rel='noopener noreferrer';
        article.append(button,make('h3'),link);grid.append(article);
      }
      article.style.order=index;
      article.querySelector('h3').textContent=String(index+1).padStart(2,'0')+' / '+item.title;
      const button=article.querySelector('[data-video]');button.setAttribute('aria-label','Reproduzir '+item.title);button.querySelector('img').alt=item.title;
      existing.delete(item.id);
    });
    existing.forEach(el=>el.remove());grid.querySelectorAll(':scope > p').forEach(el=>el.remove());
    if(!data.music.length)grid.append(make('p','Novas músicas em breve.'));
    document.querySelector('.playlist').replaceChildren();
    const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
    const list=document.getElementById('show-list');list.replaceChildren();
    data.shows.filter(show=>BandModel.showStatus(show,today)!=='archived').sort((a,b)=>(a.date<today)-(b.date<today)||(a.date<today?b.date.localeCompare(a.date):a.date.localeCompare(b.date))).forEach(show=>{
      const state=BandModel.showStatus(show,today),row=make('article');row.className='show-row';
      const date=make('time',show.date.split('-').reverse().join('/')+(show.time?' · '+show.time:''));date.dateTime=show.date;
      const detail=make('div');detail.append(make('h3',show.place),make('p',show.city));const badge=make('span',state);badge.className='show-state';row.append(date,detail,badge);
      if(state==='Em breve'&&show.tickets){const a=make('a','Ingressos ↗');a.href=show.tickets;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}list.append(row);
    });
    if(!list.children.length)list.append(make('p','Nenhuma data anunciada por aqui ainda.'));
    window.dispatchEvent(new Event('band-content-updated'));window.lucide?.createIcons();
  }
  async function load(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Conteúdo indisponível');return BandModel.validate(await r.json());}
  async function refresh(){if(refreshing||document.hidden)return;refreshing=true;try{render(await load(endpoint));}catch{}finally{refreshing=false;}}
  try{let data;try{data=await load(endpoint);}catch{data=await load(new URL('content.json',location.href));}render(data);}
  catch{if(location.protocol!=='file:')document.getElementById('playback-status').textContent='Não foi possível atualizar as músicas. Recarregue a página.';}
  const script=document.createElement('script');script.src='script.js?v=20261024-catalogo-vivo';document.head.append(script);
  setInterval(refresh,10000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
})();
