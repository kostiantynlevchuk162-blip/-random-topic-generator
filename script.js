const topics=[{"category": "Экономика", "title": "Эффект кобры"}, {"category": "Экономика", "title": "Голландская болезнь"}, {"category": "Логика", "title": "Бритва Оккама"}, {"category": "Логика", "title": "Парадокс Монти Холла"}, {"category": "Право", "title": "Презумпция невиновности"}, {"category": "Политика", "title": "Окно Овертона"}, {"category": "Философия", "title": "Корабль Тесея"}, {"category": "Психология", "title": "Эффект Даннинга — Крюгера"}, {"category": "Социология", "title": "Трагедия общин"}, {"category": "Теория игр", "title": "Дилемма заключённого"}];
const home=document.getElementById('home');
const setup=document.getElementById('setup');
const roulette=document.getElementById('roulette');
document.getElementById('startBtn').onclick=()=>{home.classList.add('hidden');setup.classList.remove('hidden');initCats();}
function initCats(){
 const wrap=document.getElementById('cats');
 if(wrap.children.length) return;
 [...new Set(topics.map(t=>t.category))].forEach(c=>{
  const d=document.createElement('div');d.className='cat active';d.textContent=c;
  d.onclick=()=>d.classList.toggle('active');wrap.appendChild(d);
 });
}
document.getElementById('spinBtn').onclick=()=>{
 setup.classList.add('hidden');roulette.classList.remove('hidden');
 const slot=document.getElementById('slot');
 const active=[...document.querySelectorAll('.cat.active')].map(x=>x.textContent);
 const pool=topics.filter(t=>active.includes(t.category));
 let i=0;
 const timer=setInterval(()=>{
   slot.textContent=pool[Math.floor(Math.random()*pool.length)].title;
   i++;
   if(i>35){clearInterval(timer);}
 },80+i*4);
}
