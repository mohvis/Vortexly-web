'use client';
import React, { useCallback, useRef, useState } from 'react';
import type { EditorState, ImageTarget, Layer, TextLayer } from '@/types/editor';
import type { EditorStore } from '@/hooks/useEditorState';

// ── Connector arrow palette ───────────────────────────────────────
const CONNECTOR_THUMBS = [
  { label: 'Loop',     d: 'M42 18C28 4,10 12,18 28C24 40,42 38,48 28C54 18,46 8,38 12M44 30C60 50,80 70,98 100M86 96L98 100L92 88' },
  { label: 'Curve',    d: 'M18 15C50 8,108 35,105 100M93 92L105 100L108 88' },
  { label: 'Double',   d: 'M38 20C20 10,12 28,24 34C36 40,50 30,46 16C42 5,28 7,26 18C55 50,80 78,100 105M88 98L100 105L104 92' },
  { label: 'S-Curl',   d: 'M20 20C20 50,80 55,80 85M68 80L80 85L80 72' },
  { label: 'Flourish', d: 'M30 15C14 15,8 30,20 35C32 40,44 30,42 18C40 8,28 8,26 18M38 22C58 44,80 68,100 96M88 90L100 96L96 83' },
  { label: 'Spiral',   d: 'M60 18C85 18,100 35,100 58C100 83,80 98,58 94C36 90,22 72,28 52C34 35,52 28,62 40C70 50,64 64,54 62M42 56L54 62L54 49' },
];

const GRAD_DIRS = [
  { value: 'to bottom',       label: 'Top → Bottom' },
  { value: 'to right',        label: 'Left → Right' },
  { value: 'to bottom right', label: 'Diagonal ↘' },
  { value: 'to bottom left',  label: 'Diagonal ↙' },
  { value: '135deg',          label: '135°' },
  { value: '45deg',           label: '45°' },
];

const FONT_OPTS = [
  'Bodoni Moda','Playfair Display','Cormorant Garamond','Lora',
  'Libre Baskerville','EB Garamond','Merriweather','Georgia',
  'DM Sans','Inter','Poppins','Montserrat','Raleway',
  'Work Sans','Nunito','Arial','Helvetica Neue',
];

// ── Accordion section ─────────────────────────────────────────────
function AccordionSec({ title, id, defaultOpen = true, children }: {
  title: string; id: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`asec${open ? ' asec--open' : ''}`} id={id}>
      <button type="button" className="asec-hdr" onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-controls={`${id}-body`}>
        <span className="asec-title">{title}</span>
        <svg className="asec-chevron" viewBox="0 0 10 6" fill="none" width="10" height="6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="asec-body" id={`${id}-body`}>{children}</div>}
    </div>
  );
}

// ── Slider row ────────────────────────────────────────────────────
interface AdjRowProps {
  label: string; id: string; min: number; max: number; value: number;
  unit?: string; onChange: (v: number) => void;
}
function AdjRow({ label, id, min, max, value, unit = '%', onChange }: AdjRowProps) {
  return (
    <div className="adj-row">
      <span className="adj-lbl" aria-hidden="true">{label}</span>
      <input type="range" className="adj-slider" id={id} min={min} max={max} value={value}
        aria-label={label} onChange={e => onChange(Number(e.target.value))} />
      <span className="adj-val">{value}{unit}</span>
    </div>
  );
}

