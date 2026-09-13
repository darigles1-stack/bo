import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import AuditTable from './components/AuditTable.jsx';
import PayloadModal from './components/PayloadModal.jsx';
import TraceWaterfall from './components/TraceWaterfall.jsx';
import DiagFlowControl from './components/DiagFlowControl.jsx';
import MongoDirectExplorer from './components/MongoDirectExplorer.jsx';
import { X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('audit');
  const [dataSource, setDataSource] = useState('mongo');
  const [autoRefresh, setAutoRefresh] = useState(5);
  const [refreshCountdown, setRefreshCountdown] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedPayloadLog, setSelectedPayloadLog] = useState(null);
  const [selectedTraceId, setSelectedTraceId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [health, setHealth] = useState({
    mongo: false,
    audit: false,
    pref: false,
    mongoInfo: '',
  });

  const checkHealth = async () => {
    try {
      const r = await fetch('/api/mongo/status');
      const d = await r.json();
      setHealth((prev) => ({
        ...prev,
        mongo: d.status === 'UP',
        mongoInfo: d.status === 'UP' ? `Total registros: ${d.totalRecords}` : d.error,
      }));
    } catch {
      setHealth((prev) => ({ ...prev, mongo: false }));
    }

    try {
      const r = await fetch('/api/audit/ping');
      setHealth((prev) => ({ ...prev, audit: r.ok }));
    } catch {
      setHealth((prev) => ({ ...prev, audit: false }));
    }

    try {
      const r = await fetch('/api/pref/admin/diag/config');
      setHealth((prev) => ({ ...prev, pref: r.ok }));
    } catch {
      setHealth((prev) => ({ ...prev, pref: false }));
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let url = '/api/mongo/operations?limit=50';
      if (dataSource === 'audit-ms') {
        url = '/api/proxy/audit/operations?size=50';
      }

      let res = await fetch(url);
      if (!res.ok && dataSource === 'audit-ms') {
        res = await fetch('/api/mongo/operations?limit=50');
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.operations || data.content || data.logs || [];
        setLogs(list);
      }
    } catch (err) {
      console.warn('Error fetching operations:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchLogs();
  }, [dataSource]);

  useEffect(() => {
    if (autoRefresh <= 0 || activeTab !== 'audit') return;
    setRefreshCountdown(autoRefresh);

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchLogs();
          checkHealth();
          return autoRefresh;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, dataSource, activeTab]);

  const handleViewTrace = (traceId) => {
    setSelectedTraceId(traceId || '');
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onNavigate={(id) => {
          setActiveTab(id);
          setDrawerOpen(false);
        }}
        health={health}
      />

      <div className="main-column">
        <Navbar
          activeTab={activeTab}
          dataSource={dataSource}
          setDataSource={setDataSource}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onManualRefresh={() => {
            fetchLogs();
            checkHealth();
            setRefreshCountdown(autoRefresh);
          }}
          refreshCountdown={refreshCountdown}
          isLoading={isLoading}
        />

        <main className="page">
          {activeTab === 'audit' && (
            <>
              <div className="page-header">
                <h2>Qué hizo cada usuario</h2>
                <p>
                  Listado por operación de negocio: canal, cliente, horario, resultado y duración.
                  Abrí el detalle para ver la secuencia completa del servicio y sus llamados.
                </p>
              </div>
              <AuditTable
                logs={logs}
                isLoading={isLoading}
                onViewPayload={(log) => setSelectedPayloadLog(log)}
                onViewTrace={handleViewTrace}
              />
            </>
          )}

          {activeTab === 'diagflow' && (
            <>
              <div className="page-header">
                <h2>Diagnóstico bajo demanda</h2>
                <p>
                  Control centralizado del nivel de detalle de flujo. Por defecto permanece apagado
                  para no saturar el sistema.
                </p>
              </div>
              <DiagFlowControl />
            </>
          )}

          {activeTab === 'mongo-direct' && (
            <>
              <div className="page-header">
                <h2>Explorador técnico</h2>
                <p>Herramienta avanzada para inspección directa de documentos de auditoría.</p>
              </div>
              <MongoDirectExplorer />
            </>
          )}
        </main>
      </div>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Detalle de la operación</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                  Secuencia del servicio principal y llamados subordinados
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeDrawer} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              <TraceWaterfall
                initialTraceId={selectedTraceId}
                onViewPayload={(log) => setSelectedPayloadLog(log)}
                embedded
              />
            </div>
          </div>
        </div>
      )}

      {selectedPayloadLog && (
        <PayloadModal log={selectedPayloadLog} onClose={() => setSelectedPayloadLog(null)} />
      )}
    </div>
  );
}
