import React from 'react';
import { RefreshCw } from 'lucide-react';

const TITLES = {
  audit: {
    title: 'Actividad de clientes',
    subtitle: 'Operaciones consolidadas por usuario, canal y resultado',
  },
  diagflow: {
    title: 'Diagnóstico de microservicios',
    subtitle: 'Activá o desactivá el detalle de flujo sin reiniciar servicios',
  },
  'mongo-direct': {
    title: 'Explorador técnico',
    subtitle: 'Consulta avanzada sobre colecciones de auditoría',
  },
};

export default function Navbar({
  activeTab,
  dataSource,
  setDataSource,
  autoRefresh,
  setAutoRefresh,
  onManualRefresh,
  refreshCountdown,
  isLoading,
}) {
  const meta = TITLES[activeTab] || TITLES.audit;

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </div>

      <div className="topbar-actions">
        {activeTab === 'audit' && (
          <>
            <div className="field" style={{ minWidth: 150 }}>
              <label className="input-label">Fuente</label>
              <select
                className="select"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
              >
                <option value="mongo">MongoDB</option>
                <option value="audit-ms">Servicio auditoría</option>
              </select>
            </div>

            <div className="field" style={{ minWidth: 110 }}>
              <label className="input-label">Actualización</label>
              <select
                className="select"
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(Number(e.target.value))}
              >
                <option value={0}>Pausada</option>
                <option value={5}>Cada 5 s</option>
                <option value={10}>Cada 10 s</option>
                <option value={30}>Cada 30 s</option>
              </select>
            </div>
          </>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onManualRefresh}
          disabled={isLoading}
          title="Actualizar"
          style={{ alignSelf: 'flex-end' }}
        >
          <RefreshCw size={15} className={isLoading ? 'pulse' : ''} />
          {autoRefresh > 0 && activeTab === 'audit' ? `${refreshCountdown}s` : 'Actualizar'}
        </button>
      </div>
    </header>
  );
}
