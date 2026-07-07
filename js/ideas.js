function addIdea(){
  const t=ideaTitle.value.trim();
  if(!t) return;
  state.ideas.unshift({id:"c"+Date.now(),cat:ideaCat.value,title:t,note:"",liked:false});
  ideaTitle.value="";
  save();
}
function toggleIdea(id){
  const i=state.ideas.find(x=>x.id===id);
  if(i) i.liked=!i.liked;
  save();
}
function renderIdeas(){
  ideasList.innerHTML="";
  ["Tour Life","Shows","Music","Personality","Long-form","Brand"].forEach(cat=>{
    const items=state.ideas.filter(i=>i.cat===cat);
    if(!items.length) return;
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`<div class="row"><h3>${cat}</h3><div class="meta">${items.length} ideas</div></div>`;
    items.forEach(i=>{
      const row=document.createElement("div");
      row.className="ideaRow "+(i.liked?"liked":"");
      row.onclick=()=>toggleIdea(i.id);
      row.innerHTML=`<div class="circle">✓</div><div><h3>${i.title}</h3><p>${i.note||""}</p></div>`;
      card.appendChild(row);
    });
    ideasList.appendChild(card);
  });
}
