// Exposes window.Cloud with save/load helpers.
// Best-effort auto-hook if epub.js's `window.rendition` exists.
window.Cloud = {
  async saveProgress(bookId, data){
    try {
      await fetch('/api/state/progress', {
        method:'PUT',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ bookId, ...data }),
        credentials:'include'
      });
    } catch {}
  },
  async loadProgress(bookId){
    try {
      const r = await fetch('/api/state/progress?bookId='+encodeURIComponent(bookId), { credentials:'include' });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  },
  async listAnnotations(bookId){
    try {
      const r = await fetch('/api/annotations?bookId='+encodeURIComponent(bookId), { credentials:'include' });
      if (!r.ok) return { items: [] };
      return await r.json();
    } catch { return { items: [] }; }
  },
  async upsertAnnotation(a){
    try {
      const r = await fetch('/api/annotations', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify(a),
        credentials:'include'
      });
      return await r.json();
    } catch { return { ok:false }; }
  },
  async deleteAnnotation(id){
    try { await fetch('/api/annotations/'+encodeURIComponent(id), { method:'DELETE', credentials:'include' }); } catch {}
  }
};

// Optional auto-hook for epub.js viewers that set window.rendition
(function(){
  const MAX_WAIT = 4000; let waited = 0;
  const t = setInterval(()=>{
    waited += 200;
    if (window.rendition && window.currentBookId) {
      clearInterval(t);
      try {
        window.rendition.on('relocated', (loc)=>{
          const cfi = loc?.start?.cfi || null;
          const percent = (loc?.percentage != null) ? (loc.percentage * 100) : null;
          window.Cloud.saveProgress(window.currentBookId, { cfi, percent });
        });
      } catch {}
    }
    if (waited >= MAX_WAIT) clearInterval(t);
  }, 200);
})();
