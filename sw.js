// Service worker de la Hoja de Campo Digital (Trinijove).
// Solo cachea el "app shell" (la propia página, que lleva el logo y los estilos
// incrustados) para que la app abra sin conexión una vez instalada. Los datos
// de las caracterizaciones viven en localStorage y en Supabase, no aquí.
const CACHE = "trinijove-hcd-v14";
// Las fotos tienen nombres únicos y no cambian nunca: se guardan aparte y no se borran al actualizar.
const FOTOS = "trinijove-fotos-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./config.js", "./vendor/supabase-2.117.2.js", "./vendor/jspdf-4.2.1.umd.min.js", "./icon-192-v2.png", "./icon-512-v2.png"];

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
      return Promise.all(keys.filter(function(k){ return k!==CACHE && k!==FOTOS; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  if(event.request.method!=="GET") return;
  var url = new URL(event.request.url);
  // Fotos de Supabase: primero la copia del móvil, para verlas y meterlas en el PDF sin conexión.
  // Se piden siempre en modo cors para que la copia sirva también a fetch() (las <img> piden en no-cors).
  if(url.pathname.indexOf("/storage/v1/object/public/fotos/")>-1){
    event.respondWith(
      caches.open(FOTOS).then(function(cache){
        return cache.match(url.href).then(function(hit){
          return hit || fetch(url.href, {mode:"cors", credentials:"omit"}).then(function(resp){
            if(resp && resp.ok) cache.put(url.href, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }
  // El resto de Supabase (datos, sesión) va siempre a la red.
  if(url.origin !== self.location.origin) return;
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
