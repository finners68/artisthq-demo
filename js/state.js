const KEY = "lockleadhq_v1_consolidated";
const appToday = new Date(2026,6,1);
let currentMonth = new Date(2026,6,1);
let currentShowTab = "upcoming";
let selectedDate = null;
let selectedColour = "orange";
let popTimer = null;
let tripOpenDate = null;
let tripModeActiveView = false;

const defaultIdeas = [
  ["Tour Life","Airport → Encore","A repeatable journey format from travel to final track."],
  ["Tour Life","Taxi conversations","Natural chat, dry humour, one-question format."],
  ["Shows","Before The First Track","Thirty seconds before walking on."],
  ["Shows","Empty venue → full venue","A clear story arc from silence to chaos."],
  ["Music","USB organisation","Preparation and craft without overexplaining."],
  ["Personality","Natural conversations","Let personality appear without forcing performance."],
  ["Long-form","24 Hours with Locklead","Full day from travel to checkout."]
];

let state = JSON.parse(localStorage.getItem(KEY)||"null") || {
  shows:{},
  ideas:defaultIdeas.map((x,i)=>({id:"i"+i,cat:x[0],title:x[1],note:x[2],liked:false})),
  notes:[]
};
if(!state.shows) state.shows = {};
if(!state.ideas) state.ideas = [];
if(!state.notes) state.notes = [];

function persist(){
  localStorage.setItem(KEY, JSON.stringify(state));
  if(typeof queueSync === "function") queueSync();
}
function save(){ persist(); renderAll(); }
function k(d){ return d.toISOString().slice(0,10); }
function nice(date, opts={weekday:"short",day:"numeric",month:"short"}){ return new Date(date).toLocaleDateString("en-GB",opts); }
function colourClass(c){ return (c||"orange")+"Bg"; }
function show(date){ if(!state.shows[date]) state.shows[date]={files:[],tripDone:{}}; return state.shows[date]; }
function title(s){ return s.name || "Untitled"; }
function files(s){ return s.files || []; }
function completion(s){
  const transport = s.noTransport || (s.airportHotelDriverName && s.airportHotelDriverPhone) || s.airportHotelTransfer;
  const items = [
    s.name,s.venue,s.setTime,s.departureAirport,s.terminal,s.departureTime,
    s.flightInfo,s.arrivalAirport,s.arrivalTime,(files(s).length?files(s).length:s.docsNotes),
    transport,s.hotel||s.hotelAddress||s.hotelNotes
  ];
  return Math.round(items.filter(v=>v!==undefined && v!==null && String(v).trim()!=="").length / items.length * 100);
}
function basic(s){
  return {
    travel:[s.departureAirport,s.terminal,s.arrivalAirport,s.arrivalTime?s.arrivalTime:"",s.flightInfo].filter(Boolean).join(" · ") || "Not added",
    transport:s.noTransport ? "Uber" : ([s.airportHotelDriverName,s.airportHotelTransfer].filter(Boolean).join(" · ") || "Not added"),
    hotel:[s.hotel,s.hotelNotes].filter(Boolean).join("\\n") || "Not added",
    docs:files(s).length ? files(s).length+" boarding card(s)" : (s.docsNotes ? "Docs noted" : "Not added")
  };
}
