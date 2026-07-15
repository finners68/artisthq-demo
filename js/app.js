function go(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  [...document.querySelectorAll(".tab")].find(t=>t.textContent.toLowerCase().includes(id==="today"?"today":id))?.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderAll(){
  renderToday();
  renderCalendar(miniCal,false);
  renderCalendar(calendar,true);
  renderShows();
  renderIdeas();
  renderNotes();
}
function renderToday(){
  todayDate.textContent = appToday.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  const upcoming = Object.entries(state.shows).filter(([d,s])=>d>=k(appToday)&&!s.completed).sort();
  if(upcoming[0]){
    nextShowTitle.textContent = title(upcoming[0][1]);
    nextShowMeta.textContent = nice(upcoming[0][0])+" · "+(upcoming[0][1].venue||"");
  }else{
    nextShowTitle.textContent = "No show";
    nextShowMeta.textContent = "Tap a calendar date to add one.";
  }
  latestIdeas.innerHTML="";
  state.ideas.forEach(i=>{
    const el=document.createElement("div");
    el.className="ideaSlide";
    el.onclick=()=>go("ideas");
    el.innerHTML=`<div class="meta" style="color:var(--orange)">${i.cat}</div><h3>${i.title}</h3><p>${i.note||""}</p>`;
    latestIdeas.appendChild(el);
  });
}
function openNextShow(){
  const upcoming = Object.entries(state.shows).filter(([d,s])=>d>=k(appToday)&&!s.completed).sort();
  go("tours");
  if(upcoming[0]) setTimeout(()=>document.querySelector(`[data-show-date="${upcoming[0][0]}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),150);
}
/* Realtime sync + infinite window stability */
let liveToastTimer = null;
let liveRenderQueued = false;

function liveToast(msg="Saved"){
  if(!document.getElementById("liveToast")) return;
  liveToast.textContent = msg;
  liveToast.classList.add("show");
  clearTimeout(liveToastTimer);
  liveToastTimer = setTimeout(()=>liveToast.classList.remove("show"),900);
}
function liveQueueRender(reason=""){
  if(liveRenderQueued) return;
  liveRenderQueued = true;
  requestAnimationFrame(()=>{
    liveRenderQueued = false;
    const openSheets = [...document.querySelectorAll(".sheetOverlay.active")].map(x=>x.id);
    if(typeof renderToday==="function") renderToday();
    if(typeof renderCalendar==="function"){
      if(document.getElementById("miniCal")) renderCalendar(miniCal,false);
      if(document.getElementById("calendar")) renderCalendar(calendar,true);
    }
    if(typeof renderShows==="function") renderShows();
    if(typeof renderIdeas==="function") renderIdeas();
    if(typeof renderNotes==="function") renderNotes();
    openSheets.forEach(id=>document.getElementById(id)?.classList.add("active"));
    if(typeof repairPatchButtons==="function") repairPatchButtons();
  });
}
function livePersist(msg){
  persist();
  liveQueueRender(msg);
  if(msg) liveToast(msg);
}
const liveOriginalPersist = typeof persist === "function" ? persist : null;
persist = function(){
  localStorage.setItem(KEY, JSON.stringify(state));
  if(typeof queueSync === "function") queueSync();
  liveQueueRender();
};
const liveOriginalSave = typeof save === "function" ? save : null;
save = function(){
  localStorage.setItem(KEY, JSON.stringify(state));
  if(typeof queueSync === "function") queueSync();
  liveQueueRender("Saved");
};

/* Make overlays reusable forever */
function closeAllTransientSheets(exceptId=null){
  document.querySelectorAll(".sheetOverlay.active").forEach(el=>{
    if(el.id !== exceptId) el.classList.remove("active");
  });
}
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    const active=[...document.querySelectorAll(".sheetOverlay.active")].pop();
    if(active) active.classList.remove("active");
    document.body.classList.toggle("modal-open",!!document.querySelector(".sheetOverlay.active"));
  }
});
document.addEventListener("click",e=>{
  const overlay=e.target.classList && e.target.classList.contains("sheetOverlay") ? e.target : null;
  if(overlay){
    overlay.classList.remove("active");
    document.body.classList.toggle("modal-open",!!document.querySelector(".sheetOverlay.active"));
  }
}, true);
const liveObserver = new MutationObserver(()=>{
  document.body.classList.toggle("modal-open",!!document.querySelector(".sheetOverlay.active"));
});
liveObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});

/* Fix date changes and ensure submitted events hit calendar/upcoming immediately */
if(typeof saveShow === "function"){
  const livePrevSaveShow = saveShow;
  saveShow = function(){
    const beforeDate = selectedDate;
    const targetDate = (document.getElementById("showDateInput") && showDateInput.value) ? showDateInput.value : selectedDate;
    livePrevSaveShow();
    selectedDate = targetDate;
    // Force show to be upcoming unless explicitly completed
    if(state.shows && state.shows[targetDate]){
      state.shows[targetDate].completed = !!state.shows[targetDate].completed && false;
      if(!state.shows[targetDate].files) state.shows[targetDate].files=[];
      if(!state.shows[targetDate].tripDone) state.shows[targetDate].tripDone={};
    }
    persist();
    liveQueueRender("Show saved");
    setTimeout(()=>{
      if(typeof go==="function") go("tours");
      document.querySelector(`[data-show-date="${targetDate}"]`)?.scrollIntoView({behavior:"smooth",block:"center"});
      if(typeof repairPatchButtons==="function") repairPatchButtons();
    },60);
  };
}

/* Ensure date action / edit sheets can reopen repeatedly */
if(typeof openEdit === "function"){
  const liveOpenEdit = openEdit;
  openEdit = function(date){
    closeAllTransientSheets("editSheet");
    selectedDate = date;
    liveOpenEdit(date);
    if(document.getElementById("showDateInput")) showDateInput.value = date;
    setTimeout(()=>editSheet.classList.add("active"),0);
  };
}
if(typeof closeEdit === "function"){
  const liveCloseEdit = closeEdit;
  closeEdit = function(){
    liveCloseEdit();
    editSheet?.classList.remove("active");
  };
}
if(typeof openDateActions === "function"){
  const liveOpenDateActions = openDateActions;
  openDateActions = function(e){
    e?.preventDefault();
    e?.stopPropagation();
    closeAllTransientSheets("dateActionSheet");
    liveOpenDateActions(e);
    setTimeout(()=>dateActionSheet.classList.add("active"),0);
  };
}
if(typeof closeDateActions === "function"){
  const liveCloseDateActions = closeDateActions;
  closeDateActions = function(){
    liveCloseDateActions();
    dateActionSheet?.classList.remove("active");
  };
}
if(typeof openContentSheet === "function"){
  const liveOpenContentSheet = openContentSheet;
  openContentSheet = function(date){
    closeAllTransientSheets("contentSheet");
    liveOpenContentSheet(date);
    if(document.getElementById("contentDateInput")) contentDateInput.value = date;
    setTimeout(()=>contentSheet.classList.add("active"),0);
  };
}
if(typeof closeContentSheet === "function"){
  const liveCloseContentSheet = closeContentSheet;
  closeContentSheet = function(){
    liveCloseContentSheet();
    contentSheet?.classList.remove("active");
  };
}

/* Keep repair trip windows reusable and synced */
if(typeof repairOpen === "function"){
  const liveRepairOpen = repairOpen;
  repairOpen = function(date,isTrip){
    closeAllTransientSheets("repairTripSheet");
    liveRepairOpen(date,isTrip);
    setTimeout(()=>{
      repairTripSheet?.classList.add("active");
      if(typeof repairPatchButtons==="function") repairPatchButtons();
    },0);
  };
}
if(typeof repairClose === "function"){
  const liveRepairClose = repairClose;
  repairClose = function(){
    liveRepairClose();
    repairTripSheet?.classList.remove("active");
  };
}
if(typeof repairCloseDetail === "function"){
  const liveRepairCloseDetail = repairCloseDetail;
  repairCloseDetail = function(){
    liveRepairCloseDetail();
    repairDetailSheet?.classList.remove("active");
  };
}
if(typeof repairToggle === "function"){
  const liveRepairToggle = repairToggle;
  repairToggle = function(id,e){
    liveRepairToggle(id,e);
    livePersist("Checklist updated");
    if(repairDate && state.shows && state.shows[repairDate]){
      state.shows[repairDate].tripActive = true;
    }
    setTimeout(()=>{
      if(typeof repairRender==="function") repairRender();
      if(typeof repairPatchButtons==="function") repairPatchButtons();
    },0);
  };
}
if(typeof repairComplete === "function"){
  const liveRepairComplete = repairComplete;
  repairComplete = function(date){
    liveRepairComplete(date);
    livePersist("Trip completed");
    setTimeout(()=>setShowTab && setShowTab("past"),80);
  };
}

/* Patch visible active trip mini checklist so ticks also work there */
document.addEventListener("click",e=>{
  const mini = e.target.closest(".activeTripStep");
  if(!mini) return;
  const card=mini.closest("[data-show-date]");
  if(!card) return;
  const date=card.getAttribute("data-show-date");
  const meta=mini.querySelector(".meta")?.textContent || "";
  const stepIndex=(parseInt((meta.match(/\d+/)||["0"])[0],10)-1);
  const steps = typeof repairStepsFor==="function" ? repairStepsFor(date) : (typeof tripSteps==="function" ? tripSteps(date) : []);
  const step = steps[stepIndex];
  if(step && typeof repairOpen==="function"){
    repairOpen(date,true);
    setTimeout(()=>repairDetail(step.id),100);
  }
}, true);

/* Autosave fields while edit sheet is open, but debounce to avoid fighting typing */
let liveFieldTimer=null;
document.addEventListener("input",e=>{
  if(!e.target.closest("#editSheet")) return;
  clearTimeout(liveFieldTimer);
  liveFieldTimer=setTimeout(()=>{
    // Only live-sync to current in-memory show, don't close the sheet
    const date=(document.getElementById("showDateInput")&&showDateInput.value)||selectedDate;
    if(!date || !state.shows) return;
    const current=state.shows[selectedDate] || {files:[],tripDone:{}};
    const draft={...current};
    const map = {
      showName:"name", venue:"venue", setTime:"setTime", departureAirport:"departureAirport",
      terminal:"terminal", departureTime:"departureTime", flightInfo:"flightInfo",
      arrivalAirport:"arrivalAirport", arrivalTime:"arrivalTime", docsNotes:"docsNotes",
      airportHotelDriverName:"airportHotelDriverName", airportHotelDriverPhone:"airportHotelDriverPhone",
      airportHotelTransfer:"airportHotelTransfer", hotel:"hotel", hotelAddress:"hotelAddress",
      hotelNotes:"hotelNotes", hotelVenueDriverName:"hotelVenueDriverName",
      hotelVenueDriverPhone:"hotelVenueDriverPhone", hotelVenueTransfer:"hotelVenueTransfer",
      showNotes:"notes"
    };
    Object.entries(map).forEach(([id,key])=>{
      const el=document.getElementById(id);
      if(el) draft[key]=el.value;
    });
    draft.noTransport=!!document.getElementById("noTransport")?.checked;
    draft.colour=selectedColour||draft.colour||"orange";
    draft.files=current.files||[];
    draft.tripDone=current.tripDone||{};
    draft.tripActive=current.tripActive||false;
    draft.completed=current.completed||false;
    state.shows[date]=draft;
    if(date!==selectedDate && state.shows[selectedDate] && !state.shows[selectedDate].name){
      delete state.shows[selectedDate];
    }
    selectedDate=date;
    persist();
    liveQueueRender();
  },350);
}, true);

/* Watch localStorage-style data changes from this window and repaint often */
setInterval(()=>{
  if(typeof repairPatchButtons==="function") repairPatchButtons();
  // keep calendar / active cards current without hard refresh
  const activeEdit=!!document.querySelector("#editSheet.active");
  if(!activeEdit) liveQueueRender();
},1500);

setTimeout(()=>{
  liveQueueRender();
  if(typeof repairPatchButtons==="function") repairPatchButtons();
},250);


/* FINAL calendar date + trip checklist reliability fix */

// Fix local calendar date keys. toISOString can shift UK summer dates by one day.
function localKey(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
k = localKey;

// Steps used for tickable Trip Mode. Notes are intentionally not a checklist item.
function fixedChecklistSteps(date){
  const s = (typeof repairGet==="function") ? repairGet(date) : show(date);
  const no = s.noTransport || s.noTransportUber;
  const v = (a,b)=>s[a] || (b?s[b]:"") || "";
  const map = (q,label)=>q ? `<div class="actions"><a class="actionLink" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}">${label}</a></div>` : "";
  return [
    {id:"depart",title:"Departure airport",detail:[v("departureAirport","airport"),v("terminal","airportTerminal"),v("departureTime")].filter(Boolean).join("\n"),actions:map([v("departureAirport","airport"),v("terminal","airportTerminal")].filter(Boolean).join(" "),"Open Maps")},
    {id:"flight",title:"Flight / travel",detail:[v("flightInfo","flights"),v("departureTime")?("Depart "+v("departureTime")):"",v("arrivalTime")?("Arrive "+v("arrivalTime")):""].filter(Boolean).join("\n")},
    {id:"docs",title:"Boarding cards / documents",detail:v("docsNotes","docs") || "No document notes.",docs:true},
    {id:"arrival",title:"Arrival airport",detail:[v("arrivalAirport","airport"),v("arrivalTime")].filter(Boolean).join("\n"),actions:map(v("arrivalAirport","airport"),"Open Maps")},
    {id:"transfer1",title:"Airport → hotel transfer",detail:no?"No transport — please Uber":[v("airportHotelDriverName","driverName"),v("airportHotelDriverPhone","driverPhone"),v("airportHotelTransfer","transfers")].filter(Boolean).join("\n"),phone:v("airportHotelDriverPhone","driverPhone")},
    {id:"hotel",title:"Hotel",detail:[v("hotel"),v("hotelAddress"),v("hotelNotes","hotelCheckin")].filter(Boolean).join("\n"),actions:map([v("hotel"),v("hotelAddress")].filter(Boolean).join(" "),"Open Hotel")},
    {id:"transfer2",title:"Hotel → venue transfer",detail:no?"No transport — please Uber":[v("hotelVenueDriverName"),v("hotelVenueDriverPhone"),v("hotelVenueTransfer","hotelToVenue")].filter(Boolean).join("\n"),phone:v("hotelVenueDriverPhone")},
    {id:"venue",title:"Venue / set time",detail:[v("venue"),v("setTime")].filter(Boolean).join("\n"),actions:map([v("venue"),s.name||s.action].filter(Boolean).join(" "),"Open Venue")}
  ];
}
function fixedNotesStep(date){
  const s=(typeof repairGet==="function") ? repairGet(date) : show(date);
  return {id:"notes",title:"Notes",detail:s.notes || "No notes"};
}

// Override old trip step helpers so all views use same tickable list without Notes.
if(typeof repairStepsFor==="function"){
  repairStepsFor = fixedChecklistSteps;
}
if(typeof tripSteps==="function"){
  tripSteps = fixedChecklistSteps;
}

// Make calendar render use local keys and repaint immediately.
if(typeof renderCalendar==="function"){
  renderCalendar = function(target, full){
    if(!target) return;
    target.innerHTML="";
    if(full && document.getElementById("monthTitle")) monthTitle.textContent = currentMonth.toLocaleString("en-GB",{month:"long",year:"numeric"});
    ["M","T","W","T","F","S","S"].forEach(x=>{
      const h=document.createElement("div");
      h.className="dayHead";
      h.textContent=x;
      target.appendChild(h);
    });
    const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
    const offset=(new Date(y,m,1).getDay()+6)%7;
    const days=new Date(y,m+1,0).getDate();
    const today=localKey(appToday);
    for(let i=0;i<offset;i++) target.appendChild(document.createElement("div"));
    for(let d=1;d<=days;d++){
      const date=new Date(y,m,d), key=localKey(date), s=state.shows[key], pct=s?(typeof completion==="function"?completion(s):0):0;
      const el=document.createElement("div");
      el.className="day "+(key===today?"today ":"")+(s&&pct>=100?"completeDay":"");
      el.onclick=(ev)=>openDatePopover(key,ev);
      const c=s?(pct>=100?"greenBg":((s.colour||"orange")+"Bg")):"";
      el.innerHTML=`<div class="date">${d}</div>${key===today?'<span class="todayMarker"></span>':''}${s?'<span class="eventBar '+c+'"></span>':''}`;
      target.appendChild(el);
    }
  };
}

// Ensure saving a date uses selected local date and updates calendar/upcoming instantly.
if(typeof saveShow==="function" && !window.__finalSaveShowPatched){
  window.__finalSaveShowPatched=true;
  const prevSaveShow=saveShow;
  saveShow=function(){
    const targetDate=(document.getElementById("showDateInput") && showDateInput.value) ? showDateInput.value : selectedDate;
    prevSaveShow();
    selectedDate=targetDate;
    if(state.shows && state.shows[targetDate]){
      state.shows[targetDate].completed=false;
      if(!state.shows[targetDate].files) state.shows[targetDate].files=[];
      if(!state.shows[targetDate].tripDone) state.shows[targetDate].tripDone={};
    }
    persist();
    if(typeof renderAll==="function") renderAll();
    setTimeout(()=>{
      if(typeof go==="function") go("tours");
      document.querySelector(`[data-show-date="${targetDate}"]`)?.scrollIntoView({behavior:"smooth",block:"center"});
      if(typeof repairPatchButtons==="function") repairPatchButtons();
    },50);
  };
}

// Active card: tick circles toggle directly. Notes is displayed as read-only if needed.
function fixedToggleFromCard(date,id,e){
  if(e){e.preventDefault();e.stopPropagation();}
  const s=(typeof repairGet==="function") ? repairGet(date) : show(date);
  if(!s.tripDone) s.tripDone={};
  s.tripDone[id]=!s.tripDone[id];
  persist();
  if(typeof renderAll==="function") renderAll();
  setTimeout(()=>{
    document.querySelector(`[data-show-date="${date}"]`)?.scrollIntoView({behavior:"smooth",block:"center"});
    if(typeof repairPatchButtons==="function") repairPatchButtons();
  },30);
}
function fixedOpenTripFromCard(date,e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(typeof repairOpen==="function") repairOpen(date,true);
  else if(typeof openTrip==="function") openTrip(date,true);
}
function fixedOpenStepDetail(date,id,e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(typeof repairOpen==="function"){
    repairOpen(date,true);
    setTimeout(()=>repairDetail(id),120);
  }else if(typeof openTrip==="function"){
    openTrip(date,true);
    setTimeout(()=>openStepDetail(id),120);
  }
}

// Override active trip card HTML to remove tickable Notes and make tick circles work.
if(typeof activeTripHTML==="function"){
  activeTripHTML=function(date,s){
    const steps=fixedChecklistSteps(date);
    const done=steps.filter(st=>s.tripDone&&s.tripDone[st.id]).length;
    const pct=Math.round(done/steps.length*100);
    const list=steps.map((st,i)=>`
      <div class="activeTripStep ${s.tripDone&&s.tripDone[st.id]?'done':''}">
        <button class="tickMini" onclick="fixedToggleFromCard('${date}','${st.id}',event)">✓</button>
        <div onclick="fixedOpenStepDetail('${date}','${st.id}',event)">
          <div class="meta">Step ${i+1}</div>
          <h3>${st.title}</h3>
          <p>${st.detail||"Not added yet"}</p>
        </div>
      </div>`).join("");
    const notes=fixedNotesStep(date);
    const notesHtml = s.notes ? `<div class="activeTripStep readOnly"><div><div class="meta">Notes</div><h3>Notes</h3><p>${notes.detail}</p></div></div>` : "";
    return `<div class="showBody">
      <div class="activeTripCard">
        <div class="tripPill">Trip Mode Active</div>
        <h2>${title(s)}</h2>
        <p>${[s.venue,s.setTime].filter(Boolean).join(" · ")}</p>
        <div class="progress"><div class="progressFill" style="width:${pct}%;background:${pct===100?'var(--green)':'var(--orange)'}"></div></div>
        <p style="margin-top:8px">${pct}% complete</p>
        <div class="activeTripSteps">${list}${notesHtml}</div>
        <div class="grid2" style="margin-top:12px">
          <button class="btn" onclick="fixedOpenTripFromCard('${date}',event)">Open Trip</button>
          <button class="btn dark" onclick="completeTrip('${date}')">Complete</button>
        </div>
      </div>
    </div>`;
  };
}

// Repair sheet should also not show Notes as tickable; add read-only notes at bottom.
if(typeof repairRender==="function" && !window.__repairRenderNoNotesPatched){
  window.__repairRenderNoNotesPatched=true;
  repairRender=function(){
    const s=repairGet(repairDate);
    const steps=fixedChecklistSteps(repairDate);
    const done=steps.filter(st=>s.tripDone&&s.tripDone[st.id]).length;
    const pct=Math.round(done/steps.length*100);
    repairProgressText.textContent=pct+"% complete";
    repairProgressFill.style.width=pct+"%";
    repairProgressFill.style.background=pct===100?"var(--green)":"var(--orange)";
    repairSteps.innerHTML="";
    steps.forEach((st,i)=>{
      const row=document.createElement("div");
      row.className="repairStep "+(s.tripDone&&s.tripDone[st.id]?"done":"");
      row.innerHTML=`<button class="repairTick" onclick="repairToggle('${st.id}',event)">✓</button>
        <div onclick="repairDetail('${st.id}',event)">
          <div class="meta">Step ${i+1}</div>
          <h3>${st.title}</h3>
          <p>${st.detail||"Not added yet"}</p>
          ${st.action||""}
          ${st.phone?repairContacts(st.phone):""}
          ${st.docs?repairDocsHTML(repairDate):""}
        </div>
        <button class="repairMore" onclick="repairDetail('${st.id}',event)">›</button>`;
      repairSteps.appendChild(row);
    });
    const notes=fixedNotesStep(repairDate);
    if(notes.detail && notes.detail!=="No notes"){
      const note=document.createElement("div");
      note.className="repairStep readOnly";
      note.innerHTML=`<div></div><div><div class="meta">Read-only</div><h3>Notes</h3><p>${notes.detail}</p></div><div></div>`;
      repairSteps.appendChild(note);
    }
    if(repairTripMode){
      const complete=document.createElement("button");
      complete.className="btn green";
      complete.style.width="100%";
      complete.style.marginTop="12px";
      complete.textContent="✓ Complete Trip & Move to Past";
      complete.onclick=()=>repairComplete(repairDate);
      repairSteps.appendChild(complete);
    }
  };
}

// Open Trip button hard fallback.
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const txt=btn.textContent.trim().toLowerCase();
  if(txt!=="open trip") return;
  const card=btn.closest("[data-show-date]");
  if(!card) return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  fixedOpenTripFromCard(card.getAttribute("data-show-date"),e);
},true);

