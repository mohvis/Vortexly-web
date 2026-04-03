// ==========================================
//  LAYOUT MODE  ('two' | 'one' | 'custom')
// ==========================================
let layoutMode = 'two';

function setLayoutMode(mode) {
  layoutMode = mode;
  document.getElementById('panel-two').style.display    = mode === 'two'    ? '' : 'none';
  document.getElementById('panel-one').style.display    = mode === 'one'    ? '' : 'none';
  document.getElementById('panel-custom').style.display = mode === 'custom' ? '' : 'none';
  document.getElementById('layout-two').style.display    = mode === 'two'    ? '' : 'none';
  document.getElementById('layout-single').style.display = mode === 'one'    ? '' : 'none';
  document.getElementById('layout-custom').style.display = mode === 'custom' ? '' : 'none';
  ['two','one','custom'].forEach(m => {
    const btn = document.getElementById('msw-' + m);
    if (btn) { btn.classList.toggle('active', m === mode); btn.setAttribute('aria-pressed', (m === mode).toString()); }
  });
  if (mode === 'custom') {
    renderAllLayers();
    renderLayerList();
    deselectLayer();
  } else {
    hideFloatTb();
  }
  syncBgControls();
  saveState();
}

// ==========================================
//  MOBILE TABS
// ==========================================
function initMobileTabs() {
  const tabEdit = document.getElementById('tab-edit');
  const tabPreview = document.getElementById('tab-preview');
  const panel = document.getElementById('editor-panel');
  const wrapper = document.getElementById('canvas-wrapper');
  function showTab(t) {
    if (t === 'edit') {
      panel.classList.add('mob-active'); wrapper.classList.remove('mob-active');
      tabEdit.classList.add('active'); tabPreview.classList.remove('active');
    } else {
      wrapper.classList.add('mob-active'); panel.classList.remove('mob-active');
      tabPreview.classList.add('active'); tabEdit.classList.remove('active');
      setTimeout(scaleCanvas, 50);
    }
  }
  tabEdit.addEventListener('click', () => showTab('edit'));
  tabPreview.addEventListener('click', () => showTab('preview'));
  function applyInitial() {
    if (window.innerWidth <= 767) { showTab('edit'); }
    else { panel.classList.remove('mob-active'); wrapper.classList.remove('mob-active'); }
  }
  applyInitial();
  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) { panel.classList.remove('mob-active'); wrapper.classList.remove('mob-active'); }
  });
}

// ==========================================
//  SCALE CANVAS
// ==========================================
function scaleCanvas() {
  const wrapper = document.getElementById('canvas-wrapper');
  const scaler  = document.getElementById('canvas-scaler');
  const avW = wrapper.clientWidth  - 40;
  const avH = wrapper.clientHeight - 40;
  const scale = Math.min(avW / 1000, avH / 1500);
  scaler.style.transform = `scale(${scale})`;
  scaler.style.width  = '1000px';
  scaler.style.height = '1500px';
  positionFloatTb();
}
window.addEventListener('resize', scaleCanvas);
scaleCanvas();

// ==========================================
//  PASTE TARGET TRACKING
// ==========================================
let pasteTargetId = 'top';
['top','bottom','single'].forEach(t => {
  const sec = document.getElementById('sec-' + t);
  const dz  = document.getElementById('dz-'  + t);
  if (sec) sec.addEventListener('mouseenter', () => pasteTargetId = t);
  if (dz)  dz.addEventListener('mouseenter',  () => pasteTargetId = t);
});

// ==========================================
//  IMAGE URL TRACKING
// ==========================================
const currentUrls = { top: null, bottom: null, single: null };
const imgState    = {
  top:    { origSrc: null },
  bottom: { origSrc: null },
  single: { origSrc: null }
};

function showImgControls(target, show) {
  const adj    = document.getElementById('adj-' + target);
  const cropBtn = document.getElementById('crop-' + target + '-btn');
  if (adj)     adj.classList.toggle('visible', show);
  if (cropBtn) cropBtn.style.display = show ? 'inline-flex' : 'none';
}

function applyImgStyle(target) {
  const card = document.getElementById('card-' + target);
  const zoom = parseInt(document.getElementById('zoom-' + target).value, 10);
  const posX = document.getElementById('posx-' + target).value;
  const posY = document.getElementById('posy-' + target).value;
  document.getElementById('zoom-' + target + '-val').textContent = zoom + '%';
  document.getElementById('posx-' + target + '-val').textContent = posX + '%';
  document.getElementById('posy-' + target + '-val').textContent = posY + '%';
  if (card) {
    card.style.backgroundSize     = zoom + '%';
    card.style.backgroundPosition = posX + '% ' + posY + '%';
  }
  saveState();
}

function resetImgStyle(target) {
  document.getElementById('zoom-' + target).value = 100;
  document.getElementById('posx-' + target).value = 50;
  document.getElementById('posy-' + target).value = 50;
  applyImgStyle(target);
}

function revokeUrl(target) {
  if (currentUrls[target]) { URL.revokeObjectURL(currentUrls[target]); currentUrls[target] = null; }
}

function loadImage(target, src, isBlob) {
  if (isBlob) { revokeUrl(target); currentUrls[target] = src; }
  const card  = document.getElementById('card-'  + target);
  const thumb = document.getElementById('thumb-' + target);
  const ph    = document.getElementById('ph-'    + target);
  const cph   = document.getElementById('cph-'   + target);
  const dz    = document.getElementById('dz-'    + target);
  const delB  = document.getElementById('del-'   + target);
  if (card)  card.style.backgroundImage = `url('${src}')`;
  if (thumb) { thumb.src = src; thumb.style.display = 'block'; }
  if (ph)    ph.style.display    = 'none';
  if (cph)   cph.style.display   = 'none';
  if (dz)    dz.classList.add('loaded');
  if (delB)  delB.style.display  = 'inline-flex';
  imgState[target].origSrc = src;
  showImgControls(target, true);
}

function removeImage(target) {
  revokeUrl(target);
  const card  = document.getElementById('card-'  + target);
  const thumb = document.getElementById('thumb-' + target);
  const ph    = document.getElementById('ph-'    + target);
  const cph   = document.getElementById('cph-'   + target);
  const dz    = document.getElementById('dz-'    + target);
  const delB  = document.getElementById('del-'   + target);
  const fi    = document.getElementById('file-'  + target);
  if (card)  card.style.backgroundImage  = '';
  if (thumb) { thumb.src = ''; thumb.style.display = 'none'; }
  if (ph)    ph.style.display    = 'flex';
  if (cph)   cph.style.display   = 'flex';
  if (dz)    dz.classList.remove('loaded');
  if (delB)  delB.style.display  = 'none';
  if (fi)    fi.value = '';
  if (imgState[target].origSrc && imgState[target].origSrc.startsWith('blob:')) {
    URL.revokeObjectURL(imgState[target].origSrc);
  }
  imgState[target].origSrc = null;
  resetImgStyle(target);
  showImgControls(target, false);
  saveState();
}

// ==========================================
//  FILE UPLOAD
// ==========================================
function triggerUpload(target) { pasteTargetId = target; document.getElementById('file-' + target).click(); }

function onFileChange(input, target) {
  const file = input.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  loadImage(target, url, true);
  toast('Image loaded');
}

// ==========================================
//  DRAG AND DROP
// ==========================================
['top','bottom','single'].forEach(target => {
  const dz = document.getElementById('dz-' + target);
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); pasteTargetId = target; });
  dz.addEventListener('dragleave', e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('over'); });
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) { loadImage(target, URL.createObjectURL(file), true); toast('Image loaded'); }
  });
  dz.addEventListener('click', e => { if (e.target.closest('.dz-btn')) return; if (!dz.classList.contains('loaded')) triggerUpload(target); });
});

