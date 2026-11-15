import React from 'react';
import {
  Pencil,
  Pentagon,
  Square,
  Trash2,
  X,
  Info,
  CheckCircle2,
  Undo2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DrawToolbar({
  drawMode, // null | 'freehand' | 'polygon' | 'rectangle'
  onSelectDrawMode,
  onClearDrawing,
  hasDrawing,
  polygonPointsCount = 0,
  onFinishPolygon,
  onUndoVertex,
  onClose
}) {
  const { lang, t } = useLanguage();

  const getHint = () => {
    if (drawMode === 'polygon') {
      if (polygonPointsCount === 0) {
        return lang === 'es'
          ? 'Haz clic en el mapa para colocar el primer vértice del polígono.'
          : 'Click on the map to place the first polygon vertex.';
      }
      if (polygonPointsCount < 3) {
        return lang === 'es'
          ? `Coloca al menos 3 vértices (${polygonPointsCount}/3 colocados). Mueve el cursor para ver la guía.`
          : `Place at least 3 vertices (${polygonPointsCount}/3 placed). Move cursor to preview.`;
      }
      return lang === 'es'
        ? 'Haz clic en el punto inicial, haz doble clic o presiona Enter para cerrar el polígono.'
        : 'Click the starting point, double-click, or press Enter to close the polygon.';
    }
    if (drawMode === 'freehand') {
      return lang === 'es'
        ? 'Mantén pulsado el botón del ratón y traza el contorno deseado sobre el globo terráqueo.'
        : 'Hold down the mouse button and draw your desired outline on the globe.';
    }
    if (drawMode === 'rectangle') {
      return lang === 'es'
        ? 'Haz clic en un vértice y arrastra hacia la esquina opuesta para definir el rectángulo.'
        : 'Click on a corner and drag to the opposite corner to define the rectangle.';
    }
    return lang === 'es'
      ? 'Selecciona un modo de dibujo para trazar un área personalizada.'
      : 'Select a drawing mode to outline a custom area.';
  };

  return (
    <div className="draw-toolbar panel">
      <div className="draw-toolbar-header">
        <div className="draw-title-group">
          <Pencil size={16} className="text-amber-400" />
          <span className="draw-title">{t('drawToolbar.title')}</span>
          {drawMode === 'polygon' && polygonPointsCount > 0 && (
            <span className="vertex-counter-badge">
              {polygonPointsCount} {polygonPointsCount === 1 ? t('drawToolbar.vertex') : t('drawToolbar.vertices')}
            </span>
          )}
        </div>
        <button
          className="btn-close-sm"
          onClick={onClose}
          title={t('drawToolbar.closeToolbar')}
          aria-label={t('drawToolbar.close')}
        >
          <X size={15} />
        </button>
      </div>

      <div className="draw-tools-group">
        <button
          className={`draw-tool-btn ${drawMode === 'polygon' ? 'active' : ''}`}
          onClick={() => onSelectDrawMode(drawMode === 'polygon' ? null : 'polygon')}
          title={t('drawToolbar.polygonTitle')}
        >
          <Pentagon size={15} />
          <span>{t('drawToolbar.polygon')}</span>
        </button>

        <button
          className={`draw-tool-btn ${drawMode === 'freehand' ? 'active' : ''}`}
          onClick={() => onSelectDrawMode(drawMode === 'freehand' ? null : 'freehand')}
          title={t('drawToolbar.freehandTitle')}
        >
          <Pencil size={15} />
          <span>{t('drawToolbar.freehand')}</span>
        </button>

        <button
          className={`draw-tool-btn ${drawMode === 'rectangle' ? 'active' : ''}`}
          onClick={() => onSelectDrawMode(drawMode === 'rectangle' ? null : 'rectangle')}
          title={t('drawToolbar.rectangleTitle')}
        >
          <Square size={15} />
          <span>{t('drawToolbar.rectangle')}</span>
        </button>

        {/* Acciones contextuales para modo Polígono */}
        {drawMode === 'polygon' && polygonPointsCount >= 3 && (
          <button
            className="draw-tool-btn success"
            onClick={onFinishPolygon}
            title={t('drawToolbar.finishPolygonTitle')}
          >
            <CheckCircle2 size={15} />
            <span>{t('drawToolbar.finishPolygon')}</span>
          </button>
        )}

        {drawMode === 'polygon' && polygonPointsCount >= 1 && (
          <button
            className="draw-tool-btn"
            onClick={onUndoVertex}
            title={t('drawToolbar.undoVertexTitle')}
          >
            <Undo2 size={15} />
            <span>{t('drawToolbar.undoVertex')}</span>
          </button>
        )}

        {hasDrawing && (
          <button
            className="draw-tool-btn danger"
            onClick={onClearDrawing}
            title={t('drawToolbar.clearDrawingTitle')}
          >
            <Trash2 size={15} />
            <span>{t('drawToolbar.clearDrawing')}</span>
          </button>
        )}
      </div>

      <div className="draw-hint-box">
        <Info size={13} className="text-amber-400 flex-shrink-0" />
        <span>{getHint()}</span>
      </div>
    </div>
  );
}
