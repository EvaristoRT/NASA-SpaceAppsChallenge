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

  const categories = [
    'Todos',
    'América',
    'Europa',
    'Asia',
    'África',
    'Oceanía',
    'Continentes',
    'Maravillas'
  ];

  const filteredZones = useMemo(() => {
    return ZONES.filter((zone) => {
      let matchCategory = true;
      if (activeCategory === 'Todos') {
        matchCategory = true;
      } else if (activeCategory === 'Continentes') {
        matchCategory = zone.category === 'Continente';
      } else if (activeCategory === 'Maravillas') {
        matchCategory = zone.category.includes('Zona');
      } else {
        matchCategory = zone.continent === activeCategory;
      }

      const matchSearch =
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (zone.capital && zone.capital.toLowerCase().includes(searchTerm.toLowerCase())) ||
        zone.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (zone.continent && zone.continent.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (zone.description && zone.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (zone.highlights && zone.highlights.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase())));

      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchTerm]);

  return (
    <aside className={`sidebar-zones panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <Layers size={18} className="accent" />
          <h3 className="sidebar-title">Explorador de Países y Zonas</h3>
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
          placeholder="Buscar entre más de 190 países..."
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

      {/* Filtros por Continente y Categoría */}
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

      {/* Lista de Zonas y Países */}
      <div className="zones-list-container">
        {filteredZones.length === 0 ? (
          <div className="no-results">
            <p>No se encontraron países ni zonas con ese término.</p>
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
                  <div className="zone-item-meta">
                    <span className="zone-item-category" data-category={zone.category}>
                      {zone.capital ? `Cap: ${zone.capital}` : zone.category}
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
          {filteredZones.length} {filteredZones.length === 1 ? 'país / zona' : 'países y zonas disponibles'}
        </span>
      </div>
    </aside>
  );
}