// ==========================================
//  CLIPBOARD PASTE
// ==========================================
async function pasteTarget(target) {
  pasteTargetId = target;
  const dz = document.getElementById('dz-' + target);
  if (dz) { dz.classList.add('paste-active'); setTimeout(() => dz.classList.remove('paste-active'), 1800); }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) { loadImage(target, URL.createObjectURL(await item.getType(type)), true); toast('Pasted'); return; }
    }
    toast('No image in clipboard');
  } catch { toast('Paste: use Ctrl+V or allow clipboard access'); }
}

document.addEventListener('paste', e => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        const url = URL.createObjectURL(blob);
        if (layoutMode === 'custom') { addImageLayer(url); toast('Image layer added'); }
        else { loadImage(pasteTargetId, url, true); toast('Pasted'); }
        return;
      }
    }
  }
});

// ==========================================
//  LABEL SYNC (2-image & 1-image template)
// ==========================================
function sync(inputId, canvasId) {
  const val = document.getElementById(inputId)?.value;
  const el  = document.getElementById(canvasId);
  if (el && val !== undefined) el.textContent = val;
  saveState();
}

function applyLabelColor(canvasId, color) {
  const el = document.getElementById(canvasId);
  if (el) el.style.color = color;
  saveState();
}
// alias for single template
const applySingleColor = applyLabelColor;

// 1-image label alignment (applies to the whole labels block)
let singleAlign = 'left';
function applySingleAlign(align) {
  singleAlign = align;
  const container = document.getElementById('single-labels');
  if (container) {
    container.style.textAlign = align;
    const divider = container.querySelector('.s-txt-div');
    if (divider) {
      if (align === 'left')   { divider.style.marginLeft = '0';    divider.style.marginRight = 'auto'; }
      if (align === 'center') { divider.style.marginLeft = 'auto'; divider.style.marginRight = 'auto'; }
      if (align === 'right')  { divider.style.marginLeft = 'auto'; divider.style.marginRight = '0';    }
    }
  }
  document.querySelectorAll('.sal-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.align === align);
  });
  saveState();
}

// Dark theme
let darkTheme = false;
function toggleDarkTheme() {
  darkTheme = !darkTheme;
  document.documentElement.setAttribute('data-theme', darkTheme ? 'dark' : 'light');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.setAttribute('aria-pressed', darkTheme.toString());
  saveState();
}

function applyFontSize(id) {
  let sliderHtmlId, valHtmlId, canvasId;
  if      (id === 'top-brand') { sliderHtmlId = 'fs-top-brand'; valHtmlId = 'fs-top-brand-val'; canvasId = 'c-top-brand'; }
  else if (id === 'bot-brand') { sliderHtmlId = 'fs-bot-brand'; valHtmlId = 'fs-bot-brand-val'; canvasId = 'c-bot-brand'; }
  else if (id === 's-brand')   { sliderHtmlId = 's-fs-brand';   valHtmlId = 's-fs-brand-val';   canvasId = 's-brand'; }
  else return;
  const sliderEl = document.getElementById(sliderHtmlId);
  if (!sliderEl) return;
  const val = sliderEl.value;
  const el = document.getElementById(canvasId);
  if (el) el.style.fontSize = val + 'px';
  const valEl = document.getElementById(valHtmlId);
  if (valEl) valEl.textContent = val + 'px';
  saveState();
}

// ==========================================
//  BACKGROUND GRADIENT
// ==========================================
let bgState = {
  type:    'solid',
  solid:   '#ffffff',
  gradC1:  '#1a1e2e',
  gradC2:  '#4a3020',
  gradDir: 'to bottom'
};

function applyBgFromState() {
  const canvas = document.getElementById('pin-canvas');
  if (!canvas) return;
  if (bgState.type === 'solid') {
    canvas.style.background = bgState.solid;
  } else {
    canvas.style.background = `linear-gradient(${bgState.gradDir}, ${bgState.gradC1}, ${bgState.gradC2})`;
  }
  saveState();
}

function bgFromSolid(color) {
  bgState.solid = color;
  ['canvas-bg','canvas-bg-one','canvas-bg-custom'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = color;
  });
  applyBgFromState();
}

function setBgType(type) {
  bgState.type = type;
  syncBgControls();
  applyBgFromState();
}

function syncBgInputs() {
  ['canvas-bg','canvas-bg-one','canvas-bg-custom'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = bgState.solid;
  });
  ['','-one','-custom'].forEach(sfx => {
    const gc1  = document.getElementById('bg-gc1'  + sfx);
    const gc2  = document.getElementById('bg-gc2'  + sfx);
    const gdir = document.getElementById('bg-gdir' + sfx);
    if (gc1)  gc1.value  = bgState.gradC1;
    if (gc2)  gc2.value  = bgState.gradC2;
    if (gdir) gdir.value = bgState.gradDir;
  });
}

function syncBgControls() {
  document.querySelectorAll('.bgt-btn').forEach(b => {
    const t = b.dataset.bgt;
    b.classList.toggle('active', t === bgState.type);
    b.setAttribute('aria-pressed', (t === bgState.type).toString());
  });
  ['','-one','-custom'].forEach(sfx => {
    const sol = document.getElementById('bg-solid-ctrl' + sfx);
    const grd = document.getElementById('bg-grad-ctrl'  + sfx);
    if (sol) sol.style.display = bgState.type === 'solid'    ? '' : 'none';
    if (grd) grd.style.display = bgState.type === 'gradient' ? '' : 'none';
  });
  syncBgInputs();
}

// ==========================================
//  SWIRL TOGGLE
// ==========================================
function toggleSwirl(visible) {
  const svg  = document.getElementById('swirl-svg');
  const ctrl = document.getElementById('swirl-controls');
  if (svg)  svg.style.display = visible ? '' : 'none';
  if (ctrl) ctrl.style.display = visible ? '' : 'none';
  saveState();
}

// ==========================================
//  IMAGE FILTERS
// ==========================================
function applyFilter(target) {
  const card     = document.getElementById('card-' + target);
  const bright   = document.getElementById('bright-'   + target)?.value ?? 100;
  const contrast = document.getElementById('contrast-' + target)?.value ?? 100;
  const bv = document.getElementById('bright-'   + target + '-val');
  const cv = document.getElementById('contrast-' + target + '-val');
  if (bv) bv.textContent = bright   + '%';
  if (cv) cv.textContent = contrast + '%';
  if (card) card.style.filter = `brightness(${bright}%) contrast(${contrast}%)`;
  saveState();
}

function resetFilter(target) {
  const b = document.getElementById('bright-'   + target);
  const c = document.getElementById('contrast-' + target);
  if (b) b.value = 100;
  if (c) c.value = 100;
  applyFilter(target);
}

// ==========================================
//  EXPORT OPTIONS
// ==========================================
let exportMode = '2x';

function setExport(mode) {
  exportMode = mode;
  ['1x','2x','jpg'].forEach(m => {
    ['', '-one', '-custom'].forEach(sfx => {
      const b = document.getElementById('eopt-' + m + sfx);
      if (b) b.classList.toggle('active', m === mode);
    });
  });
  saveState();
}

// ==========================================
//  CROP TOOL
// ==========================================
let cropTarget  = null;
let cropRect    = null;
let cropAction  = null;
let cropStart   = null;
let displayW    = 0, displayH = 0, displayScale = 1;
const HANDLE_SIZE = 10;

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function normRect(r) {
  return { x: r.w < 0 ? r.x + r.w : r.x, y: r.h < 0 ? r.y + r.h : r.y, w: Math.abs(r.w), h: Math.abs(r.h) };
}

