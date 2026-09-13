import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import AuditTable from './components/AuditTable.jsx';
import PayloadModal from './components/PayloadModal.jsx';
import TraceWaterfall from './components/TraceWaterfall.jsx';
import DiagFlowControl from './components/DiagFlowControl.jsx';
import MongoDirectExplorer from './components/MongoDirectExplorer.jsx';
import { Database, GitBranch, Layers, FileCode, Shield } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'waterfall', 'diagflow', 'mongo-direct'
  const [dataSource, setDataSource] = useState('mongo'); // 'mongo' or 'audit-ms'
  const [autoRefresh, setAutoRefresh] = useState(5); // 0 = off, 3, 5, 10, 30
  const [refreshCountdown, setRefreshCountdown] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const [logs, setLogs] = useState([]);
  const [selectedPayloadLog, setSelectedPayloadLog] = useState(null);
  const [selectedTraceId, setSelectedTraceId] = useState('');

  const [health, setHealth] = useState({
    mongo: false,
    audit: false,
    pref: false,
    mongoInfo: ''
  });

  // Cargar estado de salud
  const checkHealth = async () => {
    // 1. Mongo
    try {
      const r = await fetch('/api/mongo/status');
      const d = await r.json();
      setHealth(prev => ({
        ...prev,
        mongo: d.status === 'UP',
        mongoInfo: d.status === 'UP' ? `Total registros: ${d.totalRecords}` : d.error
      }));
    } catch {
      setHealth(prev => ({ ...prev, mongo: false }));
    }

    // 2. ms-audit
    try {
      const r = await fetch('/api/audit/ping');
      setHealth(prev => ({ ...prev, audit: r.ok }));
    } catch {
      setHealth(prev => ({ ...prev, audit: false }));
    }

    // 3. ms-preferencia
    try {
      const r = await fetch('/api/pref/admin/diag/config');
      setHealth(prev => ({ ...prev, pref: r.ok }));
    } catch {
      setHealth(prev => ({ ...prev, pref: false }));
    }
  };

  // Cargar operaciones de auditoría (Nivel A: audit_operations)
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let url = '/api/mongo/operations?limit=50';
      if (dataSource === 'audit-ms') {
        url = '/api/proxy/audit/operations?size=50';
      }

      let res = await fetch(url);
      if (!res.ok && dataSource === 'audit-ms') {
        // Fallback a mongo directo si ms-audit no responde
        res = await fetch('/api/mongo/operations?limit=50');
      }

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.operations || data.content || data.logs || []);
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

  // Contador de auto-refresco
  useEffect(() => {
    if (autoRefresh <= 0) return;
    setRefreshCountdown(autoRefresh);

    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchLogs();
          checkHealth();
          return autoRefresh;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, dataSource]);

  // Navegar a la traza Padre-Hijo
  const handleViewTrace = (traceId) => {
    setSelectedTraceId(traceId);
    setActiveTab('waterfall');
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        health={health}
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

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Database size={16} /> Operaciones de Usuario ({logs.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'waterfall' ? 'active' : ''}`}
          onClick={() => setActiveTab('waterfall')}
        >
          <GitBranch size={16} /> Árbol Padre-Hijo (Waterfall)
        </button>

        <button
          className={`tab-btn ${activeTab === 'diagflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagflow')}
        >
          <Layers size={16} /> Control DIAG.FLOW
        </button>

        <button
          className={`tab-btn ${activeTab === 'mongo-direct' ? 'active' : ''}`}
          onClick={() => setActiveTab('mongo-direct')}
        >
          <FileCode size={16} /> Explorador BSON MongoDB
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="main-content">
        {activeTab === 'audit' && (
          <AuditTable
            logs={logs}
            isLoading={isLoading}
            onViewPayload={(log) => setSelectedPayloadLog(log)}
            onViewTrace={handleViewTrace}
          />
        )}

        {activeTab === 'waterfall' && (
          <TraceWaterfall
            initialTraceId={selectedTraceId}
            onViewPayload={(log) => setSelectedPayloadLog(log)}
          />
        )}

        {activeTab === 'diagflow' && (
          <DiagFlowControl />
        )}

        {activeTab === 'mongo-direct' && (
          <MongoDirectExplorer />
        )}
      </main>

      {/* Modal for Request/Response Inspection */}
      {selectedPayloadLog && (
        <PayloadModal
          log={selectedPayloadLog}
          onClose={() => setSelectedPayloadLog(null)}
        />
      )}
    </div>
  );
}
