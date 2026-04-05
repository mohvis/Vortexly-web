'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  BgState, EditorState, ExportMode, ImageSlot, ImageTarget,
  Layer, LayoutMode, OneLabels, SwirlState, TextAlign, TextLayer,
  ImageLayer, TwoLabels,
} from '@/types/editor';
import { DEFAULT_IMAGE_SLOT, DEFAULT_STATE } from '@/types/editor';

const LS_KEY = 'watchpin_state_v4';
const SAVE_DEBOUNCE_MS = 500;
const CLOUD_DEBOUNCE_MS = 2000;

// ── Persist helpers ───────────────────────────────────────────────
function saveToStorage(s: EditorState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota / SSR */ }
}

function loadFromStorage(): EditorState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    const s = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...s,
      bg:        { ...DEFAULT_STATE.bg,        ...s.bg },
      images: {
        top:    { ...DEFAULT_IMAGE_SLOT, ...s.images?.top },
        bottom: { ...DEFAULT_IMAGE_SLOT, ...s.images?.bottom },
        single: { ...DEFAULT_IMAGE_SLOT, ...s.images?.single },
      },
      twoLabels: { ...DEFAULT_STATE.twoLabels, ...s.twoLabels },
      oneLabels: { ...DEFAULT_STATE.oneLabels, ...s.oneLabels },
      swirl:     { ...DEFAULT_STATE.swirl,     ...s.swirl },
      // backward compat: old key was 'textLayers'
      layers: Array.isArray(s.layers) ? s.layers
            : Array.isArray(s.textLayers) ? s.textLayers.map((l: Layer) => ({ ...l, type: l.type ?? 'text' }))
            : [],
      nextLayerId: s.nextLayerId ?? 1,
    } as EditorState;
  } catch { return DEFAULT_STATE; }
}

// ── Cloud helpers ─────────────────────────────────────────────────
async function loadFromCloud(): Promise<EditorState | null> {
  try {
    const { data: { session } } = await createClient().auth.getSession();
    const token = session?.access_token;
    const res = await fetch('/api/editor/state', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.state) return null;
    const s = json.state;
    return {
      ...DEFAULT_STATE,
      ...s,
      bg:        { ...DEFAULT_STATE.bg,        ...s.bg },
      images: {
        top:    { ...DEFAULT_IMAGE_SLOT, ...s.images?.top },
        bottom: { ...DEFAULT_IMAGE_SLOT, ...s.images?.bottom },
        single: { ...DEFAULT_IMAGE_SLOT, ...s.images?.single },
      },
      twoLabels: { ...DEFAULT_STATE.twoLabels, ...s.twoLabels },
      oneLabels: { ...DEFAULT_STATE.oneLabels, ...s.oneLabels },
      swirl:     { ...DEFAULT_STATE.swirl,     ...s.swirl },
      layers: Array.isArray(s.layers) ? s.layers : [],
      nextLayerId: s.nextLayerId ?? 1,
    } as EditorState;
  } catch { return null; }
}

async function saveToCloud(s: EditorState): Promise<void> {
  try {
    const { data: { session } } = await createClient().auth.getSession();
    const token = session?.access_token;
    await fetch('/api/editor/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(s),
    });
  } catch { /* network error — silently skip */ }
}

