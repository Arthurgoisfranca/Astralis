const CACHE='astralis-shell-v150-20261102';
const PRELOAD=['/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRELOAD)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
async function validShell(response){if(!response?.ok||!response.headers.get('content-type')?.includes('text/html'))return false;const html=await response.clone().text();return /<!doctype\s+html/i.test(html)&&/<div\s+id=["']root["']/.test(html);}
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
 const url=new URL(request.url);if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket.io')||url.pathname.startsWith('/files/')||url.pathname.includes('auth'))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-store'});if(await validShell(response))await (await caches.open(CACHE)).put('/',response.clone());return response;}catch{return (await caches.match('/'))||Response.error();}})());return;
 }
 if(!/\.(js|css|png|svg|ico|woff2?|webp|json)$/.test(url.pathname))return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response;})));
});