setTimeout(()=>{ if(typeof renderAll==="function") renderAll(); },100);


/* Boarding card / Open Trip safety fix */
function safeFileListForDate(date){
  try{
    const s = (typeof repairGet==="function") ? repairGet(date) : (typeof show==="function" ? show(date) : (state.shows[date]||{}));
    const list = s.files || s.docsFiles || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }catch(e){
    console.warn("safeFileListForDate failed", e);
    return [];
  }
}
function safeEscape(str){
  return String(str||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}
function safeOpenUploadedFile(date,i){
  try{
    const f=safeFileListForDate(date)[i];
    if(!f) return;
    if(typeof openFile==="function"){
      openFile(date,i);
      return;
    }
    if(document.getElementById("fileViewer")){
      fileViewerTitle.textContent=f.name||"Document";
      const data=f.data||"";
      fileViewerContent.innerHTML=data.startsWith("data:image")
        ? `<img style="width:100%;border-radius:20px;border:1px solid var(--line)" src="${data}">`
        : `<a class="actionLink" href="${data}" download="${safeEscape(f.name||"document")}">Open / download file</a>`;
      fileViewer.classList.add("active");
    }
  }catch(e){
    console.error("safeOpenUploadedFile failed", e);
    alert("Could not open this document preview.");
  }
}
function safeDocsGridHTML(date){
  const fs=safeFileListForDate(date);
  if(!fs.length) return "<p>No boarding cards uploaded.</p>";
  return `<div class="docsGrid">`+fs.map((f,i)=>{
    const name=safeEscape(f.name||"Document");
    return `<div class="docCard" data-file-index="${i}" onclick="safeOpenUploadedFile('${date}',${i})">${docCardPreviewInner(f)}<p>${name}</p></div>`;
  }).join("")+`</div>`;
}

/* Override all document render helpers safely */
if(typeof docsHTML==="function"){
  docsHTML=function(date){ return safeDocsGridHTML(date); };
}
if(typeof repairDocsHTML==="function"){
  repairDocsHTML=function(date){ return safeDocsGridHTML(date); };
}

/* Harden Open Trip so a docs/render error cannot stop the button */
if(typeof fixedOpenTripFromCard==="function"){
  const oldFixedOpenTripFromCard=fixedOpenTripFromCard;
  fixedOpenTripFromCard=function(date,e){
    try{
      oldFixedOpenTripFromCard(date,e);
    }catch(err){
      console.error("Open Trip failed, using fallback", err);
      if(typeof repairOpen==="function"){
        try{ repairOpen(date,true); return; }catch(e2){ console.error(e2); }
      }
      if(typeof openTrip==="function"){
        try{ openTrip(date,true); return; }catch(e3){ console.error(e3); }
      }
      alert("Open Trip hit a document preview bug. The file has been saved, but this view needs reopening.");
    }
  };
}
if(typeof repairOpen==="function"){
  const oldRepairOpen=repairOpen;
  repairOpen=function(date,isTrip){
    try{
      oldRepairOpen(date,isTrip);
    }catch(err){
      console.error("repairOpen failed, rendering simplified trip", err);
      repairDate=date;
      repairTripMode=!!isTrip;
      repairModeLabel.textContent=isTrip?"Trip Mode":"Full itinerary";
      const s=repairGet(date);
      repairTitle.textContent=(s.name||s.action||"Trip");
      repairSub.textContent=[s.venue,s.setTime].filter(Boolean).join(" · ");
      repairSteps.innerHTML=`<div class="viewCard"><h3>${s.name||"Trip"}</h3><p>Document preview was protected. Try opening the boarding card from Edit Main Details if it does not appear here.</p>${safeDocsGridHTML(date)}</div>`;
      repairTripSheet.classList.add("active");
    }
  };
}

/* Direct delegated handler for Open Trip after file upload */
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const txt=btn.textContent.trim().toLowerCase();
  if(txt!=="open trip") return;
  const card=btn.closest("[data-show-date]");
  if(!card) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  const date=card.getAttribute("data-show-date");
  try{
    if(typeof repairOpen==="function") repairOpen(date,true);
    else if(typeof openTrip==="function") openTrip(date,true);
  }catch(err){
    console.error("delegated Open Trip fallback failed", err);
    alert("Open Trip could not render. The uploaded file is saved, but the view hit a preview error.");
  }
},true);

