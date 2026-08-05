let remaining=60,timer;
function start(){
 clearInterval(timer);remaining=60;
 document.getElementById('timer').textContent=remaining;
 timer=setInterval(()=>{
  remaining--;
  document.getElementById('timer').textContent=remaining;
  if(remaining<=0){clearInterval(timer);alert('Время!');}
 },1000);
}
function nextTopic(){
 document.getElementById('topic').textContent=
 topics[Math.floor(Math.random()*topics.length)];
 start();
}