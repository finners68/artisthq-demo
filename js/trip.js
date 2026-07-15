function markCompleted(date){
  show(date).completed=true;
  show(date).tripActive=false;
  save();
}
function startTrip(date){
  Object.keys(state.shows).forEach(d=>state.shows[d].tripActive=false);
  const s=show(date);
  s.tripActive=true;
  if(!s.tripDone) s.tripDone={};
  persist();
  renderShows();
  openTrip(date,true);
}
function completeTrip(date){
  const s=show(date);
  s.tripActive=false;
  s.completed=true;
  persist();
  closeTripSheet();
  renderAll();
}
function tripSteps(date){
  const s=show(date);
  const no=s.noTransport;
  return [
    {id:"depart",title:"Departure airport",detail:[s.departureAirport,s.terminal,s.departureTime].filter(Boolean).join("\n"),actions:mapAction([s.departureAirport,s.terminal].filter(Boolean).join(" "),"Open Maps")},
    {id:"flight",title:"Flight / travel",detail:[s.flightInfo,s.departureTime?("Depart "+s.departureTime):"",s.arrivalTime?("Arrive "+s.arrivalTime):""].filter(Boolean).join("\n")},
    {id:"docs",title:"Boarding cards / documents",detail:s.docsNotes||"No document notes.",docs:true},
    {id:"arrival",title:"Arrival airport",detail:[s.arrivalAirport,s.arrivalTime].filter(Boolean).join("\n"),actions:mapAction(s.arrivalAirport,"Open Maps")},
    {id:"transfer1",title:"Airport → hotel transfer",detail:no?"No transport — please Uber":[s.airportHotelDriverName,s.airportHotelDriverPhone,s.airportHotelTransfer].filter(Boolean).join("\n"),contact:{name:s.airportHotelDriverName,phone:s.airportHotelDriverPhone}},
    {id:"hotel",title:"Hotel",detail:[s.hotel,s.hotelAddress,s.hotelNotes].filter(Boolean).join("\n"),actions:mapAction([s.hotel,s.hotelAddress].filter(Boolean).join(" "),"Open Hotel")},
    {id:"transfer2",title:"Hotel → venue transfer",detail:no?"No transport — please Uber":[s.hotelVenueDriverName,s.hotelVenueDriverPhone,s.hotelVenueTransfer].filter(Boolean).join("\n"),contact:{name:s.hotelVenueDriverName,phone:s.hotelVenueDriverPhone}},
    {id:"venue",title:"Venue / set time",detail:[s.venue,s.setTime].filter(Boolean).join("\n"),actions:mapAction([s.venue,s.name].filter(Boolean).join(" "),"Open Venue")},
    {id:"notes",title:"Notes",detail:s.notes||"No notes"}
  ];
}
function mapAction(query,label){
  return query ? `<div class="actions"><a class="actionLink" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}">${label}</a></div>` : "";
}
function contactActions(phone){
  if(!phone) return "";
  const digits=String(phone).replace(/[^0-9]/g,"");
  return `<div class="contactGrid">
    <a href="tel:${phone}">Call</a>
    <a href="sms:${phone}">Text</a>
    <a target="_blank" href="https://wa.me/${digits}">WhatsApp</a>
    <a target="_blank" href="https://wa.me/${digits}">WA Call</a>
  </div>`;
}
function docCardPreviewInner(f){
  if(f.data && f.data.startsWith("data:image")) return `<img src="${f.data}">`;
  if(f.url && isImageFile(f)) return `<img src="${f.url}">`;
  const name = f.name || "Document";
  return `<div class="safeFileFallback">Document<br>${name}</div>`;
}

