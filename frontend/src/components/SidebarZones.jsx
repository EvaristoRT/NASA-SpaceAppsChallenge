import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Layers,
  Search,
  X
} from 'lucide-react';
import { ZONES } from '../data/zonesData';
import { useLanguage } from '../context/LanguageContext';
import { localizeZone, normalizeSearch } from '../i18n/zoneText';

// Lista de una categoría, de la A a la Z en el idioma pedido
const buildList = (category, lang) =>
  ZONES.filter((z) => z.category === category)
    .map((z) => ({ zone: z, text: localizeZone(z, lang) }))
    .sort((x, y) => x.text.name.localeCompare(y.text.name, lang));

export default function SidebarZones({
  isOpen,
  onClose,
  selectedZone,
  onSelectZone
}) {
  const { lang, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Dos secciones, cada una de la A a la Z en el idioma activo: continentes y países. Se busca por el nombre en ambos idiomas.
  const continents = useMemo(() => buildList('Continente', lang), [lang]);
  const countries = useMemo(() => buildList('País', lang), [lang]);

  const { filteredContinents, filteredCountries } = useMemo(() => {
    const q = normalizeSearch(searchTerm.trim());
    const filterList = (list) =>
      !q
        ? list
        : list.filter(({ zone, text }) =>
            [zone.name, text.name, zone.capital, text.capital, zone.continent, text.continent].some(
              (v) => v && normalizeSearch(v).includes(q)
            )
          );
    return { filteredContinents: filterList(continents), filteredCountries: filterList(countries) };
  }, [continents, countries, searchTerm]);
  const total = filteredContinents.length + filteredCountries.length;

  const renderItem = ({ zone, text }) => {
    const isSelected = selectedZone?.id === zone.id;
    return (
      <div
        key={zone.id}
        className={`zone-list-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectZone(zone)}
      >
        <div className="zone-item-content">
          <div className="zone-item-name">{text.name}</div>
          {zone.category === 'País' && text.continent && <div className="zone-item-meta">{text.continent}</div>}
        </div>
        <ChevronRight size={16} className="zone-item-arrow" />
      </div>
    );
  };

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
          <button className="clear-btn" onClick={() => setSearchTerm('')} title={t('sidebarZones.clear')}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Continentes y países */}
      <div className="zones-list-container">
        {total === 0 ? (
          <div className="no-results">
            <p>{t('sidebarZones.noZonesFound')}</p>
          </div>
        ) : (
          <>
            {filteredContinents.length > 0 && (
              <>
                <div className="zones-section-title">
                  {t('sidebarZones.continents')} <span className="num">{filteredContinents.length}</span>
                </div>
                {filteredContinents.map(renderItem)}
              </>
            )}
            {filteredCountries.length > 0 && (
              <>
                <div className="zones-section-title">
                  {t('sidebarZones.countries')} <span className="num">{filteredCountries.length}</span>
                </div>
                {filteredCountries.map(renderItem)}
              </>
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-count">
          {filteredContinents.length} {t('sidebarZones.continents').toLowerCase()} · {filteredCountries.length}{' '}
          {t(filteredCountries.length === 1 ? 'sidebarZones.countOne' : 'sidebarZones.countMany')}
        </span>
      </div>
    </aside>
  );
}