/* After any upload, repaint buttons without breaking state */
if(typeof handleUpload==="function" && !window.__uploadSafePatched){
  window.__uploadSafePatched=true;
  const oldHandleUpload=handleUpload;
  handleUpload=function(e){
    try{
      oldHandleUpload(e);
      setTimeout(()=>{
        if(typeof renderAll==="function") renderAll();
        if(typeof repairPatchButtons==="function") repairPatchButtons();
      },250);
    }catch(err){
      console.error("Upload failed", err);
      alert("Upload failed. Try a smaller image or screenshot.");
    }
  };
}


/* Trip detail reset: Open Trip always returns to full checklist */
let activeTripDetailStep = null;

function resetTripDetailState(){
  activeTripDetailStep = null;
  ["detailSheet","repairDetailSheet","workingDetailSheet","safeDetailSheet"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){
      el.classList.remove("active");
      el.classList.remove("forceHidden");
    }
  });
}

/* Make every trip open start clean */
if(typeof repairOpen === "function" && !window.__repairOpenResetPatched){
  window.__repairOpenResetPatched = true;
  const oldRepairOpenReset = repairOpen;
  repairOpen = function(date,isTrip){
    resetTripDetailState();
    oldRepairOpenReset(date,isTrip);
    setTimeout(()=>{
      resetTripDetailState();
      const sheet=document.getElementById("repairTripSheet");
      if(sheet){
        sheet.classList.add("active");
        const panel=sheet.querySelector(".sheet,.sheetPanel");
        if(panel) panel.scrollTop=0;
      }
    },0);
  };
}
if(typeof openTrip === "function" && !window.__openTripResetPatched){
  window.__openTripResetPatched = true;
  const oldOpenTripReset = openTrip;
  openTrip = function(date,active){
    resetTripDetailState();
    oldOpenTripReset(date,active);
    setTimeout(()=>{
      resetTripDetailState();
      const sheet=document.getElementById("tripSheet");
      if(sheet){
        sheet.classList.add("active");
        const panel=sheet.querySelector(".sheet,.sheetPanel");
        if(panel) panel.scrollTop=0;
      }
    },0);
  };
}

