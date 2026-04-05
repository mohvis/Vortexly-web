'use client';
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { renderPinToCanvas } from '@/lib/exportCanvas';
import { useEditorState }  from '@/hooks/useEditorState';
import { ControlPanel }    from '@/components/editor/ControlPanel';
import { RightPanel }      from '@/components/editor/RightPanel';
import { PinCanvas }       from '@/components/editor/PinCanvas';
import { CropModal }       from '@/components/editor/CropModal';
import { createClient }    from '@/lib/supabase/client';
import type { ImageTarget, Layer } from '@/types/editor';

// ── Crop queue state ─────────────────────────────────────────────
interface CropTarget {
  src:    string;
  target: ImageTarget | null;   // null = custom layer
  layerId?: string;
}

export function PinEditor() {
  const store = useEditorState();
  const { state } = store;

  // ── Canvas scale ─────────────────────────────────────────────
  const [fitScale,    setFitScale]    = useState(0.5);
  const [zoomFactor,  setZoomFactor]  = useState(1);
  const scale      = fitScale * zoomFactor;
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const pinCanvasRef = useRef<HTMLDivElement>(null);

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'edit' | 'canvas'>('edit');

  // Canvas pan (used when zoomFactor > 1)
  const [pan,      setPan]      = useState({ x: 0, y: 0 });
  const [panning,  setPanning]  = useState(false);
  const panDrag = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Compute scale on mount + resize (RAF-guarded to avoid CPU spike during drag)
  useEffect(() => {
    let rafId = 0;
    function update() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const avW = Math.max(1, el.clientWidth  - 40);
        const avH = Math.max(1, el.clientHeight - 40 - 38); // 38 = canvas toolbar height
        setFitScale(Math.min(1, Math.max(0.28, Math.min(avW / 1000, avH / 1500))));
      });
    }
    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, []);

  // ── Dark theme on <html> ─────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.darkTheme ? 'dark' : 'light');
  }, [state.darkTheme]);

  // ── Global paste (image from clipboard → active target) ──────
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = ev => {
            const src = ev.target?.result as string;
            if (!src) return;
            if (state.layoutMode === 'custom') store.addImageLayer(src);
            else store.loadImage('top', src);
            store.showToast('Pasted');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [state.layoutMode, store]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd + Shift + S → export
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        downloadPNG();
      }
      // Delete/Backspace → remove selected layer
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if ((e.key === 'Delete' || e.key === 'Backspace') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        if (state.selectedLayerId && state.layoutMode === 'custom') {
          store.removeLayer(state.selectedLayerId);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedLayerId, state.layoutMode]);

  // ── Zoom controls ─────────────────────────────────────────────
  const zoomIn  = useCallback(() => setZoomFactor(f => Math.min(3,   +(f * 1.25).toFixed(4))), []);
  const zoomOut = useCallback(() => setZoomFactor(f => Math.max(0.3, +(f / 1.25).toFixed(4))), []);
  const zoomFit = useCallback(() => { setZoomFactor(1); setPan({ x: 0, y: 0 }); }, []);

  // Auto-reset pan when zoom returns to fit
  useEffect(() => { if (zoomFactor <= 1) setPan({ x: 0, y: 0 }); }, [zoomFactor]);

  // ── Crop modal ─────────────────────────────────────────────────
  const [cropQueue, setCropQueue] = useState<CropTarget | null>(null);

  const openCrop = useCallback((target: ImageTarget) => {
    const src = state.images[target].src;
    if (!src) { store.showToast('No image to crop'); return; }
    setCropQueue({ src, target });
  }, [state.images, store]);

  const openCropLayer = useCallback((layerId: string) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer || layer.type !== 'image' || !(layer as { src?: string }).src) {
      store.showToast('No image to crop'); return;
    }
    setCropQueue({ src: (layer as { src: string }).src, target: null, layerId });
  }, [state.layers, store]);

  const onCropApply = useCallback((dataUrl: string) => {
    if (!cropQueue) return;
    if (cropQueue.target) {
      store.loadImage(cropQueue.target, dataUrl);
    } else if (cropQueue.layerId) {
      store.updateLayer(cropQueue.layerId, { src: dataUrl } as Partial<Layer>);
    }
    setCropQueue(null);
    store.showToast('Crop applied');
  }, [cropQueue, store]);

  // ── Export ────────────────────────────────────────────────────
  const renderBlob = useCallback(async (): Promise<{ blob: Blob; fileName: string } | null> => {
    const pixelRatio = state.exportMode === '2x' ? 2 : 1;
    const mimeType   = state.exportMode === 'jpg' ? 'image/jpeg' : 'image/png';
    const qual       = state.exportMode === 'jpg' ? 0.92 : 1;
    const ext        = state.exportMode === 'jpg' ? '.jpg' : '.png';
    const fileName   = `vortexly-pin-${Date.now()}${ext}`;
    const canvas     = await renderPinToCanvas(state, pixelRatio);
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob ? { blob, fileName } : null), mimeType, qual);
    });
  }, [state]);

  const downloadPNG = useCallback(async () => {
    store.setExporting(true);
    store.selectLayer(null);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const result = await renderBlob();
      if (!result) { store.showToast('Export failed'); return; }
      const { blob, fileName } = result;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      store.showToast('Download started…');
    } catch (err) {
      console.error(err);
      store.showToast('Export failed – try again');
    } finally {
      store.setExporting(false);
    }
  }, [renderBlob, store]);

  const saveToDrive = useCallback(async () => {
    if (!store.isAuth) { store.showToast('Sign in with Google to save to Drive'); return; }
    if (!store.driveConnected) { store.showToast('Connect Google Drive first'); return; }
    store.setExporting(true);
    store.selectLayer(null);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const result = await renderBlob();
      if (!result) { store.showToast('Export failed'); return; }
      const { blob, fileName } = result;
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      const form = new FormData();
      form.append('file', blob, fileName);
      form.append('filename', fileName);
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        store.showToast('Saved to Drive ✓');
      } else {
        const info = await res.json() as { error: string };
        if (res.status === 403) {
          store.clearDriveConnection();
          store.showToast('Drive disconnected — re-sign in with Google');
        } else store.showToast(`Drive upload failed: ${info.error}`);
      }
    } catch {
      store.showToast('Drive upload failed — try again');
    } finally {
      store.setExporting(false);
    }
  }, [renderBlob, store]);

  // ── Float toolbar for custom text layers ─────────────────────
  function floatTbStyle(): React.CSSProperties {
    if (state.layoutMode !== 'custom' || !state.selectedLayerId) return { display: 'none' };
    const layer = state.layers.find(l => l.id === state.selectedLayerId);
    if (!layer || layer.type === 'image') return { display: 'none' };
    const tl = layer as import('@/types/editor').TextLayer;
    return {
      display:  'flex',
      left:     Math.round(tl.x + tl.width / 2) * scale + 'px',
      top:      Math.max(8, Math.round(tl.y * scale - 48)) + 'px',
      transform:'translateX(-50%)',
    };
  }

  // ── Canvas pan handlers (active when zoomFactor > 1) ─────────
  function onScrollAreaPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (zoomFactor <= 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('.txt-layer,.img-layer,button,input,select,textarea,a')) return;
    panDrag.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    setPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onScrollAreaPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!panDrag.current) return;
    setPan({
      x: panDrag.current.px + (e.clientX - panDrag.current.mx),
      y: panDrag.current.py + (e.clientY - panDrag.current.my),
    });
  }
  function onScrollAreaPointerUp() {
    panDrag.current = null;
    setPanning(false);
  }

  const selLayer = state.layers.find(l => l.id === state.selectedLayerId) as import('@/types/editor').TextLayer | undefined;

  return (
    <div id="app" data-theme={state.darkTheme ? 'dark' : 'light'}>
      {/* ── Left panel ──────── */}
      <ControlPanel
        state={state}
        store={store}

        onOpenCrop={openCrop}
        onOpenCropLayer={openCropLayer}
        mobileActive={mobileTab === 'edit'}
      />

      {/* ── Canvas area ─────── */}
      <div id="canvas-wrapper" ref={wrapperRef}
        className={mobileTab === 'canvas' ? 'mob-active' : ''}>

        {/* Canvas toolbar */}
        <div className="canvas-tb">
          <div className="canvas-tb-left">
            <button type="button" className="ctb-btn" title={state.darkTheme ? 'Light mode' : 'Dark mode'}
              onClick={() => store.toggleDarkTheme()}>
              {state.darkTheme ? (
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M17 11.5A7 7 0 0 1 8.5 3a7.5 7.5 0 1 0 8.5 8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              )}
              <span>{state.darkTheme ? 'Light' : 'Dark'}</span>
            </button>
          </div>
          <div className="canvas-tb-center">
            <span className="ctb-info">1000 × 1500 px</span>
          </div>
          <div className="canvas-tb-right">
            <button type="button" className="ctb-btn ctb-zoom-btn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">−</button>
            <button type="button" className="ctb-zoom-display" onClick={zoomFit} title="Reset zoom">
              {Math.round(fitScale * zoomFactor * 100)}%
            </button>
            <button type="button" className="ctb-btn ctb-zoom-btn" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">+</button>
            <button type="button" className="ctb-btn ctb-fit-btn" onClick={zoomFit} title="Fit to screen" aria-label="Fit to screen">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="canvas-scroll-area"
          style={zoomFactor > 1 ? { cursor: panning ? 'grabbing' : 'grab' } : undefined}
          onPointerDown={onScrollAreaPointerDown}
          onPointerMove={onScrollAreaPointerMove}
          onPointerUp={onScrollAreaPointerUp}
          onPointerCancel={onScrollAreaPointerUp}
        >
          {/* Pan translate wrapper */}
          <div style={{ transform: `translate(${pan.x}px,${pan.y}px)`, flexShrink: 0, position: 'relative', willChange: 'transform' }}>
          <PinCanvas
            ref={pinCanvasRef}
            state={state}
            scale={scale}
            onSelectLayer={store.selectLayer}
            onUpdateLayer={store.updateLayer}
            onOpenCrop={openCrop}
          />

          {/* Float toolbar */}
          {selLayer && (
            <div id="float-tb" role="toolbar" aria-label="Text formatting" style={floatTbStyle()}>
              <button className={`ftb-btn${selLayer.fontWeight === '700' ? ' ftb-active' : ''}`} title="Bold"
                onClick={() => store.updateLayer(selLayer.id, { fontWeight: selLayer.fontWeight === '700' ? '400' : '700' })}><b>B</b></button>
              <button className={`ftb-btn${selLayer.fontStyle === 'italic' ? ' ftb-active' : ''}`} title="Italic"
                onClick={() => store.updateLayer(selLayer.id, { fontStyle: selLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}><i>I</i></button>
              <div className="ftb-sep" role="separator"/>
              {(['left','center','right'] as const).map(a => (
                <button key={a} className={`ftb-btn${selLayer.align === a ? ' ftb-active' : ''}`} title={`Align ${a}`}
                  onClick={() => store.updateLayer(selLayer.id, { align: a })}>{a[0].toUpperCase()}</button>
              ))}
              <div className="ftb-sep" role="separator"/>
              <button className="ftb-btn ftb-del" title="Delete layer"
                onClick={() => store.removeLayer(selLayer.id)}>✕</button>
            </div>
          )}
          </div>{/* end pan wrapper */}

          <div id="scale-tip">{Math.round(fitScale * zoomFactor * 100)}% · 1000 × 1500 px canvas</div>
        </div>
      </div>

      {/* ── Right panel ──── */}
      <RightPanel
        state={state}
        store={store}
        onDownload={downloadPNG}
        onSaveToDrive={saveToDrive}
        onOpenCropLayer={openCropLayer}
        mobileActive={mobileTab === 'edit'}
      />

      {/* ── Mobile tabs ───── */}
      <nav id="mob-tabbar" aria-label="View mode">
        <button className={`mob-tab${mobileTab === 'edit' ? ' active' : ''}`} onClick={() => setMobileTab('edit')}
          aria-pressed={mobileTab === 'edit'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button className={`mob-tab${mobileTab === 'canvas' ? ' active' : ''}`} onClick={() => setMobileTab('canvas')}
          aria-pressed={mobileTab === 'canvas'}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M3 15l5-5 4 4 3-3 6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Canvas
        </button>
      </nav>

      {/* ── Crop modal ──────── */}
      <CropModal
        open={!!cropQueue}
        src={cropQueue?.src ?? null}
        onApply={onCropApply}
        onClose={() => setCropQueue(null)}
      />

      {/* ── Loading overlay ─── */}
      {store.exporting && (
        <div id="loading-ov" role="status" aria-live="polite" className="show">
          <div className="spin" aria-hidden="true"/>
          <p>Generating PNG…</p>
        </div>
      )}

      {/* ── Toast ───────────── */}
      {store.toast && (
        <div id="toast" role="status" aria-live="polite" aria-atomic="true" className="show">
          {store.toast}
        </div>
      )}
    </div>
  );
}