// ── Image drop zone ───────────────────────────────────────────────
interface ImageSectionProps {
  target: ImageTarget; title: string;
  state: EditorState; store: EditorStore;
  onOpenCrop: (target: ImageTarget) => void;
}
function ImageSection({ target, title, state, store, onOpenCrop }: ImageSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const slot    = state.images[target];

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      if (src) { store.loadImage(target, src); store.showToast('Image loaded'); }
    };
    reader.readAsDataURL(file);
  }, [target, store]);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const t = item.types.find(x => x.startsWith('image/'));
        if (t) {
          const blob = await item.getType(t);
          const reader = new FileReader();
          reader.onload = e => {
            const src = e.target?.result as string;
            if (src) { store.loadImage(target, src); store.showToast('Pasted'); }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      store.showToast('No image in clipboard');
    } catch { store.showToast('Paste: use Ctrl+V or allow clipboard access'); }
  }, [target, store]);

  return (
    <AccordionSec title={`${title} — Image`} id={`sec-${target}`} defaultOpen={true}>
      <div className={`dz${slot.src ? ' loaded' : ''}`} id={`dz-${target}`}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => { if (!slot.src) fileRef.current?.click(); }}
      >
        {slot.src
          ? <img className="dz-thumb" src={slot.src} alt="Preview" />
          : (
            <div className="dz-ph">
              <div className="dz-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="5" width="24" height="18" rx="3" stroke="#c0b8b0" strokeWidth="1.6"/>
                  <path d="M2 18l7-7 5 5 4-4 8 7" stroke="#c0b8b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="19" cy="11" r="2.5" stroke="#c0b8b0" strokeWidth="1.4"/>
                </svg>
              </div>
              <div><b>Drop image here</b><span>Drag, paste or upload</span></div>
            </div>
          )}
      </div>
      <div className="dz-row">
        <button type="button" className="dz-btn" onClick={() => fileRef.current?.click()}>
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M7 9V1M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Upload
        </button>
        <button type="button" className="dz-btn" onClick={handlePaste}>
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><rect x="3" y="2" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 2V1h4v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5 6h4M5 8.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          Paste
        </button>
        {slot.src && (
          <button type="button" className="dz-btn" onClick={() => onOpenCrop(target)}>
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M2 1v9h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 4H1M13 10H5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Crop
          </button>
        )}
        {slot.src && (
          <button type="button" className="dz-btn del" onClick={() => store.removeImage(target)}>
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M1 3h12M5 3V2h4v1M3 3l1 9h6l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Remove
          </button>
        )}
      </div>
      {slot.src && (
        <div className="img-adjust visible" id={`adj-${target}`}>
          <AdjRow label="Zoom"     id={`zoom-${target}`}     min={50}  max={300} value={slot.zoom}     onChange={v => store.setImage(target, { zoom:     v })} />
          <AdjRow label="X"        id={`posx-${target}`}     min={0}   max={100} value={slot.posX}     onChange={v => store.setImage(target, { posX:     v })} />
          <AdjRow label="Y"        id={`posy-${target}`}     min={0}   max={100} value={slot.posY}     onChange={v => store.setImage(target, { posY:     v })} />
          <AdjRow label="Bright"   id={`bright-${target}`}   min={50}  max={150} value={slot.bright}   onChange={v => store.setImage(target, { bright:   v })} />
          <AdjRow label="Contrast" id={`contrast-${target}`} min={50}  max={150} value={slot.contrast} onChange={v => store.setImage(target, { contrast: v })} />
          <div className="adj-footer">
            <button type="button" className="adj-reset"
              onClick={() => store.setImage(target, { zoom:100, posX:50, posY:50, bright:100, contrast:100 })}>
              Reset
            </button>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="file-input-hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </AccordionSec>
  );
}

// ── Text label row ────────────────────────────────────────────────
function LabelField({ label, inputId, value, color, fontSize, minFs, maxFs, multiline,
  onText, onColor, onFs }: {
  label: string; inputId: string; value: string; color: string; fontSize: number;
  minFs: number; maxFs: number; multiline?: boolean;
  onText: (v: string) => void; onColor: (v: string) => void; onFs: (v: number) => void;
}) {
  return (
    <>
      <div className="fr">
        <div className="fr-head">
          <label className="fl" htmlFor={inputId}>{label}</label>
          <input type="color" className="lbl-swatch" value={color} aria-label={`${label} color`}
            onChange={e => onColor(e.target.value)} />
        </div>
        {multiline ? (
          <textarea className="fi" id={inputId} value={value} placeholder={label} aria-label={label}
            onChange={e => onText(e.target.value)} />
        ) : (
          <input className="fi" id={inputId} type="text" value={value} placeholder={label} aria-label={label}
            onChange={e => onText(e.target.value)} />
        )}
      </div>
      <div className="fr">
        <label className="fl" htmlFor={`fs-${inputId}`}>{label} size</label>
        <div className="adj-row">
          <input type="range" className="adj-slider" id={`fs-${inputId}`} min={minFs} max={maxFs} value={fontSize}
            aria-label={`${label} font size`} onChange={e => onFs(Number(e.target.value))} />
          <span className="adj-val">{fontSize}px</span>
        </div>
      </div>
    </>
  );
}