/* Track but do not preserve selected detail after closing */
if(typeof repairDetail === "function" && !window.__repairDetailResetPatched){
  window.__repairDetailResetPatched = true;
  const oldRepairDetailReset = repairDetail;
  repairDetail = function(id,e){
    activeTripDetailStep = id;
    oldRepairDetailReset(id,e);
  };
}
if(typeof openStepDetail === "function" && !window.__openStepDetailResetPatched){
  window.__openStepDetailResetPatched = true;
  const oldOpenStepDetailReset = openStepDetail;
  openStepDetail = function(id,e){
    activeTripDetailStep = id;
    oldOpenStepDetailReset(id,e);
  };
}

/* Closing any detail resets selected state */
if(typeof repairCloseDetail === "function" && !window.__repairCloseDetailResetPatched){
  window.__repairCloseDetailResetPatched = true;
  const oldRepairCloseDetailReset = repairCloseDetail;
  repairCloseDetail = function(){
    oldRepairCloseDetailReset();
    resetTripDetailState();
  };
}
if(typeof closeDetail === "function" && !window.__closeDetailResetPatched){
  window.__closeDetailResetPatched = true;
  const oldCloseDetailReset = closeDetail;
  closeDetail = function(){
    oldCloseDetailReset();
    resetTripDetailState();
  };
}

