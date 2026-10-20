let content, etag, saving = false;
const status = document.getElementById('status');
const make = (tag,text) => { const el=document.createElement(tag); if(text) el.textContent=text; return el; };
function action(label,callback) {const b=make('button',label);b.type='button';b.addEventListener('click',callback);return b;}
function editing(form,item) {form.reset();Object.entries(item).forEach(([key,value])=>{const field=form.elements.namedItem(key);if(field){if(field.type==='checkbox')field.checked=value;else field.value=value;}});form.scrollIntoView({behavior:'smooth'});}
async function save(next) {
  if(saving)return false;
  saving=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Salvando…';
  try { const r=await fetch('/api/content',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':etag},body:JSON.stringify(BandModel.validate(next))});const result=await r.json();if(!r.ok)throw Error(result.error || 'Falha ao salvar.');content=result;etag=r.headers.get('ETag');render();status.textContent='Salvo. As alterações já estão disponíveis no site.';return true; }
  catch(e){status.textContent=e.message;return false;}finally{saving=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
function render() {
  const music=document.getElementById('music-list');music.replaceChildren();
  content.music.forEach((item,index)=>{
    const row=make('article');row.className='entry';const image=make('img');image.src='https://i.ytimg.com/vi/'+item.videoId+'/hqdefault.jpg';image.alt=item.title;
    const detail=make('div');detail.className='entry-description';detail.append(make('h3',item.title),make('p',String(index+1).padStart(2,'0')+' · YouTube'));
    const buttons=make('div');buttons.className='entry-buttons';buttons.append(action('Editar',()=>editing(document.getElementById('music-form'),{...item,video:'https://www.youtube.com/watch?v='+item.videoId})),action('↑',()=>move(index,-1)),action('↓',()=>move(index,1)),action('Remover',()=>remove('music',item)));
    buttons.children[1].title='Mover para cima';buttons.children[2].title='Mover para baixo';row.append(image,detail,buttons);music.append(row);
  });
  if(!content.music.length)music.append(make('p','Nenhuma música cadastrada.'));
  const list=document.getElementById('show-list');list.replaceChildren();
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
  [...content.shows].sort((a,b)=>b.date.localeCompare(a.date)).forEach(item=>{
    const row=make('article');row.className='entry';const detail=make('div');detail.className='entry-description';detail.append(make('h3',item.place+' · '+item.city),make('p',item.date.split('-').reverse().join('/')+' · '+(BandModel.showStatus(item,today)==='archived'?'Arquivado':BandModel.showStatus(item,today))));
    const buttons=make('div');buttons.className='entry-buttons';buttons.append(action('Editar',()=>editing(document.getElementById('show-form'),item)),action('Remover',()=>remove('shows',item)));row.append(detail,buttons);list.append(row);
  });
  if(!content.shows.length)list.append(make('p','Nenhum show cadastrado.'));
}
function move(index,direction){const target=index+direction;if(target<0||target>=content.music.length)return;const next=structuredClone(content);[next.music[index],next.music[target]]=[next.music[target],next.music[index]];save(next);}
function remove(type,item){if(!confirm('Remover '+(item.title || item.place)+'?'))return;const next=structuredClone(content);next[type]=next[type].filter(x=>x.id!==item.id);save(next);}
document.getElementById('music-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!content)return;const form=e.currentTarget;if(!form.reportValidity())return;const d=new FormData(form);const videoId=BandModel.videoId(String(d.get('video')));if(!videoId){status.textContent='Informe um link válido do YouTube.';return;}
  const item={id:d.get('id') || crypto.randomUUID(),title:String(d.get('title')).trim(),videoId};const next=structuredClone(content);const index=next.music.findIndex(x=>x.id===item.id);if(index<0)next.music.push(item);else next.music[index]=item;if(await save(next))form.reset();
});
document.getElementById('show-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!content)return;const form=e.currentTarget;if(!form.reportValidity())return;const d=new FormData(form);const item={id:d.get('id') || crypto.randomUUID(),date:String(d.get('date')),time:String(d.get('time')),place:String(d.get('place')),city:String(d.get('city')),tickets:String(d.get('tickets')),cancelled:d.has('cancelled')};const next=structuredClone(content);const index=next.shows.findIndex(x=>x.id===item.id);if(index<0)next.shows.push(item);else next.shows[index]=item;if(await save(next))form.reset();
});
document.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.reset).reset()));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('music').hidden=b.dataset.tab!=='music';document.getElementById('shows').hidden=b.dataset.tab!=='shows';}));
(async()=>{try{const r=await fetch('/api/content',{cache:'no-store'});if(!r.ok)throw Error();content=BandModel.validate(await r.json());etag=r.headers.get('ETag');render();status.textContent='';}catch{status.textContent='Abra o painel pelo servidor local. Não foi possível carregar o conteúdo.';document.querySelectorAll('button').forEach(b=>b.disabled=true);}})();