// ── Hook ──────────────────────────────────────────────────────────
export function useEditorState() {
  // Always start with DEFAULT_STATE so server and client render the same HTML.
  // localStorage restore happens in a useEffect below to avoid hydration mismatch.
  const [state, setState] = useState<EditorState>(DEFAULT_STATE);

  // Track whether user is authenticated (determines cloud sync)
  const isAuthRef    = useRef<boolean | null>(null);
  const hydratedRef  = useRef(false);  // true once localStorage has been restored
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [driveConnected, setDriveConnected] = useState<boolean>(false);

  // Debounced localStorage + cloud save (skipped until hydrated)
  const lsTimerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!hydratedRef.current) return;  // don't save DEFAULT_STATE over real data

    // Debounce localStorage write — avoids saving on every keystroke
    clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => saveToStorage(state), SAVE_DEBOUNCE_MS);

    // Debounce cloud save — only for authenticated users
    if (isAuthRef.current === true) {
      clearTimeout(cloudTimerRef.current);
      cloudTimerRef.current = setTimeout(() => saveToCloud(state), CLOUD_DEBOUNCE_MS);
    }

    return () => {
      clearTimeout(lsTimerRef.current);
      clearTimeout(cloudTimerRef.current);
    };
  }, [state]);

  // On mount: restore localStorage first, then check auth + cloud in parallel.
  // Auth is determined by /api/drive/status (authenticated field), NOT by
  // whether cloud state exists — a new user may be logged in with no saved state.
  useEffect(() => {
    let cancelled = false;

    // Immediately restore persisted local state — runs after hydration so no mismatch
    const stored = loadFromStorage();
    setState(stored);
    hydratedRef.current = true;

    type StatusRes = { connected: boolean; authenticated: boolean };

    Promise.all([
      fetch('/api/drive/status')
        .then(r => r.ok ? (r.json() as Promise<StatusRes>) : { connected: false, authenticated: false })
        .catch((): StatusRes => ({ connected: false, authenticated: false })),
      loadFromCloud(),
    ]).then(async ([status, cloudState]) => {
      if (cancelled) return;
      const authenticated = !!status.authenticated;
      let connected = !!status.connected;
      isAuthRef.current = authenticated;
      setIsAuth(authenticated);

      // ── Client-side token fallback: the server-side PKCE exchangeCodeForSession
      // does not expose provider_token, so read it from the browser session and
      // persist to drive_tokens if it hasn't been saved yet.
      if (authenticated && !connected) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
          const saved = await fetch('/api/drive/save-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              access_token:  session.provider_token,
              refresh_token: session.provider_refresh_token ?? null,
            }),
          }).then(r => r.ok).catch(() => false);
          if (saved) connected = true;
        }
      }

      setDriveConnected(connected);
      if (cloudState) {
        setState(cloudState);
        saveToStorage(cloudState);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // ── Toast ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const [exporting, setExportingState] = useState(false);
  const setExporting = useCallback((v: boolean) => { setExportingState(v); }, []);

  // ── Layout / global ───────────────────────────────────────────
  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setState(p => ({ ...p, layoutMode: mode, selectedLayerId: null }));
  }, []);

  const toggleDarkTheme = useCallback(() => {
    setState(p => ({ ...p, darkTheme: !p.darkTheme }));
  }, []);

  const setExportMode = useCallback((mode: ExportMode) => {
    setState(p => ({ ...p, exportMode: mode }));
  }, []);

  // ── Background ────────────────────────────────────────────────
  const setBg = useCallback((updates: Partial<BgState>) => {
    setState(p => ({ ...p, bg: { ...p.bg, ...updates } }));
  }, []);

  // ── Images ────────────────────────────────────────────────────
  const setImage = useCallback((target: ImageTarget, updates: Partial<ImageSlot>) => {
    setState(p => ({
      ...p,
      images: { ...p.images, [target]: { ...p.images[target], ...updates } },
    }));
  }, []);

  const loadImage = useCallback((target: ImageTarget, src: string) => {
    setState(p => ({
      ...p,
      images: { ...p.images, [target]: { ...p.images[target], src } },
    }));
  }, []);

  const removeImage = useCallback((target: ImageTarget) => {
    setState(p => ({
      ...p,
      images: { ...p.images, [target]: { ...DEFAULT_IMAGE_SLOT } },
    }));
    showToast('Image removed');
  }, [showToast]);

  // ── 2-image labels ────────────────────────────────────────────
  const setTwoLabel = useCallback((key: keyof TwoLabels, updates: Partial<{ text: string; color: string; fontSize: number }>) => {
    setState(p => ({
      ...p,
      twoLabels: { ...p.twoLabels, [key]: { ...p.twoLabels[key], ...updates } },
    }));
  }, []);

  // ── 1-image labels ────────────────────────────────────────────
  const setOneLabel = useCallback((key: keyof OneLabels, updates: Partial<{ text: string; color: string; fontSize: number }>) => {
    setState(p => ({
      ...p,
      oneLabels: { ...p.oneLabels, [key]: { ...p.oneLabels[key], ...updates } },
    }));
  }, []);

  const setSingleAlign = useCallback((align: TextAlign) => {
    setState(p => ({ ...p, singleAlign: align }));
  }, []);

  // ── Swirl ─────────────────────────────────────────────────────
  const setSwirl = useCallback((updates: Partial<SwirlState>) => {
    setState(p => ({ ...p, swirl: { ...p.swirl, ...updates } }));
  }, []);

  // ── Custom layers ─────────────────────────────────────────────
  const addTextLayer = useCallback((props: Partial<TextLayer> = {}) => {
    setState(p => {
      const id     = 'tl' + p.nextLayerId;
      const offset = p.layers.length * 60;
      const layer: TextLayer = {
        type: 'text', id,
        text:          props.text          ?? 'Your Text Here',
        x:             props.x             ?? 80,
        y:             props.y             ?? 200 + offset,
        fontSize:      props.fontSize      ?? 72,
        color:         props.color         ?? '#ffffff',
        fontFamily:    props.fontFamily    ?? 'Bodoni Moda',
        fontWeight:    props.fontWeight    ?? '700',
        fontStyle:     props.fontStyle     ?? 'normal',
        letterSpacing: props.letterSpacing ?? 0,
        align:         props.align         ?? 'left',
        opacity:       props.opacity       ?? 100,
        width:         props.width         ?? 840,
        textShadow:    props.textShadow    ?? '',
      };
      return { ...p, layers: [...p.layers, layer], nextLayerId: p.nextLayerId + 1, selectedLayerId: id };
    });
  }, []);

  const addImageLayer = useCallback((src: string) => {
    setState(p => {
      const id     = 'tl' + p.nextLayerId;
      const offset = p.layers.filter(l => l.type === 'image').length * 24;
      const layer: ImageLayer = {
        type: 'image', id, src,
        x: 80 + offset, y: 80 + offset,
        width: 500, height: 500, opacity: 100,
      };
      return { ...p, layers: [...p.layers, layer], nextLayerId: p.nextLayerId + 1, selectedLayerId: id };
    });
    showToast('Image layer added');
  }, [showToast]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setState(p => ({
      ...p,
      layers: p.layers.map(l => l.id === id ? { ...l, ...updates } as Layer : l),
    }));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setState(p => ({
      ...p,
      layers: p.layers.filter(l => l.id !== id),
      selectedLayerId: p.selectedLayerId === id ? null : p.selectedLayerId,
    }));
  }, []);

  const selectLayer = useCallback((id: string | null) => {
    setState(p => ({ ...p, selectedLayerId: id }));
  }, []);

  const clearDriveConnection = useCallback(() => {
    setDriveConnected(false);
  }, []);

  return {
    state,
    isAuth,
    driveConnected,
    toast, showToast,
    exporting, setExporting,
    // actions
    setLayoutMode,
    toggleDarkTheme,
    setExportMode,
    setBg,
    setImage,
    loadImage,
    removeImage,
    setTwoLabel,
    setOneLabel,
    setSingleAlign,
    setSwirl,
    addTextLayer,
    addImageLayer,
    updateLayer,
    removeLayer,
    selectLayer,
    clearDriveConnection,
  };
}

export type EditorStore = ReturnType<typeof useEditorState>;
