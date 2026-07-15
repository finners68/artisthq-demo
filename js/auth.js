let currentAuthUser = null;

if(isSupabaseConfigured()) document.body.classList.add("auth-locked");

function setAppVisible(visible){
  document.body.classList.toggle("auth-locked", !visible);
  const authSheet = document.getElementById("authSheet");
  if(authSheet) authSheet.classList.toggle("active", !visible);
}

async function bootAuthenticatedApp(){
  window.__authReady = true;
  setAppVisible(true);
  subscribeToWorkspaceChanges();
  if(typeof renderAll === "function"){
    renderAll();
  }else{
    window.__pendingRender = true;
  }
}

async function handleAuthenticatedSession(session){
  currentAuthUser = session.user;
  initSupabaseClient();
  try{
    await bootstrapRemoteData(session.user.id);
    await bootAuthenticatedApp();
  }catch(err){
    console.error("Failed to load remote data", err);
    setAuthMessage("Could not load workspace data. Using offline cache.");
    await bootAuthenticatedApp();
  }
}

function setAuthMessage(msg){
  const el = document.getElementById("authMessage");
  if(el) el.textContent = msg || "";
}

async function signInWithPassword(){
  const client = getSupabase();
  if(!client) return;

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if(!email || !password){
    setAuthMessage("Enter email and password.");
    return;
  }

  setAuthMessage("Signing in...");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if(error){
    setAuthMessage(error.message);
    return;
  }
  setAuthMessage("");
  await handleAuthenticatedSession(data.session);
}

async function signUpWithPassword(){
  const client = getSupabase();
  if(!client) return;

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if(!email || !password){
    setAuthMessage("Enter email and password.");
    return;
  }
  if(password.length < 6){
    setAuthMessage("Password must be at least 6 characters.");
    return;
  }

  setAuthMessage("Creating account...");
  const { data, error } = await client.auth.signUp({ email, password });
  if(error){
    setAuthMessage(error.message);
    return;
  }
  if(!data.session){
    setAuthMessage("Check your email to confirm your account, then sign in.");
    return;
  }
  setAuthMessage("");
  await handleAuthenticatedSession(data.session);
}

async function signOut(){
  const client = getSupabase();
  if(client) await client.auth.signOut();
  currentAuthUser = null;
  currentWorkspaceId = null;
  localStorage.removeItem(WORKSPACE_KEY);
  unsubscribeFromWorkspaceChanges();
  window.__authReady = false;
  setAppVisible(false);
  setAuthMessage("Signed out.");
}

async function initAuth(){
  if(!isSupabaseConfigured()){
    window.__authReady = true;
    setAppVisible(true);
    document.querySelector(".signOutBtn")?.style.setProperty("display", "none");
    if(typeof renderAll === "function") renderAll();
    return;
  }

  initSupabaseClient();
  const client = getSupabase();
  if(!client){
    window.__authReady = true;
    setAppVisible(true);
    if(typeof renderAll === "function") renderAll();
    return;
  }

  setAppVisible(false);

  const { data, error } = await client.auth.getSession();
  if(error){
    console.warn("Session check failed", error);
    setAuthMessage("Sign in to sync your workspace.");
    return;
  }

  if(data.session){
    await handleAuthenticatedSession(data.session);
    return;
  }

  setAuthMessage("Sign in to sync your workspace.");

  client.auth.onAuthStateChange(async (event, session)=>{
    if(event === "SIGNED_IN" && session && !window.__authReady){
      await handleAuthenticatedSession(session);
    }
    if(event === "SIGNED_OUT"){
      window.__authReady = false;
      setAppVisible(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  initAuth();
});
