(function(){
  // ---------- tiny toast for 401s ----------
  function toast401(){
    if (document.getElementById('cf401toast')) return;
    const d = document.createElement('div');
    d.id = 'cf401toast';
    d.textContent = 'Session expired. Please sign in again.';
    Object.assign(d.style, {
      position:'fixed', right:'16px', bottom:'16px', padding:'10px 12px',
      background:'#111', color:'#fff', borderRadius:'8px',
      font:'13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
      zIndex: 2147483647, boxShadow:'0 6px 20px rgba(0,0,0,.25)'
    });
    document.body.appendChild(d);
    setTimeout(()=>{ d.remove(); }, 4000);
  }
  const _fetch = window.fetch;
  window.fetch = async function(...args){
    const res = await _fetch(...args);
    if (res && res.status === 401) toast401();
    return res;
  };

  // ---------- utils ----------
  const $ = sel => document.querySelector(sel);

  function getBookIdFromURL(){
    const u = new URL(location.href);
    return u.searchParams.get('book') || u.searchParams.get('id') || '';
  }

  // normalize spaces (collapse whitespace, trim)
  function norm(s){ return (s||'').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim(); }

  // From an original string, build normalized string + index map
  function normalizeWithMap(orig){
    let n = '', map = [];
    let i = 0;
    while (i < orig.length){
      const ch = orig[i];
      if (/\s/.test(ch)){
        // collapse a run of whitespace to one space
        while (i < orig.length && /\s/.test(orig[i])) i++;
        n += ' ';
        map.push(i-1); // map this normalized char to the last whitespace index
      } else {
        n += ch;
        map.push(i);
        i++;
      }
    }
    // trim leading/trailing space from normalized string while keeping map aligned
    if (n.startsWith(' ')) { n = n.slice(1); map = map.slice(1); }
    if (n.endsWith(' ')) { n = n.slice(0,-1); map = map.slice(0,-1); }
    return { n, map };
  }

  function makeRangeFromNormalizedMatch(node, startN, lenN){
    const { n, map } = normalizeWithMap(node.nodeValue || '');
    if (!n || startN < 0) return null;
    const startOrig = map[startN];
    const endOrig   = map[startN + lenN - 1] + 1; // exclusive
    if (startOrig == null || endOrig == null || endOrig <= startOrig) return null;
    const r = document.createRange();
    r.setStart(node, startOrig);
    r.setEnd(node, endOrig);
    return r;
  }

  function wrapRangeExternal(range, className, id, color){
    const doc = range.startContainer.ownerDocument || document;
    const span = doc.createElement('span');
    span.className = className;
    span.dataset.annotId = id;
    if (className.indexOf('hl') !== -1 && color) span.classList.add('hl-'+color);

    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
    return span;
  }

  async function fetchAnnotations(bookId){
    const r = await fetch(`/api/annotations?bookId=${encodeURIComponent(bookId)}`, { credentials:'include' });
    if (!r.ok) return [];
    return r.json();
  }

  // restore highlights/notes by matching saved snippet back into the live DOM
  async function restore(bookId){
    const root = document.getElementById('viewer');
    if (!root) return;

    const list = await fetchAnnotations(bookId);
    if (!Array.isArray(list) || list.length === 0) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const t = walker.currentNode;
      if (t.nodeValue && norm(t.nodeValue)) textNodes.push(t);
    }

    for (const a of list){
      let meta = {};
      try { meta = a.tags ? JSON.parse(a.tags) : {}; } catch {}
      const kind = meta.kind || 'hl';
      const color = a.color || 'y';
      const snippet = norm(a.note || '');

      if (!snippet) continue;

      let matched = false;
      for (const node of textNodes){
        const { n } = normalizeWithMap(node.nodeValue || '');
        const idx = n.indexOf(snippet);
        if (idx !== -1){
          const r = makeRangeFromNormalizedMatch(node, idx, snippet.length);
          if (r){
            wrapRangeExternal(r, kind === 'hl' ? 'hl' : 'gloss', a.id, color);
            matched = true;
            break;
          }
        }
      }
      // If not matched, we silently skip; future scroll loads may shift text.
    }
  }

  // fix the viewer header text to "Title – Author" (use only the first two chunks)
  function fixViewerHeader(){
    const el = document.getElementById('bookTitle');
    if (!el) return;
    const raw = (el.textContent || '').trim();
    if (!raw) return;

    // Already "Title – Author"?
    if (/–/.test(raw)) return;

    if (/\s[-–—]{1,2}\s/.test(raw)){
      const parts = raw.split(/\s[-–—]{1,2}\s/);
      if (parts.length >= 2){
        const title  = parts[0].trim();
        const author = parts[1].trim();
        el.textContent = `${title} – ${author}`;
      }
    }
  }

  // Wait until the viewer content is present, then restore + fix header
  function waitForViewerAndRestore(){
    const bookId = getBookIdFromURL();
    if (!bookId) return;

    const viewer = $('#viewer');
    if (!viewer) return;

    const attempt = async ()=>{
      // Heuristic: text content is sizable → rendering likely done
      const ready = (viewer.textContent || '').trim().length > 200;
      if (ready){
        fixViewerHeader();
        restore(bookId);
        return true;
      }
      return false;
    };

    // try immediately, then observe mutations until ready
    attempt().then((ok)=>{
      if (ok) return;
      const mo = new MutationObserver(async ()=>{
        const ok2 = await attempt();
        if (ok2) mo.disconnect();
      });
      mo.observe(viewer, {childList:true, subtree:true, characterData:true});
      // Safety timer in case observer misses: try again after 4s
      setTimeout(()=>attempt().then(ok => ok && mo.disconnect()), 4000);
    });
  }

  // Kick off only on the viewer page
  if (document.getElementById('viewer')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitForViewerAndRestore);
    } else {
      waitForViewerAndRestore();
    }
  }
})();
