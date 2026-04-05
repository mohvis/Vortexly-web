'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CropRect } from '@/types/editor';

interface CropModalProps {
  open:    boolean;
  src:     string | null;
  onApply: (dataUrl: string) => void;
  onClose: () => void;
}

const HANDLE = 10;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function normRect(r: CropRect): CropRect {
  return { x: r.w < 0 ? r.x + r.w : r.x, y: r.h < 0 ? r.y + r.h : r.y, w: Math.abs(r.w), h: Math.abs(r.h) };
}

function getHitZone(cx: number, cy: number, rect: CropRect | null) {
  if (!rect) return 'draw';
  const { x, y, w, h } = rect;
  const g = HANDLE + 4;
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

const ZONE_CURSORS: Record<string, string> = {
  draw:'crosshair', move:'move',
  'resize-tl':'nw-resize','resize-tr':'ne-resize',
  'resize-bl':'sw-resize','resize-br':'se-resize',
  'resize-t':'n-resize','resize-b':'s-resize',
  'resize-l':'w-resize','resize-r':'e-resize',
};

export function CropModal({ open, src, onApply, onClose }: CropModalProps) {
  const imgRef    = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cropRect,    setCropRect]    = useState<CropRect | null>(null);
  const [displayW,    setDisplayW]    = useState(0);
  const [displayH,    setDisplayH]    = useState(0);
  const [displayScale,setDisplayScale]= useState(1);

  // Pointer state stored in refs (not React state – avoids re-renders on every move)
  const actionRef   = useRef<string | null>(null);
  const startRef    = useRef<{ x: number; y: number; orig: CropRect | null } | null>(null);
  const cropRectRef = useRef<CropRect | null>(null);

  // Keep cropRectRef in sync
  useEffect(() => { cropRectRef.current = cropRect; }, [cropRect]);

  // ── Draw overlay ────────────────────────────────────────────────
  const drawOverlay = useCallback((rect: CropRect | null) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const { width: cw, height: ch } = cv;
    ctx.clearRect(0, 0, cw, ch);
    if (!rect) return;
    const { x, y, w, h } = rect;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.clearRect(x, y, w, h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + w*i/3, y); ctx.lineTo(x + w*i/3, y+h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + h*i/3); ctx.lineTo(x+w, y + h*i/3); ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    [[x,y],[x+w-HANDLE,y],[x,y+h-HANDLE],[x+w-HANDLE,y+h-HANDLE]].forEach(([hx,hy]) => ctx.fillRect(hx,hy,HANDLE,HANDLE));
    const mx = x+w/2-HANDLE/2, my = y+h/2-HANDLE/2;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(mx, y, HANDLE, HANDLE/2); ctx.fillRect(mx, y+h-HANDLE/2, HANDLE, HANDLE/2);
    ctx.fillRect(x, my, HANDLE/2, HANDLE); ctx.fillRect(x+w-HANDLE/2, my, HANDLE/2, HANDLE);
    ctx.font = '11px DM Sans,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(Math.round(w/displayScale) + ' × ' + Math.round(h/displayScale) + 'px', x+6, y+h-7);
  }, [displayScale]);

  // Redraw whenever cropRect changes
  useEffect(() => { drawOverlay(cropRect); }, [cropRect, drawOverlay]);

  // ── Load image into modal ────────────────────────────────────────
  useEffect(() => {
    if (!open || !src) return;
    setCropRect(null);
    const img = imgRef.current;
    const cv  = canvasRef.current;
    if (!img || !cv) return;

    function setup() {
      if (!img || !cv) return;
      const maxW = window.innerWidth  * 0.92 - 36;
      const maxH = window.innerHeight * 0.94 - 120;
      const sc   = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
      const dw   = Math.round(img.naturalWidth  * sc);
      const dh   = Math.round(img.naturalHeight * sc);
      setDisplayW(dw); setDisplayH(dh); setDisplayScale(sc);
      img.style.width  = dw + 'px';
      img.style.height = dh + 'px';
      cv.width  = dw;
      cv.height = dh;
    }

    img.onload = () => requestAnimationFrame(setup);
    img.src = src;
    if (img.complete && img.naturalWidth) requestAnimationFrame(setup);
  }, [open, src]);

  // ── Canvas pointer handlers ──────────────────────────────────────
  function getPos(e: React.PointerEvent): { x: number; y: number } {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    const zone = getHitZone(x, y, cropRectRef.current);
    actionRef.current = zone;
    startRef.current  = { x, y, orig: cropRectRef.current ? { ...cropRectRef.current } : null };
    if (zone === 'draw') setCropRect({ x, y, w: 0, h: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    const { x, y } = getPos(e);
    (canvasRef.current as HTMLCanvasElement).style.cursor = ZONE_CURSORS[getHitZone(x, y, cropRectRef.current)] ?? 'crosshair';
    if (!actionRef.current || !startRef.current) return;
    const dx = x - startRef.current.x, dy = y - startRef.current.y;
    const orig = startRef.current.orig;
    const cw = canvasRef.current!.width, ch = canvasRef.current!.height;
    const action = actionRef.current;

    if (action === 'draw') {
      setCropRect(normRect({ x: startRef.current.x, y: startRef.current.y, w: dx, h: dy }));
    } else if (action === 'move' && orig) {
      setCropRect({ x: clamp(orig.x+dx, 0, cw-orig.w), y: clamp(orig.y+dy, 0, ch-orig.h), w: orig.w, h: orig.h });
    } else if (action.startsWith('resize') && orig) {
      let { x: rx, y: ry, w: rw, h: rh } = orig;
      if (action.includes('l')) { rx = clamp(orig.x+dx, 0, orig.x+orig.w-4); rw = orig.x+orig.w-rx; }
      if (action.includes('r')) rw = clamp(orig.w+dx, 4, cw-orig.x);
      if (action.includes('t')) { ry = clamp(orig.y+dy, 0, orig.y+orig.h-4); rh = orig.y+orig.h-ry; }
      if (action.includes('b')) rh = clamp(orig.h+dy, 4, ch-orig.y);
      setCropRect({ x: rx, y: ry, w: rw, h: rh });
    }
  }

  function onPointerUp() { actionRef.current = null; startRef.current = null; }

  // ── Apply crop ───────────────────────────────────────────────────
  const applyCrop = useCallback(async () => {
    const rect = cropRectRef.current;
    if (!rect || rect.w < 4 || rect.h < 4) return;
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const sx = Math.round(rect.x / displayScale);
    const sy = Math.round(rect.y / displayScale);
    const sw = Math.round(rect.w / displayScale);
    const sh = Math.round(rect.h / displayScale);
    const off = document.createElement('canvas');
    off.width = sw; off.height = sh;
    off.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    onApply(off.toDataURL('image/jpeg', 0.95));
  }, [displayScale, onApply]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter')  applyCrop();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, applyCrop]);

  if (!open) return null;

  return (
    <div id="crop-modal" className="open" role="dialog" aria-modal="true" aria-label="Crop image">
      <div id="crop-backdrop" onClick={onClose} />
      <div id="crop-container">
        <div id="crop-header">
          <span id="crop-title">Crop Image</span>
          <div id="crop-actions">
            <button className="cbtn cbtn-sec" onClick={() => setCropRect(null)}>Reset</button>
            <button className="cbtn cbtn-pri" onClick={applyCrop}>✓ Apply</button>
            <button className="cbtn cbtn-cls" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div id="crop-area">
          <div id="crop-img-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} id="crop-img" alt="Image to crop"
              style={{ display: 'block', width: displayW || undefined, height: displayH || undefined }} />
            <canvas ref={canvasRef} id="crop-canvas" aria-label="Crop selection area"
              style={{ position: 'absolute', top: 0, left: 0, width: displayW || undefined, height: displayH || undefined }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onDoubleClick={applyCrop}
            />
          </div>
        </div>
        <div id="crop-footer">Drag to select · Double-click to apply · Esc to cancel</div>
      </div>
    </div>
  );
}
