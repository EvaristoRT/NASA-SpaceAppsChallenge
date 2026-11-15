import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';
import { ZONES } from '../data/zonesData';
import { useLanguage } from '../context/LanguageContext';
import { localizeZone } from '../i18n/zoneText';
import { continentIdOf } from '../utils/continents';

// Lista de una categoría, de la A a la Z en el idioma pedido
const buildList = (category, lang) =>
  ZONES.filter((z) => z.category === category)
    .map((z) => ({ zone: z, text: localizeZone(z, lang) }))
    .sort((x, y) => x.text.name.localeCompare(y.text.name, lang));

// Explorador por niveles: primero los continentes; al elegir uno se ven sus países. No tiene buscador propio: se busca desde
// la barra superior (un solo buscador). Si la selección cambia desde fuera (mapa, buscador), el explorador la sigue.
export default function SidebarZones({
  isOpen,
  onClose,
  selectedZone,
  onSelectZone
}) {
  const { lang, t } = useLanguage();
  const [activeContinentId, setActiveContinentId] = useState(null);
  const [followedId, setFollowedId] = useState(null);

  // Seguir la selección: un continente muestra sus países; un país abre el continente al que pertenece.
  // Se ajusta durante el render (patrón recomendado por React) en vez de en un efecto.
  const selectedId = selectedZone?.id ?? null;
  if (selectedId !== followedId) {
    setFollowedId(selectedId);
    const id = continentIdOf(selectedZone);
    if (id) setActiveContinentId(id);
  }

  const continents = useMemo(() => buildList('Continente', lang), [lang]);
  const countries = useMemo(() => buildList('País', lang), [lang]);

  const countByContinent = useMemo(() => {
    const counts = {};
    countries.forEach(({ zone }) => {
      const id = continentIdOf(zone);
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [countries]);

  const activeContinent = continents.find(({ zone }) => zone.id === activeContinentId) || null;
  const activeCountries = useMemo(
    () => (activeContinent ? countries.filter(({ zone }) => continentIdOf(zone) === activeContinent.zone.id) : []),
    [countries, activeContinent]
  );

  const countLabel = (n) => `${n} ${t(n === 1 ? 'sidebarZones.countOne' : 'sidebarZones.countMany')}`;

  const handleSelectContinent = (zone) => {
    setActiveContinentId(zone.id);
    onSelectZone(zone);
  };

  const renderItem = ({ zone, text }, meta, onClick) => (
    <div
      key={zone.id}
      className={`zone-list-item ${selectedZone?.id === zone.id ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="zone-item-content">
        <div className="zone-item-name">{text.name}</div>
        {meta && <div className="zone-item-meta">{meta}</div>}
      </div>
      <ChevronRight size={16} className="zone-item-arrow" />
    </div>
  );

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

      {activeContinent ? (
        <>
          {/* Nivel 2: países del continente elegido */}
          <button className="zones-back" onClick={() => setActiveContinentId(null)}>
            <ChevronLeft size={16} />
            <span>{t('sidebarZones.continents')}</span>
          </button>
          <div className="zones-section-title">
            {activeContinent.text.name} <span className="num">{activeCountries.length}</span>
          </div>
          <div className="zones-list-container">
            {activeCountries.length === 0 ? (
              <div className="no-results">
                <p>{t('sidebarZones.noCountries')}</p>
              </div>
            ) : (
              activeCountries.map((item) => renderItem(item, item.text.capital, () => onSelectZone(item.zone)))
            )}
          </div>
          <div className="sidebar-footer">
            <span className="sidebar-count">{countLabel(activeCountries.length)}</span>
          </div>
        </>
      ) : (
        <>
          {/* Nivel 1: continentes */}
          <div className="zones-section-title">
            {t('sidebarZones.continents')} <span className="num">{continents.length}</span>
          </div>
          <div className="zones-list-container">
            {continents.map((item) =>
              renderItem(item, countLabel(countByContinent[item.zone.id] || 0), () => handleSelectContinent(item.zone))
            )}
          </div>
          <div className="sidebar-footer">
            <span className="sidebar-count">{t('sidebarZones.hint')}</span>
          </div>
        </>
      )}
    </aside>
  );
}
