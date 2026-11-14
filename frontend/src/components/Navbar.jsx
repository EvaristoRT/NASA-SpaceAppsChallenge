import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Search,
  KeyRound,
  ChevronDown,
  Menu
} from 'lucide-react';
import { MAP_STYLES, ZONES } from '../data/zonesData';

export default function Navbar({
  currentStyleId,
  onSelectStyle,
  projection,
  onToggleProjection,
  onOpenTokenModal,
  isCustomToken,
  onSelectZone,
  onToggleSidebar,
  isSidebarOpen
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const styleDropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Filtrar sugerencias de búsqueda
  const searchResults = searchQuery.trim()
    ? ZONES.filter((z) =>
        z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (z.highlights && z.highlights.some(h => h.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    : [];

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(e.target)) {
        setShowStyleDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeStyle = MAP_STYLES.find((s) => s.id === currentStyleId) || MAP_STYLES[0];

  const handleSelectSearchResult = (zone) => {
    onSelectZone(zone);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="navbar glass-panel">
      {/* Brand & Sidebar Toggle */}
      <div className="navbar-brand-group">
        <button
          className={`btn-icon-toggle ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Alternar panel de zonas"
          aria-label="Abrir explorador de zonas"
        >
          <Menu size={20} />
        </button>

        <div className="brand-badge">
          <div className="brand-icon-wrapper">
            <Globe size={22} className="brand-globe-icon" />
          </div>
          <div className="brand-texts">
            <span className="brand-name">TerraGlobe</span>
            <span className="brand-tag">3D Interactive</span>
          </div>
        </div>
      </div>

      {/* Search Input with Autocomplete */}
      <div className="navbar-search-wrapper" ref={searchRef}>
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar continente, país o zona geográfica..."
            className="navbar-search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
          />
        </div>

        {/* Dropdown de resultados de búsqueda */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="search-results-dropdown glass-panel">
            {searchResults.map((zone) => (
              <div
                key={zone.id}
                className="search-result-item"
                onClick={() => handleSelectSearchResult(zone)}
              >
                <span className="search-result-icon">{zone.icon || '📍'}</span>
                <div className="search-result-text">
                  <span className="search-result-title">{zone.name}</span>
                  <span className="search-result-sub">{zone.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Map Style, 2D/3D Projection, Token */}
      <div className="navbar-actions">
        {/* Style Selector Dropdown */}
        <div className="style-selector-container" ref={styleDropdownRef}>
          <button
            className="style-dropdown-btn"
            onClick={() => setShowStyleDropdown(!showStyleDropdown)}
            title="Cambiar estilo de mapa"
          >
            <span className="style-icon-preview">{activeStyle.icon}</span>
            <span className="style-name-text">{activeStyle.name}</span>
            <ChevronDown size={14} className="chevron-icon" />
          </button>

          {showStyleDropdown && (
            <div className="styles-menu-dropdown glass-panel">
              <div className="dropdown-header">Estilo de Cartografía</div>
              {MAP_STYLES.map((style) => (
                <div
                  key={style.id}
                  className={`style-menu-item ${currentStyleId === style.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectStyle(style.id);
                    setShowStyleDropdown(false);
                  }}
                >
                  <span className="style-item-icon">{style.icon}</span>
                  <div className="style-item-desc">
                    <span className="style-item-name">{style.name}</span>
                    <span className="style-item-detail">{style.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2D / 3D Projection Toggle */}
        <button
          className={`projection-toggle-btn ${projection === 'globe' ? 'is-globe' : 'is-mercator'}`}
          onClick={onToggleProjection}
          title={projection === 'globe' ? 'Cambiar a proyección plana 2D (Mercator)' : 'Cambiar a proyección esférica 3D (Globo)'}
        >
          <span className="projection-pill-icon">{projection === 'globe' ? '🌍' : '🗺️'}</span>
          <span className="projection-pill-text">{projection === 'globe' ? 'Globo 3D' : 'Plano 2D'}</span>
        </button>

        {/* Token Config Modal Trigger */}
        <button
          className={`token-badge-btn ${isCustomToken ? 'is-custom' : 'is-demo'}`}
          onClick={onOpenTokenModal}
          title="Configurar Mapbox Access Token"
        >
          <KeyRound size={15} />
          <span className="token-btn-text">{isCustomToken ? 'Token Activo' : 'Configurar Token'}</span>
        </button>
      </div>
    </header>
  );
}
