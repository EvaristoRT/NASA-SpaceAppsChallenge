import React, { useState, useRef, useEffect } from 'react';
import {
  Globe,
  Map as MapIcon,
  Search,
  ChevronDown,
  Menu,
  Pencil,
  Languages
} from 'lucide-react';
import { MAP_STYLES, ZONES } from '../data/zonesData';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({
  currentStyleId,
  onSelectStyle,
  projection,
  onToggleProjection,
  onSelectZone,
  onToggleSidebar,
  isSidebarOpen,
  isDrawOpen,
  onToggleDraw
}) {
  const { lang, setLang, t, getStyleText } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const styleDropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Filtrar sugerencias de búsqueda
  const searchResults = searchQuery.trim()
    ? ZONES.filter((z) =>
        z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (z.capital && z.capital.toLowerCase().includes(searchQuery.toLowerCase())) ||
        z.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (z.continent && z.continent.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (z.highlights && z.highlights.some(h => h.toLowerCase().includes(searchQuery.toLowerCase())))
      ).slice(0, 10)
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
  const activeStyleText = getStyleText(activeStyle.id);

  const handleSelectSearchResult = (zone) => {
    onSelectZone(zone);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="navbar panel">
      {/* Brand & Sidebar Toggle */}
      <div className="navbar-brand-group">
        <button
          className={`btn-icon-toggle ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title={t('navbar.toggleSidebar')}
          aria-label={t('navbar.openExplorer')}
        >
          <Menu size={20} />
        </button>

        <div className="brand-badge">
          {/* Símbolo de Space Apps (provisional: confirmar condiciones de uso, ver design/brand/README.md) */}
          <img className="brand-symbol" src="/brand/space-apps-symbol-white.svg" alt="" width="40" height="40" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="brand-texts">
            <span className="brand-name">IgnisSync</span>
            <span className="brand-tag">{t('navbar.brandTag')}</span>
          </div>
        </div>
      </div>

      {/* Search Input with Autocomplete */}
      <div className="navbar-search-wrapper" ref={searchRef}>
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={t('navbar.searchPlaceholder')}
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
          <div className="search-results-dropdown panel">
            {searchResults.map((zone) => (
              <div
                key={zone.id}
                className="search-result-item"
                onClick={() => handleSelectSearchResult(zone)}
              >
                <div className="search-result-text">
                  <span className="search-result-title">{zone.name}</span>
                  <span className="search-result-sub">
                    {zone.capital ? `${zone.capital} • ` : ''}
                    {zone.continent || zone.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Language Tab, Map Style, Draw, 2D/3D Projection */}
      <div className="navbar-actions">
        {/* Pestaña selectora de idioma (ES / EN) */}
        <div className="language-tabs" role="tablist" aria-label={t('navbar.languageTab')}>
          <Languages size={14} className="lang-icon" aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={lang === 'es'}
            className={`lang-tab-pill ${lang === 'es' ? 'active' : ''}`}
            onClick={() => setLang('es')}
            title={t('navbar.langEsFull')}
          >
            {t('navbar.langEs')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={lang === 'en'}
            className={`lang-tab-pill ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
            title={t('navbar.langEnFull')}
          >
            {t('navbar.langEn')}
          </button>
        </div>

        {/* Style Selector Dropdown */}
        <div className="style-selector-container" ref={styleDropdownRef}>
          <button
            className="style-dropdown-btn"
            onClick={() => setShowStyleDropdown(!showStyleDropdown)}
            title={t('navbar.changeStyle')}
          >
            <span className="style-name-text">{activeStyleText.name}</span>
            <ChevronDown size={14} className="chevron-icon" />
          </button>

          {showStyleDropdown && (
            <div className="styles-menu-dropdown panel">
              <div className="dropdown-header">{t('navbar.cartographyStyle')}</div>
              {MAP_STYLES.map((style) => {
                const styleText = getStyleText(style.id);
                return (
                  <div
                    key={style.id}
                    className={`style-menu-item ${currentStyleId === style.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectStyle(style.id);
                      setShowStyleDropdown(false);
                    }}
                  >
                    <div className="style-item-desc">
                      <span className="style-item-name">{styleText.name}</span>
                      <span className="style-item-detail">{styleText.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Herramienta de Dibujo Manual (Paint / AOI) */}
        <button
          className={`draw-toggle-btn ${isDrawOpen ? 'active' : ''}`}
          onClick={onToggleDraw}
          title={t('navbar.drawTitle')}
        >
          <Pencil size={15} />
          <span className="draw-btn-text">{t('navbar.drawButton')}</span>
        </button>

        {/* 2D / 3D Projection Toggle */}
        <button
          className={`projection-toggle-btn ${projection === 'globe' ? 'is-globe' : 'is-mercator'}`}
          onClick={onToggleProjection}
          title={projection === 'globe' ? t('navbar.switchTo2D') : t('navbar.switchTo3D')}
        >
          {projection === 'globe' ? <Globe size={16} /> : <MapIcon size={16} />}
          <span className="projection-pill-text">{projection === 'globe' ? t('navbar.globe3D') : t('navbar.map2D')}</span>
        </button>
      </div>
    </header>
  );
}
