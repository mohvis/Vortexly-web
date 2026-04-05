'use client';
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { renderPinToCanvas } from '@/lib/exportCanvas';
import { useEditorState }  from '@/hooks/useEditorState';
import { ControlPanel }    from '@/components/editor/ControlPanel';
import { PinCanvas }       from '@/components/editor/PinCanvas';
import { CropModal }       from '@/components/editor/CropModal';
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
  const [scale,      setScale]     = useState(0.5);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const pinCanvasRef = useRef<HTMLDivElement>(null);

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // Compute scale on mount + resize (RAF-guarded to avoid CPU spike during drag)
  useEffect(() => {
    let rafId = 0;
    function update() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const avW = Math.max(1, el.clientWidth  - 40);
        const avH = Math.max(1, el.clientHeight - 40);
        setScale(Math.min(1, Math.max(0.28, Math.min(avW / 1000, avH / 1500))));
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

  // ── Crop modal ────────────────────────────────────────────────
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
      const form = new FormData();
      form.append('file', blob, fileName);
      form.append('filename', fileName);
      const res = await fetch('/api/drive/upload', { method: 'POST', body: form });
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

  const selLayer = state.layers.find(l => l.id === state.selectedLayerId) as import('@/types/editor').TextLayer | undefined;

  return (
    <div id="app" data-theme={state.darkTheme ? 'dark' : 'light'}>
      {/* ── Left panel ──────── */}
      <ControlPanel
        state={state}
        store={store}
        onDownload={downloadPNG}
        onSaveToDrive={saveToDrive}
        onOpenCrop={openCrop}
        onOpenCropLayer={openCropLayer}
        mobileActive={mobileTab === 'edit'}
      />

      {/* ── Canvas area ─────── */}
      <div id="canvas-wrapper" ref={wrapperRef}
        className={mobileTab === 'preview' ? 'mob-active' : ''}>
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
              onClick={() => store.removeLayer(selLayer.id)}>🗑</button>
          </div>
        )}

        <div id="scale-tip">Preview (scaled) · Edit in panel</div>
      </div>

      {/* ── Mobile tabs ─────── */}
      <nav id="mob-tabbar" aria-label="View mode">
        <button className={`mob-tab${mobileTab === 'edit' ? ' active' : ''}`} onClick={() => setMobileTab('edit')}
          aria-pressed={mobileTab === 'edit'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button className={`mob-tab${mobileTab === 'preview' ? ' active' : ''}`} onClick={() => { setMobileTab('preview'); }}
          aria-pressed={mobileTab === 'preview'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
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
