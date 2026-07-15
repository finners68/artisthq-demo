const MIGRATION_FLAG = "lockleadhq_supabase_migrated";
const WORKSPACE_KEY = "lockleadhq_workspace_id";
let currentWorkspaceId = localStorage.getItem(WORKSPACE_KEY) || null;
let dbSyncInProgress = false;
let dbRemoteLoading = false;

function formatShowDate(date){
  if(typeof date === "string") return date.slice(0, 10);
  if(date instanceof Date){
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(date).slice(0, 10);
}

function showRowToMemory(row, files, pieces){
  const mem = {
    _dbId: row.id,
    name: row.name || "",
    colour: row.colour || "orange",
    venue: row.venue || "",
    setTime: row.set_time || "",
    departureAirport: row.departure_airport || "",
    terminal: row.terminal || "",
    departureTime: row.departure_time || "",
    flightInfo: row.flight_info || "",
    arrivalAirport: row.arrival_airport || "",
    arrivalTime: row.arrival_time || "",
    docsNotes: row.docs_notes || "",
    noTransport: !!row.no_transport,
    airportHotelDriverName: row.airport_hotel_driver_name || "",
    airportHotelDriverPhone: row.airport_hotel_driver_phone || "",
    airportHotelTransfer: row.airport_hotel_transfer || "",
    hotel: row.hotel || "",
    hotelAddress: row.hotel_address || "",
    hotelNotes: row.hotel_notes || "",
    hotelVenueDriverName: row.hotel_venue_driver_name || "",
    hotelVenueDriverPhone: row.hotel_venue_driver_phone || "",
    hotelVenueTransfer: row.hotel_venue_transfer || "",
    notes: row.notes || "",
    tripDone: row.trip_done || {},
    tripActive: !!row.trip_active,
    completed: !!row.completed,
    files: (files || []).map(fileRowToMemory),
    contentPieces: (pieces || []).map(pieceRowToMemory)
  };
  return mem;
}

function memoryShowToRow(date, s){
  return {
    id: s._dbId || undefined,
    workspace_id: currentWorkspaceId,
    show_date: formatShowDate(date),
    name: s.name || null,
    colour: s.colour || "orange",
    venue: s.venue || null,
    set_time: s.setTime || null,
    departure_airport: s.departureAirport || null,
    terminal: s.terminal || null,
    departure_time: s.departureTime || null,
    flight_info: s.flightInfo || null,
    arrival_airport: s.arrivalAirport || null,
    arrival_time: s.arrivalTime || null,
    docs_notes: s.docsNotes || null,
    no_transport: !!s.noTransport,
    airport_hotel_driver_name: s.airportHotelDriverName || null,
    airport_hotel_driver_phone: s.airportHotelDriverPhone || null,
    airport_hotel_transfer: s.airportHotelTransfer || null,
    hotel: s.hotel || null,
    hotel_address: s.hotelAddress || null,
    hotel_notes: s.hotelNotes || null,
    hotel_venue_driver_name: s.hotelVenueDriverName || null,
    hotel_venue_driver_phone: s.hotelVenueDriverPhone || null,
    hotel_venue_transfer: s.hotelVenueTransfer || null,
    notes: s.notes || null,
    trip_done: s.tripDone || {},
    trip_active: !!s.tripActive,
    completed: !!s.completed
  };
}

function fileRowToMemory(row){
  return {
    _dbId: row.id,
    name: row.name,
    type: row.mime_type || "",
    storagePath: row.storage_path,
    url: null
  };
}

function pieceRowToMemory(row){
  return {
    _dbId: row.id,
    id: row.id,
    type: row.type,
    title: row.title,
    notes: row.notes || "",
    done: !!row.done
  };
}

function ideaRowToMemory(row){
  return {
    _dbId: row.id,
    id: row.legacy_id || row.id,
    cat: row.cat,
    title: row.title,
    note: row.note || "",
    liked: !!row.liked
  };
}

function noteRowToMemory(row){
  return {
    _dbId: row.id,
    id: row.legacy_id || row.id,
    text: row.text,
    created: new Date(row.created_at).toLocaleString("en-GB")
  };
}

async function ensureWorkspaceForUser(userId){
  const client = getSupabase();
  if(!client) return null;

  const { data: memberships, error: memberError } = await client
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name)")
    .eq("user_id", userId)
    .limit(1);

  if(memberError) throw memberError;

  if(memberships && memberships.length){
    currentWorkspaceId = memberships[0].workspace_id;
    localStorage.setItem(WORKSPACE_KEY, currentWorkspaceId);
    return currentWorkspaceId;
  }

  const { data: workspace, error: wsError } = await client
    .from("workspaces")
    .insert({ name: "LockleadHQ" })
    .select()
    .single();
  if(wsError) throw wsError;

  const { error: joinError } = await client
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });
  if(joinError) throw joinError;

  currentWorkspaceId = workspace.id;
  localStorage.setItem(WORKSPACE_KEY, currentWorkspaceId);
  return currentWorkspaceId;
}

