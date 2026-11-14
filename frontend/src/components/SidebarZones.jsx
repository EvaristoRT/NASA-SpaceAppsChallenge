import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Layers,
  Search,
  X
} from 'lucide-react';
import { ZONES } from '../data/zonesData';

export default function SidebarZones({
  isOpen,
  onClose,
  selectedZone,
  onSelectZone
}) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['Todos', 'Continente', 'País', 'Zona Ecológica', 'Zona Geográfica', 'Zona Marina'];

  const filteredZones = useMemo(() => {
    return ZONES.filter((zone) => {
      const matchCategory =
        activeCategory === 'Todos' || zone.category.toLowerCase().includes(activeCategory.toLowerCase());
      const matchSearch =
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (zone.highlights && zone.highlights.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchTerm]);

  return (
    <aside className={`sidebar-zones glass-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <Layers size={18} className="accent" />
          <h3 className="sidebar-title">Explorador de Zonas</h3>
        </div>
        <button className="btn-close" onClick={onClose} aria-label="Cerrar barra lateral">
          <X size={18} />
        </button>
      </div>

      {/* Barra de búsqueda interna */}
      <div className="sidebar-search-box">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar continente, país, maravilla..."
          className="sidebar-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filtros por Categoría */}
      <div className="category-chips-scroll">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Zonas */}
      <div className="zones-list-container">
        {filteredZones.length === 0 ? (
          <div className="no-results">
            <p>No se encontraron zonas que coincidan con la búsqueda.</p>
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
                <div className="zone-item-icon">{zone.icon || '📍'}</div>
                <div className="zone-item-content">
                  <div className="zone-item-name">{zone.name}</div>
                  <div className="zone-item-meta">
                    <span className="zone-item-category">{zone.category}</span>
                    {zone.area && <span className="zone-item-area">{zone.area}</span>}
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
          {filteredZones.length} {filteredZones.length === 1 ? 'zona disponible' : 'zonas disponibles'}
        </span>
      </div>
    </aside>
  );
}
