// Configure these two values with your Supabase project credentials.
const SUPABASE_URL = "Your project URL is "`https://ymasvaoqaakradddqrtl.supabase.co`.";
const SUPABASE_ANON_KEY = "sb_publishable_BNzVBxSEhKkVpWz5B7rIaw_Ot8sQL7Y";

const supabaseReady = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const sb = supabaseReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let isAdmin = false;
let catalog = [];
let watchlist = new Set();
let authMode = "login";

const $ = (id) => document.getElementById(id);
const toast = (message) => {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3200);
};
const openOverlay = id => $(id).classList.add("show");
const closeOverlay = id => $(id).classList.remove("show");

document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => closeOverlay(btn.dataset.close)));
document.querySelectorAll(".overlay").forEach(o => o.addEventListener("click", e => { if(e.target===o) o.classList.remove("show"); }));

function escapeHtml(str="") {
  return str.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function card(item) {
  const cover = item.cover_url || "";
  return `<article class="card" data-id="${item.id}">
    <div class="poster">${cover ? `<img src="${escapeHtml(cover)}" alt="">` : `<div class="placeholder"><i data-lucide="${item.kind==="series"?"tv":"clapperboard"}"></i></div>`}</div>
    <div class="card-title">${escapeHtml(item.title)}</div>
    <div class="card-subtitle">${escapeHtml(item.year || item.genre || (item.kind==="series"?"Série":"Filme"))}</div>
  </article>`;
}
function renderCatalog() {
  const series = catalog.filter(x => x.kind==="series");
  const movies = catalog.filter(x => x.kind==="movie");
  $("series-rail").innerHTML = series.map(card).join("") || emptyCards("Nenhuma série publicada ainda");
  $("movies-rail").innerHTML = movies.map(card).join("") || emptyCards("Nenhum filme publicado ainda");
  $("recent-rail").innerHTML = catalog.slice(0,12).map(card).join("") || emptyCards("Seu catálogo aparecerá aqui");
  lucide.createIcons();
  document.querySelectorAll(".card").forEach(c => c.addEventListener("click", () => playContent(catalog.find(x=>x.id===c.dataset.id))));
}
function emptyCards(message) {
  return `<div class="muted small" style="padding:14px 0">${message}</div>`;
}
async function loadCatalog() {
  if(!sb) {
    catalog = [];
    renderCatalog();
    toast("Configure as credenciais do Supabase em app.js para carregar o catálogo.");
    return;
  }
  const {data,error} = await sb.from("catalog").select("*").eq("published",true).order("created_at",{ascending:false});
  if(error) { console.error(error); toast("Não foi possível carregar o catálogo."); return; }
  catalog = data || [];
  renderCatalog();
}
async function checkUser(session) {
  currentUser = session?.user || null;
  isAdmin = false;
  if(currentUser && sb) {
    const {data} = await sb.from("profiles").select("role").eq("id",currentUser.id).maybeSingle();
    isAdmin = data?.role === "admin";
  }
  $("account-toggle").innerHTML = currentUser ? '<i data-lucide="user-check"></i>' : '<i data-lucide="user-round"></i>';
  $("auth-title").textContent = currentUser ? "Sua conta" : (authMode==="signup"?"Criar conta":"Entrar no FMS+");
  $("auth-submit").textContent = authMode==="signup"?"Criar conta":"Entrar";
  $("auth-switch").textContent = authMode==="signup"?"Já tem uma conta? Entrar":"Criar uma conta";
  $("auth-logout").hidden = !currentUser;
  $("auth-message").textContent = currentUser ? `Conectado como ${currentUser.email}${isAdmin?" · Administrador":""}` : "";
  if(isAdmin) {
    const adminBtn = document.createElement("button");
    adminBtn.className="btn glass";
    adminBtn.innerHTML='<i data-lucide="shield-check"></i> FMS+ Studio';
    adminBtn.id="admin-shortcut";
    document.querySelector(".top-actions").appendChild(adminBtn);
    adminBtn.onclick=()=>{openOverlay("admin-overlay");loadAdminLibrary();};
  } else {
    $("admin-shortcut")?.remove();
  }
  lucide.createIcons();
}
async function initAuth() {
  if(!sb) return;
  const {data:{session}} = await sb.auth.getSession();
  await checkUser(session);
  sb.auth.onAuthStateChange((_event,session) => setTimeout(()=>checkUser(session),0));
}
$("account-toggle").onclick=()=>openOverlay("auth-overlay");
$("nav-account").onclick=()=>openOverlay("auth-overlay");
$("auth-switch").onclick=()=>{authMode=authMode==="login"?"signup":"login";checkUser({user:currentUser});};
$("auth-form").onsubmit=async e=>{
  e.preventDefault();
  if(!sb){$("auth-message").textContent="Configure Supabase primeiro em app.js.";return;}
  const email=$("auth-email").value.trim(),password=$("auth-password").value;
  const result=authMode==="signup" ? await sb.auth.signUp({email,password}) : await sb.auth.signInWithPassword({email,password});
  if(result.error){$("auth-message").textContent=result.error.message;return;}
  $("auth-message").textContent=authMode==="signup"?"Cadastro enviado. Verifique seu e-mail, se a confirmação estiver ativada.":"Login realizado.";
  if(authMode==="login") closeOverlay("auth-overlay");
};
$("auth-logout").onclick=async()=>{if(sb) await sb.auth.signOut();closeOverlay("auth-overlay");};
$("featured-watch").onclick=()=>{const featured=catalog.find(x=>x.title.toLowerCase().includes("line of fire"));if(featured)playContent(featured);else toast("Adicione Line of Fire pelo FMS+ Studio para habilitar o player.");};
$("featured-list").onclick=()=>toast("Faça login para usar sua lista pessoal.");
$("nav-watchlist").onclick=()=>toast("Sua lista pessoal será vinculada à sua conta.");
$("search-toggle").onclick=$("nav-search").onclick=()=>openOverlay("search-overlay");
$("search-input").oninput=e=>{
  const q=e.target.value.toLowerCase().trim();
  const found=catalog.filter(x=>x.title.toLowerCase().includes(q));
  $("search-results").innerHTML=q?found.map(x=>`<div class="result" data-id="${x.id}">${x.cover_url?`<img src="${escapeHtml(x.cover_url)}">`:""}<div><b>${escapeHtml(x.title)}</b><div class="muted small">${escapeHtml(x.genre||"")}</div></div></div>`).join(""):"";
  $("search-results").querySelectorAll(".result").forEach(el=>el.onclick=()=>playContent(catalog.find(x=>x.id===el.dataset.id)));
};
async function playContent(item) {
  if(!item || !sb){toast("Configure o Supabase e publique um conteúdo.");return;}
  const {data,error}=await sb.storage.from("videos").createSignedUrl(item.video_path,3600);
  if(error){toast("Não foi possível abrir o vídeo.");console.error(error);return;}
  $("player-title").textContent=item.title;
  $("video-player").src=data.signedUrl;
  openOverlay("player-overlay");
  $("video-player").play().catch(()=>{});
}
$("player-overlay").addEventListener("click",e=>{if(e.target===$("player-overlay")){ $("video-player").pause();$("video-player").src="";closeOverlay("player-overlay");}});
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>toast("O catálogo completo será exibido quando houver conteúdos publicados."));
document.querySelectorAll("[data-admin-tab]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  $("admin-upload").hidden=b.dataset.adminTab!=="upload";$("admin-manage").hidden=b.dataset.adminTab!=="manage";
});
async function loadAdminLibrary(){
  if(!isAdmin||!sb)return;
  const {data,error}=await sb.from("catalog").select("*").order("created_at",{ascending:false});
  if(error){$("admin-message").textContent=error.message;return;}
  $("admin-library").innerHTML=(data||[]).map(x=>`<div class="library-item"><div class="details"><b>${escapeHtml(x.title)}</b><div class="muted small">${x.published?"Publicado":"Rascunho"} · ${x.kind==="series"?"Série":"Filme"}</div></div><button data-publish="${x.id}" data-value="${!x.published}">${x.published?"Despublicar":"Publicar"}</button><button data-delete="${x.id}" aria-label="Excluir"><i data-lucide="trash-2"></i></button></div>`).join("");
  lucide.createIcons();
  $("admin-library").querySelectorAll("[data-publish]").forEach(b=>b.onclick=async()=>{const {error}=await sb.from("catalog").update({published:b.dataset.value==="true"}).eq("id",b.dataset.publish);if(error)toast(error.message);else loadAdminLibrary();await loadCatalog();});
  $("admin-library").querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Excluir este conteúdo?"))return;const {error}=await sb.from("catalog").delete().eq("id",b.dataset.delete);if(error)toast(error.message);else{loadAdminLibrary();loadCatalog();}});
}
$("upload-form").onsubmit=async e=>{
  e.preventDefault();
  if(!sb||!isAdmin){$("admin-message").textContent="Somente um administrador autenticado pode enviar conteúdo.";return;}
  const video=$("content-video").files[0],cover=$("content-cover").files[0];
  if(!video)return;
  const id=crypto.randomUUID(),uid=currentUser.id;
  const videoPath=`${uid}/${id}-${video.name.replace(/[^\w.-]/g,"_")}`;
  $("admin-message").textContent="Enviando vídeo...";
  const videoUpload=await sb.storage.from("videos").upload(videoPath,video,{contentType:video.type,upsert:false});
  if(videoUpload.error){$("admin-message").textContent=videoUpload.error.message;return;}
  let coverPath=null,coverUrl=null;
  if(cover){
    coverPath=`${uid}/${id}-${cover.name.replace(/[^\w.-]/g,"_")}`;
    const uploaded=await sb.storage.from("covers").upload(coverPath,cover,{contentType:cover.type,upsert:false});
    if(uploaded.error){await sb.storage.from("videos").remove([videoPath]);$("admin-message").textContent=uploaded.error.message;return;}
    const {data}=sb.storage.from("covers").getPublicUrl(coverPath);coverUrl=data.publicUrl;
  }
  const record={id,title:$("content-title").value.trim(),kind:$("content-kind").value,description:$("content-description").value,year:$("content-year").value?Number($("content-year").value):null,genre:$("content-genre").value,video_path:videoPath,cover_path:coverPath,cover_url:coverUrl,published:$("content-published").checked,owner_id:uid};
  const {error}=await sb.from("catalog").insert(record);
  if(error){await sb.storage.from("videos").remove([videoPath]);if(coverPath)await sb.storage.from("covers").remove([coverPath]);$("admin-message").textContent=error.message;return;}
  $("admin-message").textContent="Conteúdo enviado com sucesso!";
  $("upload-form").reset();loadCatalog();loadAdminLibrary();
};
async function boot(){
  lucide.createIcons();
  await initAuth();
  await loadCatalog();
}
boot();