/* Closing the main trip also clears selected detail */
if(typeof repairClose === "function" && !window.__repairCloseResetPatched){
  window.__repairCloseResetPatched = true;
  const oldRepairCloseReset = repairClose;
  repairClose = function(){
    oldRepairCloseReset();
    resetTripDetailState();
  };
}
if(typeof closeTripSheet === "function" && !window.__closeTripSheetResetPatched){
  window.__closeTripSheetResetPatched = true;
  const oldCloseTripSheetReset = closeTripSheet;
  closeTripSheet = function(){
    oldCloseTripSheetReset();
    resetTripDetailState();
  };
}

/* Overlay tap close should not leave detail active underneath */
document.addEventListener("click",function(e){
  if(e.target && e.target.classList && e.target.classList.contains("sheetOverlay")){
    if(["detailSheet","repairDetailSheet","workingDetailSheet","safeDetailSheet"].includes(e.target.id)){
      resetTripDetailState();
    }
  }
},true);

/* Hard override Open Trip buttons: always reset before opening */
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const text=btn.textContent.trim().toLowerCase();
  if(text!=="open trip" && text!=="start trip" && text!=="full itinerary") return;
  const card=btn.closest("[data-show-date]");
  if(!card) return;
  resetTripDetailState();
},true);


/* Checklist tap-zone + read-only itinerary fix */