function docsHTML(date){
  const s=show(date);
  if(!files(s).length) return "<p>No boarding cards uploaded.</p>";
  return `<div class="docsGrid">`+files(s).map((f,i)=>`<div class="docCard" onclick="openFile('${date}',${i})">${docCardPreviewInner(f)}<p>${f.name||"Document"}</p></div>`).join("")+`</div>`;
}
function openItinerary(date){ openTrip(date,false); }
function openTrip(date,active){
  tripOpenDate=date;
  tripModeActiveView=active;
  const s=show(date);
  tripDate.textContent=nice(date,{weekday:"long",day:"numeric",month:"long"});
  tripTitle.textContent=title(s);
  tripVenue.textContent=[s.venue,s.setTime].filter(Boolean).join(" · ");
  tripModeLabel.textContent=active?"Trip checklist":"Full itinerary";
  renderTripSheet();
  tripSheet.classList.add("active");
  tripSheet.querySelector(".sheet").scrollTop=0;
}
function closeTripSheet(){ tripSheet.classList.remove("active"); }
function renderTripSheet(){
  const s=show(tripOpenDate);
  if(!s.tripDone) s.tripDone={};
  const steps=tripSteps(tripOpenDate);
  const done=steps.filter(st=>s.tripDone[st.id]).length;
  const pct=Math.round(done/steps.length*100);
  tripProgressText.textContent=pct+"% complete";
  tripProgressFill.style.width=pct+"%";
  tripProgressFill.style.background=pct===100?"var(--green)":"var(--orange)";
  tripSteps.innerHTML="";
  steps.forEach((st,i)=>{
    const row=document.createElement("div");
    row.className="step "+(s.tripDone[st.id]?"done":"");
    row.innerHTML=`<button class="tick" onclick="toggleStep('${st.id}',event)">✓</button>
      <div onclick="openStepDetail('${st.id}')">
        <div class="meta">Step ${i+1}</div>
        <h3>${st.title}</h3>
        <p>${st.detail||"Not added yet"}</p>
        ${st.actions||""}
        ${st.contact?contactActions(st.contact.phone):""}
        ${st.docs?docsHTML(tripOpenDate):""}
      </div>
      <button class="more" onclick="openStepDetail('${st.id}',event)">›</button>`;
    tripSteps.appendChild(row);
  });
  if(tripModeActiveView){
    const complete=document.createElement("button");
    complete.className="btn green";
    complete.style.width="100%";
    complete.style.marginTop="12px";
    complete.textContent="✓ Complete Trip & Move to Past";
    complete.onclick=()=>completeTrip(tripOpenDate);
    tripSteps.appendChild(complete);
  }
}
function toggleStep(id,e){
  e?.preventDefault();
  e?.stopPropagation();
  if(!tripModeActiveView) return;
  const s=show(tripOpenDate);
  if(!s.tripDone) s.tripDone={};
  s.tripDone[id]=!s.tripDone[id];
  persist();
  renderTripSheet();
  renderShows();
}
function openStepDetail(id,e){
  e?.preventDefault();
  e?.stopPropagation();
  const st=tripSteps(tripOpenDate).find(x=>x.id===id);
  detailMeta.textContent=st.title;
  detailTitle.textContent=st.title;
  detailSub.textContent=st.detail||"";
  detailContent.innerHTML=`<div class="viewCard"><h3>${st.detail||"Not added yet"}</h3>${st.actions||""}${st.contact?contactActions(st.contact.phone):""}${st.docs?docsHTML(tripOpenDate):""}</div>`;
  detailSheet.classList.add("active");
}
function closeDetail(){ detailSheet.classList.remove("active"); }
function openView(date,type){
  const s=show(date);
  tripOpenDate=date;
  if(type==="travel"){
    openTrip(date,false);
  }else{
    detailMeta.textContent=nice(date);
    detailTitle.textContent="Notes";
    detailSub.textContent="";
    detailContent.innerHTML=`<div class="viewCard"><h3>${s.notes||"No notes added yet."}</h3></div>`;
    detailSheet.classList.add("active");
  }
}
/* HARD BUTTON HANDLER FIX — works even if inline onclick breaks */
let repairDate = null;
let repairTripMode = false;