async function loadFromSupabase(){
  const client = getSupabase();
  if(!client || !currentWorkspaceId) return false;

  dbRemoteLoading = true;
  try{
    const [showsRes, filesRes, piecesRes, ideasRes, notesRes] = await Promise.all([
      client.from("shows").select("*").eq("workspace_id", currentWorkspaceId),
      client.from("show_files").select("*").eq("workspace_id", currentWorkspaceId),
      client.from("content_pieces").select("*").eq("workspace_id", currentWorkspaceId),
      client.from("ideas").select("*").eq("workspace_id", currentWorkspaceId).order("sort_order", { ascending: true }),
      client.from("notes").select("*").eq("workspace_id", currentWorkspaceId).order("created_at", { ascending: false })
    ]);

    if(showsRes.error) throw showsRes.error;
    if(filesRes.error) throw filesRes.error;
    if(piecesRes.error) throw piecesRes.error;
    if(ideasRes.error) throw ideasRes.error;
    if(notesRes.error) throw notesRes.error;

    const filesByShow = {};
    (filesRes.data || []).forEach(f=>{
      if(!filesByShow[f.show_id]) filesByShow[f.show_id] = [];
      filesByShow[f.show_id].push(f);
    });

    const piecesByShow = {};
    (piecesRes.data || []).forEach(p=>{
      if(!piecesByShow[p.show_id]) piecesByShow[p.show_id] = [];
      piecesByShow[p.show_id].push(p);
    });

    const shows = {};
    (showsRes.data || []).forEach(row=>{
      const date = formatShowDate(row.show_date);
      const files = (filesByShow[row.id] || []).sort((a,b)=>a.sort_order - b.sort_order);
      const pieces = (piecesByShow[row.id] || []).sort((a,b)=>a.sort_order - b.sort_order);
      shows[date] = showRowToMemory(row, files, pieces);
    });

    state.shows = shows;
    state.ideas = (ideasRes.data || []).map(ideaRowToMemory);
    state.notes = (notesRes.data || []).map(noteRowToMemory);

    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  }finally{
    dbRemoteLoading = false;
  }
}

async function pushToSupabase(){
  const client = getSupabase();
  if(!client || !currentWorkspaceId || dbRemoteLoading || dbSyncInProgress) return false;
  if(!navigator.onLine) return false;

  dbSyncInProgress = true;
  try{
    const { data: existingShows, error: existingError } = await client
      .from("shows")
      .select("id, show_date")
      .eq("workspace_id", currentWorkspaceId);
    if(existingError) throw existingError;

    const existingByDate = {};
    (existingShows || []).forEach(row=>{
      existingByDate[formatShowDate(row.show_date)] = row.id;
    });

    const localDates = Object.keys(state.shows || {});
    for(const date of localDates){
      const s = state.shows[date];
      if(!s._dbId && existingByDate[date]) s._dbId = existingByDate[date];

      const row = memoryShowToRow(date, s);
      if(s._dbId) row.id = s._dbId;

      const { data: savedShow, error: showError } = await client
        .from("shows")
        .upsert(row, { onConflict: "workspace_id,show_date" })
        .select()
        .single();
      if(showError) throw showError;

      s._dbId = savedShow.id;
      await syncShowChildren(client, savedShow.id, s);
    }

    const orphanIds = (existingShows || [])
      .filter(row=>!localDates.includes(formatShowDate(row.show_date)))
      .map(row=>row.id);
    if(orphanIds.length){
      const { error: deleteError } = await client.from("shows").delete().in("id", orphanIds);
      if(deleteError) throw deleteError;
    }

    await syncIdeas(client);
    await syncNotes(client);
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  }catch(err){
    console.error("Supabase sync failed", err);
    return false;
  }finally{
    dbSyncInProgress = false;
  }
}