// Tick click only toggles. It must not open detail.
document.addEventListener("click",function(e){
  const tick = e.target.closest(".tick,.repairTick,.tickMini");
  if(!tick) return;

  const card = tick.closest("[data-show-date]");
  const stepBox = tick.closest(".step,.repairStep,.activeTripStep");
  const idMatch = tick.getAttribute("onclick") || "";
  const id = (idMatch.match(/['"]([^'"]+)['"]/)||[])[1];

  if(id){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if(tick.classList.contains("tickMini") && card){
      const date = card.getAttribute("data-show-date");
      if(typeof fixedToggleFromCard === "function") fixedToggleFromCard(date,id,e);
      else {
        const s = (typeof repairGet==="function") ? repairGet(date) : show(date);
        if(!s.tripDone) s.tripDone={};
        s.tripDone[id]=!s.tripDone[id];
        persist();
        if(typeof renderAll==="function") renderAll();
      }
      return;
    }

    if(typeof repairToggle === "function" && tick.classList.contains("repairTick")){
      repairToggle(id,e);
      return;
    }

    if(typeof toggleStep === "function"){
      toggleStep(id,e);
      return;
    }
  }
},true);

// Full Itinerary should be read-only. No tick boxes until Trip Mode is active.
if(typeof repairOpen === "function" && !window.__readOnlyItinPatch){
  window.__readOnlyItinPatch = true;
  const oldRepairOpenReadOnly = repairOpen;
  repairOpen = function(date,isTrip){
    oldRepairOpenReadOnly(date,isTrip);
    const sheet = document.getElementById("repairTripSheet");
    if(sheet){
      sheet.classList.toggle("readOnlyItinerary", !isTrip);
    }
  };
}
if(typeof openTrip === "function" && !window.__readOnlyOpenTripPatch){
  window.__readOnlyOpenTripPatch = true;
  const oldOpenTripReadOnly = openTrip;
  openTrip = function(date,active){
    oldOpenTripReadOnly(date,active);
    const sheet = document.getElementById("tripSheet");
    if(sheet){
      sheet.classList.toggle("readOnlyItinerary", !active);
    }
  };
}

// Ensure card body opens detail only when not pressing the tick.
document.addEventListener("click",function(e){
  if(e.target.closest(".tick,.repairTick,.tickMini")) return;
  const step = e.target.closest(".step,.repairStep,.activeTripStep");
  if(!step) return;
  const btn = e.target.closest("button");
  if(btn && !btn.classList.contains("more") && !btn.classList.contains("repairMore")) return;
},true);

// When opening Full itinerary, force non-trip mode.
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const txt=btn.textContent.trim().toLowerCase();
  if(txt!=="full itinerary") return;
  const card=btn.closest("[data-show-date]");
  if(!card) return;
  const date=card.getAttribute("data-show-date");
  setTimeout(()=>{
    const sheet=document.getElementById("repairTripSheet") || document.getElementById("tripSheet");
    if(sheet) sheet.classList.add("readOnlyItinerary");
  },50);
},true);

// When opening/starting Trip, force checklist mode with ticks visible.
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const txt=btn.textContent.trim().toLowerCase();
  if(txt!=="open trip" && txt!=="start trip") return;
  setTimeout(()=>{
    const sheet=document.getElementById("repairTripSheet") || document.getElementById("tripSheet");
    if(sheet) sheet.classList.remove("readOnlyItinerary");
  },50);
},true);


/* Move completed/past show back to upcoming */
function moveShowBackToUpcoming(date,e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
  const s = (typeof repairGet==="function") ? repairGet(date) : (typeof show==="function" ? show(date) : state.shows[date]);
  if(!s) return;
  s.completed = false;
  s.tripActive = false;
  if(!s.tripDone) s.tripDone = {};
  persist();
  if(typeof renderAll==="function") renderAll();
  if(typeof setShowTab==="function") setShowTab("upcoming");
  setTimeout(()=>{
    document.querySelector(`[data-show-date="${date}"]`)?.scrollIntoView({behavior:"smooth",block:"center"});
    if(typeof repairPatchButtons==="function") repairPatchButtons();
  },80);
}

/* Inject the button into any Past Shows card */
function injectMoveBackButtons(){
  document.querySelectorAll("[data-show-date]").forEach(card=>{
    const date = card.getAttribute("data-show-date");
    const s = state.shows && state.shows[date];
    if(!s || !s.completed) return;
    if(card.querySelector(".moveBackBtn")) return;

    const body = card.querySelector(".showBody") || card;
    const btn = document.createElement("button");
    btn.className = "btn moveBackBtn";
    btn.textContent = "↩ Move back to Upcoming Shows";
    btn.onclick = (e)=>moveShowBackToUpcoming(date,e);
    body.appendChild(btn);
  });
}
const oldRenderAllMoveBack = typeof renderAll==="function" ? renderAll : null;
if(oldRenderAllMoveBack && !window.__moveBackRenderPatched){
  window.__moveBackRenderPatched=true;
  renderAll = function(){
    oldRenderAllMoveBack();
    setTimeout(injectMoveBackButtons,0);
  };
}
const oldRenderShowsMoveBack = typeof renderShows==="function" ? renderShows : null;
if(oldRenderShowsMoveBack && !window.__moveBackRenderShowsPatched){
  window.__moveBackRenderShowsPatched=true;
  renderShows = function(){
    oldRenderShowsMoveBack();
    setTimeout(injectMoveBackButtons,0);
  };
}
setInterval(injectMoveBackButtons,700);
setTimeout(injectMoveBackButtons,250);


/* Clean widget details: each checklist tile opens only its own info */
let cleanCurrentStepId = null;