function repairCollection(){
  if(!state.shows) state.shows = {};
  return state.shows;
}
function repairGet(date){
  const col=repairCollection();
  if(!col[date]) col[date]={files:[],tripDone:{}};
  if(!col[date].files) col[date].files=[];
  if(!col[date].tripDone) col[date].tripDone={};
  return col[date];
}
function repairSave(){
  persist();
}
function repairVal(s,a,b){
  return s[a] || (b ? s[b] : "") || "";
}
function repairTitleFor(s){
  return s.name || s.action || "Untitled";
}
function repairNiceDate(date){
  try{return nice(date,{weekday:"long",day:"numeric",month:"long"});}
  catch(e){return new Date(date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});}
}
function repairFiles(s){
  return s.files || s.docsFiles || [];
}
function repairMap(q,label){
  return q ? `<a class="repairAction" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}">${label}</a>` : "";
}
function repairContacts(phone){
  if(!phone) return "";
  const digits=String(phone).replace(/[^0-9]/g,"");
  return `<div class="repairContacts">
    <a href="tel:${phone}">Call</a>
    <a href="sms:${phone}">Text</a>
    <a target="_blank" href="https://wa.me/${digits}">WhatsApp</a>
    <a target="_blank" href="https://wa.me/${digits}">WA Call</a>
  </div>`;
}
function repairDocsHTML(date){
  const s=repairGet(date);
  const fs=repairFiles(s);
  if(!fs.length) return "<p>No boarding cards uploaded.</p>";
  return `<div class="repairDocs">`+fs.map((f,i)=>`
    <div class="repairDoc" onclick="repairOpenFile('${date}',${i})">
      ${docCardPreviewInner(f)}
      <p>${f.name||"Document"}</p>
    </div>`).join("")+`</div>`;
}
function repairOpenFile(date,i){
  if(typeof openFile === "function"){
    openFile(date,i);
    return;
  }
  const f=repairFiles(repairGet(date))[i];
  if(!f) return;
  alert(f.name || "Document");
}
function repairStepsFor(date){
  const s=repairGet(date);
  const no=s.noTransport || s.noTransportUber;
  return [
    {
      id:"depart",
      title:"Departure airport",
      detail:[repairVal(s,"departureAirport","airport"),repairVal(s,"terminal","airportTerminal"),repairVal(s,"departureTime")].filter(Boolean).join("\n"),
      action:repairMap([repairVal(s,"departureAirport","airport"),repairVal(s,"terminal","airportTerminal")].filter(Boolean).join(" "),"Open Maps")
    },
    {
      id:"flight",
      title:"Flight / travel",
      detail:[repairVal(s,"flightInfo","flights"),repairVal(s,"departureTime")?("Depart "+repairVal(s,"departureTime")):"",repairVal(s,"arrivalTime")?("Arrive "+repairVal(s,"arrivalTime")):""].filter(Boolean).join("\n")
    },
    {
      id:"docs",
      title:"Boarding cards / documents",
      detail:repairVal(s,"docsNotes","docs") || "No document notes.",
      docs:true
    },
    {
      id:"arrival",
      title:"Arrival airport",
      detail:[repairVal(s,"arrivalAirport","airport"),repairVal(s,"arrivalTime")].filter(Boolean).join("\n"),
      action:repairMap(repairVal(s,"arrivalAirport","airport"),"Open Maps")
    },
    {
      id:"transfer1",
      title:"Airport → hotel transfer",
      detail:no ? "No transport — please Uber" : [repairVal(s,"airportHotelDriverName","driverName"),repairVal(s,"airportHotelDriverPhone","driverPhone"),repairVal(s,"airportHotelTransfer","transfers")].filter(Boolean).join("\n"),
      phone:repairVal(s,"airportHotelDriverPhone","driverPhone")
    },
    {
      id:"hotel",
      title:"Hotel",
      detail:[repairVal(s,"hotel"),repairVal(s,"hotelAddress"),repairVal(s,"hotelNotes","hotelCheckin")].filter(Boolean).join("\n"),
      action:repairMap([repairVal(s,"hotel"),repairVal(s,"hotelAddress")].filter(Boolean).join(" "),"Open Hotel")
    },
    {
      id:"transfer2",
      title:"Hotel → venue transfer",
      detail:no ? "No transport — please Uber" : [repairVal(s,"hotelVenueDriverName"),repairVal(s,"hotelVenueDriverPhone"),repairVal(s,"hotelVenueTransfer","hotelToVenue")].filter(Boolean).join("\n"),
      phone:repairVal(s,"hotelVenueDriverPhone")
    },
    {
      id:"venue",
      title:"Venue / set time",
      detail:[repairVal(s,"venue"),repairVal(s,"setTime")].filter(Boolean).join("\n"),
      action:repairMap([repairVal(s,"venue"),repairTitleFor(s)].filter(Boolean).join(" "),"Open Venue")
    },
    {
      id:"notes",
      title:"Notes",
      detail:repairVal(s,"notes") || "No notes"
    }
  ];
}
function repairOpen(date,isTrip){
  repairDate=date;
  repairTripMode=!!isTrip;
  const s=repairGet(date);

  if(isTrip){
    Object.keys(repairCollection()).forEach(d=>repairCollection()[d].tripActive=false);
    s.tripActive=true;
    repairSave();
  }

  repairModeLabel.textContent = isTrip ? "Trip Mode" : "Full itinerary";
  repairTitle.textContent = repairTitleFor(s);
  repairSub.textContent = [repairVal(s,"venue"),repairVal(s,"setTime")].filter(Boolean).join(" · ");
  repairProgressMeta.textContent = isTrip ? "Trip checklist" : "Itinerary overview";
  repairRender();
  repairTripSheet.classList.add("active");
  const panel=repairTripSheet.querySelector(".sheet");
  if(panel) panel.scrollTop=0;

  if(typeof renderShows === "function") renderShows();
  repairPatchButtons();
}
function repairClose(){
  repairTripSheet.classList.remove("active");
}
function repairRender(){
  const s=repairGet(repairDate);
  const steps=repairStepsFor(repairDate);
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

  if(repairTripMode){
    const complete=document.createElement("button");
    complete.className="btn green";
    complete.style.width="100%";
    complete.style.marginTop="12px";
    complete.textContent="✓ Complete Trip & Move to Past";
    complete.onclick=()=>repairComplete(repairDate);
    repairSteps.appendChild(complete);
  }
}
function repairToggle(id,e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(!repairTripMode) return;
  const s=repairGet(repairDate);
  if(!s.tripDone) s.tripDone={};
  s.tripDone[id]=!s.tripDone[id];
  repairSave();
  repairRender();
  if(typeof renderShows === "function") renderShows();
  repairPatchButtons();
}
function repairDetail(id,e){
  if(e){e.preventDefault();e.stopPropagation();}
  const st=repairStepsFor(repairDate).find(x=>x.id===id);
  repairDetailMeta.textContent=st.title;
  repairDetailTitle.textContent=st.title;
  repairDetailSub.textContent=st.detail || "";
  repairDetailContent.innerHTML=`<div class="viewCard"><h3>${st.detail||"Not added yet"}</h3>${st.action||""}${st.phone?repairContacts(st.phone):""}${st.docs?repairDocsHTML(repairDate):""}</div>`;
  repairDetailSheet.classList.add("active");
}
function repairCloseDetail(){
  repairDetailSheet.classList.remove("active");
}
function repairComplete(date){
  const s=repairGet(date);
  s.tripActive=false;
  s.completed=true;
  repairSave();
  repairClose();
  if(typeof renderAll === "function") renderAll();
  setTimeout(repairPatchButtons,100);
}
function repairFindCardDate(btn){
  const card=btn.closest("[data-show-date]");
  return card ? card.getAttribute("data-show-date") : null;
}
function repairPatchButtons(){
  document.querySelectorAll("[data-show-date]").forEach(card=>{
    const date=card.getAttribute("data-show-date");
    const s=repairGet(date);
    card.querySelectorAll("button").forEach(btn=>{
      const txt=btn.textContent.trim().toLowerCase();
      if(txt==="start trip" || txt==="complete trip"){
        btn.textContent=s.tripActive ? "Complete Trip" : "Start Trip";
        btn.classList.toggle("repairActiveButton",!!s.tripActive);
        btn.onclick=(e)=>{
          e.preventDefault(); e.stopPropagation();
          if(s.tripActive) repairComplete(date);
          else repairOpen(date,true);
        };
      }
      if(txt==="full itinerary"){
        btn.onclick=(e)=>{
          e.preventDefault(); e.stopPropagation();
          repairOpen(date,false);
        };
      }
      if(txt==="open trip"){
        btn.onclick=(e)=>{
          e.preventDefault(); e.stopPropagation();
          repairOpen(date,true);
        };
      }
    });
  });
}
document.addEventListener("click",function(e){
  const btn=e.target.closest("button");
  if(!btn) return;
  const txt=btn.textContent.trim().toLowerCase();
  if(!["start trip","complete trip","full itinerary","open trip"].includes(txt)) return;
  const date=repairFindCardDate(btn);
  if(!date) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  const s=repairGet(date);
  if(txt==="start trip") repairOpen(date,true);
  if(txt==="complete trip") repairComplete(date);
  if(txt==="full itinerary") repairOpen(date,false);
  if(txt==="open trip") repairOpen(date,true);
}, true);
setTimeout(repairPatchButtons,300);
setInterval(repairPatchButtons,700);


