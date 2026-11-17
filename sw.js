// Service worker Belajar Yuk! (mode offline). Ubah VERSI setiap kali file game diperbarui.
const VERSI = 'belajar-yuk-v1';
const HEWAN = ['anjing','kucing','sapi','ayam','bebek','kambing','domba','kuda','babi','singa','harimau','gajah','monyet','burung','katak','ular','lebah','ikan'];
const ASET = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png']
  .concat(HEWAN.map(h => './' + h + '.mp3'))
  .concat(Array.from({length:28}, (_, i) => './huruf' + (i+1) + '.mp3'));

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI).then(c =>
      // file yang tidak ada dilewati, tidak membatalkan pemasangan
      Promise.all(ASET.map(u => fetch(u, {cache:'reload'}).then(r => { if(r.ok) return c.put(u, r); }).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// audio meminta potongan (Range); jawab dari cache supaya tetap bisa diputar offline
async function potong(req, res){
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  let s = m && m[1] ? parseInt(m[1], 10) : 0;
  let e = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if(m && !m[1] && m[2]){ s = size - parseInt(m[2], 10); e = size - 1; }
  e = Math.min(e, size - 1);
  return new Response(buf.slice(s, e + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + s + '-' + e + '/' + size,
      'Content-Length': String(e - s + 1)
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, {ignoreSearch:true});
    if(hit) return req.headers.has('range') ? potong(req, hit) : hit;
    try{
      const r = await fetch(req);
      if(r.status === 200 && !req.headers.has('range')){
        const c = await caches.open(VERSI);
        c.put(req, r.clone());
      }
      return r;
    }catch(err){
      if(req.mode === 'navigate'){ const h = await caches.match('./index.html'); if(h) return h; }
      throw err;
    }
  })());
});
