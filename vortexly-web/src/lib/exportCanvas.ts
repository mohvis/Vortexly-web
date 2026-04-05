/**
 * exportCanvas.ts
 * Pure Canvas 2D renderer for the pin export.
 * Produces pixel-perfect output independent of html2canvas / DOM layout.
 */

import type { EditorState, ImageSlot, TextLayer, ImageLayer } from '@/types/editor';

const W = 1000;
const H = 1500;

// ── Image loading helpers ─────────────────────────────────────────────────────

const IMG_CACHE = new Map<string, HTMLImageElement>();

function loadImg(src: string): Promise<HTMLImageElement> {
  if (IMG_CACHE.has(src)) return Promise.resolve(IMG_CACHE.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { IMG_CACHE.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Draw a card image with zoom/posX/posY/brightness/contrast clipped to a rect ──

function drawCardImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: ImageSlot,
  x: number, y: number, w: number, h: number,
  radius: number,
) {
  ctx.save();
  // Rounded-rect clip
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  // Apply brightness / contrast via CSS filter on an offscreen canvas
  const off = document.createElement('canvas');
  off.width  = w;
  off.height = h;
  const oc = off.getContext('2d')!;
  oc.filter = `brightness(${slot.bright}%) contrast(${slot.contrast}%)`;

  // Mimic background-size: zoom%; background-position: posX% posY%
  const zoom   = slot.zoom / 100;
  const imgW   = img.naturalWidth  * zoom * (w / img.naturalWidth);
  const imgH   = img.naturalHeight * zoom * (h / img.naturalHeight);
  // background-size relative to the container
  const scaledW = w * zoom;
  const scaledH = scaledW * (img.naturalHeight / img.naturalWidth);
  const ox = (slot.posX / 100) * (w  - scaledW);
  const oy = (slot.posY / 100) * (h  - scaledH);
  oc.drawImage(img, ox, oy, scaledW, scaledH);

  ctx.drawImage(off, x, y);
  ctx.restore();
  void imgW; void imgH; // suppress unused
}

// ── Wrap text to fit width, return lines ─────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

// ── Draw label block, return the Y cursor after drawing ──────────────────────

interface LabelBlock {
  eye?:   { text: string; color: string; fontSize: number };
  brand?: { text: string; color: string; fontSize: number };
  divider?: boolean;
  model?: { text: string; color: string; fontSize: number };
  price?: { text: string; color: string; fontSize: number };
  dupe?:  { text: string; color: string; fontSize: number };
  tag?:   { text: string; color: string; fontSize: number };
}

function drawLabelBlock(
  ctx: CanvasRenderingContext2D,
  block: LabelBlock,
  startX: number,
  startY: number,
  maxW: number,
  align: CanvasTextAlign,
  anchorBottom: boolean,   // if true, startY is the BOTTOM of the block
) {
  // Pre-compute all lines so we know total height if anchored at bottom
  type Line = { text: string; font: string; color: string; size: number; marginBottom: number; isDivider?: boolean; isEye?: boolean };
  const lines: Line[] = [];

  if (block.eye?.text) {
    lines.push({ text: block.eye.text.toUpperCase(), font: `400 ${block.eye.fontSize}px "DM Sans"`, color: block.eye.color, size: block.eye.fontSize, marginBottom: 10, isEye: true });
  }
  if (block.brand?.text) {
    for (const para of block.brand.text.split('\n')) {
      ctx.font = `700 ${block.brand.fontSize}px "Bodoni Moda"`;
      const paraLines = wrapText(ctx, para, maxW);
      for (let i = 0; i < paraLines.length; i++) {
        lines.push({ text: paraLines[i], font: `700 ${block.brand.fontSize}px "Bodoni Moda"`, color: block.brand.color, size: block.brand.fontSize, marginBottom: i === paraLines.length - 1 ? 6 : 0 });
      }
    }
  }
  if (block.divider) {
    lines.push({ text: '', font: '', color: '', size: 1, marginBottom: 12, isDivider: true });
  }
  if (block.model?.text) {
    lines.push({ text: block.model.text, font: `italic 400 ${block.model.fontSize}px "Bodoni Moda"`, color: block.model.color, size: block.model.fontSize, marginBottom: 14 });
  }
  if (block.price?.text) {
    lines.push({ text: block.price.text, font: `500 ${block.price.fontSize}px "DM Sans"`, color: block.price.color, size: block.price.fontSize, marginBottom: 0 });
  }
  if (block.dupe?.text) {
    for (const para of block.dupe.text.split('\n')) {
      ctx.font = `600 ${block.dupe.fontSize}px "Bodoni Moda"`;
      const paraLines = wrapText(ctx, para, maxW);
      for (let i = 0; i < paraLines.length; i++) {
        lines.push({ text: paraLines[i], font: `600 italic ${block.dupe.fontSize}px "Bodoni Moda"`, color: block.dupe.color, size: block.dupe.fontSize, marginBottom: i === paraLines.length - 1 ? 6 : 0 });
      }
    }
  }
  if (block.tag?.text) {
    lines.push({ text: block.tag.text.toUpperCase(), font: `300 ${block.tag.fontSize}px "DM Sans"`, color: block.tag.color, size: block.tag.fontSize, marginBottom: 0 });
  }

  if (lines.length === 0) return;

  // compute total height
  let totalH = 0;
  for (const l of lines) {
    totalH += l.isDivider ? (12 + l.marginBottom) : (l.size * 1.15 + l.marginBottom);
  }

  let y = anchorBottom ? startY - totalH : startY;
  ctx.textAlign  = align;
  ctx.textBaseline = 'top';

  const tx = align === 'right' ? startX + maxW : align === 'center' ? startX + maxW / 2 : startX;

  for (const l of lines) {
    if (l.isDivider) {
      const dw = 40;
      const dx = align === 'right' ? startX + maxW - dw : align === 'center' ? startX + maxW / 2 - dw / 2 : startX;
      ctx.save();
      ctx.strokeStyle = '#c8bfb0';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(dx, y + 6);
      ctx.lineTo(dx + dw, y + 6);
      ctx.stroke();
      ctx.restore();
      y += 12 + l.marginBottom;
      continue;
    }
    if (l.isEye) {
      // letter-spacing: 3.5px for eye text — draw char by char
      ctx.save();
      ctx.font      = l.font;
      ctx.fillStyle = l.color;
      const chars   = l.text.split('');
      const spacing = 3.5;
      const totalTW = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
      let cx = align === 'right' ? tx - totalTW : align === 'center' ? tx - totalTW / 2 : tx;
      ctx.textAlign = 'left';
      for (const ch of chars) {
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + spacing;
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.font      = l.font;
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, tx, y);
      ctx.restore();
    }
    y += l.size * 1.15 + l.marginBottom;
  }
}

// ── Swirl paths (exact same data as PinCanvas.tsx) ────────────────────────────

const SWIRL_D = [
  [
    { type: 'path', d: 'M42,18 C28,4 10,12 18,28 C24,40 42,38 48,28 C54,18 46,8 38,12', sw: 2.5, dash: [] },
    { type: 'path', d: 'M44,30 C60,50 80,70 98,100', sw: 2, dash: [6, 4] },
    { type: 'path', d: 'M86,96 L98,100 L92,88', sw: 2.5, dash: [] },
  ],
  [
    { type: 'path', d: 'M18,15 C50,8 108,35 105,100', sw: 2.5, dash: [] },
    { type: 'path', d: 'M93,92 L105,100 L108,88', sw: 2.5, dash: [] },
  ],
  [
    { type: 'path', d: 'M38,20 C20,10 12,28 24,34 C36,40 50,30 46,16 C42,5 28,7 26,18 C55,50 80,78 100,105', sw: 2, dash: [] },
    { type: 'path', d: 'M88,98 L100,105 L104,92', sw: 2, dash: [] },
  ],
  [
    { type: 'path', d: 'M20,20 C20,50 80,55 80,85', sw: 2.5, dash: [] },
    { type: 'circle', cx: 20, cy: 20, r: 7, sw: 2 },
    { type: 'path', d: 'M68,80 L80,85 L80,72', sw: 2.5, dash: [] },
  ],
  [
    { type: 'path', d: 'M30,15 C14,15 8,30 20,35 C32,40 44,30 42,18 C40,8 28,8 26,18', sw: 2, dash: [] },
    { type: 'path', d: 'M38,22 C58,44 80,68 100,96', sw: 1.8, dash: [] },
    { type: 'path', d: 'M88,90 L100,96 L96,83', sw: 2, dash: [] },
  ],
  [
    { type: 'path', d: 'M60,18 C85,18 100,35 100,58 C100,83 80,98 58,94 C36,90 22,72 28,52 C34,35 52,28 62,40 C70,50 64,64 54,62', sw: 2, dash: [] },
    { type: 'path', d: 'M42,56 L54,62 L54,49', sw: 2, dash: [] },
  ],
];

function parseSvgPath(d: string): { cmd: string; args: number[] }[] {
  const re = /([MmLlCcQqAaSsZz])([^MmLlCcQqAaSsZz]*)/g;
  const cmds: { cmd: string; args: number[] }[] = [];
  let m;
  while ((m = re.exec(d)) !== null) {
    cmds.push({ cmd: m[1], args: m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number) });
  }
  return cmds;
}

function applySvgPath(ctx: CanvasRenderingContext2D, d: string, scale: number) {
  const cmds = parseSvgPath(d);
  let cx = 0, cy = 0;
  ctx.beginPath();
  for (const { cmd, args } of cmds) {
    switch (cmd) {
      case 'M': ctx.moveTo(args[0] * scale, args[1] * scale); cx = args[0]; cy = args[1]; break;
      case 'L': ctx.lineTo(args[0] * scale, args[1] * scale); cx = args[0]; cy = args[1]; break;
      case 'C':
        ctx.bezierCurveTo(args[0]*scale, args[1]*scale, args[2]*scale, args[3]*scale, args[4]*scale, args[5]*scale);
        cx = args[4]; cy = args[5]; break;
      case 'Z': ctx.closePath(); break;
      default: break;
    }
    void cx; void cy;
  }
}

function drawSwirl(
  ctx: CanvasRenderingContext2D,
  design: number,
  color: string,
  opacity: number,
  x: number, y: number, size: number,
) {
  const scale = size / 120;
  const paths = SWIRL_D[design] ?? SWIRL_D[0];
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opacity / 100;
  ctx.strokeStyle = color;
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';
  for (const p of paths) {
    if (p.type === 'path') {
      ctx.setLineDash(p.dash as number[]);
      ctx.lineWidth = (p.sw as number) * scale * 1.2;
      applySvgPath(ctx, p.d as string, scale);
      ctx.stroke();
    } else if (p.type === 'circle' && 'cx' in p) {
      ctx.setLineDash([]);
      ctx.lineWidth = (p.sw as number) * scale * 1.2;
      ctx.beginPath();
      ctx.arc((p as {cx:number}).cx*scale, (p as {cy:number}).cy*scale, (p as {r:number}).r*scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Main export function ──────────────────────────────────────────────────────

export async function renderPinToCanvas(
  state: EditorState,
  pixelRatio = 2,
): Promise<HTMLCanvasElement> {
  const cw = W * pixelRatio;
  const ch = H * pixelRatio;
  const s  = pixelRatio;          // shorthand scale

  const cv  = document.createElement('canvas');
  cv.width  = cw;
  cv.height = ch;
  const ctx = cv.getContext('2d')!;
  ctx.scale(s, s);

  // ── Ensure fonts are loaded ──────────────────────────────────
  await document.fonts.ready;
  await Promise.allSettled([
    document.fonts.load('700 50px "Bodoni Moda"'),
    document.fonts.load('italic 400 17px "Bodoni Moda"'),
    document.fonts.load('600 italic 42px "Bodoni Moda"'),
    document.fonts.load('400 11px "DM Sans"'),
    document.fonts.load('500 15px "DM Sans"'),
    document.fonts.load('300 11px "DM Sans"'),
  ]);

  const { bg, images: img, twoLabels: tl, oneLabels: ol, swirl } = state;

  // ── Background ───────────────────────────────────────────────
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.solid;
    ctx.fillRect(0, 0, W, H);
  } else {
    const grad = ((): CanvasGradient => {
      const d = bg.gradDir;
      if (d === 'to bottom')       return ctx.createLinearGradient(0, 0, 0, H);
      if (d === 'to right')        return ctx.createLinearGradient(0, 0, W, 0);
      if (d === 'to bottom right') return ctx.createLinearGradient(0, 0, W, H);
      if (d === 'to bottom left')  return ctx.createLinearGradient(W, 0, 0, H);
      if (d === '135deg')          return ctx.createLinearGradient(0, 0, W, H);
      if (d === '45deg')           return ctx.createLinearGradient(0, H, W, 0);
      return ctx.createLinearGradient(0, 0, 0, H);
    })();
    grad.addColorStop(0, bg.gradC1);
    grad.addColorStop(1, bg.gradC2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── TWO-IMAGE LAYOUT ─────────────────────────────────────────
  if (state.layoutMode === 'two') {
    // Top card: top:100, left:-20, w:560, h:650, radius: 0 0 32 0
    if (img.top.src) {
      const topImg = await loadImg(img.top.src);
      drawCardImage(ctx, topImg, img.top, -20, 100, 560, 650, 32);
    }
    // Bottom card: bottom:100→top=H-100-680=720, right:-20→left=W-590+20=430, w:590, h:680, radius: 32 0 0 0
    if (img.bottom.src) {
      const botImg = await loadImg(img.bottom.src);
      drawCardImage(ctx, botImg, img.bottom, W - 570, 720, 590, 680, 32);
    }

    // Top labels: top:335, right:48 → x = W-48-340=612, width:340
    drawLabelBlock(ctx,
      { eye: tl.topEye, brand: tl.topBrand, divider: true, model: tl.topModel, price: tl.topPrice },
      612, 335, 340, 'left', false,
    );

    // Swirl: top:690, left:425, size:150
    if (swirl.visible) {
      drawSwirl(ctx, swirl.design, swirl.color, swirl.opacity, 425, 690, 150);
    }

    // Bottom labels: bottom:335→topY=H-335-labelH. Use anchorBottom=true, y=H-335, x=48, width=340, right-aligned
    drawLabelBlock(ctx,
      { eye: tl.botEye, dupe: tl.botBrand, divider: true, model: tl.botModel, price: tl.botPrice, tag: tl.botTag },
      48, H - 335, 340, 'right', true,
    );
  }

  // ── ONE-IMAGE LAYOUT ─────────────────────────────────────────
  if (state.layoutMode === 'one') {
    // card-single: positioned via CSS as full-width card
    // From style.css it occupies most of the top half — replicate with a large card
    if (img.single.src) {
      const sImg = await loadImg(img.single.src);
      drawCardImage(ctx, sImg, img.single, 0, 0, W, 900, 0);
    }
    // single-labels block below
    const alignMap: Record<string, CanvasTextAlign> = { left: 'left', center: 'center', right: 'right' };
    const ta = alignMap[state.singleAlign] ?? 'left';
    const lx = ta === 'right' ? W - 80 : ta === 'center' ? 80 : 80;
    drawLabelBlock(ctx,
      { eye: ol.eye, brand: ol.brand, divider: true, model: ol.model, price: ol.price },
      lx, 940, W - 160, ta, false,
    );
  }

  // ── CUSTOM LAYOUT ────────────────────────────────────────────
  if (state.layoutMode === 'custom') {
    for (const layer of state.layers) {
      if (layer.type === 'image') {
        const il = layer as ImageLayer;
        if (!il.src) continue;
        try {
          const im = await loadImg(il.src);
          ctx.save();
          ctx.globalAlpha = il.opacity / 100;
          ctx.drawImage(im, il.x, il.y, il.width, il.height);
          ctx.restore();
        } catch { /* skip broken layer */ }
      } else {
        const tl2 = layer as TextLayer;
        ctx.save();
        ctx.globalAlpha   = tl2.opacity / 100;
        ctx.font          = `${tl2.fontStyle} ${tl2.fontWeight} ${tl2.fontSize}px "${tl2.fontFamily}"`;
        ctx.fillStyle     = tl2.color;
        ctx.textBaseline  = 'top';
        ctx.textAlign     = tl2.align;
        if (tl2.textShadow) {
          // simple parse: "0px 2px 4px #000" → shadowOffsetX/Y/blur/color
          const parts = tl2.textShadow.split(' ');
          if (parts.length >= 4) {
            ctx.shadowOffsetX = parseFloat(parts[0]);
            ctx.shadowOffsetY = parseFloat(parts[1]);
            ctx.shadowBlur    = parseFloat(parts[2]);
            ctx.shadowColor   = parts[3];
          }
        }
        const tx2 = tl2.align === 'right'  ? tl2.x + tl2.width
                   : tl2.align === 'center' ? tl2.x + tl2.width / 2
                   : tl2.x;
        // Draw with letter spacing
        if (tl2.letterSpacing) {
          let cx2 = tl2.align === 'right'  ? tx2 - ctx.measureText(tl2.text).width
                   : tl2.align === 'center' ? tx2 - ctx.measureText(tl2.text).width / 2
                   : tx2;
          ctx.textAlign = 'left';
          for (const ch of tl2.text.split('')) {
            ctx.fillText(ch, cx2, tl2.y);
            cx2 += ctx.measureText(ch).width + tl2.letterSpacing;
          }
        } else {
          ctx.fillText(tl2.text, tx2, tl2.y);
        }
        ctx.restore();
      }
    }
  }

  return cv;
}
