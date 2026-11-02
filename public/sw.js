<<<<<<< HEAD
const CACHE='mesa-dados-shell-v14-20261102';
const PRELOAD=['/','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRELOAD)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
=======
// O shell é cacheado somente quando o servidor responde HTML real.
const CACHE='mesa-dados-shell-v151-20261102';
const PRELOAD=['/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRELOAD)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
const isValidHtml=async response=>{
  if(!response?.ok || !response.headers.get('content-type')?.includes('text/html'))return false;
  const text=await response.clone().text();
  return /<!doctype\s+html/i.test(text)&&/<div\s+id=["']root["']/.test(text);
};
>>>>>>> 6b70ecdd29d9136f36782aa9222869597063b583
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  const url=new URL(req.url);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket.io')||url.pathname.startsWith('/files/')||url.pathname.includes('auth'))return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try {
        const response=await fetch(req, {cache:'no-store'});
        if(await isValidHtml(response))await (await caches.open(CACHE)).put('/',response.clone());
        return response;
      }catch(error){return (await caches.match('/'))||Response.error();}
    })());
    return;
  }
  if(!/\.(js|css|png|svg|ico|woff2?|webp|json)$/.test(url.pathname))return;
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response.ok)caches.open(CACHE).then(cache=>cache.put(req,response.clone()));
    return response;
  })));
});