function drawCropOverlay() {
  const canvas = document.getElementById('crop-canvas');
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  if (!cropRect) return;
  const { x, y, w, h } = cropRect;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, cw, ch);
  ctx.clearRect(x, y, w, h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + w*i/3, y); ctx.lineTo(x + w*i/3, y+h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h*i/3); ctx.lineTo(x+w, y + h*i/3); ctx.stroke();
  }
  const hs = HANDLE_SIZE;
  ctx.fillStyle = '#fff';
  [[x,y],[x+w-hs,y],[x,y+h-hs],[x+w-hs,y+h-hs]].forEach(([hx,hy]) => ctx.fillRect(hx,hy,hs,hs));
  const mx = x + w/2 - hs/2, my = y + h/2 - hs/2;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(mx, y, hs, hs/2); ctx.fillRect(mx, y+h-hs/2, hs, hs/2);
  ctx.fillRect(x, my, hs/2, hs); ctx.fillRect(x+w-hs/2, my, hs/2, hs);
  const natW = Math.round(w / displayScale), natH = Math.round(h / displayScale);
  ctx.font = '11px DM Sans,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(natW + ' x ' + natH + 'px', x + 6, y + h - 7);
}

function getHitZone(cx, cy) {
  if (!cropRect) return 'draw';
  const { x, y, w, h } = cropRect;
  const g = HANDLE_SIZE + 4;
  if (cx>=x-g&&cx<=x+g&&cy>=y-g&&cy<=y+g)         return 'resize-tl';
  if (cx>=x+w-g&&cx<=x+w+g&&cy>=y-g&&cy<=y+g)     return 'resize-tr';
  if (cx>=x-g&&cx<=x+g&&cy>=y+h-g&&cy<=y+h+g)     return 'resize-bl';
  if (cx>=x+w-g&&cx<=x+w+g&&cy>=y+h-g&&cy<=y+h+g) return 'resize-br';
  if (cy>=y-g&&cy<=y+g)       return 'resize-t';
  if (cy>=y+h-g&&cy<=y+h+g)   return 'resize-b';
  if (cx>=x-g&&cx<=x+g)       return 'resize-l';
  if (cx>=x+w-g&&cx<=x+w+g)   return 'resize-r';
  if (cx>=x&&cx<=x+w&&cy>=y&&cy<=y+h) return 'move';
  return 'draw';
}

const ZONE_CURSORS = {
  draw:'crosshair', move:'move',
  'resize-tl':'nw-resize','resize-tr':'ne-resize',
  'resize-bl':'sw-resize','resize-br':'se-resize',
  'resize-t':'n-resize','resize-b':'s-resize',
  'resize-l':'w-resize','resize-r':'e-resize'
};

function openCrop(target) {
  cropTarget = target;
  const src = imgState[target].origSrc;
  if (!src) { toast('No image to crop'); return; }
  _openCropModal(src);
}

// Open crop for an image layer in custom mode
function openCropLayer(lid) {
  const layer = textLayers.find(l => l.id === lid);
  if (!layer || layer.type !== 'image' || !layer.src) { toast('No image to crop'); return; }
  cropTarget = '__layer:' + lid;
  _openCropModal(layer.src);
}

function _openCropModal(src) {
  cropRect = null; cropAction = null;
  const modal  = document.getElementById('crop-modal');
  const img    = document.getElementById('crop-img');
  const canvas = document.getElementById('crop-canvas');
  function onImgReady() {
    const maxW = window.innerWidth * 0.92 - 36;
    const maxH = window.innerHeight * 0.94 - 120;
    const sc = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    displayW = Math.round(img.naturalWidth * sc);
    displayH = Math.round(img.naturalHeight * sc);
    displayScale = sc;
    img.style.width = displayW + 'px'; img.style.height = displayH + 'px';
    canvas.width = displayW; canvas.height = displayH;
    drawCropOverlay();
  }
  img.onload = () => requestAnimationFrame(onImgReady);
  img.src = src;
  if (img.complete && img.naturalWidth) requestAnimationFrame(onImgReady);
  modal.classList.add('open');
}

function closeCrop() {
  document.getElementById('crop-modal').classList.remove('open');
  cropRect = null; cropAction = null; cropTarget = null;
}

function resetCrop() {
  if (!cropTarget) return;
  if (typeof cropTarget === 'string' && cropTarget.startsWith('__layer:')) {
    closeCrop(); return;
  }
  const src = imgState[cropTarget].origSrc;
  if (!src) return;
  const card  = document.getElementById('card-'  + cropTarget);
  const thumb = document.getElementById('thumb-' + cropTarget);
  if (card)  card.style.backgroundImage = `url('${src}')`;
  if (thumb) thumb.src = src;
  closeCrop();
  toast('Image restored');
}

async function applyCrop() {
  if (!cropTarget || !cropRect || cropRect.w < 4 || cropRect.h < 4) { toast('Draw a selection first'); return; }

  const isLayer = typeof cropTarget === 'string' && cropTarget.startsWith('__layer:');
  let src;
  if (isLayer) {
    const lid   = cropTarget.slice(8);
    const layer = textLayers.find(l => l.id === lid);
    if (!layer) { closeCrop(); return; }
    src = layer.src;
  } else {
    src = imgState[cropTarget].origSrc;
  }

  const img = new Image(); img.src = src;
  await new Promise(res => { if (img.complete && img.naturalWidth) { res(); return; } img.onload = res; img.onerror = res; });
  if (!img.naturalWidth) { toast('Could not load image'); return; }
  const sx = Math.round(cropRect.x / displayScale), sy = Math.round(cropRect.y / displayScale);
  const sw = Math.round(cropRect.w / displayScale), sh = Math.round(cropRect.h / displayScale);
  const off = document.createElement('canvas');
  off.width = sw; off.height = sh;
  off.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const dataUrl = off.toDataURL('image/jpeg', 0.95);

  if (isLayer) {
    const lid   = cropTarget.slice(8);
    const layer = textLayers.find(l => l.id === lid);
    if (layer) { layer.src = dataUrl; renderAllLayers(); saveState(); }
  } else {
    const card  = document.getElementById('card-'  + cropTarget);
    const thumb = document.getElementById('thumb-' + cropTarget);
    if (card)  card.style.backgroundImage = `url('${dataUrl}')`;
    if (thumb) thumb.src = dataUrl;
    resetImgStyle(cropTarget);
    currentUrls[cropTarget] = null;
  }
  closeCrop();
  toast('Crop applied');
}

// Crop pointer events
(function() {
  const canvas = document.getElementById('crop-canvas');
  if (!canvas) return;
  function getOffset(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }
  canvas.addEventListener('pointermove', e => {
    const { x, y } = getOffset(e);
    canvas.style.cursor = ZONE_CURSORS[getHitZone(x, y)] || 'crosshair';
    if (!cropAction || !cropStart) return;
    const dx = x - cropStart.x, dy = y - cropStart.y;
    const orig = cropStart.origRect;
    const cw = canvas.width, ch = canvas.height;
    if (cropAction === 'draw') {
      cropRect = normRect({ x: cropStart.x, y: cropStart.y, w: dx, h: dy });
    } else if (cropAction === 'move') {
      cropRect = { x: clamp(orig.x + dx, 0, cw - orig.w), y: clamp(orig.y + dy, 0, ch - orig.h), w: orig.w, h: orig.h };
    } else if (cropAction.startsWith('resize')) {
      let { x: rx, y: ry, w: rw, h: rh } = orig;
      if (cropAction.includes('l')) { rx = clamp(orig.x + dx, 0, orig.x + orig.w - 4); rw = orig.x + orig.w - rx; }
      if (cropAction.includes('r')) { rw = clamp(orig.w + dx, 4, cw - orig.x); }
      if (cropAction.includes('t')) { ry = clamp(orig.y + dy, 0, orig.y + orig.h - 4); rh = orig.y + orig.h - ry; }
      if (cropAction.includes('b')) { rh = clamp(orig.h + dy, 4, ch - orig.y); }
      cropRect = { x: rx, y: ry, w: rw, h: rh };
    }
    drawCropOverlay();
  });
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const { x, y } = getOffset(e);
    const zone = getHitZone(x, y);
    cropAction = zone;
    cropStart  = { x, y, origRect: cropRect ? { ...cropRect } : null };
    if (zone === 'draw') cropRect = { x, y, w: 0, h: 0 };
  });
  canvas.addEventListener('pointerup',    () => { cropAction = null; cropStart = null; });
  canvas.addEventListener('pointerleave', () => { if (cropAction === 'draw') { cropAction = null; cropStart = null; } });
  canvas.addEventListener('dblclick', () => applyCrop());
  document.addEventListener('keydown', e => {
    const isOpen = document.getElementById('crop-modal').classList.contains('open');
    if (e.key === 'Escape' && isOpen) closeCrop();
    if (e.key === 'Enter'  && isOpen) applyCrop();
  });
}());

