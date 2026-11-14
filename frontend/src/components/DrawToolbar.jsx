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
  return (
    <div className="draw-toolbar panel">
      <div className="draw-toolbar-header">
        <div className="draw-title-group">
          <Pencil size={16} className="text-amber-400" />
          <span className="draw-title">Herramienta de Dibujo y AOI</span>
          {drawMode === 'polygon' && polygonPointsCount > 0 && (
            <span className="vertex-counter-badge">
              {polygonPointsCount} {polygonPointsCount === 1 ? 'vértice' : 'vértices'}
            </span>
          )}
        </div>
        <button
          className="btn-close-sm"
          onClick={onClose}
          title="Cerrar barra de dibujo"
          aria-label="Cerrar"
        >
          <X size={15} />
        </button>
      </div>

      <div className="draw-tools-group">
        <button
          className={`draw-tool-btn ${drawMode === 'polygon' ? 'active' : ''}`}
          onClick={() => onSelectDrawMode(drawMode === 'polygon' ? null : 'polygon')}
          title="Dibujar polígono colocando puntos vértice por vértice"
        >
          <Pentagon size={15} />
          <span>Polígono (Vértices)</span>
        </button>

        <button
          className={`draw-tool-btn ${drawMode === 'freehand' ? 'active' : ''}`}
          onClick={() => onSelectDrawMode(drawMode === 'freehand' ? null : 'freehand')}
          title="Dibujar forma libre a mano alzada (mantén pulsado y arrastra)"
        >
          <Pencil size={15} />
          <span>Mano Alzada</span>
        </button>

        <button
          className={`draw-tool-btn ${drawMode === 'rectangle' ? 'active' : ''}`}
          onClick={() => onSelectDrawMode(drawMode === 'rectangle' ? null : 'rectangle')}
          title="Dibujar zona rectangular (clic y arrastra diagonalmente)"
        >
          <Square size={15} />
          <span>Rectángulo</span>
        </button>

        {/* Acciones contextuales para modo Polígono */}
        {drawMode === 'polygon' && polygonPointsCount >= 3 && (
          <button
            className="draw-tool-btn success"
            onClick={onFinishPolygon}
            title="Finalizar y cerrar el polígono actual (o presiona Enter)"
          >
            <CheckCircle2 size={15} />
            <span>Cerrar Polígono</span>
          </button>
        )}

        {drawMode === 'polygon' && polygonPointsCount >= 1 && (
          <button
            className="draw-tool-btn"
            onClick={onUndoVertex}
            title="Deshacer el último vértice colocado (o presiona Backspace)"
          >
            <Undo2 size={15} />
            <span>Deshacer punto</span>
          </button>
        )}

        {hasDrawing && (
          <button
            className="draw-tool-btn danger"
            onClick={onClearDrawing}
            title="Borrar trazado actual"
          >
            <Trash2 size={15} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      <div className="draw-hint-box">
        <Info size={13} className="text-amber-400 flex-shrink-0" />
        <span>
          {drawMode === 'polygon' && (
            polygonPointsCount === 0
              ? 'Haz clic en el mapa para colocar el primer vértice del polígono.'
              : polygonPointsCount < 3
              ? `Coloca al menos 3 vértices (${polygonPointsCount}/3 colocados). Mueve el cursor para ver la guía.`
              : 'Haz clic en el punto verde inicial, haz doble clic o presiona Enter para cerrar el polígono.'
          )}
          {drawMode === 'freehand' &&
            'Mantén pulsado el botón del ratón y traza el contorno deseado sobre el globo terráqueo.'}
          {drawMode === 'rectangle' &&
            'Haz clic en un vértice y arrastra hacia la esquina opuesta para definir el rectángulo.'}
          {!drawMode && 'Selecciona un modo de dibujo para trazar un área personalizada.'}
        </span>
      </div>
    </div>
  );
}