function cleanGetShow(date){
  if(typeof repairGet === "function") return repairGet(date);
  if(typeof show === "function") return show(date);
  if(!state.shows) state.shows={};
  if(!state.shows[date]) state.shows[date]={files:[],tripDone:{}};
  return state.shows[date];
}
function cleanValue(s,a,b){
  return s[a] || (b ? s[b] : "") || "";
}
function cleanMap(q,label){
  return q ? `<div class="actions"><a class="actionLink" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}">${label}</a></div>` : "";
}
function cleanContacts(phone){
  if(!phone) return "";
  const digits=String(phone).replace(/[^0-9]/g,"");
  return `<div class="contactGrid">
    <a href="tel:${phone}">Call</a>
    <a href="sms:${phone}">Text</a>
    <a target="_blank" href="https://wa.me/${digits}">WhatsApp</a>
    <a target="_blank" href="https://wa.me/${digits}">WA Call</a>
  </div>`;
}
function cleanFiles(date){
  const s=cleanGetShow(date);
  const fs=s.files || s.docsFiles || [];
  return Array.isArray(fs) ? fs.filter(Boolean) : [];
}
function cleanDocsHTML(date){
  const fs=cleanFiles(date);
  if(!fs.length) return "<p>No boarding cards uploaded.</p>";
  return `<div class="docsGrid">`+fs.map((f,i)=>{
    const name=String(f.name||"Document").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
    return `<div class="docCard" onclick="cleanOpenFile('${date}',${i},event)">
      ${docCardPreviewInner(f)}
      <p>${name}</p>
    </div>`;
  }).join("")+`</div>`;
}
function cleanOpenFile(date,i,e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(typeof openFile==="function") return openFile(date,i);
}
function cleanSteps(date){
  const s=cleanGetShow(date);
  const no=s.noTransport || s.noTransportUber;
  const v=(a,b)=>cleanValue(s,a,b);
  return [
    {id:"depart",title:"Departure airport",detail:[v("departureAirport","airport"),v("terminal","airportTerminal"),v("departureTime")].filter(Boolean).join("\n"),actions:cleanMap([v("departureAirport","airport"),v("terminal","airportTerminal")].filter(Boolean).join(" "),"Open Maps")},
    {id:"flight",title:"Flight / travel",detail:[v("flightInfo","flights"),v("departureTime")?("Depart "+v("departureTime")):"",v("arrivalTime")?("Arrive "+v("arrivalTime")):""].filter(Boolean).join("\n")},
    {id:"docs",title:"Boarding cards / documents",detail:v("docsNotes","docs")||"No document notes.",docs:true},
    {id:"arrival",title:"Arrival airport",detail:[v("arrivalAirport","airport"),v("arrivalTime")].filter(Boolean).join("\n"),actions:cleanMap(v("arrivalAirport","airport"),"Open Maps")},
    {id:"transfer1",title:"Airport → hotel transfer",detail:no?"No transport — please Uber":[v("airportHotelDriverName","driverName"),v("airportHotelDriverPhone","driverPhone"),v("airportHotelTransfer","transfers")].filter(Boolean).join("\n"),phone:v("airportHotelDriverPhone","driverPhone")},
    {id:"hotel",title:"Hotel",detail:[v("hotel"),v("hotelAddress"),v("hotelNotes","hotelCheckin")].filter(Boolean).join("\n"),actions:cleanMap([v("hotel"),v("hotelAddress")].filter(Boolean).join(" "),"Open Hotel")},
    {id:"transfer2",title:"Hotel → venue transfer",detail:no?"No transport — please Uber":[v("hotelVenueDriverName"),v("hotelVenueDriverPhone"),v("hotelVenueTransfer","hotelToVenue")].filter(Boolean).join("\n"),phone:v("hotelVenueDriverPhone")},
    {id:"venue",title:"Venue / set time",detail:[v("venue"),v("setTime")].filter(Boolean).join("\n"),actions:cleanMap([v("venue"),s.name||s.action].filter(Boolean).join(" "),"Open Venue")}
  ];
}

/* Override step source globally so notes are not tickable and docs only render in docs step */
if(typeof repairStepsFor==="function") repairStepsFor = cleanSteps;
if(typeof tripSteps==="function") tripSteps = cleanSteps;
if(typeof fixedChecklistSteps==="function") fixedChecklistSteps = cleanSteps;
if(typeof docsHTML==="function") docsHTML = cleanDocsHTML;
if(typeof repairDocsHTML==="function") repairDocsHTML = cleanDocsHTML;

