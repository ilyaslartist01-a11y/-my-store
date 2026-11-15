import { useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  Shirt,
  RotateCw,
  Trash2,
  AlignCenterHorizontal,
  ShoppingBag,
  Layers,
  FlipHorizontal2,
  Maximize2,
  SunMedium,
  Scissors,
  Undo2,
  Sparkles,
  Loader2,
  Plus,
  Pencil,
} from 'lucide-react';
import type {
  CurrencyCode,
  CustomDesignSpec,
  CustomGarmentType,
  GarmentSize,
  SiteDesignConfig,
  StudioGarmentColor,
} from '../types';
import {
  CustomGarmentSvg,
  renderCustomGarmentPreview,
  type StudioArtworkLayer,
} from './CustomGarmentSvg';
import {
  removeImageBackgroundHighAccuracy,
  removeSolidBackgroundPerceptual,
} from '../utils/removeImageBackground';

interface CustomStudioModalProps {
  isOpen: boolean;
  design: SiteDesignConfig;
  isOwnerAuthenticated?: boolean;
  onUpdateStudioColors?: (colors: StudioGarmentColor[]) => Promise<boolean>;
  onClose: () => void;
  onAddToCart: (item: {
    id: 'custom-tshirt' | 'custom-hoodie';
    title: string;
    size: GarmentSize;
    price: number;
    currency: CurrencyCode;
    customDesign: CustomDesignSpec;
  }) => void;
}

const DEFAULT_GARMENT_COLORS: StudioGarmentColor[] = [
  { name: 'أسود فاحم', hex: '#141518' },
  { name: 'عاجي ناصع', hex: '#EFECE6' },
  { name: 'رمادي دخاني', hex: '#3E424B' },
  { name: 'بيج رملي', hex: '#C8B89D' },
  { name: 'بني إسبريسو', hex: '#3B2B23' },
  { name: 'كحلي ليلي', hex: '#17223B' },
  { name: 'عنابي ملكي', hex: '#5A1E28' },
  { name: 'أخضر غامق', hex: '#18362B' },
];

const SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function getCustomGarmentPrice(
  garmentType: CustomGarmentType,
  currency: CurrencyCode
): number {
  if (currency === 'DZD') {
    return garmentType === 'hoodie' ? 6800 : 3800;
  }
  if (currency === 'EUR') {
    return garmentType === 'hoodie' ? 70 : 42;
  }
  return garmentType === 'hoodie' ? 75 : 45;
}

