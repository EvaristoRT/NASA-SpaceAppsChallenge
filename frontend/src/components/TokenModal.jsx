import React, { useState } from 'react';
import { KeyRound, Check, ExternalLink, X, ShieldAlert } from 'lucide-react';

export default function TokenModal({ isOpen, onClose, currentToken, onSaveToken }) {
  const [inputVal, setInputVal] = useState(currentToken || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const cleanToken = inputVal.trim();
    onSaveToken(cleanToken);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setInputVal('');
    onSaveToken('');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const isConfigured = Boolean(inputVal && inputVal.trim());

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <KeyRound size={20} className="text-cyan-400" />
            </div>
            <div>
              <h3>Configuración de Mapbox Token</h3>
              <p className="modal-subtitle">Personaliza tu clave de acceso para Mapbox GL JS</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <div className="token-status-pill">
            <span className={`status-dot ${isConfigured ? 'custom' : 'demo'}`} />
            <span>
              Estado actual: <strong>{isConfigured ? 'Token Activo' : 'Sin Token Configurado'}</strong>
            </span>
          </div>

          <label className="input-label" htmlFor="mapbox-token-input">
            Mapbox Access Token:
          </label>
          <div className="input-wrapper">
            <input
              id="mapbox-token-input"
              type="text"
              className="text-input"
              placeholder="Pega aquí tu clave pública de Mapbox"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              autoFocus
            />
          </div>

          <div className="help-box">
            <div className="help-icon">
              <ShieldAlert size={16} />
            </div>
            <p>
              Mapbox GL JS requiere un Access Token para descargar los mosaicos vectoriales y la proyección 3D del globo.
              Puedes crear una cuenta gratuita en{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noreferrer"
                className="inline-link"
              >
                mapbox.com <ExternalLink size={12} style={{ display: 'inline' }} />
              </a>{' '}
              y obtener 50,000 cargas mensuales sin costo.
            </p>
          </div>

          <div className="modal-footer">
            {isConfigured && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClear}
                title="Eliminar token guardado"
              >
                Limpiar Token
              </button>
            )}
            <button type="submit" className="btn-primary">
              {isSaved ? (
                <>
                  <Check size={16} /> Guardado
                </>
              ) : (
                'Guardar y Aplicar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