/* Clean render for the main trip sheet — no protected fallback, no previous selected view */
function cleanRenderTripSheet(date,isTrip){
  const s=cleanGetShow(date);
  if(!s.tripDone) s.tripDone={};
  const steps=cleanSteps(date);
  const done=steps.filter(st=>s.tripDone[st.id]).length;
  const pct=Math.round(done/steps.length*100);

  const titleText=s.name||s.action||"Trip";
  const sub=[s.venue,s.setTime].filter(Boolean).join(" · ");

  const sheet = document.getElementById("repairTripSheet") || document.getElementById("tripSheet");
  const titleEl = document.getElementById("repairTitle") || document.getElementById("tripTitle");
  const subEl = document.getElementById("repairSub") || document.getElementById("tripVenue");
  const labelEl = document.getElementById("repairModeLabel") || document.getElementById("tripDate");
  const progressText = document.getElementById("repairProgressText") || document.getElementById("tripProgressText");
  const progressFill = document.getElementById("repairProgressFill") || document.getElementById("tripProgressFill");
  const stepsEl = document.getElementById("repairSteps") || document.getElementById("tripSteps");

  if(labelEl) labelEl.textContent=isTrip?"Trip Mode":"Full itinerary";
  if(titleEl) titleEl.textContent=titleText;
  if(subEl) subEl.textContent=sub;
  if(progressText) progressText.textContent=pct+"% complete";
  if(progressFill){progressFill.style.width=pct+"%";progressFill.style.background=pct===100?"var(--green)":"var(--orange)";}
  if(!stepsEl) return;

  stepsEl.innerHTML="";
  steps.forEach((st,i)=>{
    const row=document.createElement("div");
    row.className="repairStep "+(s.tripDone[st.id]?"done":"");
    row.innerHTML=`<button class="repairTick" onclick="cleanToggleStep('${date}','${st.id}',event)">✓</button>
      <div onclick="cleanOpenStep('${date}','${st.id}',event)">
        <div class="meta">Step ${i+1}</div>
        <h3>${st.title}</h3>
        <p>${st.detail||"Not added yet"}</p>
        ${st.actions||""}
        ${st.phone?cleanContacts(st.phone):""}
        ${st.docs?cleanDocsHTML(date):""}
      </div>
      <button class="repairMore" onclick="cleanOpenStep('${date}','${st.id}',event)">›</button>`;
    if(!isTrip){
      row.querySelector(".repairTick").style.display="none";
      row.style.gridTemplateColumns="1fr auto";
    }
    stepsEl.appendChild(row);
  });

  if(isTrip){
    const complete=document.createElement("button");
    complete.className="btn green";
    complete.style.width="100%";
    complete.style.marginTop="12px";
    complete.textContent="✓ Complete Trip & Move to Past";
    complete.onclick=()=>typeof repairComplete==="function"?repairComplete(date):completeTrip(date);
    stepsEl.appendChild(complete);
  }

  if(sheet){
    sheet.classList.add("active");
    sheet.classList.add("tripParentClean");
    sheet.classList.toggle("readOnlyItinerary",!isTrip);
    const panel=sheet.querySelector(".sheet,.sheetPanel");
    if(panel) panel.scrollTop=0;
  }
}
function cleanToggleStep(date,id,e){
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}
  const s=cleanGetShow(date);
  if(!s.tripDone) s.tripDone={};
  s.tripDone[id]=!s.tripDone[id];
  persist();
  cleanRenderTripSheet(date,true);
  if(typeof renderAll==="function") renderAll();
  setTimeout(()=>document.querySelector(`[data-show-date="${date}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),40);
}
function cleanOpenStep(date,id,e){
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}
  cleanCurrentStepId=id;

  /* Always close any previous detail first */
  ["detailSheet","repairDetailSheet"].forEach(sid=>document.getElementById(sid)?.classList.remove("active"));

  const st=cleanSteps(date).find(x=>x.id===id);
  if(!st) return;

  const detailSheetEl=document.getElementById("repairDetailSheet") || document.getElementById("detailSheet");
  const meta=document.getElementById("repairDetailMeta") || document.getElementById("detailMeta");
  const title=document.getElementById("repairDetailTitle") || document.getElementById("detailTitle");
  const sub=document.getElementById("repairDetailSub") || document.getElementById("detailSub");
  const content=document.getElementById("repairDetailContent") || document.getElementById("detailContent");

  if(meta) meta.textContent=st.title;
  if(title) title.textContent=st.title;
  if(sub) sub.textContent=st.detail||"";
  if(content){
    content.innerHTML=`<div class="viewCard"><h3>${st.detail||"Not added yet"}</h3>${st.actions||""}${st.phone?cleanContacts(st.phone):""}${st.docs?cleanDocsHTML(date):""}</div>`;
  }
  if(detailSheetEl){
    detailSheetEl.classList.add("active");
    detailSheetEl.classList.add("detailOnlySheet");
    const panel=detailSheetEl.querySelector(".sheet,.sheetPanel");
    if(panel) panel.scrollTop=0;
  }
}
function cleanCloseDetail(){
  cleanCurrentStepId=null;
  ["detailSheet","repairDetailSheet"].forEach(id=>document.getElementById(id)?.classList.remove("active"));
}

/* Override open functions so each pathway starts fresh */
if(typeof repairOpen==="function"){
  repairOpen=function(date,isTrip){
    cleanCloseDetail();
    repairDate=date;
    repairTripMode=!!isTrip;
    cleanRenderTripSheet(date,!!isTrip);
  };
}
if(typeof openTrip==="function"){
  openTrip=function(date,active){
    cleanCloseDetail();
    tripOpenDate=date;
    tripModeActiveView=!!active;
    cleanRenderTripSheet(date,!!active);
  };
}
if(typeof repairDetail==="function") repairDetail=function(id,e){ cleanOpenStep(repairDate,id,e); };
if(typeof openStepDetail==="function") openStepDetail=function(id,e){ cleanOpenStep(tripOpenDate,id,e); };
if(typeof repairCloseDetail==="function") repairCloseDetail=cleanCloseDetail;
if(typeof closeDetail==="function") closeDetail=cleanCloseDetail;

/* Stop tick column from opening detail */
document.addEventListener("click",function(e){
  const tick=e.target.closest(".repairTick,.tick,.tickMini");
  if(!tick) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
},true);

/* Clicking outside/close button clears selected step */
document.addEventListener("click",function(e){
  if(e.target.classList && e.target.classList.contains("sheetOverlay")){
    if(e.target.id==="detailSheet" || e.target.id==="repairDetailSheet") cleanCloseDetail();
  }
  const btn=e.target.closest("button");
  if(btn && btn.textContent.trim()==="×" && btn.closest("#detailSheet,#repairDetailSheet")){
    cleanCloseDetail();
  }
},true);

/* Active card open trip should always open full clean list */
function cleanOpenTripFromCard(date,e){
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}
  cleanCloseDetail();
  cleanRenderTripSheet(date,true);
}
if(typeof fixedOpenTripFromCard==="function") fixedOpenTripFromCard=cleanOpenTripFromCard;

/* Hard delegate open trip/full itinerary */
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const txt=btn.textContent.trim().toLowerCase();
  if(txt!=="open trip" && txt!=="full itinerary" && txt!=="start trip") return;
  const card=btn.closest("[data-show-date]");
  if(!card) return;
  const date=card.getAttribute("data-show-date");
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(txt==="full itinerary") cleanRenderTripSheet(date,false);
  else cleanRenderTripSheet(date,true);
},true);


/* Locklead photo integration — visual only */
function applyLockleadPhotos(){
  document.querySelectorAll(".showHeader").forEach((el,i)=>{
    const img = i % 3 === 0 ? "locklead_booth.jpg" : i % 3 === 1 ? "locklead_crowd.jpg" : "locklead_red.jpg";
    el.style.setProperty("--show-img", `url("assets/${img}")`);
  });

  document.querySelectorAll(".card").forEach(card=>{
    if(card.textContent.includes("No upcoming shows yet") || card.textContent.includes("No past shows yet")){
      card.classList.add("photoEmptyState");
    }
  });
}
const photoRenderAllBase = typeof renderAll === "function" ? renderAll : null;
if(photoRenderAllBase && !window.__lockleadPhotoRenderPatched){
  window.__lockleadPhotoRenderPatched = true;
  renderAll = function(){
    photoRenderAllBase();
    setTimeout(applyLockleadPhotos,0);
  };
}
const photoRenderShowsBase = typeof renderShows === "function" ? renderShows : null;
if(photoRenderShowsBase && !window.__lockleadPhotoRenderShowsPatched){
  window.__lockleadPhotoRenderShowsPatched = true;
  renderShows = function(){
    photoRenderShowsBase();
    setTimeout(applyLockleadPhotos,0);
  };
}
setTimeout(applyLockleadPhotos,250);

if(!isSupabaseConfigured()){
  renderAll();
}