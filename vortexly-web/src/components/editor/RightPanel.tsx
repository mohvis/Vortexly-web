'use client';
import React from 'react';
import type { EditorState, ImageLayer, TextLayer } from '@/types/editor';
import type { EditorStore } from '@/hooks/useEditorState';

const FONT_OPTS = [
  'Bodoni Moda','Playfair Display','Cormorant Garamond','Lora',
  'Libre Baskerville','EB Garamond','Merriweather','Georgia',
  'DM Sans','Inter','Poppins','Montserrat','Raleway',
  'Work Sans','Nunito','Arial','Helvetica Neue',
];

const GRAD_DIRS = [
  { value: 'to bottom',       label: 'Top → Bottom' },
  { value: 'to right',        label: 'Left → Right' },
  { value: 'to bottom right', label: 'Diagonal ↘' },
  { value: 'to bottom left',  label: 'Diagonal ↙' },
  { value: '135deg',          label: '135°' },
  { value: '45deg',           label: '45°' },
];

interface RightPanelProps {
  state:           EditorState;
  store:           EditorStore;
  onDownload:      () => void;
  onSaveToDrive:   () => void;
  onOpenCropLayer: (id: string) => void;
  mobileActive?:   boolean;
}

// ── Canvas background properties ──────────────────────────────────
function CanvasProps({ state, store }: { state: EditorState; store: EditorStore }) {
  const { bg } = state;
  return (
    <section className="rp-sec">
      <div className="rp-sec-title">Background</div>
      <div className="bg-type-row">
        {(['solid','gradient'] as const).map(t => (
          <button key={t} type="button"
            className={`bgt-btn${bg.type === t ? ' active' : ''}`}
            aria-pressed={bg.type === t}
            onClick={() => store.setBg({ type: t })}>
            {t === 'solid' ? 'Solid' : 'Gradient'}
          </button>
        ))}
      </div>
      {bg.type === 'solid' ? (
        <div className="color-row">
          <input type="color" className="color-swatch" value={bg.solid} aria-label="Background color"
            onChange={e => store.setBg({ solid: e.target.value })} />
          <span className="color-label">Background</span>
          <button type="button" className="color-reset"
            onClick={() => store.setBg({ solid: '#ffffff' })}>Reset</button>
        </div>
      ) : (
        <>
          <div className="grad-colors-row">
            <input type="color" className="color-swatch" value={bg.gradC1} aria-label="Gradient start"
              onChange={e => store.setBg({ gradC1: e.target.value })} />
            <svg viewBox="0 0 24 10" width="24" height="10" aria-hidden="true">
              <path d="M0 5h22M17 1l5 4-5 4" stroke="#a09890" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <input type="color" className="color-swatch" value={bg.gradC2} aria-label="Gradient end"
              onChange={e => store.setBg({ gradC2: e.target.value })} />
          </div>
          <div className="fr fr--mt8">
            <label className="fl" htmlFor="rp-bg-gdir">Direction</label>
            <select className="fi" id="rp-bg-gdir" value={bg.gradDir}
              onChange={e => store.setBg({ gradDir: e.target.value })}>
              {GRAD_DIRS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </>
      )}
    </section>
  );
}

// ── Text layer inspector ──────────────────────────────────────────
function TextLayerProps({ layer, store }: { layer: TextLayer; store: EditorStore }) {
  return (
    <section className="rp-sec rp-sec--highlight">
      <div className="rp-sec-head">
        <div className="rp-sec-title">Text Layer</div>
        <button className="rp-desel" onClick={() => store.selectLayer(null)}
          title="Deselect" aria-label="Deselect layer">
          <svg viewBox="0 0 10 10" fill="none" width="10" height="10" aria-hidden="true">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="color-row">
        <input type="color" className="color-swatch" value={layer.color} aria-label="Text color"
          onChange={e => store.updateLayer(layer.id, { color: e.target.value })} />
        <span className="color-label">Color</span>
      </div>

      <div className="le-style-row">
        <button type="button"
          className={`le-btn${layer.fontWeight === '700' ? ' le-active' : ''}`}
          aria-label="Bold"
          onClick={() => store.updateLayer(layer.id, { fontWeight: layer.fontWeight === '700' ? '400' : '700' })}>
          <b>B</b>
        </button>
        <button type="button"
          className={`le-btn${layer.fontStyle === 'italic' ? ' le-active' : ''}`}
          aria-label="Italic"
          onClick={() => store.updateLayer(layer.id, { fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' })}>
          <i>I</i>
        </button>
        <select className="le-select" aria-label="Font family" value={layer.fontFamily}
          onChange={e => store.updateLayer(layer.id, { fontFamily: e.target.value })}>
          {FONT_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="fr">
        <span className="fl">Size</span>
        <div className="adj-row">
          <input type="range" className="adj-slider" min={12} max={220} value={layer.fontSize}
            aria-label="Font size"
            onChange={e => store.updateLayer(layer.id, { fontSize: +e.target.value })} />
          <span className="adj-val">{layer.fontSize}px</span>
        </div>
      </div>

      <div className="fr">
        <span className="fl">Spacing</span>
        <div className="adj-row">
          <input type="range" className="adj-slider" min={-5} max={30} value={layer.letterSpacing}
            aria-label="Letter spacing"
            onChange={e => store.updateLayer(layer.id, { letterSpacing: +e.target.value })} />
          <span className="adj-val">{layer.letterSpacing}px</span>
        </div>
      </div>

      <div className="fr">
        <span className="fl">Opacity</span>
        <div className="adj-row">
          <input type="range" className="adj-slider" min={10} max={100} value={layer.opacity}
            aria-label="Opacity"
            onChange={e => store.updateLayer(layer.id, { opacity: +e.target.value })} />
          <span className="adj-val">{layer.opacity}%</span>
        </div>
      </div>

      <div className="sal-row rp-align-row" role="group" aria-label="Text alignment">
        {(['left','center','right'] as const).map(a => (
          <button key={a} type="button"
            className={`sal-btn${layer.align === a ? ' active' : ''}`}
            aria-pressed={layer.align === a}
            onClick={() => store.updateLayer(layer.id, { align: a })}>
            {a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Image layer inspector ─────────────────────────────────────────
function ImageLayerProps({ layer, store, onOpenCropLayer }: {
  layer: ImageLayer; store: EditorStore; onOpenCropLayer: (id: string) => void;
}) {
  return (
    <section className="rp-sec rp-sec--highlight">
      <div className="rp-sec-head">
        <div className="rp-sec-title">Image Layer</div>
        <button className="rp-desel" onClick={() => store.selectLayer(null)}
          title="Deselect" aria-label="Deselect layer">
          <svg viewBox="0 0 10 10" fill="none" width="10" height="10" aria-hidden="true">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="fr">
        <span className="fl">Opacity</span>
        <div className="adj-row">
          <input type="range" className="adj-slider" min={10} max={100} value={layer.opacity}
            aria-label="Opacity"
            onChange={e => store.updateLayer(layer.id, { opacity: +e.target.value })} />
          <span className="adj-val">{layer.opacity}%</span>
        </div>
      </div>

      <div className="dz-row rp-layer-actions">
        <button type="button" className="dz-btn" onClick={() => onOpenCropLayer(layer.id)}>
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
            <path d="M1 5V2h3M10 2h3v3M13 9v3h-3M4 13H1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Crop
        </button>
        <button type="button" className="dz-btn del" onClick={() => store.removeLayer(layer.id)}>
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
            <path d="M1 3h12M5 3V2h4v1M3 3l1 9h6l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Delete
        </button>
      </div>
    </section>
  );
}

// ── Export section ────────────────────────────────────────────────
function ExportSection({ state, store, onDownload, onSaveToDrive }: {
  state: EditorState; store: EditorStore; onDownload: () => void; onSaveToDrive: () => void;
}) {
  return (
    <div className="rp-export">
      <div className="rp-sec-title">Export</div>
      <div className="export-opts" role="group" aria-label="Export quality">
        {(['1x','2x','jpg'] as const).map(m => (
          <button key={m} type="button"
            className={`eopt${state.exportMode === m ? ' active' : ''}`}
            onClick={() => store.setExportMode(m)}>
            {m === '2x' ? '2× Hi-Res' : m.toUpperCase()}
          </button>
        ))}
      </div>
      <button id="dl-btn" type="button" onClick={onDownload} disabled={store.exporting}>
        <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
          <path d="M8 1v8M4 6l4 3 4-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        {store.exporting ? 'Exporting…' : 'Download'}
      </button>
      {store.isAuth && store.driveConnected ? (
        <button id="drive-save-btn" type="button" onClick={onSaveToDrive} disabled={store.exporting}>
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

// ── Root component ────────────────────────────────────────────────
export function RightPanel({ state, store, onDownload, onSaveToDrive, onOpenCropLayer, mobileActive }: RightPanelProps) {
  const selLayer = state.layoutMode === 'custom'
    ? (state.layers.find(l => l.id === state.selectedLayerId) ?? null)
    : null;

  return (
    <aside id="right-panel" className={mobileActive ? 'mob-active' : undefined}>
      <div className="rp-body">

        {/* ── Layer inspector (only in Canvas mode when a layer is selected) ── */}
        {selLayer?.type === 'text' && (
          <TextLayerProps layer={selLayer as TextLayer} store={store} />
        )}
        {selLayer?.type === 'image' && (
          <ImageLayerProps layer={selLayer as ImageLayer} store={store} onOpenCropLayer={onOpenCropLayer} />
        )}

        {/* ── Canvas info ── */}
        <section className="rp-sec">
          <div className="rp-sec-title">Canvas</div>
          <div className="rp-canvas-info">
            <span className="rp-info-chip">1000 × 1500 px</span>
            <span className="rp-info-chip rp-info-mode">
              {state.layoutMode === 'two' ? 'Compare' : state.layoutMode === 'one' ? 'Single' : 'Canvas'}
            </span>
          </div>
        </section>

        {/* ── Background ── */}
        <CanvasProps state={state} store={store} />

      </div>

      {/* ── Export — always pinned at bottom ── */}
      <ExportSection state={state} store={store} onDownload={onDownload} onSaveToDrive={onSaveToDrive} />
    </aside>
  );
}
