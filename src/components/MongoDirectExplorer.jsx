import React, { useState, useEffect } from 'react';
import { Database, Table, RefreshCw, FileText, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export default function MongoDirectExplorer() {
  const [mongoStatus, setMongoStatus] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rawDocs, setRawDocs] = useState([]);
  const [selectedCol, setSelectedCol] = useState('audit_full_payloads');
  const [docLimit, setDocLimit] = useState(10);
  const [fetchingDocs, setFetchingDocs] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchCollections();
    fetchRawDocuments('audit_full_payloads', 10);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/mongo/status');
      const data = await res.json();
      setMongoStatus(data);
    } catch (err) {
      setMongoStatus({ status: 'DOWN', error: err.message });
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mongo/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRawDocuments = async (colName, limit) => {
    setFetchingDocs(true);
    try {
      const res = await fetch(`/api/mongo/logs?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setRawDocs(data.logs || []);
      }
    } catch {
      setRawDocs([]);
    } finally {
      setFetchingDocs(false);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="card-title">
            <Database color="#10b981" size={20} />
            Explorador Directo de MongoDB (`salminus_audit`)
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Acceso directo mediante el driver nativo de MongoDB para validar la estructura interna de documentos BSON.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => { fetchStatus(); fetchCollections(); }} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'pulse' : ''} /> Refrescar Estado
        </button>
      </div>

      {/* Connection Info Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card" style={{ padding: '1rem', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado Motor Mongo</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: mongoStatus?.status === 'UP' ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}>
            {mongoStatus?.status === 'UP' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {mongoStatus?.status || 'VERIFICANDO...'}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base de Datos</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00d2ff', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {mongoStatus?.database || 'salminus_audit'}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Colección Principal</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f3f4f6', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            audit_full_payloads
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', margin: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Documentos</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {mongoStatus?.totalRecords != null ? mongoStatus.totalRecords : '-'}
          </div>
        </div>
      </div>

      {/* Raw Document Inspector */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={18} color="#00d2ff" />
            <strong style={{ color: '#fff' }}>Documentos en Colección: {selectedCol}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Límite:</span>
            <select
              className="select-field"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
              value={docLimit}
              onChange={(e) => {
                const lim = Number(e.target.value);
                setDocLimit(lim);
                fetchRawDocuments(selectedCol, lim);
              }}
            >
              <option value="5">5 docs</option>
              <option value="10">10 docs</option>
              <option value="25">25 docs</option>
              <option value="50">50 docs</option>
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchRawDocuments(selectedCol, docLimit)}
              disabled={fetchingDocs}
            >
              <RefreshCw size={12} className={fetchingDocs ? 'pulse' : ''} /> Consultar
            </button>
          </div>
        </div>

        {fetchingDocs ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }} className="pulse">
            Consultando MongoDB directamente...
          </div>
        ) : rawDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No hay documentos persistidos en la colección o MongoDB no está accesible en `mongodb://localhost:27017`.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rawDocs.map((doc, idx) => (
              <div key={doc._id || doc.id || idx} style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge" style={{ background: '#1f2937' }}>Doc #{idx + 1}</span>
                    <span className="mono-text" style={{ color: '#38bdf8' }}>_id: {String(doc._id || doc.id)}</span>
                    <span className="badge badge-service">{doc.serviceName || 'ms-auth'}</span>
                  </div>
                  <span className="mono-text" style={{ fontSize: '0.72rem' }}>
                    {doc.timestamp ? new Date(doc.timestamp).toLocaleString('es-AR') : '-'}
                  </span>
                </div>
                <pre className="code-box" style={{ maxHeight: '200px' }}>
                  {JSON.stringify(doc, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
