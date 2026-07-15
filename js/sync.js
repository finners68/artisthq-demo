let syncTimer = null;
let realtimeChannel = null;
const SYNC_DEBOUNCE_MS = 800;

function queueSync(){
  if(!isSupabaseConfigured() || !currentWorkspaceId) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async ()=>{
    const ok = await pushToSupabase();
    if(ok && typeof liveToast === "function") liveToast("Synced");
  }, SYNC_DEBOUNCE_MS);
}

function flushSync(){
  if(!isSupabaseConfigured() || !currentWorkspaceId) return Promise.resolve(false);
  clearTimeout(syncTimer);
  return pushToSupabase();
}

async function reloadFromRemoteAndRender(){
  if(dbRemoteLoading) return;
  const ok = await loadFromSupabase();
  if(ok && typeof renderAll === "function") renderAll();
  return ok;
}

function subscribeToWorkspaceChanges(){
  const client = getSupabase();
  if(!client || !currentWorkspaceId) return;

  if(realtimeChannel){
    client.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = client
    .channel(`workspace-${currentWorkspaceId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "shows", filter: `workspace_id=eq.${currentWorkspaceId}` }, ()=>{
      if(dbSyncInProgress) return;
      reloadFromRemoteAndRender();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "show_files", filter: `workspace_id=eq.${currentWorkspaceId}` }, ()=>{
      if(dbSyncInProgress) return;
      reloadFromRemoteAndRender();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "content_pieces", filter: `workspace_id=eq.${currentWorkspaceId}` }, ()=>{
      if(dbSyncInProgress) return;
      reloadFromRemoteAndRender();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "ideas", filter: `workspace_id=eq.${currentWorkspaceId}` }, ()=>{
      if(dbSyncInProgress) return;
      reloadFromRemoteAndRender();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `workspace_id=eq.${currentWorkspaceId}` }, ()=>{
      if(dbSyncInProgress) return;
      reloadFromRemoteAndRender();
    })
    .subscribe();
}

function unsubscribeFromWorkspaceChanges(){
  const client = getSupabase();
  if(client && realtimeChannel){
    client.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

window.addEventListener("online", ()=>{
  flushSync();
});
