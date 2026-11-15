import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Layers,
  Search,
  X
} from 'lucide-react';
import { ZONES } from '../data/zonesData';
import { useLanguage } from '../context/LanguageContext';

export default function SidebarZones({
  isOpen,
  onClose,
  selectedZone,
  onSelectZone
}) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Solo países, de la A a la Z (los continentes se buscan desde la barra superior o se eligen en el globo)
  const countries = useMemo(
    () => ZONES.filter((z) => z.category === 'País').sort((x, y) => x.name.localeCompare(y.name, 'es')),
    []
  );

  const filteredZones = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (zone) =>
        zone.name.toLowerCase().includes(q) ||
        (zone.nativeName && zone.nativeName.toLowerCase().includes(q)) ||
        (zone.capital && zone.capital.toLowerCase().includes(q)) ||
        (zone.continent && zone.continent.toLowerCase().includes(q))
    );
  }, [countries, searchTerm]);

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

      {/* Lista de países */}
      <div className="zones-list-container">
        {filteredZones.length === 0 ? (
          <div className="no-results">
            <p>{t('sidebarZones.noZonesFound')}</p>
          </div>
        ) : (
          filteredZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            return (
              <div
                key={zone.id}
                className={`zone-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectZone(zone)}
              >
                <div className="zone-item-content">
                  <div className="zone-item-name">{zone.name}</div>
                  {zone.continent && <div className="zone-item-meta">{zone.continent}</div>}
                </div>
                <ChevronRight size={16} className="zone-item-arrow" />
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-count">
          {filteredZones.length} {t(filteredZones.length === 1 ? 'sidebarZones.countOne' : 'sidebarZones.countMany')}
        </span>
      </div>
    </aside>
  );
}
