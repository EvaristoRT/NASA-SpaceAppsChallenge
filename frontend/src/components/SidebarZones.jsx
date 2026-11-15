import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Layers,
  Search,
  X
} from 'lucide-react';
import { ZONES } from '../data/zonesData';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_OPTIONS = [
  { key: 'all', labelKey: 'sidebarZones.categories.all' },
  { key: 'americas', labelKey: 'sidebarZones.categories.americas', matchContinent: 'América' },
  { key: 'europe', labelKey: 'sidebarZones.categories.europe', matchContinent: 'Europa' },
  { key: 'asia', labelKey: 'sidebarZones.categories.asia', matchContinent: 'Asia' },
  { key: 'africa', labelKey: 'sidebarZones.categories.africa', matchContinent: 'África' },
  { key: 'oceania', labelKey: 'sidebarZones.categories.oceania', matchContinent: 'Oceanía' },
  { key: 'continents', labelKey: 'sidebarZones.categories.continents' },
  { key: 'wonders', labelKey: 'sidebarZones.categories.wonders' }
];

export default function SidebarZones({
  isOpen,
  onClose,
  selectedZone,
  onSelectZone
}) {
  const { lang, t } = useLanguage();
  const [activeCategoryKey, setActiveCategoryKey] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredZones = useMemo(() => {
    const currentOpt = CATEGORY_OPTIONS.find(o => o.key === activeCategoryKey) || CATEGORY_OPTIONS[0];

    return ZONES.filter((zone) => {
      let matchCategory = true;
      if (activeCategoryKey === 'all') {
        matchCategory = true;
      } else if (activeCategoryKey === 'continents') {
        matchCategory = zone.category === 'Continente';
      } else if (activeCategoryKey === 'wonders') {
        matchCategory = zone.category.includes('Zona');
      } else if (currentOpt.matchContinent) {
        matchCategory = zone.continent === currentOpt.matchContinent;
      }

      const query = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        zone.name.toLowerCase().includes(query) ||
        (zone.nativeName && zone.nativeName.toLowerCase().includes(query)) ||
        (zone.capital && zone.capital.toLowerCase().includes(query)) ||
        zone.category.toLowerCase().includes(query) ||
        (zone.continent && zone.continent.toLowerCase().includes(query)) ||
        (zone.description && zone.description.toLowerCase().includes(query)) ||
        (zone.highlights && zone.highlights.some((h) => h.toLowerCase().includes(query)));

      return matchCategory && matchSearch;
    });
  }, [activeCategoryKey, searchTerm]);

  return (
    <aside className={`sidebar-zones panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <Layers size={18} className="accent" />
          <h3 className="sidebar-title">{t('sidebarZones.title')}</h3>
        </div>
        <button className="btn-close" onClick={onClose} aria-label={t('sidebarZones.closeSidebar')}>
          <X size={18} />
        </button>
      </div>

      {/* Barra de búsqueda interna */}
      <div className="sidebar-search-box">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder={t('sidebarZones.searchPlaceholder')}
          className="sidebar-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')} title={lang === 'es' ? 'Limpiar' : 'Clear'}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filtros por Continente y Categoría */}
      <div className="category-chips-scroll">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.key}
            className={`category-chip ${activeCategoryKey === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategoryKey(cat.key)}
          >
            {t(cat.labelKey)}
          </button>
        ))}
      </div>

      {/* Lista de Zonas y Países */}
      <div className="zones-list-container">
        {filteredZones.length === 0 ? (
          <div className="no-results">
            <p>{t('sidebarZones.noZonesFound')}</p>
            <span className="text-xs text-muted mt-1">{t('sidebarZones.tryOtherSearch')}</span>
          </div>
        ) : (
          filteredZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            const displayName = (lang === 'en' && zone.nativeName && zone.category === 'Continente')
              ? zone.nativeName
              : zone.name;

            return (
              <div
                key={zone.id}
                className={`zone-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectZone(zone)}
              >
                <div className="zone-item-content">
                  <div className="zone-item-name">{displayName}</div>
                  <div className="zone-item-meta">
                    <span className="zone-item-category" data-category={zone.category}>
                      {zone.capital ? `${t('zoneDrawer.capital')}: ${zone.capital}` : zone.category}
                    </span>
                    {zone.population && (
                      <span className="zone-item-area">{zone.population}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="zone-item-arrow" />
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-count">
          {filteredZones.length} {filteredZones.length === 1
            ? (lang === 'es' ? 'país / zona' : 'country / zone')
            : (lang === 'es' ? 'países y zonas disponibles' : 'countries & zones available')}
        </span>
      </div>
    </aside>
  );
}
