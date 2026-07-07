function addNote(){
  const t=noteText.value.trim();
  if(!t) return;
  state.notes.unshift({id:"n"+Date.now(),text:t,created:new Date().toLocaleString("en-GB")});
  noteText.value="";
  save();
}
function deleteNote(id){
  state.notes=state.notes.filter(n=>n.id!==id);
  save();
}
function renderNotes(){
  notesList.innerHTML=state.notes.length?"":"<p>No notes yet.</p>";
  state.notes.forEach(n=>{
    const el=document.createElement("div");
    el.className="note";
    el.innerHTML=`<div class="meta">${n.created}</div>${n.text}<br><button class="btn danger" style="margin-top:10px" onclick="deleteNote('${n.id}')">Delete</button>`;
    notesList.appendChild(el);
  });
