let supabaseClient = null;

function initSupabaseClient(){
  if(!isSupabaseConfigured()) return null;
  if(typeof supabase === "undefined"){
    console.warn("Supabase JS library not loaded");
    return null;
  }
  if(!supabaseClient){
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

function getSupabase(){
  return supabaseClient || initSupabaseClient();
}