// ── Background section ────────────────────────────────────────────
function BgSection({ state, store, suffix }: { state: EditorState; store: EditorStore; suffix: string }) {
  const { bg } = state;
  return (
    <AccordionSec title="Background" id={`sec-bg${suffix}`} defaultOpen={false}>
      <div className="bg-type-row">
        {(['solid','gradient'] as const).map(t => (
          <button key={t} type="button" className={`bgt-btn${bg.type === t ? ' active' : ''}`}
            aria-pressed={bg.type === t}
            onClick={() => store.setBg({ type: t })}>
            {t === 'solid' ? 'Solid' : 'Gradient'}
          </button>
        ))}
      </div>
      {bg.type === 'solid' ? (
        <div className="color-row">
          <input type="color" className="color-swatch" value={bg.solid} aria-label="Canvas background color"
            onChange={e => store.setBg({ solid: e.target.value })} />
          <span className="color-label">Canvas color</span>
          <button type="button" className="color-reset" onClick={() => store.setBg({ solid: '#ffffff' })}>Reset</button>
        </div>
      ) : (
        <>
          <div className="grad-colors-row">
            <input type="color" className="color-swatch" value={bg.gradC1} aria-label="Gradient start color"
              onChange={e => store.setBg({ gradC1: e.target.value })} />
            <svg viewBox="0 0 24 10" width="24" height="10" aria-hidden="true">
              <path d="M0 5h22M17 1l5 4-5 4" stroke="#a09890" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <input type="color" className="color-swatch" value={bg.gradC2} aria-label="Gradient end color"
              onChange={e => store.setBg({ gradC2: e.target.value })} />
          </div>
          <div className="fr fr--mt8">
            <label className="fl" htmlFor={`bg-gdir${suffix}`}>Direction</label>
            <select className="fi" id={`bg-gdir${suffix}`} value={bg.gradDir}
              onChange={e => store.setBg({ gradDir: e.target.value })}>
              {GRAD_DIRS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </>
      )}
    </AccordionSec>
  );
}

// ── Export / Download section ─────────────────────────────────────
function DownloadSection({ state, store, onDownload, onSaveToDrive }: {
  state: EditorState; store: EditorStore; onDownload: () => void; onSaveToDrive: () => void;
}) {
  return (
    <div className="dl-sec">
      <div className="export-opts" role="group" aria-label="Export quality">
        {(['1x','2x','jpg'] as const).map(m => (
          <button key={m} type="button"
            className={`eopt${state.exportMode === m ? ' active' : ''}`}
            onClick={() => store.setExportMode(m)}>
            {m === '2x' ? '2× Hi-Res' : m.toUpperCase()}
          </button>
        ))}
      </div>
      <button id="dl-btn" type="button" onClick={onDownload}>
        <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
          <path d="M8 1v8M4 6l4 3 4-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        Download
      </button>
      {store.isAuth && store.driveConnected ? (
        <button id="drive-save-btn" type="button" onClick={onSaveToDrive}>
          <svg viewBox="0 0 22 16" fill="none" width="15" height="15" aria-hidden="true">
            <path d="M8 14H2a1 1 0 0 1-.87-1.5L7 3l3 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 14h6a1 1 0 0 0 .87-1.5L15 3l-3 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Save to Drive
        </button>
      ) : store.isAuth ? (
        <a href="/login" className="drive-badge drive-badge--off">Connect Google Drive</a>
      ) : (
        <a href="/login" className="drive-badge drive-badge--guest">Sign in to sync to Drive</a>
      )}
      <div className="kb-hint">Ctrl + Shift + S → Download</div>
    </div>
  );
}

// ── Custom canvas layer list ──────────────────────────────────────
function LayerList({ state, store, onOpenCropLayer }: {
  state: EditorState; store: EditorStore; onOpenCropLayer: (id: string) => void;
}) {
  const { layers, selectedLayerId } = state;
  if (layers.length === 0) return (
    <p className="layer-hint layer-hint--empty">No layers yet. Use the buttons above to add.</p>
  );
  return (
    <div id="layers-list">
      {layers.map(layer => {
        const isOpen = layer.id === selectedLayerId;
        if (layer.type === 'image') {
          const il = layer as import('@/types/editor').ImageLayer;
          return (
            <div key={il.id} className={`layer-row${isOpen ? ' lr-selected lr-open' : ''}`}>
              <div className="layer-row-head" onClick={() => store.selectLayer(isOpen ? null : il.id)}>
                <span className="lr-chevron">{isOpen ? '▾' : '▸'}</span>
                <span className="lr-img-thumb" style={{ backgroundImage: `url('${il.src}')` }} aria-hidden="true" />
                <span className="lr-name">Image</span>
                <button type="button" className="lr-del" aria-label="Remove layer"
                  onClick={e => { e.stopPropagation(); store.removeLayer(il.id); }}>
                  <svg viewBox="0 0 10 10" fill="none" width="10" height="10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </button>
              </div>
              {isOpen && (
                <div className="layer-editor">
                  <div className="lr-img-actions">
                    <button type="button" className="dz-btn" onClick={() => onOpenCropLayer(il.id)}>
                      <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M2 1v9h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 4H1M13 10H5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      Crop
                    </button>
                    <button type="button" className="dz-btn del" onClick={() => store.removeLayer(il.id)}>
                      <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M1 3h12M5 3V2h4v1M3 3l1 9h6l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Delete
                    </button>
                  </div>
                  <div className="fr">
                    <span className="fl">Opacity</span>
                    <div className="adj-row">
                      <input type="range" className="adj-slider" min={10} max={100} value={il.opacity}
                        aria-label="Opacity"
                        onChange={e => store.updateLayer(il.id, { opacity: Number(e.target.value) })} />
                      <span className="adj-val">{il.opacity}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        const tl = layer as TextLayer;
        return (
          <div key={tl.id} className={`layer-row${isOpen ? ' lr-selected lr-open' : ''}`}>
            <div className="layer-row-head" onClick={() => store.selectLayer(isOpen ? null : tl.id)}>
              <span className="lr-chevron">{isOpen ? '▾' : '▸'}</span>
              <span className="lr-dot" style={{ background: tl.color }} />
              <span className="lr-name">{tl.text.length > 22 ? tl.text.slice(0, 22) + '…' : tl.text}</span>
              <button type="button" className="lr-del" aria-label="Remove layer"
                onClick={e => { e.stopPropagation(); store.removeLayer(tl.id); }}>
                <svg viewBox="0 0 10 10" fill="none" width="10" height="10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            {isOpen && (
              <div className="layer-editor">
                <div className="fr">
                  <span className="fl">Text</span>
                  <textarea className="fi fi-layer" aria-label="Layer text"
                    value={tl.text} onChange={e => store.updateLayer(tl.id, { text: e.target.value })} />
                </div>
                <div className="le-style-row">
                  <button type="button" className={`le-btn${tl.fontWeight === '700' ? ' le-active' : ''}`}
                    aria-label="Bold" onClick={() => store.updateLayer(tl.id, { fontWeight: tl.fontWeight === '700' ? '400' : '700' })}>
                    <b>B</b>
                  </button>
                  <button type="button" className={`le-btn${tl.fontStyle === 'italic' ? ' le-active' : ''}`}
                    aria-label="Italic" onClick={() => store.updateLayer(tl.id, { fontStyle: tl.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                    <i>I</i>
                  </button>
                  <select className="le-select" aria-label="Font family" value={tl.fontFamily}
                    onChange={e => store.updateLayer(tl.id, { fontFamily: e.target.value })}>
                    {FONT_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="fr">
                  <span className="fl">Size</span>
                  <div className="adj-row">
                    <input type="range" className="adj-slider" min={12} max={220} value={tl.fontSize}
                      aria-label="Font size" onChange={e => store.updateLayer(tl.id, { fontSize: Number(e.target.value) })} />
                    <span className="adj-val">{tl.fontSize}px</span>
                  </div>
                </div>
                <div className="fr">
                  <span className="fl">Spacing</span>
                  <div className="adj-row">
                    <input type="range" className="adj-slider" min={-5} max={30} value={tl.letterSpacing}
                      aria-label="Letter spacing" onChange={e => store.updateLayer(tl.id, { letterSpacing: Number(e.target.value) })} />
                    <span className="adj-val">{tl.letterSpacing}px</span>
                  </div>
                </div>
                <div className="color-row">
                  <input type="color" className="color-swatch" value={tl.color} aria-label="Text color"
                    onChange={e => store.updateLayer(tl.id, { color: e.target.value })} />
                  <span className="color-label">Text color</span>
                </div>
                <div className="fr">
                  <span className="fl">Opacity</span>
                  <div className="adj-row">
                    <input type="range" className="adj-slider" min={10} max={100} value={tl.opacity}
                      aria-label="Opacity" onChange={e => store.updateLayer(tl.id, { opacity: Number(e.target.value) })} />
                    <span className="adj-val">{tl.opacity}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ControlPanel ─────────────────────────────────────────────
interface ControlPanelProps {
  state:           EditorState;
  store:           EditorStore;
  onDownload:      () => void;
  onSaveToDrive:   () => void;
  onOpenCrop:      (target: ImageTarget) => void;
  onOpenCropLayer: (id: string) => void;
  mobileActive?:   boolean;
}

export function ControlPanel({
  state, store, onDownload, onSaveToDrive, onOpenCrop, onOpenCropLayer, mobileActive
}: ControlPanelProps) {
  const fileCustomRef = useRef<HTMLInputElement>(null);
  const { twoLabels: tl, oneLabels: ol } = state;

  const handleCustomImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      if (src) store.addImageLayer(src);
    };
    reader.readAsDataURL(file);
  }, [store]);

  const pasteCustomImg = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const t = item.types.find(x => x.startsWith('image/'));
        if (t) {
          const blob = await item.getType(t);
          const reader = new FileReader();
          reader.onload = e => {
            const src = e.target?.result as string;
            if (src) store.addImageLayer(src);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      store.showToast('No image in clipboard');
    } catch { store.showToast('Paste: use Ctrl+V or allow clipboard'); }
  }, [store]);

  return (
    <aside id="editor-panel" className={mobileActive ? 'mob-active' : undefined}>

      {/* ── Mode switcher (sticky, no logo — app-header handles branding) ── */}
      <div className="mode-sw" role="group" aria-label="Layout mode">
        <button type="button" className={`msw-btn${state.layoutMode === 'two' ? ' active' : ''}`}
          id="msw-two" onClick={() => store.setLayoutMode('two')}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
            <rect x="1" y="2" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="2" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          Compare
        </button>
        <button type="button" className={`msw-btn${state.layoutMode === 'one' ? ' active' : ''}`}
          id="msw-one" onClick={() => store.setLayoutMode('one')}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
            <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          Single
        </button>
        <button type="button" className={`msw-btn${state.layoutMode === 'custom' ? ' active' : ''}`}
          id="msw-custom" onClick={() => store.setLayoutMode('custom')}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
            <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          Canvas
        </button>
      </div>

      {/* ══════════════ COMPARE (2-item) PANEL ══════════════ */}
      <div id="panel-two" className={state.layoutMode !== 'two' ? 'panel-hidden' : undefined}>

        <ImageSection target="top"    title="Item A"  state={state} store={store} onOpenCrop={onOpenCrop} />

        <AccordionSec title="Item A — Labels" id="sec-top-labels">
          <div className="fields">
            <LabelField label="Category"  inputId="top-eye"   value={tl.topEye.text}   color={tl.topEye.color}   fontSize={tl.topEye.fontSize}   minFs={6}  maxFs={30}  onText={v => store.setTwoLabel('topEye',  { text: v })} onColor={v => store.setTwoLabel('topEye',  { color: v })} onFs={v => store.setTwoLabel('topEye',  { fontSize: v })} />
            <LabelField label="Title"     inputId="top-brand" value={tl.topBrand.text} color={tl.topBrand.color} fontSize={tl.topBrand.fontSize} minFs={20} maxFs={80}  onText={v => store.setTwoLabel('topBrand',{ text: v })} onColor={v => store.setTwoLabel('topBrand',{ color: v })} onFs={v => store.setTwoLabel('topBrand',{ fontSize: v })} multiline />
            <LabelField label="Subtitle"  inputId="top-model" value={tl.topModel.text} color={tl.topModel.color} fontSize={tl.topModel.fontSize} minFs={8}  maxFs={50}  onText={v => store.setTwoLabel('topModel',{ text: v })} onColor={v => store.setTwoLabel('topModel',{ color: v })} onFs={v => store.setTwoLabel('topModel',{ fontSize: v })} />
            <LabelField label="Price"     inputId="top-price" value={tl.topPrice.text} color={tl.topPrice.color} fontSize={tl.topPrice.fontSize} minFs={8}  maxFs={50}  onText={v => store.setTwoLabel('topPrice',{ text: v })} onColor={v => store.setTwoLabel('topPrice',{ color: v })} onFs={v => store.setTwoLabel('topPrice',{ fontSize: v })} />
          </div>
        </AccordionSec>

        <ImageSection target="bottom" title="Item B"  state={state} store={store} onOpenCrop={onOpenCrop} />

        <AccordionSec title="Item B — Labels" id="sec-bot-labels">
          <div className="fields">
            <LabelField label="Category"  inputId="bot-eye"   value={tl.botEye.text}   color={tl.botEye.color}   fontSize={tl.botEye.fontSize}   minFs={6}  maxFs={30}  onText={v => store.setTwoLabel('botEye',  { text: v })} onColor={v => store.setTwoLabel('botEye',  { color: v })} onFs={v => store.setTwoLabel('botEye',  { fontSize: v })} />
            <LabelField label="Title"     inputId="bot-brand" value={tl.botBrand.text} color={tl.botBrand.color} fontSize={tl.botBrand.fontSize} minFs={20} maxFs={80}  onText={v => store.setTwoLabel('botBrand',{ text: v })} onColor={v => store.setTwoLabel('botBrand',{ color: v })} onFs={v => store.setTwoLabel('botBrand',{ fontSize: v })} multiline />
            <LabelField label="Subtitle"  inputId="bot-model" value={tl.botModel.text} color={tl.botModel.color} fontSize={tl.botModel.fontSize} minFs={8}  maxFs={50}  onText={v => store.setTwoLabel('botModel',{ text: v })} onColor={v => store.setTwoLabel('botModel',{ color: v })} onFs={v => store.setTwoLabel('botModel',{ fontSize: v })} />
            <LabelField label="Price"     inputId="bot-price" value={tl.botPrice.text} color={tl.botPrice.color} fontSize={tl.botPrice.fontSize} minFs={16} maxFs={80}  onText={v => store.setTwoLabel('botPrice',{ text: v })} onColor={v => store.setTwoLabel('botPrice',{ color: v })} onFs={v => store.setTwoLabel('botPrice',{ fontSize: v })} />
            <LabelField label="Caption"   inputId="bot-tag"   value={tl.botTag.text}   color={tl.botTag.color}   fontSize={tl.botTag.fontSize}   minFs={6}  maxFs={30}  onText={v => store.setTwoLabel('botTag',  { text: v })} onColor={v => store.setTwoLabel('botTag',  { color: v })} onFs={v => store.setTwoLabel('botTag',  { fontSize: v })} />
          </div>
        </AccordionSec>

        <AccordionSec title="Connector Arrow" id="sec-connector" defaultOpen={false}>
          <div className="swirl-toggle-row">
            <label className="tog-switch" aria-label="Show connector arrow">
              <input type="checkbox" checked={state.swirl.visible} onChange={e => store.setSwirl({ visible: e.target.checked })} />
              <span className="tog-track"/>
            </label>
            <span className="tog-label">Show connector arrow</span>
          </div>
          {state.swirl.visible && (
            <div id="swirl-controls">
              <div className="swirl-grid">
                {CONNECTOR_THUMBS.map((sw, i) => (
                  <div className="si" key={i}>
                    <button type="button" className={`sb${state.swirl.design === i ? ' active' : ''}`}
                      onClick={() => store.setSwirl({ design: i })} aria-label={sw.label}>
                      <svg viewBox="0 0 120 120" fill="none">
                        <path d={sw.d} stroke="#4a4030" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </button>
                    <div className="sn">{sw.label}</div>
                  </div>
                ))}
              </div>
              <div className="color-row color-row--mt">
                <input type="color" className="color-swatch" value={state.swirl.color} aria-label="Arrow color"
                  onChange={e => store.setSwirl({ color: e.target.value })} />
                <span className="color-label">Arrow color</span>
                <button type="button" className="color-reset" onClick={() => store.setSwirl({ color: '#4a4030' })}>Reset</button>
              </div>
              <AdjRow label="Opacity" id="swirl-opacity" min={10} max={100} value={state.swirl.opacity}
                onChange={v => store.setSwirl({ opacity: v })} />
            </div>
          )}
        </AccordionSec>

        <BgSection state={state} store={store} suffix="" />
        <DownloadSection state={state} store={store} onDownload={onDownload} onSaveToDrive={onSaveToDrive} />
      </div>

      {/* ══════════════ SINGLE PANEL ══════════════ */}
      <div id="panel-one" className={state.layoutMode !== 'one' ? 'panel-hidden' : undefined}>

        <ImageSection target="single" title="Image" state={state} store={store} onOpenCrop={onOpenCrop} />

        <AccordionSec title="Labels" id="sec-one-labels">
          <div className="fields">
            <LabelField label="Category"  inputId="s-eye"   value={ol.eye.text}   color={ol.eye.color}   fontSize={ol.eye.fontSize}   minFs={6}  maxFs={30}  onText={v => store.setOneLabel('eye',  { text: v })} onColor={v => store.setOneLabel('eye',  { color: v })} onFs={v => store.setOneLabel('eye',  { fontSize: v })} />
            <LabelField label="Title"     inputId="s-brand" value={ol.brand.text} color={ol.brand.color} fontSize={ol.brand.fontSize} minFs={20} maxFs={100} onText={v => store.setOneLabel('brand',{ text: v })} onColor={v => store.setOneLabel('brand',{ color: v })} onFs={v => store.setOneLabel('brand',{ fontSize: v })} multiline />
            <LabelField label="Subtitle"  inputId="s-model" value={ol.model.text} color={ol.model.color} fontSize={ol.model.fontSize} minFs={8}  maxFs={50}  onText={v => store.setOneLabel('model',{ text: v })} onColor={v => store.setOneLabel('model',{ color: v })} onFs={v => store.setOneLabel('model',{ fontSize: v })} />
            <LabelField label="Price"     inputId="s-price" value={ol.price.text} color={ol.price.color} fontSize={ol.price.fontSize} minFs={8}  maxFs={50}  onText={v => store.setOneLabel('price',{ text: v })} onColor={v => store.setOneLabel('price',{ color: v })} onFs={v => store.setOneLabel('price',{ fontSize: v })} />
          </div>
          <div className="sal-row sal-row--mt" role="group" aria-label="Label text alignment">
            {(['left','center','right'] as const).map(a => (
              <button key={a} type="button" className={`sal-btn${state.singleAlign === a ? ' active' : ''}`}
                aria-pressed={state.singleAlign === a} data-align={a} onClick={() => store.setSingleAlign(a)}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </AccordionSec>

        <BgSection state={state} store={store} suffix="-one" />
        <DownloadSection state={state} store={store} onDownload={onDownload} onSaveToDrive={onSaveToDrive} />
      </div>

      {/* ══════════════ FREE CANVAS PANEL ══════════════ */}
      <div id="panel-custom" className={state.layoutMode !== 'custom' ? 'panel-hidden' : undefined}>

        <AccordionSec title="Layers" id="sec-layers">
          <div className="layer-quick-btns">
            <button type="button" className="lqb-btn lqb-img" onClick={() => fileCustomRef.current?.click()}>
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M7 9V1M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Image
            </button>
            <button type="button" className="lqb-btn lqb-paste" onClick={pasteCustomImg}>
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><rect x="3" y="2" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 2V1h4v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5 6h4M5 8.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Paste
            </button>
            <button type="button" className="lqb-btn lqb-txt" onClick={() => store.addTextLayer()}>
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true"><path d="M2 3h10M7 3v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Text
            </button>
          </div>
          <LayerList state={state} store={store} onOpenCropLayer={onOpenCropLayer} />
          <p className="layer-hint">Drag · resize · reorder on canvas</p>
        </AccordionSec>

        <BgSection state={state} store={store} suffix="-custom" />
        <DownloadSection state={state} store={store} onDownload={onDownload} onSaveToDrive={onSaveToDrive} />

        <input ref={fileCustomRef} type="file" accept="image/*" className="file-input-hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCustomImageFile(f); e.target.value = ''; }} />
      </div>

    </aside>
  );
}
