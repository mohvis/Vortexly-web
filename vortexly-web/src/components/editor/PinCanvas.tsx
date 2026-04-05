'use client';
import React, { CSSProperties, forwardRef, useEffect, useRef } from 'react';
import type { EditorState, ImageSlot, ImageTarget, Layer, TextLayer, ImageLayer } from '@/types/editor';

// ── Swirl SVG inner paths ─────────────────────────────────────────
const SWIRL_PATHS = [
  `<path d="M 42 18 C 28 4, 10 12, 18 28 C 24 40, 42 38, 48 28 C 54 18, 46 8, 38 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <path d="M 44 30 C 60 50, 80 70, 98 100" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="6 4"/>
   <path d="M 86 96 L 98 100 L 92 88" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 18 15 C 50 8, 108 35, 105 100" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <path d="M 93 92 L 105 100 L 108 88" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 38 20 C 20 10, 12 28, 24 34 C 36 40, 50 30, 46 16 C 42 5, 28 7, 26 18 C 55 50, 80 78, 100 105" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
   <path d="M 88 98 L 100 105 L 104 92" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 20 20 C 20 50, 80 55, 80 85" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <circle cx="20" cy="20" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
   <path d="M 68 80 L 80 85 L 80 72" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 30 15 C 14 15, 8 30, 20 35 C 32 40, 44 30, 42 18 C 40 8, 28 8, 26 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
   <path d="M 38 22 C 58 44, 80 68, 100 96" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
   <path d="M 88 90 L 100 96 L 96 83" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  `<path d="M 60 18 C 85 18, 100 35, 100 58 C 100 83, 80 98, 58 94 C 36 90, 22 72, 28 52 C 34 35, 52 28, 62 40 C 70 50, 64 64, 54 62" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
   <path d="M 42 56 L 54 62 L 54 49" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
];

// ── Helpers ───────────────────────────────────────────────────────
function cardStyle(slot: ImageSlot): CSSProperties {
  return {
    backgroundImage:    slot.src ? `url('${slot.src}')` : undefined,
    backgroundSize:     `${slot.zoom}%`,
    backgroundPosition: `${slot.posX}% ${slot.posY}%`,
    filter:             `brightness(${slot.bright}%) contrast(${slot.contrast}%)`,
  };
}

function canvasBg(s: EditorState): CSSProperties {
  return s.bg.type === 'solid'
    ? { background: s.bg.solid }
    : { background: `linear-gradient(${s.bg.gradDir}, ${s.bg.gradC1}, ${s.bg.gradC2})` };
}

// ── Placeholder SVGs ──────────────────────────────────────────────
function TopPlaceholder() {
  return (
    <div className="cph">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <rect width="72" height="72" rx="14" fill="#ece8e2"/>
        <path d="M12 50l14-18 11 13 7-9 14 14H12z" fill="#d8d0c6"/>
        <circle cx="50" cy="24" r="7" fill="#d8d0c6"/>
      </svg>
      <p>Top Brand<br/>Image</p>
    </div>
  );
}
function BottomPlaceholder() {
  return (
    <div className="cph">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <rect width="72" height="72" rx="14" fill="#dce8d8"/>
        <path d="M12 50l14-18 11 13 7-9 14 14H12z" fill="#c0d4bc"/>
        <circle cx="50" cy="24" r="7" fill="#c0d4bc"/>
      </svg>
      <p>Your Brand<br/>Image</p>
    </div>
  );
}
function SinglePlaceholder() {
  return (
    <div className="cph">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <rect width="72" height="72" rx="14" fill="#dde5f0"/>
        <path d="M12 50l14-18 11 13 7-9 14 14H12z" fill="#b8c8e0"/>
        <circle cx="50" cy="24" r="7" fill="#b8c8e0"/>
      </svg>
      <p>Drop an Image<br/>to fill the card</p>
    </div>
  );
}

// ── Drag / resize state for custom layers ─────────────────────────
interface DragState {
  kind:        'move' | 'resize';
  layerId:     string;
  startX:      number;
  startY:      number;
  origX:       number;
  origY:       number;
  origW:       number;
  origH:       number;
  handlePos?:  string;
}

interface PinCanvasProps {
  state:         EditorState;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onOpenCrop:    (target: ImageTarget) => void;   // 'top'|'bottom'|'single' or '__layer:id'
  /** Scale factor computed by parent */
  scale:         number;
}

