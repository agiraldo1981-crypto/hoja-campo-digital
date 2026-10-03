// Service worker de la Hoja de Campo Digital (Trinijove).
// Solo cachea el "app shell" (la propia página, que lleva el logo y los estilos
// incrustados) para que la app abra sin conexión una vez instalada. Los datos
// de las caracterizaciones ya viven en localStorage, no aquí.
const CACHE = "trinijove-hcd-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      return Promise.all(SHELL.map(function(url){
        return cache.add(url).catch(function(){ /* algún asset puede no existir; se ignora */ });
      }));
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  if(event.request.method!=="GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var network = fetch(event.request).then(function(resp){
        if(resp && resp.ok){
          var copy = resp.clone();
          caches.open(CACHE).then(function(cache){ cache.put(event.request, copy); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
