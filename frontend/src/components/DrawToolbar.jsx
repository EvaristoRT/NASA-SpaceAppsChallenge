import React from 'react';
import {
  Pencil,
  Square,
  Trash2,
  X,
  Info
} from 'lucide-react';

export default function DrawToolbar({
  drawMode, // null | 'freehand' | 'rectangle'
  onSelectDrawMode,
  onClearDrawing,
  hasDrawing,
  onClose
}) {
  return (
    <div className="draw-toolbar glass-panel">
      <div className="draw-toolbar-header">
        <div className="draw-title-group">
          <Pencil size={16} className="text-amber-400" />
          <span className="draw-title">Herramienta de Dibujo</span>
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
