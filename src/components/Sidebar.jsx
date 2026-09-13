import React from 'react';
import { Activity, Layers, Database, Shield } from 'lucide-react';

const NAV = [
  { id: 'audit', label: 'Actividad de clientes', icon: Activity, section: 'Operación' },
  { id: 'diagflow', label: 'Diagnóstico', icon: Layers, section: 'Operación' },
  { id: 'mongo-direct', label: 'Explorador técnico', icon: Database, section: 'Administración' },
];

export default function Sidebar({ activeTab, onNavigate, health }) {
  let lastSection = null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">BCO</div>
        <div className="brand-text">
          <strong>Salminus</strong>
          <span>Backoffice · Banco de Corrientes</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const showSection = item.section !== lastSection;
          lastSection = item.section;
          return (
            <React.Fragment key={item.id}>
              {showSection && <div className="nav-section-label">{item.section}</div>}
              <button
                type="button"
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className={`health-row ${health?.mongo ? 'up' : ''}`}>
          <span>MongoDB</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="dot" />
            {health?.mongo ? 'Operativo' : 'Caído'}
          </span>
        </div>
        <div className={`health-row ${health?.audit ? 'up' : ''}`}>
          <span>Auditoría</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="dot" />
            {health?.audit ? 'Operativo' : 'Caído'}
          </span>
        </div>
        <div className={`health-row ${health?.pref ? 'up' : ''}`}>
          <span>Preferencias</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="dot" />
            {health?.pref ? 'Operativo' : 'Caído'}
          </span>
        </div>
        <div className="health-row" style={{ marginTop: 4, justifyContent: 'flex-start', gap: 8 }}>
          <Shield size={12} />
          <span>Entorno controlado</span>
        </div>
      </div>
    </aside>
  );
}
