function renderCalendar(target, full){
  if(!target) return;
  target.innerHTML="";
  if(full) monthTitle.textContent = currentMonth.toLocaleString("en-GB",{month:"long",year:"numeric"});
  ["M","T","W","T","F","S","S"].forEach(x=>{
    const h=document.createElement("div");
    h.className="dayHead";
    h.textContent=x;
    target.appendChild(h);
  });
  const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
  const offset=(new Date(y,m,1).getDay()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  const today=k(appToday);
  for(let i=0;i<offset;i++) target.appendChild(document.createElement("div"));
  for(let d=1;d<=days;d++){
    const date=new Date(y,m,d), key=k(date), s=state.shows[key], pct=s?completion(s):0;
    const el=document.createElement("div");
    el.className="day "+(key===today?"today ":"")+(s&&pct>=100?"completeDay":"");
    el.onclick=(ev)=>openDatePopover(key,ev);
    el.innerHTML=`<div class="date">${d}</div>${key===today?'<span class="todayMarker"></span>':''}${s?'<span class="eventBar '+(pct>=100?'greenBg':colourClass(s.colour))+'"></span>':''}`;
    target.appendChild(el);
  }
}
function changeMonth(n){ currentMonth.setMonth(currentMonth.getMonth()+n); renderAll(); }
function openDatePopover(date,ev){
  selectedDate=date;
  const s=state.shows[date]||{};
  popDate.textContent = nice(date,{weekday:"long",day:"numeric",month:"long"});
  popTitle.textContent = s.name || "No show added";
  popCity.textContent = s.venue || "Tap … for itinerary";
  const r=ev.currentTarget.getBoundingClientRect();
  datePopover.classList.add("active");
  datePopover.style.left=Math.min(Math.max(r.left-20,14),window.innerWidth-295)+"px";
  datePopover.style.top=Math.min(r.bottom+12,window.innerHeight-145)+"px";
  if(popTimer) clearTimeout(popTimer);
  popTimer=setTimeout(closePopover,1800);
}
function closePopover(){ datePopover.classList.remove("active"); }
function openPopoverItinerary(e){
  e?.stopPropagation();
  if(popTimer) clearTimeout(popTimer);
  closePopover();
  go("tours");
  setTimeout(()=>openItinerary(selectedDate),150);
}
document.addEventListener("click",e=>{
  if(!datePopover.contains(e.target)&&!e.target.closest(".day")) closePopover();
});
