// ============================================================
//  Core editor types — replaces the state scattered across app.js
// ============================================================

export type LayoutMode  = 'two' | 'one' | 'custom';
export type ExportMode  = '1x' | '2x' | 'jpg';
export type BgType      = 'solid' | 'gradient';
export type TextAlign   = 'left' | 'center' | 'right';
export type ImageTarget = 'top' | 'bottom' | 'single';

export interface ImageSlot {
  src:      string | null;
  zoom:     number;   // 50–300
  posX:     number;   // 0–100
  posY:     number;   // 0–100
  bright:   number;   // 50–150
  contrast: number;   // 50–150
}

export interface LabelSlot {
  text:     string;
  color:    string;  // hex
  fontSize: number;  // px
}

export interface BgState {
  type:    BgType;
  solid:   string;
  gradC1:  string;
  gradC2:  string;
  gradDir: string;
}

export interface SwirlState {
  visible: boolean;
  design:  number;  // 0-5
  color:   string;
  opacity: number;  // 10-100
}

// Custom-canvas layer types
export interface TextLayer {
  type:          'text';
  id:            string;
  text:          string;
  x:             number;
  y:             number;
  fontSize:      number;
  color:         string;
  fontFamily:    string;
  fontWeight:    string;
  fontStyle:     string;
  letterSpacing: number;
  align:         TextAlign;
  opacity:       number;
  width:         number;
  textShadow:    string;
}

export interface ImageLayer {
  type:    'image';
  id:      string;
  src:     string;
  x:       number;
  y:       number;
  width:   number;
  height:  number;
  opacity: number;
}

export type Layer = TextLayer | ImageLayer;

export interface TwoLabels {
  topEye:   LabelSlot;
  topBrand: LabelSlot;
  topModel: LabelSlot;
  topPrice: LabelSlot;
  botEye:   LabelSlot;
  botBrand: LabelSlot;
  botModel: LabelSlot;
  botPrice: LabelSlot;
  botTag:   LabelSlot;
}

export interface OneLabels {
  eye:   LabelSlot;
  brand: LabelSlot;
  model: LabelSlot;
  price: LabelSlot;
}

export interface EditorState {
  layoutMode:    LayoutMode;
  darkTheme:     boolean;
  exportMode:    ExportMode;
  bg:            BgState;
  images:        Record<ImageTarget, ImageSlot>;
  twoLabels:     TwoLabels;
  oneLabels:     OneLabels;
  singleAlign:   TextAlign;
  swirl:         SwirlState;
  layers:        Layer[];
  nextLayerId:   number;
  selectedLayerId: string | null;
}

// Crop-tool state (not persisted)
export interface CropRect { x: number; y: number; w: number; h: number }

export const DEFAULT_IMAGE_SLOT: ImageSlot = {
  src: null, zoom: 100, posX: 50, posY: 50, bright: 100, contrast: 100,
};

export const DEFAULT_STATE: EditorState = {
  layoutMode:  'two',
  darkTheme:   false,
  exportMode:  '2x',
  bg: { type: 'solid', solid: '#ffffff', gradC1: '#1a1e2e', gradC2: '#4a3020', gradDir: 'to bottom' },
  images: {
    top:    { ...DEFAULT_IMAGE_SLOT },
    bottom: { ...DEFAULT_IMAGE_SLOT },
    single: { ...DEFAULT_IMAGE_SLOT },
  },
  twoLabels: {
    topEye:   { text: 'Category / Tag',       color: '#b0a898', fontSize: 11 },
    topBrand: { text: 'Item A',               color: '#1a1814', fontSize: 50 },
    topModel: { text: 'Model or Subtitle',    color: '#7a7060', fontSize: 17 },
    topPrice: { text: '$0,000',               color: '#5a5248', fontSize: 15 },
    botEye:   { text: 'Compare With',         color: '#b0a898', fontSize: 11 },
    botBrand: { text: 'Item B',               color: '#1a1814', fontSize: 42 },
    botModel: { text: 'Model or Subtitle',    color: '#7a7060', fontSize: 17 },
    botPrice: { text: '$0,000',               color: '#2a6640', fontSize: 42 },
    botTag:   { text: 'Caption or tagline',   color: '#aaa098', fontSize: 11 },
  },
  oneLabels: {
    eye:   { text: 'Category',   color: '#a09890', fontSize: 11 },
    brand: { text: 'Item Name',  color: '#1a1814', fontSize: 72 },
    model: { text: 'Subtitle',   color: '#7a7060', fontSize: 22 },
    price: { text: '$0,000',     color: '#5a5248', fontSize: 20 },
  },
  singleAlign:     'left',
  swirl:           { visible: true, design: 0, color: '#4a4030', opacity: 85 },
  layers:          [],
  nextLayerId:     1,
  selectedLayerId: null,
};