async function syncShowChildren(client, showId, s){
  await syncShowFiles(client, showId, s);
  await syncContentPieces(client, showId, s);
}

async function syncShowFiles(client, showId, s){
  const { data: existing, error } = await client
    .from("show_files")
    .select("id, storage_path")
    .eq("show_id", showId);
  if(error) throw error;

  const existingIds = new Set((existing || []).map(x=>x.id));
  const keepIds = new Set();

  for(let i = 0; i < (s.files || []).length; i++){
    const f = s.files[i];
    if(f._pendingUpload){
      continue;
    }
    if(f._dbId){
      keepIds.add(f._dbId);
      await client.from("show_files").update({
        name: f.name,
        mime_type: f.type || null,
        storage_path: f.storagePath,
        sort_order: i
      }).eq("id", f._dbId);
      continue;
    }
    if(!f.storagePath && f.data){
      continue;
    }
    if(f.storagePath){
      const { data: inserted, error: insError } = await client
        .from("show_files")
        .insert({
          show_id: showId,
          workspace_id: currentWorkspaceId,
          name: f.name,
          mime_type: f.type || null,
          storage_path: f.storagePath,
          sort_order: i
        })
        .select()
        .single();
      if(insError) throw insError;
      f._dbId = inserted.id;
      keepIds.add(inserted.id);
    }
  }

  const toDelete = [...existingIds].filter(id=>!keepIds.has(id));
  if(toDelete.length){
    const paths = (existing || []).filter(x=>toDelete.includes(x.id)).map(x=>x.storage_path);
    await client.from("show_files").delete().in("id", toDelete);
    if(paths.length){
      await client.storage.from("show-documents").remove(paths);
    }
  }
}

async function syncContentPieces(client, showId, s){
  const { data: existing, error } = await client
    .from("content_pieces")
    .select("id")
    .eq("show_id", showId);
  if(error) throw error;

  const existingIds = new Set((existing || []).map(x=>x.id));
  const keepIds = new Set();

  for(let i = 0; i < (s.contentPieces || []).length; i++){
    const p = s.contentPieces[i];
    const payload = {
      show_id: showId,
      workspace_id: currentWorkspaceId,
      type: p.type || "Action",
      title: p.title || "",
      notes: p.notes || "",
      done: !!p.done,
      sort_order: i
    };
    if(p._dbId){
      keepIds.add(p._dbId);
      await client.from("content_pieces").update(payload).eq("id", p._dbId);
    }else{
      const { data: inserted, error: insError } = await client
        .from("content_pieces")
        .insert(payload)
        .select()
        .single();
      if(insError) throw insError;
      p._dbId = inserted.id;
      p.id = inserted.id;
      keepIds.add(inserted.id);
    }
  }

  const toDelete = [...existingIds].filter(id=>!keepIds.has(id));
  if(toDelete.length){
    await client.from("content_pieces").delete().in("id", toDelete);
  }
}

async function syncIdeas(client){
  const { data: existing, error } = await client
    .from("ideas")
    .select("id, legacy_id")
    .eq("workspace_id", currentWorkspaceId);
  if(error) throw error;

  const existingIds = new Set((existing || []).map(x=>x.id));
  const keepIds = new Set();

  for(let i = 0; i < (state.ideas || []).length; i++){
    const idea = state.ideas[i];
    const payload = {
      workspace_id: currentWorkspaceId,
      legacy_id: idea.id,
      cat: idea.cat,
      title: idea.title,
      note: idea.note || "",
      liked: !!idea.liked,
      sort_order: i
    };
    if(idea._dbId){
      keepIds.add(idea._dbId);
      await client.from("ideas").update(payload).eq("id", idea._dbId);
    }else{
      const { data: inserted, error: insError } = await client
        .from("ideas")
        .insert(payload)
        .select()
        .single();
      if(insError) throw insError;
      idea._dbId = inserted.id;
      keepIds.add(inserted.id);
    }
  }

  const toDelete = [...existingIds].filter(id=>!keepIds.has(id));
  if(toDelete.length){
    await client.from("ideas").delete().in("id", toDelete);
  }
}

