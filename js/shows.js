function setShowTab(tab){
  currentShowTab=tab;
  upcomingBtn.classList.toggle("active",tab==="upcoming");
  pastBtn.classList.toggle("active",tab==="past");
  renderShows();
}
function renderShows(){
  showList.innerHTML="";
  let entries=Object.entries(state.shows).sort().filter(([d,s])=>currentShowTab==="past"?s.completed:!s.completed);
  if(!entries.length){
    showList.innerHTML=`<div class="card"><p>No ${currentShowTab==="past"?"past":"upcoming"} shows yet.</p></div>`;
    return;
  }
  entries.forEach(([date,s],idx)=>{
    const b=basic(s), pct=completion(s);
    const card=document.createElement("div");
    card.className="card showCard";
    card.setAttribute("data-show-date",date);

    if(s.tripActive){
      card.innerHTML=activeTripHTML(date,s);
      showList.appendChild(card);
      return;
    }

    card.innerHTML=`
      <div class="showHeader" style="--img:url('assets/${idx%2?'booth.jpg':'crowd.jpg'}')">
        <div class="meta">${nice(date)} · Show</div>
        <h2><span class="colourDot ${colourClass(s.colour)}"></span>${title(s)}</h2>
        <p>${[s.venue,s.setTime].filter(Boolean).join(" · ")}</p>
      </div>
      <div class="showBody">
        <div class="grid2">
          <div class="infoChip"><div class="meta">Travel</div><h3>${b.travel}</h3></div>
          <div class="infoChip"><div class="meta">Transport</div><h3>${b.transport}</h3></div>
          <div class="infoChip"><div class="meta">Hotel</div><h3>${b.hotel}</h3></div>
          <div class="infoChip"><div class="meta">Docs</div><h3>${b.docs}</h3></div>
        </div>
        <button class="smallRow" onclick="openView('${date}','travel')"><div class="smallRowLeft"><div class="smallIcon">✈︎</div><div><h3>Travel info</h3><p>${b.travel}</p></div></div><div class="chev">›</div></button>
        <button class="smallRow" onclick="openView('${date}','notes')"><div class="smallRowLeft"><div class="smallIcon">☰</div><div><h3>Notes</h3><p>${s.notes||"Not added yet"}</p></div></div><div class="chev">›</div></button>
        <button class="btn orange" style="width:100%;margin-top:12px" onclick="startTrip('${date}')">Start Trip</button>
        <button class="btn" style="width:100%;margin-top:10px" onclick="openItinerary('${date}')">Full itinerary</button>
        <button class="btn dark" style="width:100%;margin-top:10px" onclick="openEdit('${date}')">Edit main details</button>
        <button class="btn green" style="width:100%;margin-top:10px" onclick="markCompleted('${date}')">✓ Mark show complete</button>
      </div>`;
    showList.appendChild(card);
  });
}
function activeTripHTML(date,s){
  const steps=tripSteps(date);
  const done=steps.filter(st=>s.tripDone&&s.tripDone[st.id]).length;
  const pct=Math.round(done/steps.length*100);
  const list=steps.map((st,i)=>`
    <div class="activeTripStep ${s.tripDone&&s.tripDone[st.id]?'done':''}" onclick="openTrip('${date}',true);setTimeout(()=>openStepDetail('${st.id}'),120)">
      <div class="tickMini">✓</div>
      <div>
        <div class="meta">Step ${i+1}</div>
        <h3>${st.title}</h3>
        <p>${st.detail||"Not added yet"}</p>
      </div>
    </div>`).join("");
  return `<div class="showBody">
    <div class="activeTripCard">
      <div class="tripPill">Trip Mode Active</div>
      <h2>${title(s)}</h2>
      <p>${[s.venue,s.setTime].filter(Boolean).join(" · ")}</p>
      <div class="progress"><div class="progressFill" style="width:${pct}%;background:${pct===100?'var(--green)':'var(--orange)'}"></div></div>
      <p style="margin-top:8px">${pct}% complete</p>
      <div class="activeTripSteps">${list}</div>
      <div class="grid2" style="margin-top:12px">
        <button class="btn" onclick="openTrip('${date}',true)">Open Trip</button>
        <button class="btn dark" onclick="completeTrip('${date}')">Complete</button>
      </div>
    </div>
  </div>`;
}
function openEdit(date){
  selectedDate=date;
  const s=show(date);
  selectedColour=s.colour||"orange";
  editDate.textContent=nice(date,{weekday:"long",day:"numeric",month:"long"});
  if(document.getElementById("showDateInput")) showDateInput.value=date;
  showName.value=s.name||"";
  venue.value=s.venue||"";
  setTime.value=s.setTime||"";
  departureAirport.value=s.departureAirport||"";
  terminal.value=s.terminal||"";
  departureTime.value=s.departureTime||"";
  flightInfo.value=s.flightInfo||"";
  arrivalAirport.value=s.arrivalAirport||"";
  arrivalTime.value=s.arrivalTime||"";
  docsNotes.value=s.docsNotes||"";
  noTransport.checked=!!s.noTransport;
  airportHotelDriverName.value=s.airportHotelDriverName||"";
  airportHotelDriverPhone.value=s.airportHotelDriverPhone||"";
  airportHotelTransfer.value=s.airportHotelTransfer||"";
  hotel.value=s.hotel||"";
  hotelAddress.value=s.hotelAddress||"";
  hotelNotes.value=s.hotelNotes||"";
  hotelVenueDriverName.value=s.hotelVenueDriverName||"";
  hotelVenueDriverPhone.value=s.hotelVenueDriverPhone||"";
  hotelVenueTransfer.value=s.hotelVenueTransfer||"";
  showNotes.value=s.notes||"";
  renderFilePreview();
  pickColour(selectedColour);
  editSheet.classList.add("active");
}
function closeEdit(){ editSheet.classList.remove("active"); }
function pickColour(c){
  selectedColour=c;
  document.querySelectorAll(".colourChoice").forEach(x=>x.classList.remove("active"));
  [...document.querySelectorAll(".colourChoice")].find(x=>x.getAttribute("onclick").includes(c))?.classList.add("active");
}
function saveShow(){
  const originalDate = selectedDate;
  const targetDate = (document.getElementById("showDateInput") && showDateInput.value) ? showDateInput.value : selectedDate;

  const prev = show(originalDate);
  const movedExisting = targetDate !== originalDate ? (state.shows[targetDate] || {}) : prev;

  state.shows[targetDate]={
    ...movedExisting,
    ...prev,
    name:showName.value,
    colour:selectedColour,
    venue:venue.value,
    setTime:setTime.value,
    departureAirport:departureAirport.value,
    terminal:terminal.value,
    departureTime:departureTime.value,
    flightInfo:flightInfo.value,
    arrivalAirport:arrivalAirport.value,
    arrivalTime:arrivalTime.value,
    docsNotes:docsNotes.value,
    noTransport:noTransport.checked,
    airportHotelDriverName:airportHotelDriverName.value,
    airportHotelDriverPhone:airportHotelDriverPhone.value,
    airportHotelTransfer:airportHotelTransfer.value,
    hotel:hotel.value,
    hotelAddress:hotelAddress.value,
    hotelNotes:hotelNotes.value,
    hotelVenueDriverName:hotelVenueDriverName.value,
    hotelVenueDriverPhone:hotelVenueDriverPhone.value,
    hotelVenueTransfer:hotelVenueTransfer.value,
    notes:showNotes.value,
    files:prev.files||movedExisting.files||[],
    tripDone:prev.tripDone||movedExisting.tripDone||{},
    tripActive:prev.tripActive||false,
    completed:false
  };

  if(targetDate !== originalDate){
    delete state.shows[originalDate];
    selectedDate = targetDate;
  }

  closeEdit();
  save();
}
function deleteShow(){
  delete state.shows[selectedDate];
  closeEdit();
  save();
}
function handleUpload(e){
  const file=e.target.files[0];
  if(!file || !selectedDate) return;
  Promise.resolve(uploadShowFile(selectedDate, file))
    .then(()=>renderFilePreview())
    .catch(err=>{
      console.error("Upload failed", err);
      alert("Upload failed. Try a smaller image or screenshot.");
    });
  e.target.value="";
}
function fileCardPreviewHtml(f, date, i){
  const inline = (f.data && f.data.startsWith("data:image")) ? f.data : (f.url && isImageFile(f) ? f.url : "");
  const img = inline ? `<img src="${inline}" onclick="openFile('${date}',${i})">` : "";
  return `<div class="fileCard">${img}<div class="fileCardName">${f.name}</div><button class="btn danger" style="width:100%;margin-top:8px" onclick="removeFile(${i})">Remove</button></div>`;
}
async function renderFilePreview(){
  const s=show(selectedDate);
  const list=files(s);
  await Promise.all(list.map(f=>f.storagePath && !f.data && !f.url ? resolveFileUrl(f) : null));
  filePreview.innerHTML=list.map((f,i)=>fileCardPreviewHtml(f, selectedDate, i)).join("");
}
function removeFile(i){
  show(selectedDate).files.splice(i,1);
  persist();
  renderFilePreview();
}
async function openFile(date,i){
  const f=show(date).files[i];
  if(!f) return;
  fileViewerTitle.textContent=f.name||"Document";
  let src=f.data||f.url||"";
  if(!src && f.storagePath) src=await resolveFileUrl(f);
  if(src && isImageFile(f)){
    fileViewerContent.innerHTML=`<img style="width:100%;border-radius:20px;border:1px solid var(--line)" src="${src}">`;
  }else if(src){
    fileViewerContent.innerHTML=`<a class="actionLink" href="${src}" download="${f.name}" target="_blank" rel="noopener">Download / open file</a>`;
  }else{
    fileViewerContent.innerHTML=`<p>Could not load this document preview.</p>`;
  }
  fileViewer.classList.add("active");
}
function closeFile(){ fileViewer.classList.remove("active"); }
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
}