// ==========================================
//  SWIRL COLOR / OPACITY
// ==========================================
function applySwirlColor(color) {
  const svg = document.getElementById('swirl-svg');
  if (!svg) return;
  svg.querySelectorAll('path, circle, line').forEach(el => {
    if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', color);
    if (el.getAttribute('fill')   && el.getAttribute('fill')   !== 'none') el.setAttribute('fill', color);
  });
  saveState();
}

function applySwirlOpacity(val) {
  const svg = document.getElementById('swirl-svg');
  if (svg) svg.style.opacity = val / 100;
  const valEl = document.getElementById('swirl-opacity-val');
  if (valEl) valEl.textContent = val + '%';
  saveState();
}

// ==========================================
//  TEXT LAYERS (custom mode)
// ==========================================
let textLayers      = [];
let nextLayerId     = 1;
let selectedLayerId = null;

function getCanvasScale() {
  const scaler = document.getElementById('canvas-scaler');
  const t = (scaler && scaler.style.transform) || '';
  const m = t.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function clientToCanvasCoords(clientX, clientY) {
  const scaler = document.getElementById('canvas-scaler');
  if (!scaler) return { x: clientX, y: clientY };
  const rect = scaler.getBoundingClientRect();
  const scale = getCanvasScale() || 1;
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top)  / scale
  };
}

function addTextLayer(props) {
  props = props || {};
  const id     = 'tl' + (nextLayerId++);
  const offset = textLayers.length * 60;
  const layer  = {
    type:          'text',
    id,
    text:          props.text          !== undefined ? props.text          : 'Your Text Here',
    x:             props.x             !== undefined ? props.x             : 80,
    y:             props.y             !== undefined ? props.y             : 200 + offset,
    fontSize:      props.fontSize      !== undefined ? props.fontSize      : 72,
    color:         props.color         !== undefined ? props.color         : '#ffffff',
    fontFamily:    props.fontFamily    !== undefined ? props.fontFamily    : 'Bodoni Moda',
    fontWeight:    props.fontWeight    !== undefined ? props.fontWeight    : '700',
    fontStyle:     props.fontStyle     !== undefined ? props.fontStyle     : 'normal',
    letterSpacing: props.letterSpacing !== undefined ? props.letterSpacing : 0,
    align:         props.align         !== undefined ? props.align         : 'left',
    opacity:       props.opacity       !== undefined ? props.opacity       : 100,
    width:         props.width         !== undefined ? props.width         : 840,
    textShadow:    props.textShadow    !== undefined ? props.textShadow    : '',
  };
  textLayers.push(layer);
  renderAllLayers(); renderLayerList(); selectLayer(id); saveState();
}

// ==========================================
//  IMAGE LAYERS (custom mode)
// ==========================================
function triggerCustomImage() { document.getElementById('file-custom-img').click(); }

async function pasteCustomImg() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'));
      if (type) { addImageLayer(URL.createObjectURL(await item.getType(type))); return; }
    }
    toast('No image in clipboard');
  } catch { toast('Paste: use Ctrl+V or allow clipboard'); }
}

function onCustomImageChange(input) {
  const file = input.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  addImageLayer(URL.createObjectURL(file));
  input.value = '';
}

function addImageLayer(src) {
  const id     = 'tl' + (nextLayerId++);
  const offset = textLayers.filter(l => l.type === 'image').length * 24;
  const layer  = {
    type: 'image',
    id, src,
    x:       80 + offset,
    y:       80 + offset,
    width:   500,
    height:  500,
    opacity: 100,
  };
  textLayers.push(layer);
  renderAllLayers(); renderLayerList(); selectLayer(id); saveState();
  toast('Image layer added');
}

function updateImgLayerDom(id) {
  const layer = textLayers.find(l => l.id === id);
  if (!layer || layer.type !== 'image') return;
  const el = document.querySelector('.img-layer[data-lid="' + id + '"]');
  if (!el) return;
  el.style.width   = layer.width   + 'px';
  el.style.height  = layer.height  + 'px';
  el.style.opacity = layer.opacity / 100;
}

function removeTextLayer(id) {
  textLayers = textLayers.filter(l => l.id !== id);
  if (selectedLayerId === id) { selectedLayerId = null; hideFloatTb(); }
  renderAllLayers(); renderLayerList(); saveState();
}

function removeSelectedLayer() { if (selectedLayerId) removeTextLayer(selectedLayerId); }

function updateLayerProp(id, key, value) {
  const layer = textLayers.find(l => l.id === id);
  if (!layer) return;
  layer[key] = value;
  if (layer.type !== 'image') {
    const el = document.querySelector('.txt-layer[data-lid="' + id + '"]');
    if (el) applyLayerDomStyle(el, layer);
  }
  saveState();
}

function applyLayerDomStyle(el, layer) {
  const handles = [...el.querySelectorAll('.cv-handle')]; // preserve handles
  el.style.left          = layer.x + 'px';
  el.style.top           = layer.y + 'px';
  el.style.width         = layer.width + 'px';
  el.style.fontSize      = layer.fontSize + 'px';
  el.style.color         = layer.color;
  el.style.fontFamily    = layer.fontFamily + ',Georgia,serif';
  el.style.fontWeight    = layer.fontWeight;
  el.style.fontStyle     = layer.fontStyle;
  el.style.letterSpacing = layer.letterSpacing + 'px';
  el.style.textAlign     = layer.align;
  el.style.opacity       = layer.opacity / 100;
  el.style.textShadow    = layer.textShadow || '';
  el.textContent         = layer.text;
  handles.forEach(h => el.appendChild(h)); // re-attach handles
}

