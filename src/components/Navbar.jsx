import React from 'react';
import { Database, Activity, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

export default function Navbar({
  health,
  dataSource,
  setDataSource,
  autoRefresh,
  setAutoRefresh,
  onManualRefresh,
  refreshCountdown,
  isLoading
}) {
  return (
    <header className="navbar">
      <div className="navbar-content">
        {/* Brand Section */}
        <div className="brand-section">
          <div className="brand-badge">BCO CTES</div>
          <div>
            <h1 className="brand-title">Salminus Backoffice</h1>
            <p className="brand-subtitle">Auditoría MongoDB &bull; Trazas Padre-Hijo &bull; DIAG.FLOW</p>
          </div>
        </div>

        {/* Health Indicators & Mode Switcher */}
        <div className="health-strip">
          {/* Data Source Selector */}
          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
            <span className="input-label" style={{ margin: 0 }}>Origen:</span>
            <select
              className="select-field"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
            >
              <option value="mongo">MongoDB Directo (27017)</option>
              <option value="audit-ms">ms-audit REST (8089)</option>
            </select>
          </div>

          {/* Mongo Health */}
          <div className={`health-pill ${health.mongo ? 'up' : 'down'}`} title={health.mongoInfo || 'MongoDB'}>
            <Database size={13} />
            <span className="status-dot"></span>
            <span>Mongo: {health.mongo ? 'UP' : 'DOWN'}</span>
          </div>

          {/* ms-audit Health */}
          <div className={`health-pill ${health.audit ? 'up' : 'down'}`} title="ms-audit:8089">
            <Activity size={13} />
            <span className="status-dot"></span>
            <span>ms-audit: {health.audit ? 'UP' : 'DOWN'}</span>
          </div>

          {/* ms-preferencia Health */}
          <div className={`health-pill ${health.pref ? 'up' : 'down'}`} title="ms-preferencia:8099">
            <Layers size={13} />
            <span className="status-dot"></span>
            <span>DIAG.FLOW: {health.pref ? 'UP' : 'DOWN'}</span>
          </div>

          {/* Auto-refresh control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
            <select
              className="select-field"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
            >
              <option value="0">Pausado</option>
              <option value="3">3s</option>
              <option value="5">5s</option>
              <option value="10">10s</option>
              <option value="30">30s</option>
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={onManualRefresh}
              disabled={isLoading}
              title="Refrescar ahora"
            >
              <RefreshCw size={13} className={isLoading ? 'pulse' : ''} />
              {autoRefresh > 0 && <span style={{ fontSize: '0.7rem' }}>({refreshCountdown}s)</span>}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