/* Date action handling */
let selectedContentType = "Instagram";

function ensureShow(date){
  const s = show(date);
  if(!s.files) s.files=[];
  if(!s.tripDone) s.tripDone={};
  return s;
}
function openDateActions(e){
  e?.preventDefault();
  e?.stopPropagation();
  if(popTimer) clearTimeout(popTimer);
  closePopover();
  const s = state.shows[selectedDate] || {};
  dateActionMeta.textContent = nice(selectedDate,{weekday:"long",day:"numeric",month:"long"});
  dateActionTitle.textContent = s.name ? s.name : "No show added";
  dateActionSub.textContent = s.venue || "Add a show or content/action piece.";
  dateActionSheet.classList.add("active");
}
function closeDateActions(){
  dateActionSheet.classList.remove("active");
}
function actionEditShow(){
  closeDateActions();
  openEdit(selectedDate);
}
function actionOpenItinerary(){
  closeDateActions();
  if(!state.shows[selectedDate]){
    openEdit(selectedDate);
    return;
  }
  openItinerary(selectedDate);
}
function actionContentPiece(){
  closeDateActions();
  openContentSheet(selectedDate);
}
function openContentSheet(date){
  selectedDate = date;
  ensureShow(date);
  contentDateMeta.textContent = nice(date,{weekday:"long",day:"numeric",month:"long"});
  if(document.getElementById("contentDateInput")) contentDateInput.value=date;
  selectedContentType = "Instagram";
  contentTitle.value="";
  contentNotes.value="";
  pickContentType("Instagram");
  contentSheet.classList.add("active");
}
function closeContentSheet(){
  contentSheet.classList.remove("active");
}
function pickContentType(type){
  selectedContentType = type;
  document.querySelectorAll(".contentTypeBtn").forEach(b=>b.classList.remove("active"));
  const map={Instagram:"ctInstagram",TikTok:"ctTikTok",YouTube:"ctYouTube",Action:"ctOther"};
  document.getElementById(map[type])?.classList.add("active");
}
function saveContentPiece(){
  const targetDate = (document.getElementById("contentDateInput") && contentDateInput.value) ? contentDateInput.value : selectedDate;
  selectedDate = targetDate;
  const s = ensureShow(targetDate);
  if(!s.contentPieces) s.contentPieces=[];
  const title = contentTitle.value.trim();
  const notes = contentNotes.value.trim();
  if(!title && !notes){
    closeContentSheet();
    return;
  }
  s.contentPieces.push({
    id:"cp"+Date.now(),
    type:selectedContentType,
    title:title || selectedContentType+" action",
    notes,
    done:false
  });
  persist();
  closeContentSheet();
  renderAll();
}