function renderAllLayers() {
  const layout = document.getElementById('layout-custom');
  if (!layout) return;
  layout.querySelectorAll('.txt-layer, .img-layer').forEach(el => el.remove());
  textLayers.forEach(layer => {
    const el = document.createElement('div');
    if (layer.type === 'image') {
      el.className   = 'img-layer';
      el.dataset.lid = layer.id;
      el.style.cssText = `left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px;background-image:url('${layer.src}');opacity:${(layer.opacity||100)/100};`;
    } else {
      el.className   = 'txt-layer';
      el.dataset.lid = layer.id;
      applyLayerDomStyle(el, layer);
    }
    if (layer.id === selectedLayerId) el.classList.add('tl-selected');
    el.addEventListener('pointerdown', onLayerPointerDown);
    layout.appendChild(el);
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderLayerList() {
  const list = document.getElementById('layers-list');
  if (!list) return;
  if (textLayers.length === 0) {
    list.innerHTML = '<p style="font-size:10px;color:#c0b8b0;text-align:center;padding:8px 0;">No layers yet<br>Use the buttons above to add</p>';
    return;
  }
  const fontOpts = [
    // Serif
    'Bodoni Moda','Playfair Display','Cormorant Garamond','Lora',
    'Libre Baskerville','EB Garamond','Merriweather','Georgia',
    // Sans-serif
    'DM Sans','Inter','Poppins','Montserrat','Raleway',
    'Work Sans','Nunito','Arial','Helvetica Neue',
  ];
  list.innerHTML = textLayers.map(layer => {
    const isOpen = layer.id === selectedLayerId;
    if (layer.type === 'image') {
      const thumb = layer.src ? 'background-image:url(\'' + escHtml(layer.src) + '\')' : 'background:#ddd';
      return (
        '<div class="layer-row' + (isOpen ? ' lr-selected lr-open' : '') + '" data-lid="' + layer.id + '">' +
          '<div class="layer-row-head" onclick="selectLayer(\'' + layer.id + '\')">' +
            '<span class="lr-chevron">' + (isOpen ? '&#9660;' : '&#9658;') + '</span>' +
            '<span class="lr-img-thumb" style="' + thumb + '" aria-hidden="true"></span>' +
            '<span class="lr-name">Image</span>' +
            '<button class="lr-del" onclick="event.stopPropagation();removeTextLayer(\'' + layer.id + '\')" aria-label="Delete image layer">&times;</button>' +
          '</div>' +
          (isOpen ?
            '<div class="layer-editor">' +
              '<div class="lr-img-actions">' +
                '<button class="dz-btn" onclick="openCropLayer(\'' + layer.id + '\')" aria-label="Crop image layer"><svg viewBox="0 0 14 14" width="10" height="10" fill="none" aria-hidden="true"><path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Crop</button>' +
                '<button class="dz-btn del" onclick="removeTextLayer(\'' + layer.id + '\')" aria-label="Delete image layer"><svg viewBox="0 0 14 14" width="10" height="10" fill="none" aria-hidden="true"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 3.5l.5 8h4l.5-8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Delete</button>' +
              '</div>' +
              '<div class="lr-img-hint">Drag to move &middot; handles to resize</div>' +
              '<div class="fr"><span class="fl">Opacity</span><div class="adj-row"><input type="range" class="adj-slider" min="10" max="100" value="' + (layer.opacity||100) + '" oninput="updateLayerProp(\'' + layer.id + '\',\'opacity\',+this.value);updateImgLayerDom(\'' + layer.id + '\');this.nextElementSibling.textContent=this.value+\'%\'"/><span class="adj-val">' + (layer.opacity||100) + '%</span></div></div>' +
            '</div>'
          : '') +
        '</div>'
      );
    }
    // Text layer
    const preview  = layer.text.length > 20 ? layer.text.slice(0, 20) + '...' : layer.text;
    const fontSel  = fontOpts.map(f => '<option value="' + f + '"' + (layer.fontFamily === f ? ' selected' : '') + '>' + f + '</option>').join('');
    return (
      '<div class="layer-row' + (isOpen ? ' lr-selected lr-open' : '') + '" data-lid="' + layer.id + '">' +
        '<div class="layer-row-head" onclick="selectLayer(\'' + layer.id + '\')">' +
          '<span class="lr-chevron">' + (isOpen ? '&#9660;' : '&#9658;') + '</span>' +
          '<span class="lr-dot" style="background:' + layer.color + '"></span>' +
          '<span class="lr-name">' + escHtml(preview) + '</span>' +
          '<button class="lr-del" onclick="event.stopPropagation();removeTextLayer(\'' + layer.id + '\')" aria-label="Delete text layer">&times;</button>' +
        '</div>' +
        (isOpen ?
          '<div class="layer-editor">' +
            '<div class="fr"><span class="fl">Text</span><textarea class="fi" style="min-height:38px" oninput="liveUpdateText(\'' + layer.id + '\',this.value)">' + escHtml(layer.text) + '</textarea></div>' +
            '<div class="le-style-row">' +
              '<button class="le-btn' + (layer.fontWeight === '700' ? ' le-active' : '') + '" onclick="toggleLEProp(\'' + layer.id + '\',\'fontWeight\',\'700\',\'400\')"><b>B</b></button>' +
              '<button class="le-btn' + (layer.fontStyle === 'italic' ? ' le-active' : '') + '" onclick="toggleLEProp(\'' + layer.id + '\',\'fontStyle\',\'italic\',\'normal\')"><i>I</i></button>' +
              '<select class="le-select" onchange="updateLayerProp(\'' + layer.id + '\',\'fontFamily\',this.value)">' + fontSel + '</select>' +
            '</div>' +
            '<div class="fr"><span class="fl">Size</span><div class="adj-row"><input type="range" class="adj-slider" min="12" max="220" value="' + layer.fontSize + '" oninput="updateLayerProp(\'' + layer.id + '\',\'fontSize\',+this.value);this.nextElementSibling.textContent=this.value+\'px\'"/><span class="adj-val">' + layer.fontSize + 'px</span></div></div>' +
            '<div class="fr"><span class="fl">Letter Spacing</span><div class="adj-row"><input type="range" class="adj-slider" min="-5" max="30" value="' + layer.letterSpacing + '" oninput="updateLayerProp(\'' + layer.id + '\',\'letterSpacing\',+this.value);this.nextElementSibling.textContent=this.value+\'px\'"/><span class="adj-val">' + layer.letterSpacing + 'px</span></div></div>' +
            '<div class="color-row"><input type="color" class="color-swatch" value="' + layer.color + '" aria-label="Text color" oninput="updateLayerProp(\'' + layer.id + '\',\'color\',this.value)"/><span class="color-label">Text color</span></div>' +
            '<div class="fr"><span class="fl">Opacity</span><div class="adj-row"><input type="range" class="adj-slider" min="10" max="100" value="' + layer.opacity + '" oninput="updateLayerProp(\'' + layer.id + '\',\'opacity\',+this.value);this.nextElementSibling.textContent=this.value+\'%\'"/><span class="adj-val">' + layer.opacity + '%</span></div></div>' +
          '</div>'
        : '') +
      '</div>'
    );
  }).join('');
}

function liveUpdateText(id, value) {
  const layer = textLayers.find(l => l.id === id);
  if (!layer) return;
  layer.text = value;
  const el = document.querySelector('.txt-layer[data-lid="' + id + '"]');
  if (el) {
    const handles = [...el.querySelectorAll('.cv-handle')];
    el.textContent = value;
    handles.forEach(h => el.appendChild(h));
  }
  const row = document.querySelector('.layer-row[data-lid="' + id + '"]');
  if (row) {
    const nameEl = row.querySelector('.lr-name');
    if (nameEl) nameEl.textContent = value.length > 20 ? value.slice(0, 20) + '...' : value;
  }
  saveState();
}

function toggleLEProp(id, prop, onVal, offVal) {
  const layer = textLayers.find(l => l.id === id);
  if (!layer) return;
  layer[prop] = layer[prop] === onVal ? offVal : onVal;
  const el = document.querySelector('.txt-layer[data-lid="' + id + '"]');
  if (el) applyLayerDomStyle(el, layer);
  const row = document.querySelector('.layer-row[data-lid="' + id + '"]');
  if (row) {
    const boldBtn   = row.querySelector('.le-btn:first-child');
    const italicBtn = row.querySelector('.le-btn:nth-child(2)');
    if (prop === 'fontWeight' && boldBtn)   boldBtn.classList.toggle('le-active',   layer.fontWeight === '700');
    if (prop === 'fontStyle'  && italicBtn) italicBtn.classList.toggle('le-active', layer.fontStyle  === 'italic');
  }
  positionFloatTb();
  saveState();
}

// ==========================================
//  SELECT / DESELECT LAYERS
// ==========================================
function addCanvasHandles(el, layer) {
  // Images: 4 corners + right edge; Text: right edge only (controls wrap width)
  const positions = layer.type === 'image' ? ['tl','tr','bl','br','r'] : ['r'];
  positions.forEach(pos => {
    const h = document.createElement('div');
    h.className    = 'cv-handle cv-' + pos;
    h.dataset.hpos = pos;
    h.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      isResizing      = true;
      resizeHandlePos = pos;
      const startPos = clientToCanvasCoords(e.clientX, e.clientY);
      resizeStartX    = startPos.x;
      resizeStartY    = startPos.y;
      const lyr = textLayers.find(l => l.id === selectedLayerId);
      resizeOrigLayer = lyr ? { x: lyr.x, y: lyr.y, width: lyr.width, height: lyr.height || 400 } : null;
    });
    el.appendChild(h);
  });
}

function selectLayer(id) {
  selectedLayerId = id;
  document.querySelectorAll('.txt-layer, .img-layer').forEach(el => {
    el.querySelectorAll('.cv-handle').forEach(h => h.remove());
    el.classList.toggle('tl-selected', el.dataset.lid === id);
  });
  if (layoutMode === 'custom') {
    const selEl = document.querySelector('[data-lid="' + id + '"]');
    const layer  = textLayers.find(l => l.id === id);
    if (selEl && layer) addCanvasHandles(selEl, layer);
  }
  renderLayerList();
  const layer = textLayers.find(l => l.id === id);
  if (layer && layer.type === 'image') { hideFloatTb(); }
  else { positionFloatTb(); }
}

function deselectLayer() {
  selectedLayerId = null;
  document.querySelectorAll('.txt-layer, .img-layer').forEach(el => {
    el.classList.remove('tl-selected');
    el.querySelectorAll('.cv-handle').forEach(h => h.remove());
  });
  hideFloatTb();
  renderLayerList();
}

document.getElementById('pin-canvas').addEventListener('click', e => {
  if (!e.target.closest('.txt-layer, .img-layer')) deselectLayer();
});

// ==========================================
//  FLOAT TOOLBAR (custom mode text layers)
// ==========================================
function positionFloatTb() {
  const tb = document.getElementById('float-tb');
  if (!tb) return;
  if (layoutMode !== 'custom') { tb.style.display = 'none'; return; }
  const layer = textLayers.find(l => l.id === selectedLayerId);
  if (!layer || layer.type === 'image') { tb.style.display = 'none'; return; }
  const scale   = getCanvasScale();
  const scaler  = document.getElementById('canvas-scaler');
  const wrapper = document.getElementById('canvas-wrapper');
  if (!scaler || !wrapper) return;
  const sr = scaler.getBoundingClientRect();
  const wr = wrapper.getBoundingClientRect();
  const centerX = sr.left + (layer.x + layer.width / 2) * scale - wr.left;
  const topY    = sr.top  + layer.y * scale - wr.top - 50;
  tb.style.display = 'flex';
  tb.style.left    = Math.round(centerX) + 'px';
  tb.style.top     = Math.max(8, Math.round(topY)) + 'px';
  document.getElementById('ftb-bold').classList.toggle('ftb-active',   layer.fontWeight === '700');
  document.getElementById('ftb-italic').classList.toggle('ftb-active', layer.fontStyle  === 'italic');
  document.getElementById('ftb-al').classList.toggle('ftb-active', layer.align === 'left');
  document.getElementById('ftb-ac').classList.toggle('ftb-active', layer.align === 'center');
  document.getElementById('ftb-ar').classList.toggle('ftb-active', layer.align === 'right');
}

function hideFloatTb() {
  const tb = document.getElementById('float-tb');
  if (tb) tb.style.display = 'none';
}

function toggleLayerStyle(what) {
  const layer = textLayers.find(l => l.id === selectedLayerId);
  if (!layer) return;
  if (what === 'bold')   layer.fontWeight = layer.fontWeight === '700' ? '400' : '700';
  if (what === 'italic') layer.fontStyle  = layer.fontStyle  === 'italic' ? 'normal' : 'italic';
  const el = document.querySelector('.txt-layer[data-lid="' + selectedLayerId + '"]');
  if (el) applyLayerDomStyle(el, layer);
  renderLayerList(); positionFloatTb(); saveState();
}

function setLayerAlign(align) {
  const layer = textLayers.find(l => l.id === selectedLayerId);
  if (!layer) return;
  layer.align = align;
  const el = document.querySelector('.txt-layer[data-lid="' + selectedLayerId + '"]');
  if (el) el.style.textAlign = align;
  positionFloatTb(); saveState();
}

// ==========================================
//  DRAG + RESIZE LAYERS (Canva-style)
// ==========================================
let isDragging  = false;
let dragLayerId = null;
let dragStartX  = 0, dragStartY = 0;
let dragOrigX   = 0, dragOrigY  = 0;

let isResizing      = false;
let resizeHandlePos = null;
let resizeStartX    = 0, resizeStartY = 0;
let resizeOrigLayer = null;

function onLayerPointerDown(e) {
  if (e.target.classList.contains('cv-handle')) return; // handled separately
  e.preventDefault(); e.stopPropagation();
  const el  = e.currentTarget;
  const id  = el.dataset.lid;
  if (!id) return;
  const layer = textLayers.find(l => l.id === id);
  if (!layer) return;
  // ── Set up drag state and capture pointer BEFORE any DOM mutations ──
  dragLayerId = id;
  isDragging  = false;
  const startPos = clientToCanvasCoords(e.clientX, e.clientY);
  dragStartX  = startPos.x;
  dragStartY  = startPos.y;
  dragOrigX   = layer.x;
  dragOrigY   = layer.y;
  el.setPointerCapture(e.pointerId);
  // ── Then select the layer (may mutate DOM / sidebar) ──
  selectLayer(id);
}

document.addEventListener('pointermove', e => {
  // ── Resize ──
  if (isResizing && selectedLayerId && resizeOrigLayer) {
    const cur    = clientToCanvasCoords(e.clientX, e.clientY);
    const dx     = cur.x - resizeStartX;
    const dy     = cur.y - resizeStartY;
    const orig   = resizeOrigLayer;
    const layer  = textLayers.find(l => l.id === selectedLayerId);
    if (!layer) return;
    const handle = resizeHandlePos;
    const isTop    = handle === 'tl' || handle === 'tr';
    const isBottom = handle === 'bl' || handle === 'br';
    const isRight  = pos === 'tr' || pos === 'br' || pos === 'r';
    const isLeft   = pos === 'tl' || pos === 'bl';
    let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height;
    if (isRight)  newW = Math.max(80, Math.round(orig.width  + dx));
    if (isLeft)  { newX = Math.round(orig.x + dx); newW = Math.max(80, Math.round(orig.width - dx)); }
    if (layer.type === 'image') {
      if (isTop)    { newY = Math.round(orig.y + dy); newH = Math.max(50, Math.round(orig.height - dy)); }
      if (isBottom)   newH = Math.max(50, Math.round(orig.height + dy));
    }
    layer.x = newX; layer.y = newY; layer.width = Math.round(newW);
    if (layer.type === 'image') layer.height = Math.round(newH);
    const el = document.querySelector('[data-lid="' + selectedLayerId + '"]');
    if (el) {
      el.style.left  = newX + 'px';
      el.style.top   = newY + 'px';
      el.style.width = Math.round(newW) + 'px';
      if (layer.type === 'image') el.style.height = Math.round(newH) + 'px';
    }
    positionFloatTb();
    return;
  }
  // ── Move ──
  if (!dragLayerId) return;
  const pos = clientToCanvasCoords(e.clientX, e.clientY);
  const dx  = pos.x - dragStartX;
  const dy  = pos.y - dragStartY;
  if (Math.abs(dx) + Math.abs(dy) > 3) isDragging = true;
  if (!isDragging) return;
  const layer = textLayers.find(l => l.id === dragLayerId);
  if (!layer) return;
  layer.x = Math.round(dragOrigX + dx);
  layer.y = Math.round(dragOrigY + dy);
  const el = document.querySelector('[data-lid="' + dragLayerId + '"]');
  if (el) { el.style.left = layer.x + 'px'; el.style.top = layer.y + 'px'; el.classList.add('tl-dragging'); }
  positionFloatTb();
});

document.addEventListener('pointerup', () => {
  if (isResizing) {
    isResizing = false; resizeHandlePos = null; resizeOrigLayer = null;
    saveState(); return;
  }
  if (!dragLayerId) return;
  const el = document.querySelector('[data-lid="' + dragLayerId + '"]');
  if (el) el.classList.remove('tl-dragging');
  if (isDragging) saveState();
  isDragging = false; dragLayerId = null;
});

document.addEventListener('pointercancel', () => {
  isResizing = false; resizeHandlePos = null; resizeOrigLayer = null;
  isDragging = false; dragLayerId = null;
});

// ==========================================
//  SWIRL DESIGNS
// ==========================================
const SWIRLS = [
  `<path d="M 42 18 C 28 4, 10 12, 18 28 C 24 40, 42 38, 48 28 C 54 18, 46 8, 38 12" stroke="#4a4030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <path d="M 44 30 C 60 50, 80 70, 98 100" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="6 4"/>
   <path d="M 86 96 L 98 100 L 92 88" stroke="#4a4030" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 18 15 C 50 8, 108 35, 105 100" stroke="#4a4030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <path d="M 93 92 L 105 100 L 108 88" stroke="#4a4030" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 38 20 C 20 10, 12 28, 24 34 C 36 40, 50 30, 46 16 C 42 5, 28 7, 26 18 C 55 50, 80 78, 100 105" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round"/>
   <path d="M 88 98 L 100 105 L 104 92" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 20 20 C 20 50, 80 55, 80 85" stroke="#4a4030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <circle cx="20" cy="20" r="7" stroke="#4a4030" stroke-width="2" fill="none"/>
   <path d="M 68 80 L 80 85 L 80 72" stroke="#4a4030" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 30 15 C 14 15, 8 30, 20 35 C 32 40, 44 30, 42 18 C 40 8, 28 8, 26 18" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round"/>
   <path d="M 38 22 C 58 44, 80 68, 100 96" stroke="#4a4030" stroke-width="1.8" fill="none" stroke-linecap="round"/>
   <path d="M 88 90 L 100 96 L 96 83" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 60 18 C 85 18, 100 35, 100 58 C 100 83, 80 98, 58 94 C 36 90, 22 72, 28 52 C 34 35, 52 28, 62 40 C 70 50, 64 64, 54 62" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round"/>
   <path d="M 42 56 L 54 62 L 54 49" stroke="#4a4030" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
];

function setSwirl(i) {
  const svg = document.getElementById('swirl-svg');
  if (svg) svg.innerHTML = SWIRLS[i];
  document.querySelectorAll('.sb').forEach((b, idx) => b.classList.toggle('active', idx === i));
  const currentColor = document.getElementById('swirl-color')?.value || '#4a4030';
  if (currentColor !== '#4a4030') applySwirlColor(currentColor);
  saveState();
}

// ==========================================
//  PNG EXPORT
// ==========================================
async function downloadPNG() {
  const dlBtnId = layoutMode === 'two' ? 'dl-btn' : (layoutMode === 'one' ? 'dl-btn-one' : 'dl-btn-custom');
  const dlBtn   = document.getElementById(dlBtnId);
  const loader  = document.getElementById('loading-ov');
  const scaler  = document.getElementById('canvas-scaler');

  if (layoutMode === 'two') {
    // No mandatory-image block — allow downloading canvas as-is with placeholders
  }

  if (dlBtn) dlBtn.disabled = true;
  if (loader) loader.classList.add('show');

  hideFloatTb();
  document.querySelectorAll('.txt-layer.tl-selected, .img-layer.tl-selected').forEach(el => el.classList.remove('tl-selected'));

  // Keep onscreen rendered canvas untouched, and render export from a hidden clone to avoid visual zoom flicker.
  const pinCanvas = document.getElementById('pin-canvas');
  let exportCanvas = null;
  if (pinCanvas) {
    exportCanvas = pinCanvas.cloneNode(true);
    exportCanvas.id = 'pin-canvas-export-copy';
    exportCanvas.style.position = 'absolute';
    exportCanvas.style.left = '0';
    exportCanvas.style.top = '0';
    exportCanvas.style.zIndex = '-9999';
    exportCanvas.style.transform = 'scale(1)';
    exportCanvas.style.transformOrigin = 'top left';
    exportCanvas.style.width = '1000px';
    exportCanvas.style.height = '1500px';
    document.body.appendChild(exportCanvas);

    // Convert swirl SVG to image in the clone for proper html2canvas rendering
    if (layoutMode === 'two') {
      const swirlSvg = exportCanvas.querySelector('#swirl-svg');
      if (swirlSvg && swirlSvg.style.display !== 'none') {
        const svgXml = new XMLSerializer().serializeToString(swirlSvg);
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgXml);
        const svgBmp = new Image();
        svgBmp.src = svgUrl;
        await new Promise(r => { svgBmp.onload = r; svgBmp.onerror = r; });
        const offC = document.createElement('canvas');
        offC.width = 150;
        offC.height = 150;
        offC.getContext('2d').drawImage(svgBmp, 0, 0, 150, 150);
        const pngUrl = offC.toDataURL('image/png');
        const swirlImg = document.createElement('img');
        swirlImg.src = pngUrl;
        swirlImg.style.position = 'absolute';
        swirlImg.style.left = '425px';
        swirlImg.style.top = '690px';
        swirlImg.style.width = '150px';
        swirlImg.style.height = '150px';
        swirlImg.style.opacity = '0.85';
        swirlImg.style.zIndex = '10';
        swirlSvg.parentNode.replaceChild(swirlImg, swirlSvg);
      }
    }
  }

  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const scale  = exportMode === '2x' ? 2 : 1;
    const type   = exportMode === 'jpg' ? 'image/jpeg' : 'image/png';
    const qual   = exportMode === 'jpg' ? 0.92 : 1;
    const canvas = await html2canvas(exportCanvas || pinCanvas, {
      scale, useCORS: true, allowTaint: false, backgroundColor: null,
    });
    canvas.toBlob(blob => {
      if (!blob) { toast('Export failed'); return; }
      const a        = document.createElement('a');
      const objUrl  = URL.createObjectURL(blob);
      a.href         = objUrl;
      a.download     = 'vortexly-pin-' + Date.now() + (exportMode === 'jpg' ? '.jpg' : '.png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
      toast('Download started');
    }, type, qual);
  } catch (err) {
    console.error(err);
    toast('Export failed - try again');
  } finally {
    if (exportCanvas && exportCanvas.parentNode) exportCanvas.parentNode.removeChild(exportCanvas);
    if (selectedLayerId) {
      const el = document.querySelector('[data-lid="' + selectedLayerId + '"]');
      if (el) el.classList.add('tl-selected');
    }
    positionFloatTb();
    if (dlBtn) dlBtn.disabled = false;
    if (loader) loader.classList.remove('show');
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') { e.preventDefault(); downloadPNG(); }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (selectedLayerId && layoutMode === 'custom') removeSelectedLayer();
  }
});

// ==========================================
//  PERSISTENCE
// ==========================================
const LS_KEY = 'watchpin_state_v3';

function saveState() {
  try {
    const gv  = id => document.getElementById(id)?.value;
    const gck = id => document.getElementById(id)?.checked;
    const state = {
      layoutMode,
      bgState: { ...bgState },
      // 2-image
      topImg:       document.getElementById('card-top')?.style.backgroundImage    || '',
      topZoom:      gv('zoom-top')     || 100,  topPosX:    gv('posx-top')     || 50,  topPosY:    gv('posy-top')     || 50,
      topBright:    gv('bright-top')   || 100,  topContrast:gv('contrast-top') || 100,
      botImg:       document.getElementById('card-bottom')?.style.backgroundImage || '',
      botZoom:      gv('zoom-bottom')  || 100,  botPosX:    gv('posx-bottom')  || 50,  botPosY:    gv('posy-bottom')  || 50,
      botBright:    gv('bright-bottom')|| 100,  botContrast:gv('contrast-bottom')|| 100,
      topEye:       gv('in-top-eye'),  topBrand:  gv('in-top-brand'), topFsBrand: gv('fs-top-brand'),
      topModel:     gv('in-top-model'),topPrice:  gv('in-top-price'),
      botEye:       gv('in-bot-eye'),  botBrand:  gv('in-bot-brand'), botFsBrand: gv('fs-bot-brand'),
      botPrice:     gv('in-bot-price'),botTag:    gv('in-bot-tag'),
      // 2-image label colors
      lcTopEye:   gv('lc-top-eye'),   lcTopBrand: gv('lc-top-brand'),
      lcTopModel: gv('lc-top-model'), lcTopPrice: gv('lc-top-price'),
      lcBotEye:   gv('lc-bot-eye'),   lcBotBrand: gv('lc-bot-brand'),
      lcBotPrice: gv('lc-bot-price'), lcBotTag:   gv('lc-bot-tag'),
      // swirl
      swirlColor:   gv('swirl-color'),   swirlOpacity: gv('swirl-opacity'),
      swirlVisible: gck('swirl-visible') !== false,
      // 1-image template
      singImg:      document.getElementById('card-single')?.style.backgroundImage || '',
      singZoom:     gv('zoom-single')     || 100, singPosX: gv('posx-single')     || 50, singPosY: gv('posy-single')     || 50,
      singBright:   gv('bright-single')   || 100, singContrast: gv('contrast-single') || 100,
      singleEye:    gv('s-in-eye'),   singleBrand: gv('s-in-brand'), singleFsBrand: gv('s-fs-brand'),
      singleModel:  gv('s-in-model'), singlePrice: gv('s-in-price'),
      // 1-image label colors
      slcEye:   gv('s-lc-eye'),   slcBrand: gv('s-lc-brand'),
      slcModel: gv('s-lc-model'), slcPrice: gv('s-lc-price'),
      // layers
      textLayers: JSON.parse(JSON.stringify(textLayers)),
      nextLayerId,
      exportMode,
      singleAlign,
      darkTheme,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch(_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const s   = JSON.parse(raw);

    // bg state
    if (s.bgState) {
      bgState.type    = s.bgState.type    || 'solid';
      bgState.solid   = s.bgState.solid   || '#ffffff';
      bgState.gradC1  = s.bgState.gradC1  || '#1a1e2e';
      bgState.gradC2  = s.bgState.gradC2  || '#4a3020';
      bgState.gradDir = s.bgState.gradDir || 'to bottom';
    }
    syncBgControls();
    applyBgFromState();

    // Layout mode (sync before restoring state so panels are visible)
    if (s.layoutMode) setLayoutMode(s.layoutMode);

    // Restore images
    function restoreImg(target, imgStr) {
      if (!imgStr || !imgStr.startsWith('url("data:')) return;
      loadImage(target, imgStr.slice(5, -2), false);
    }
    restoreImg('top',    s.topImg);
    restoreImg('bottom', s.botImg);
    restoreImg('single', s.singImg);

    // Slider helpers
    const sv = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };

    // 2-image adjustments
    sv('zoom-top',     s.topZoom);    sv('posx-top',     s.topPosX);    sv('posy-top',     s.topPosY);
    sv('bright-top',   s.topBright);  sv('contrast-top', s.topContrast);
    if (s.topImg) applyImgStyle('top');
    applyFilter('top');

    sv('zoom-bottom',    s.botZoom);  sv('posx-bottom',  s.botPosX);  sv('posy-bottom',  s.botPosY);
    sv('bright-bottom',  s.botBright);sv('contrast-bottom',s.botContrast);
    if (s.botImg) applyImgStyle('bottom');
    applyFilter('bottom');

    sv('zoom-single',  s.singZoom);  sv('posx-single',  s.singPosX);  sv('posy-single',  s.singPosY);
    sv('bright-single',s.singBright);sv('contrast-single',s.singContrast);
    if (s.singImg) applyImgStyle('single');
    applyFilter('single');

    // 2-image labels
    function restoreLabel(inputId, canvasId, val) {
      if (val === undefined) return;
      const el = document.getElementById(inputId); if (el) el.value = val;
      sync(inputId, canvasId);
    }
    restoreLabel('in-top-eye',   'c-top-eye',   s.topEye);
    restoreLabel('in-top-brand', 'c-top-brand', s.topBrand);
    if (s.topFsBrand) { sv('fs-top-brand', s.topFsBrand); applyFontSize('top-brand'); }
    restoreLabel('in-top-model', 'c-top-model', s.topModel);
    restoreLabel('in-top-price', 'c-top-price', s.topPrice);
    restoreLabel('in-bot-eye',   'c-bot-eye',   s.botEye);
    restoreLabel('in-bot-brand', 'c-bot-brand', s.botBrand);
    if (s.botFsBrand) { sv('fs-bot-brand', s.botFsBrand); applyFontSize('bot-brand'); }
    restoreLabel('in-bot-price', 'c-bot-price', s.botPrice);
    restoreLabel('in-bot-tag',   'c-bot-tag',   s.botTag);

    // 2-image label colors
    function restoreColor(inputId, canvasId, val) {
      if (!val) return;
      const el = document.getElementById(inputId); if (el) el.value = val;
      applyLabelColor(canvasId, val);
    }
    restoreColor('lc-top-eye',   'c-top-eye',   s.lcTopEye);
    restoreColor('lc-top-brand', 'c-top-brand', s.lcTopBrand);
    restoreColor('lc-top-model', 'c-top-model', s.lcTopModel);
    restoreColor('lc-top-price', 'c-top-price', s.lcTopPrice);
    restoreColor('lc-bot-eye',   'c-bot-eye',   s.lcBotEye);
    restoreColor('lc-bot-brand', 'c-bot-brand', s.lcBotBrand);
    restoreColor('lc-bot-price', 'c-bot-price', s.lcBotPrice);
    restoreColor('lc-bot-tag',   'c-bot-tag',   s.lcBotTag);

    // Swirl
    if (s.swirlColor) { const el = document.getElementById('swirl-color'); if (el) el.value = s.swirlColor; applySwirlColor(s.swirlColor); }
    if (s.swirlOpacity) { sv('swirl-opacity', s.swirlOpacity); applySwirlOpacity(s.swirlOpacity); }
    if (s.swirlVisible === false) { const ck = document.getElementById('swirl-visible'); if (ck) ck.checked = false; toggleSwirl(false); }

    // 1-image template labels
    restoreLabel('s-in-eye',   's-eye',   s.singleEye);
    restoreLabel('s-in-brand', 's-brand', s.singleBrand);
    if (s.singleFsBrand) { sv('s-fs-brand', s.singleFsBrand); applyFontSize('s-brand'); }
    restoreLabel('s-in-model', 's-model', s.singleModel);
    restoreLabel('s-in-price', 's-price', s.singlePrice);

    // 1-image label colors
    restoreColor('s-lc-eye',   's-eye',   s.slcEye);
    restoreColor('s-lc-brand', 's-brand', s.slcBrand);
    restoreColor('s-lc-model', 's-model', s.slcModel);
    restoreColor('s-lc-price', 's-price', s.slcPrice);

    // Export mode
    if (s.exportMode) setExport(s.exportMode);

    // Single-image label alignment
    if (s.singleAlign) { singleAlign = s.singleAlign; applySingleAlign(s.singleAlign); }

    // Dark theme
    if (s.darkTheme) {
      darkTheme = true;
      document.documentElement.setAttribute('data-theme', 'dark');
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }

    // Layers (custom mode) — normalize old layers without type
    if (Array.isArray(s.textLayers) && s.textLayers.length > 0) {
      textLayers  = s.textLayers.map(l => ({ ...l, type: l.type || 'text' }));
      nextLayerId = s.nextLayerId || (textLayers.length + 1);
      if (s.layoutMode === 'custom') { renderAllLayers(); renderLayerList(); }
    }
  } catch(_) {}
}

// ==========================================
//  TOAST
// ==========================================
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ==========================================
//  INIT
// ==========================================
initMobileTabs();
loadState();