async function syncNotes(client){
  const { data: existing, error } = await client
    .from("notes")
    .select("id, legacy_id")
    .eq("workspace_id", currentWorkspaceId);
  if(error) throw error;

  const existingIds = new Set((existing || []).map(x=>x.id));
  const keepIds = new Set();

  for(const note of (state.notes || [])){
    const payload = {
      workspace_id: currentWorkspaceId,
      legacy_id: note.id,
      text: note.text
    };
    if(note._dbId){
      keepIds.add(note._dbId);
      await client.from("notes").update(payload).eq("id", note._dbId);
    }else{
      const { data: inserted, error: insError } = await client
        .from("notes")
        .insert(payload)
        .select()
        .single();
      if(insError) throw insError;
      note._dbId = inserted.id;
      keepIds.add(inserted.id);
    }
  }

  const toDelete = [...existingIds].filter(id=>!keepIds.has(id));
  if(toDelete.length){
    await client.from("notes").delete().in("id", toDelete);
  }
}

async function resolveFileUrl(file){
  if(!file) return "";
  if(file.data) return file.data;
  if(file.url) return file.url;
  if(!file.storagePath) return "";
  const client = getSupabase();
  if(!client) return "";
  const { data, error } = await client.storage
    .from("show-documents")
    .createSignedUrl(file.storagePath, 3600);
  if(error){
    console.warn("Signed URL failed", error);
    return "";
  }
  file.url = data.signedUrl;
  return file.url;
}

function isImageFile(file){
  const type = file.type || "";
  const url = file.url || file.data || "";
  return type.startsWith("image/") || url.startsWith("data:image") || /\.(png|jpe?g|gif|webp)$/i.test(file.name || "");
}

async function uploadShowFile(showDate, file){
  const client = getSupabase();
  const s = show(showDate);

  if(!client || !currentWorkspaceId || !navigator.onLine){
    return uploadShowFileLocal(showDate, file);
  }

  if(!s._dbId){
    await pushToSupabase();
  }
  if(!s._dbId){
    return uploadShowFileLocal(showDate, file);
  }

  const fileId = crypto.randomUUID();
  const safeName = (file.name || "document").replace(/[^\w.\-]+/g, "_");
  const storagePath = `${currentWorkspaceId}/${s._dbId}/${fileId}-${safeName}`;

  const { error: uploadError } = await client.storage
    .from("show-documents")
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
  if(uploadError){
    console.warn("Storage upload failed, using local fallback", uploadError);
    return uploadShowFileLocal(showDate, file);
  }

  if(!s.files) s.files = [];
  const entry = {
    name: file.name,
    type: file.type || "",
    storagePath,
    url: null
  };

  const { data: inserted, error: insError } = await client
    .from("show_files")
    .insert({
      show_id: s._dbId,
      workspace_id: currentWorkspaceId,
      name: entry.name,
      mime_type: entry.type,
      storage_path: storagePath,
      sort_order: s.files.length
    })
    .select()
    .single();
  if(insError) throw insError;

  entry._dbId = inserted.id;
  s.files.push(entry);
  persist();
  return entry;
}

function uploadShowFileLocal(showDate, file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const s = show(showDate);
      if(!s.files) s.files = [];
      const entry = { name: file.name, type: file.type, data: reader.result };
      s.files.push(entry);
      persist();
      resolve(entry);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function migrateLocalStorageToSupabase(){
  if(localStorage.getItem(MIGRATION_FLAG) === "1") return false;

  const client = getSupabase();
  if(!client || !currentWorkspaceId) return false;

  const hasLocalData =
    Object.keys(state.shows || {}).length > 0 ||
    (state.ideas || []).length > 0 ||
    (state.notes || []).length > 0;

  const { count, error } = await client
    .from("shows")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", currentWorkspaceId);
  if(error) throw error;

  const remoteEmpty = !count;
  if(!hasLocalData || !remoteEmpty){
    localStorage.setItem(MIGRATION_FLAG, "1");
    return false;
  }

  await pushToSupabase();
  localStorage.setItem(MIGRATION_FLAG, "1");
  await loadFromSupabase();
  return true;
}

async function bootstrapRemoteData(userId){
  await ensureWorkspaceForUser(userId);
  const migrated = await migrateLocalStorageToSupabase();
  if(!migrated){
    await loadFromSupabase();
  }
  return true;
}