/* Extend show cards/read-only views with saved content pieces */
const originalRenderShowsDateActions = renderShows;
renderShows = function(){
  originalRenderShowsDateActions();
  document.querySelectorAll("[data-show-date]").forEach(card=>{
    const date=card.getAttribute("data-show-date");
    const s=show(date);
    if(!s.contentPieces || !s.contentPieces.length || card.querySelector(".contentPiecePreview")) return;
    const target=card.querySelector(".showBody") || card;
    const html=`<button class="smallRow contentPiecePreview" onclick="openContentList('${date}')">
      <div class="smallRowLeft"><div class="smallIcon">✦</div><div><h3>Content / actions</h3><p>${s.contentPieces.length} saved for this date</p></div></div><div class="chev">›</div>
    </button>`;
    const notesBtn=[...target.querySelectorAll(".smallRow")].find(x=>x.textContent.includes("Notes"));
    if(notesBtn) notesBtn.insertAdjacentHTML("beforebegin", html);
  });
};
function openContentList(date){
  selectedDate=date;
  const s=show(date);
  detailMeta.textContent=nice(date);
  detailTitle.textContent="Content / actions";
  detailSub.textContent=(s.contentPieces||[]).length+" saved";
  detailContent.innerHTML=(s.contentPieces||[]).map((p,i)=>`
    <div class="viewCard">
      <div class="meta">${p.type}</div>
      <h3>${p.title}</h3>
      <p>${p.notes||""}</p>
      <button class="btn ${p.done?'green':'dark'}" style="margin-top:10px" onclick="toggleContentPiece('${date}',${i})">${p.done?'Done':'Mark done'}</button>
    </div>
  `).join("") || "<p>No content/actions saved.</p>";
  detailSheet.classList.add("active");
}
function toggleContentPiece(date,i){
  const s=show(date);
  if(!s.contentPieces || !s.contentPieces[i]) return;
  s.contentPieces[i].done=!s.contentPieces[i].done;
  persist();
  openContentList(date);
}
