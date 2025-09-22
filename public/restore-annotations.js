// public/restore-annotations.js
(function(){
  // ---------- tiny 401 toast ----------
  function ensureToast(){
    if (document.getElementById('cf401toast')) return;
    const d = document.createElement('div');
    d.id = 'cf401toast';
    d.textContent = 'Session expired. Please sign in again.';
    Object.assign(d.style, {
      position:'fixed', right:'16px', bottom:'16px', padding:'10px 12px',
      background:'#111', color:'#fff', borderRadius:'8px', font:'13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      zIndex: 2147483647, boxShadow:'0 6px 20px rgba(0,0,0,.25)'
    });
    document.body.appendChild(d);
    setTimeout(()=>{ d.remove(); }, 5000);
  }

  const _fetch = window.fetch;
  window.fetch = async function(...args){
    const res = await _fetch(...args);
    if (res && res.status === 401) ensureToast();
    return res;
  };

  // ---------- wrapping helpers (external) ----------
  function wrapRangeExternal(range, className, id, color){
    const doc = range.startContainer.ownerDocument || document;
    const span = doc.createElement('span');
    span.className = className;
    span.dataset.annotId = id;
    if (className === 'hl' && color) span.classList.add('hl-' + color);

    const startNode = range.startContainer;
    const endNode   = range.endContainer;

    // Split start and end text nodes to isolate the selection
    if (startNode.nodeType === 3) {
      const t = startNode;
      const before = t.nodeValue.slice(0, range.startOffset);
      const sel    = t.nodeValue.slice(range.startOffset);
      const beforeNode = doc.createTextNode(before);
      const selNode    = doc.createTextNode(sel);
      t.parentNode.insertBefore(beforeNode, t);
      t.parentNode.insertBefore(selNode, t);
      t.parentNode.removeChild(t);
      range.setStart(selNode, 0);
      range.setEnd(selNode, Math.min(selNode.nodeValue.length, range.endOffset - range.startOffset));
    }
    if (endNode.nodeType === 3 && endNode !== range.startContainer) {
      const t = endNode;
      const selEnd = t.nodeValue.slice(0, range.endOffset);
      const after  = t.nodeValue.slice(range.endOffset);
      const selEndNode = doc.createTextNode(selEnd);
      const afterNode  = doc.createTextNode(after);
      t.parentNode.insertBefore(selEndNode, t);
      t.parentNode.insertBefore(afterNode, t);
      t.parentNode.removeChild(t);
      range.setEnd(selEndNode, selEndNode.nodeValue.length);
    }

    // Extract the contents and wrap
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
    return span;
  }

  function findTextRange(rootEl, snippet){
    if(!snippet || !snippet.trim()) return null;
    const needle = snippet.trim();
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()){
      const t = walker.currentNode.nodeValue || '';
      const idx = t.indexOf(needle);
      if (idx !== -1){
        const r = document.createRange();
        r.setStart(walker.currentNode, idx);
        r.setEnd(walker.currentNode, idx + needle.length);
        return r;
      }
    }
    return null;
  }

  async function fetchAnnotations(bookId){
    const r = await fetch(`/api/annotations?bookId=${encodeURIComponent(bookId)}`, { credentials:'include' });
    if (!r.ok) return [];
    return await r.json();
  }

  async function restore(bookId){
    const list = await fetchAnnotations(bookId); // [{id, note, color, tags}]
    const root = document.getElementById('viewer');
    if (!root) return;

    for (const a of list){
      let meta = {};
      try { meta = a.tags ? JSON.parse(a.tags) : {}; } catch {}
      const kind = meta.kind || 'hl';
      const snippet = a.note || '';
      const range = findTextRange(root, snippet);
      if (!range) continue;

      if (kind === 'hl'){
        wrapRangeExternal(range, 'hl', a.id, a.color || 'y');
      } else {
        wrapRangeExternal(range, 'gloss', a.id);
      }
    }
  }

  function getBookIdFromURL(){
    const u = new URL(location.href);
    return u.searchParams.get('book') || u.searchParams.get('id') || null;
  }

  // Wait for #viewer to be populated, then restore once
  function whenViewerReady(cb){
    const root = document.getElementById('viewer');
    if (!root){ document.addEventListener('DOMContentLoaded', ()=>whenViewerReady(cb)); return; }
    const tryNow = ()=>{
      const hasText = (root.textContent || '').trim().length > 40;
      if (hasText){ cb(); return true; }
      return false;
    };
    if (tryNow()) return;
    const obs = new MutationObserver(()=>{ if (tryNow()){ obs.disconnect(); } });
    obs.observe(root, { childList:true, subtree:true, characterData:true });
    setTimeout(()=>obs.disconnect(), 10000); // safety
  }

  const bookId = getBookIdFromURL();
  if (bookId){
    whenViewerReady(()=>{ restore(bookId).catch(console.error); });
  }
})();