export function CustomStudioModal({
  isOpen,
  design,
  isOwnerAuthenticated = false,
  onUpdateStudioColors,
  onClose,
  onAddToCart,
}: CustomStudioModalProps) {
  const availableColors =
    Array.isArray(design.studioColors) && design.studioColors.length > 0
      ? design.studioColors
      : DEFAULT_GARMENT_COLORS;

  const [garmentType, setGarmentType] = useState<CustomGarmentType>('tshirt');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [colorHex, setColorHex] = useState<string>(availableColors[0].hex);
  const [colorName, setColorName] = useState<string>(availableColors[0].name);
  const [size, setSize] = useState<GarmentSize>('L');
  const [layers, setLayers] = useState<StudioArtworkLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [autoRemoveBgOnUpload, setAutoRemoveBgOnUpload] = useState(false);
  const [removingBgLayerId, setRemovingBgLayerId] = useState<string | null>(null);
  const [removingBgProgress, setRemovingBgProgress] = useState<number>(0);

  const [managingColors, setManagingColors] = useState(false);
  const [newColorHex, setNewColorHex] = useState('#2D4F4A');
  const [newColorName, setNewColorName] = useState('');
  const [savingColors, setSavingColors] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    layerId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const match = availableColors.find(
      (c) => c.hex.toLowerCase() === colorHex.toLowerCase()
    );
    if (!match && availableColors.length > 0) {
      setColorHex(availableColors[0].hex);
      setColorName(availableColors[0].name);
    }
  }, [availableColors, colorHex]);

  if (!isOpen) return null;

  const activeCurrency = design.defaultCurrency;
  const price = getCustomGarmentPrice(garmentType, activeCurrency);
  const visibleLayers = layers.filter((l) => l.side === side);
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;

  async function handleOwnerAddColor() {
    if (!onUpdateStudioColors) return;
    const cleanHex = newColorHex.trim().toUpperCase();
    const cleanName = newColorName.trim() || cleanHex;
    if (availableColors.some((c) => c.hex.toUpperCase() === cleanHex)) {
      return;
    }
    setSavingColors(true);
    try {
      const ok = await onUpdateStudioColors([
        ...availableColors,
        { name: cleanName, hex: cleanHex },
      ]);
      if (ok) {
        setNewColorName('');
        setColorHex(cleanHex);
        setColorName(cleanName);
      }
    } finally {
      setSavingColors(false);
    }
  }

  async function handleOwnerRemoveColor(hexToRemove: string) {
    if (!onUpdateStudioColors || availableColors.length <= 1) return;
    const nextColors = availableColors.filter(
      (c) => c.hex.toUpperCase() !== hexToRemove.toUpperCase()
    );
    if (nextColors.length === 0) return;
    setSavingColors(true);
    try {
      await onUpdateStudioColors(nextColors);
    } finally {
      setSavingColors(false);
    }
  }

  async function processHighAccuracyBgRemoval(layerId: string, sourceSrc: string) {
    setRemovingBgLayerId(layerId);
    setRemovingBgProgress(5);
    try {
      const { src: cleanSrc } = await removeImageBackgroundHighAccuracy(sourceSrc, (pct) => {
        setRemovingBgProgress(pct);
      });
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layerId ? { ...l, src: cleanSrc, bgRemoved: true } : l
        )
      );
    } finally {
      setRemovingBgLayerId((curr) => (curr === layerId ? null : curr));
      setRemovingBgProgress(0);
    }
  }

  async function processSolidColorBgRemoval(layer: StudioArtworkLayer) {
    setRemovingBgLayerId(layer.id);
    setRemovingBgProgress(50);
    try {
      const source = layer.originalSrc || layer.src;
      const cleanSrc = await removeSolidBackgroundPerceptual(source, 36);
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layer.id ? { ...l, src: cleanSrc, bgRemoved: true } : l
        )
      );
    } finally {
      setRemovingBgLayerId((curr) => (curr === layer.id ? null : curr));
      setRemovingBgProgress(0);
    }
  }

  function restoreOriginalLayerImage(layer: StudioArtworkLayer) {
    if (!layer.originalSrc) return;
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layer.id ? { ...l, src: l.originalSrc!, bgRemoved: false } : l
      )
    );
  }

  function handleUploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const originalSrc = reader.result;
        const layerId = `layer-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
        const newLayer: StudioArtworkLayer = {
          id: layerId,
          side,
          name: file.name.slice(0, 28),
          src: originalSrc,
          originalSrc,
          bgRemoved: false,
          x: 50,
          y: garmentType === 'hoodie' && side === 'front' ? 42 : 38,
          widthPct: 26,
          rotation: 0,
          opacity: 1,
        };
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayerId(layerId);
        if (autoRemoveBgOnUpload) {
          void processHighAccuracyBgRemoval(layerId, originalSrc);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  function updateLayer(id: string, patch: Partial<StudioArtworkLayer>) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }

  function handlePointerDownLayer(e: React.PointerEvent<HTMLDivElement>, layer: StudioArtworkLayer) {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setSelectedLayerId(layer.id);
    dragStateRef.current = {
      layerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: layer.x,
      origY: layer.y,
    };
  }

  function handlePointerMoveLayer(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    const container = canvasRef.current;
    if (!drag || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dxPct = ((e.clientX - drag.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startClientY) / rect.height) * 100;

    const nextX = Math.max(12, Math.min(88, drag.origX + dxPct));
    const nextY = Math.max(14, Math.min(86, drag.origY + dyPct));

    updateLayer(drag.layerId, { x: nextX, y: nextY });
  }

  function handlePointerUpLayer() {
    dragStateRef.current = null;
  }

  async function handleConfirmDesign() {
    setAdding(true);
    try {
      const previewSide =
        layers.some((l) => l.side === side)
          ? side
          : layers.some((l) => l.side === 'front')
          ? 'front'
          : layers.some((l) => l.side === 'back')
          ? 'back'
          : side;

      const previewImage = await renderCustomGarmentPreview(
        garmentType,
        previewSide,
        colorHex,
        layers
      );

      const frontLayersCount = layers.filter((l) => l.side === 'front').length;
      const backLayersCount = layers.filter((l) => l.side === 'back').length;

      onAddToCart({
        id: garmentType === 'hoodie' ? 'custom-hoodie' : 'custom-tshirt',
        title:
          garmentType === 'hoodie'
            ? `هودي مخصص (${colorName})`
            : `تيشيرت مخصص (${colorName})`,
        size,
        price,
        currency: activeCurrency,
        customDesign: {
          garmentType,
          colorHex,
          colorName,
          previewImage,
          frontLayersCount,
          backLayersCount,
        },
      });
      onClose();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2.5 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-modal-title"
    >
      <div
        className="flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: design.surfaceColor,
          borderColor: design.borderColor,
          color: design.textColor,
        }}
      >
        {/* Top Studio Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: design.borderColor, backgroundColor: design.bgColor }}
        >
          <div className="flex items-center gap-3">
            <Shirt className="h-5 w-5" style={{ color: design.accentColor }} />
            <div>
              <h2 id="studio-modal-title" className="text-base font-semibold sm:text-lg">
                استوديو تصميم التيشيرت والهودي
              </h2>
              <p className="text-xs" style={{ color: design.mutedColor }}>
                اختر القطعة، بدّل اللون بحرية، أضف صورك وحركها باللمس أو الماوس في أي مكان
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border p-2 hover:opacity-80"
            style={{ borderColor: design.borderColor, color: design.mutedColor }}
            aria-label="إغلاق استوديو التصميم"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Studio Split */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12 lg:overflow-hidden">
          {/* Interactive Garment Canvas + Docked Image Adjustment Bar */}
          <div
            className="flex flex-col items-center justify-between gap-3 p-3 sm:p-4 lg:col-span-7 lg:overflow-y-auto"
            style={{ backgroundColor: design.bgColor }}
          >
            {/* Front / Back Switcher */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div
                className="flex items-center gap-1.5 border p-1"
                style={{ borderColor: design.borderColor, backgroundColor: design.surfaceColor }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSide('front');
                    setSelectedLayerId(null);
                  }}
                  className="mc-btn-sm inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
                  style={
                    side === 'front'
                      ? { backgroundColor: design.accentColor, color: '#0D0E10' }
                      : { backgroundColor: design.bgColor, color: design.mutedColor }
                  }
                >
                  <span>الواجهة الأمامية</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSide('back');
                    setSelectedLayerId(null);
                  }}
                  className="mc-btn-sm inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
                  style={
                    side === 'back'
                      ? { backgroundColor: design.accentColor, color: '#0D0E10' }
                      : { backgroundColor: design.bgColor, color: design.mutedColor }
                  }
                >
                  <FlipHorizontal2 className="h-3.5 w-3.5" />
                  <span>الواجهة الخلفية</span>
                </button>
              </div>

              <label
                className="mc-btn-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: `${design.accentColor}26`,
                  color: design.textColor,
                }}
              >
                <Upload className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                <span>إضافة صورة</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadImages}
                  className="hidden"
                />
              </label>
            </div>

            {/* Garment Interactive Stage */}
            <div
              ref={canvasRef}
              onClick={() => setSelectedLayerId(null)}
              className="relative aspect-[500/580] w-full max-w-[330px] select-none overflow-hidden border shadow-inner sm:max-w-[355px]"
              style={{ borderColor: design.borderColor, backgroundColor: design.surfaceColor }}
            >
              <CustomGarmentSvg
                garmentType={garmentType}
                side={side}
                colorHex={colorHex}
                className="pointer-events-none h-full w-full"
              />

              {/* Subtle Print Zone Guide */}
              <div
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-lg border border-dashed border-white/15"
                style={{
                  top: garmentType === 'hoodie' && side === 'front' ? '26%' : '20%',
                  width: '48%',
                  height: garmentType === 'hoodie' && side === 'front' ? '34%' : '52%',
                }}
              />

              {/* Draggable Artwork Layers */}
              {visibleLayers.map((layer) => {
                const isSelected = layer.id === selectedLayerId;
                return (
                  <div
                    key={layer.id}
                    onPointerDown={(e) => handlePointerDownLayer(e, layer)}
                    onPointerMove={handlePointerMoveLayer}
                    onPointerUp={handlePointerUpLayer}
                    onPointerCancel={handlePointerUpLayer}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${layer.widthPct}%`,
                      opacity: layer.opacity,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                      touchAction: 'none',
                      ...(isSelected
                        ? { outline: `2px solid ${design.accentColor}`, outlineOffset: '2px' }
                        : {}),
                    }}
                    className={`absolute cursor-grab active:cursor-grabbing ${
                      isSelected ? 'z-20' : 'z-10 hover:ring-1 hover:ring-white/40'
                    }`}
                  >
                    <img
                      src={layer.src}
                      alt={layer.name}
                      draggable={false}
                      className="pointer-events-none h-auto w-full select-none object-contain"
                    />
                    {removingBgLayerId === layer.id && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded bg-black/60 text-[10px] font-medium text-[#F2EFE9] backdrop-blur-[1px]">
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: design.accentColor }} />
                        <span className="font-mono tabular-nums">{removingBgProgress}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Image Controls Docked Directly Under Garment */}
            {selectedLayer ? (
              <div
                className="w-full max-w-[500px] space-y-2.5 border p-3"
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-[#F2EFE9]">{selectedLayer.name}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={removingBgLayerId === selectedLayer.id}
                      onClick={() =>
                        void processHighAccuracyBgRemoval(
                          selectedLayer.id,
                          selectedLayer.originalSrc || selectedLayer.src
                        )
                      }
                      title="نزع الخلفية بالذكاء الاصطناعي بدقة عالية"
                      className="mc-btn-sm inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0D0E10] disabled:opacity-65"
                      style={{ backgroundColor: design.accentColor }}
                    >
                      {removingBgLayerId === selectedLayer.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="font-mono tabular-nums">جاري النزع {removingBgProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="h-3.5 w-3.5" />
                          <span>نزع الخلفية بدقة</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={removingBgLayerId === selectedLayer.id}
                      onClick={() => void processSolidColorBgRemoval(selectedLayer)}
                      title="حذف الخلفية ذات اللون الموحد للشعارات والنصوص"
                      className="mc-btn-sm inline-flex items-center gap-1 bg-[#1E2128] px-2 py-1 text-[11px] text-[#D4D0C8] disabled:opacity-60"
                    >
                      <Sparkles className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                      <span>قص الشعار</span>
                    </button>

                    {selectedLayer.bgRemoved && selectedLayer.originalSrc && (
                      <button
                        type="button"
                        disabled={removingBgLayerId === selectedLayer.id}
                        onClick={() => restoreOriginalLayerImage(selectedLayer)}
                        title="استعادة الصورة الأصلية قبل نزع الخلفية"
                        className="mc-btn-sm inline-flex items-center gap-1 bg-[#1E2128] px-2 py-1 text-[11px] text-[#D4D0C8]"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        <span>الأصلية</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => updateLayer(selectedLayer.id, { x: 50 })}
                      title="توسيط أفقي"
                      className="mc-btn-sm inline-flex items-center gap-1 bg-[#1E2128] px-2 py-1 text-[11px] text-[#D4D0C8]"
                    >
                      <AlignCenterHorizontal className="h-3.5 w-3.5" />
                      <span>توسيط</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeLayer(selectedLayer.id)}
                      title="حذف الصورة"
                      className="mc-btn-sm inline-flex items-center gap-1 bg-rose-950/60 px-2 py-1 text-[11px] text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#A6A29A]">
                      <span className="inline-flex items-center gap-1">
                        <Maximize2 className="h-3 w-3" />
                        <span>الحجم</span>
                      </span>
                      <span className="font-mono tabular-nums text-[#F2EFE9]">
                        {Math.round(selectedLayer.widthPct)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={65}
                      value={selectedLayer.widthPct}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { widthPct: Number(e.target.value) })
                      }
                      className="w-full"
                      style={{ accentColor: design.accentColor }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#A6A29A]">
                      <span className="inline-flex items-center gap-1">
                        <RotateCw className="h-3 w-3" />
                        <span>التدوير</span>
                      </span>
                      <span className="font-mono tabular-nums text-[#F2EFE9]">
                        {selectedLayer.rotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={selectedLayer.rotation}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })
                      }
                      className="w-full"
                      style={{ accentColor: design.accentColor }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#A6A29A]">
                      <span className="inline-flex items-center gap-1">
                        <SunMedium className="h-3 w-3" />
                        <span>الشفافية</span>
                      </span>
                      <span className="font-mono tabular-nums text-[#F2EFE9]">
                        {Math.round(selectedLayer.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(selectedLayer.opacity * 100)}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })
                      }
                      className="w-full"
                      style={{ accentColor: design.accentColor }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[11px] text-[#8D8980]">
                {visibleLayers.length > 0
                  ? 'اضغط على أي صورة فوق القطعة لتحريكها وتعديل حجمها وتدويرها وشفافيتها مباشرة'
                  : `اسحب أي صورة مضافة لتحريكها بحرية على ${garmentType === 'hoodie' ? 'الهودي' : 'التيشيرت'}`}
              </p>
            )}
          </div>

          {/* Controls Sidebar */}
          <div
            className="flex flex-col justify-between gap-4 border-t p-4 sm:p-5 lg:col-span-5 lg:overflow-y-auto lg:border-t-0 lg:border-r"
            style={{ borderColor: design.borderColor }}
          >
            <div className="space-y-5">
              {/* 1. Garment Selector (No Prices) */}
              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: design.mutedColor }}>
                  1. اختر قطعة الموقع للتصميم
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGarmentType('tshirt')}
                    className="mc-btn flex flex-col items-start gap-1 p-3 text-right"
                    style={
                      garmentType === 'tshirt'
                        ? {
                            backgroundColor: `${design.accentColor}26`,
                          }
                        : { backgroundColor: design.bgColor }
                    }
                  >
                    <span className="text-sm font-semibold">تيشيرت الموقع</span>
                    <span className="text-[11px]" style={{ color: design.mutedColor }}>
                      قطن ثقيل 280 جم · قصة مريحة
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGarmentType('hoodie')}
                    className="mc-btn flex flex-col items-start gap-1 p-3 text-right"
                    style={
                      garmentType === 'hoodie'
                        ? {
                            backgroundColor: `${design.accentColor}26`,
                          }
                        : { backgroundColor: design.bgColor }
                    }
                  >
                    <span className="text-sm font-semibold">هودي الموقع</span>
                    <span className="text-[11px]" style={{ color: design.mutedColor }}>
                      صوف قطني 460 جم · بقبعة مبطنة
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Available Colors (Owner Editable) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium" style={{ color: design.mutedColor }}>
                    2. لون {garmentType === 'hoodie' ? 'الهودي' : 'التيشيرت'}:{' '}
                    <span style={{ color: design.textColor }}>{colorName}</span>
                  </label>
                  {isOwnerAuthenticated && onUpdateStudioColors && (
                    <button
                      type="button"
                      onClick={() => setManagingColors((prev) => !prev)}
                      className="mc-btn-sm inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: managingColors ? `${design.accentColor}26` : design.bgColor,
                        color: managingColors ? design.accentColor : design.mutedColor,
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      <span>{managingColors ? 'إنهاء التعديل' : 'تحكم بالألوان'}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {availableColors.map((c) => {
                    const active = colorHex.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <div key={c.hex} className="relative">
                        <button
                          type="button"
                          title={c.name}
                          onClick={() => {
                            setColorHex(c.hex);
                            setColorName(c.name);
                          }}
                          className={`h-8 w-8 rounded-full border transition-transform ${
                            active ? 'scale-110' : 'border-white/20 hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: c.hex,
                            ...(active
                              ? { outline: `2px solid ${design.accentColor}`, outlineOffset: '2px' }
                              : {}),
                          }}
                          aria-label={c.name}
                        />
                        {isOwnerAuthenticated && managingColors && availableColors.length > 1 && (
                          <button
                            type="button"
                            disabled={savingColors}
                            onClick={() => void handleOwnerRemoveColor(c.hex)}
                            title={`حذف لون ${c.name}`}
                            aria-label={`حذف لون ${c.name}`}
                            className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#0D0E10] bg-rose-600 text-[10px] text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isOwnerAuthenticated && managingColors && onUpdateStudioColors && (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5"
                    style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                  >
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                      title="اختر درجة اللون"
                    />
                    <input
                      type="text"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="اسم اللون (مثال: زيتوني)"
                      className="min-w-[120px] flex-1 rounded-md border px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{
                        backgroundColor: design.surfaceColor,
                        borderColor: design.borderColor,
                        color: design.textColor,
                      }}
                    />
                    <button
                      type="button"
                      disabled={savingColors}
                      onClick={() => void handleOwnerAddColor()}
                      className="mc-btn-sm inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0D0E10] disabled:opacity-60"
                      style={{ backgroundColor: design.accentColor }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Upload Artwork Images & Layers */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: design.mutedColor }}>
                    3. صور وتصاميم ({side === 'front' ? 'الأمام' : 'الخلف'})
                  </label>
                  <span className="font-mono text-[11px] tabular-nums" style={{ color: design.mutedColor }}>
                    {visibleLayers.length} صور
                  </span>
                </div>

                <label
                  className="mc-btn flex cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `${design.accentColor}20`,
                    color: design.textColor,
                  }}
                >
                  <Upload className="h-4 w-4" style={{ color: design.accentColor }} />
                  <span>اختر صورة أو أكثر من جهازك (PNG / JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadImages}
                    className="hidden"
                  />
                </label>

                <label
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: design.borderColor, backgroundColor: design.bgColor }}
                >
                  <input
                    type="checkbox"
                    checked={autoRemoveBgOnUpload}
                    onChange={(e) => setAutoRemoveBgOnUpload(e.target.checked)}
                    className="h-4 w-4"
                    style={{ accentColor: design.accentColor }}
                  />
                  <span style={{ color: design.textColor }}>
                    نزع خلفية الصورة تلقائياً بدقة عالية عند الإضافة
                  </span>
                </label>

                {visibleLayers.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 text-[11px]" style={{ color: design.mutedColor }}>
                      <Layers className="h-3.5 w-3.5" />
                      <span>الطبقات على هذه الواجهة:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleLayers.map((layer) => (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() => setSelectedLayerId(layer.id)}
                          className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
                          style={
                            layer.id === selectedLayerId
                              ? { borderColor: design.accentColor, backgroundColor: `${design.accentColor}1A` }
                              : { borderColor: design.borderColor, backgroundColor: design.bgColor }
                          }
                        >
                          <img src={layer.src} alt="" className="h-4 w-4 rounded object-cover" />
                          <span className="max-w-[110px] truncate">{layer.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Size Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: design.mutedColor }}>
                  4. المقاس المطلوب
                </label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSize(sz)}
                      className="mc-btn-sm h-9 min-w-[42px] px-3 font-mono text-xs font-semibold"
                      style={
                        size === sz
                          ? {
                              backgroundColor: design.accentColor,
                              color: '#0D0E10',
                            }
                          : {
                              backgroundColor: design.bgColor,
                              color: design.textColor,
                            }
                      }
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Add to Cart Action (No Price Shown) */}
            <div className="border-t pt-4" style={{ borderColor: design.borderColor }}>
              <button
                type="button"
                disabled={adding}
                onClick={handleConfirmDesign}
                className="mc-btn flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#0D0E10] disabled:opacity-60"
                style={{ backgroundColor: design.accentColor }}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>{adding ? 'جاري التجهيز...' : 'أضف التصميم إلى الحقيبة'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