// Exported with forwardRef so the parent can target it for html2canvas
export const PinCanvas = forwardRef<HTMLDivElement, PinCanvasProps>(
  function PinCanvas({ state, onSelectLayer, onUpdateLayer, onOpenCrop, scale }, ref) {

    const dragRef = useRef<DragState | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ── Custom layer pointer events ─────────────────────────────
    function clientToCanvas(cx: number, cy: number) {
      const el = wrapperRef.current;
      if (!el) return { x: cx, y: cy };
      const r = el.getBoundingClientRect();
      return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
    }

    function onLayerPointerDown(e: React.PointerEvent, id: string) {
      if ((e.target as HTMLElement).classList.contains('cv-handle')) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      onSelectLayer(id);
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return;
      const pos = clientToCanvas(e.clientX, e.clientY);
      dragRef.current = {
        kind: 'move', layerId: id,
        startX: pos.x, startY: pos.y,
        origX: layer.x, origY: layer.y,
        origW: layer.width, origH: (layer as ImageLayer).height ?? 400,
      };
    }

    function onHandlePointerDown(e: React.PointerEvent, id: string, handlePos: string) {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const layer = state.layers.find(l => l.id === id);
      if (!layer) return;
      const pos = clientToCanvas(e.clientX, e.clientY);
      dragRef.current = {
        kind: 'resize', layerId: id, handlePos,
        startX: pos.x, startY: pos.y,
        origX: layer.x, origY: layer.y,
        origW: layer.width, origH: (layer as ImageLayer).height ?? 400,
      };
    }

    function onCanvasPointerMove(e: React.PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const pos  = clientToCanvas(e.clientX, e.clientY);
      const dx   = pos.x - d.startX;
      const dy   = pos.y - d.startY;

      if (d.kind === 'move') {
        onUpdateLayer(d.layerId, { x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) });
      } else {
        const h = d.handlePos ?? 'r';
        let nx = d.origX, ny = d.origY, nw = d.origW, nh = d.origH;
        if (h.includes('r'))  nw = Math.max(80,  Math.round(d.origW  + dx));
        if (h.includes('l')) { nx = Math.round(d.origX + dx); nw = Math.max(80, Math.round(d.origW - dx)); }
        if (h.includes('b'))  nh = Math.max(50,  Math.round(d.origH  + dy));
        if (h.includes('t')) { ny = Math.round(d.origY + dy); nh = Math.max(50, Math.round(d.origH - dy)); }
        onUpdateLayer(d.layerId, { x: nx, y: ny, width: nw, height: nh });
      }
    }

    function onCanvasPointerUp() { dragRef.current = null; }

    // ── Render layer ────────────────────────────────────────────
    function renderLayer(layer: Layer) {
      const isSelected = layer.id === state.selectedLayerId;
      const handles    = (layer.type === 'image')
        ? ['tl','tr','bl','br','r'] : ['r'];

      if (layer.type === 'image') {
        const il = layer as ImageLayer;
        return (
          <div
            key={il.id}
            className={`img-layer${isSelected ? ' tl-selected' : ''}`}
            data-lid={il.id}
            style={{
              left: il.x + 'px', top: il.y + 'px',
              width: il.width + 'px', height: il.height + 'px',
              backgroundImage: `url('${il.src}')`,
              opacity: il.opacity / 100,
            }}
            onPointerDown={e => onLayerPointerDown(e, il.id)}
          >
            {isSelected && handles.map(h => (
              <div
                key={h}
                className={`cv-handle cv-${h}`}
                data-hpos={h}
                onPointerDown={e => onHandlePointerDown(e, il.id, h)}
              />
            ))}
          </div>
        );
      }

      const tl = layer as TextLayer;
      return (
        <div
          key={tl.id}
          className={`txt-layer${isSelected ? ' tl-selected' : ''}`}
          data-lid={tl.id}
          style={{
            left:          tl.x + 'px',
            top:           tl.y + 'px',
            width:         tl.width + 'px',
            fontSize:      tl.fontSize + 'px',
            color:         tl.color,
            fontFamily:    tl.fontFamily + ',Georgia,serif',
            fontWeight:    tl.fontWeight,
            fontStyle:     tl.fontStyle,
            letterSpacing: tl.letterSpacing + 'px',
            textAlign:     tl.align,
            opacity:       tl.opacity / 100,
            textShadow:    tl.textShadow || undefined,
          }}
          onPointerDown={e => onLayerPointerDown(e, tl.id)}
        >
          {tl.text}
          {isSelected && handles.map(h => (
            <div
              key={h}
              className={`cv-handle cv-${h}`}
              data-hpos={h}
              onPointerDown={e => onHandlePointerDown(e, tl.id, h)}
            />
          ))}
        </div>
      );
    }

    const { twoLabels: tl, oneLabels: ol, swirl, images: img } = state;

    return (
      <div
        ref={wrapperRef}
        id="canvas-scaler"
        style={{ transformOrigin: 'center center', transform: `scale(${scale})`, width: 1000, height: 1500 }}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
      >
        {/* The actual exportable element */}
        <div id="pin-canvas" ref={ref} style={canvasBg(state)}
          onClick={e => { if (!(e.target as HTMLElement).closest('.txt-layer,.img-layer')) onSelectLayer(null); }}
        >
          {/* ── TWO-IMAGE LAYOUT ── */}
          <div id="layout-two" style={{ display: state.layoutMode === 'two' ? '' : 'none' }}>
            <div className="card" id="card-top" style={cardStyle(img.top)}>
              {!img.top.src && <TopPlaceholder />}
            </div>
            <div className="label-top">
              <div className="txt-eye"   style={{ color: tl.topEye.color,   fontSize: tl.topEye.fontSize   + 'px' }}>{tl.topEye.text}</div>
              <div className="txt-brand" style={{ color: tl.topBrand.color, fontSize: tl.topBrand.fontSize + 'px' }}>{tl.topBrand.text}</div>
              <div className="txt-div"></div>
              <div className="txt-model" style={{ color: tl.topModel.color, fontSize: tl.topModel.fontSize + 'px' }}>{tl.topModel.text}</div>
              <div className="txt-price" style={{ color: tl.topPrice.color, fontSize: tl.topPrice.fontSize + 'px' }}>{tl.topPrice.text}</div>
            </div>
            {swirl.visible && (
              <svg
                id="swirl-svg" className="swirl"
                viewBox="0 0 120 120" width="150" height="150" fill="none"
                style={{ color: swirl.color, opacity: swirl.opacity / 100 }}
                dangerouslySetInnerHTML={{ __html: SWIRL_PATHS[swirl.design] ?? SWIRL_PATHS[0] }}
              />
            )}
            <div className="label-bottom">
              <div className="txt-eye"   style={{ color: tl.botEye.color,   fontSize: tl.botEye.fontSize   + 'px' }}>{tl.botEye.text}</div>
              <div className="txt-brand" style={{ color: tl.botBrand.color, fontSize: tl.botBrand.fontSize + 'px' }}>{tl.botBrand.text}</div>
              <div className="txt-div"></div>
              <div className="txt-model" style={{ color: tl.botModel.color, fontSize: tl.botModel.fontSize + 'px' }}>{tl.botModel.text}</div>
              <div className="txt-dupe"  style={{ color: tl.botPrice.color, fontSize: tl.botPrice.fontSize + 'px' }}>{tl.botPrice.text}</div>
              <div className="txt-tag"   style={{ color: tl.botTag.color,   fontSize: tl.botTag.fontSize   + 'px' }}>{tl.botTag.text}</div>
            </div>
            <div className="card" id="card-bottom" style={cardStyle(img.bottom)}>
              {!img.bottom.src && <BottomPlaceholder />}
            </div>
          </div>

          {/* ── ONE-IMAGE LAYOUT ── */}
          <div id="layout-single" style={{ display: state.layoutMode === 'one' ? '' : 'none' }}>
            <div id="card-single" className="card" style={cardStyle(img.single)}>
              {!img.single.src && <SinglePlaceholder />}
            </div>
            <div id="single-labels" style={{ textAlign: state.singleAlign }}>
              <div className="s-txt-eye"   style={{ color: ol.eye.color,   fontSize: ol.eye.fontSize   + 'px' }}>{ol.eye.text}</div>
              <div className="s-txt-brand" style={{ color: ol.brand.color, fontSize: ol.brand.fontSize + 'px' }}>{ol.brand.text}</div>
              <div className="s-txt-div" style={{ marginLeft: state.singleAlign === 'right' ? 'auto' : state.singleAlign === 'center' ? 'auto' : '0', marginRight: state.singleAlign === 'left' ? 'auto' : state.singleAlign === 'center' ? 'auto' : '0' }}></div>
              <div className="s-txt-model" style={{ color: ol.model.color, fontSize: ol.model.fontSize + 'px' }}>{ol.model.text}</div>
              <div className="s-txt-price" style={{ color: ol.price.color, fontSize: ol.price.fontSize + 'px' }}>{ol.price.text}</div>
            </div>
          </div>

          {/* ── CUSTOM LAYOUT ── */}
          <div id="layout-custom" style={{ display: state.layoutMode === 'custom' ? '' : 'none' }}>
            {state.layers.map(renderLayer)}
          </div>
        </div>{/* /pin-canvas */}
      </div>
    );
  }
);

PinCanvas.displayName = 'PinCanvas';
