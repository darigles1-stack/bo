import React, { useEffect, useState } from 'react';
import { Search, Clock, Eye } from 'lucide-react';

export default function TraceWaterfall({ initialTraceId, onViewPayload, embedded = false }) {
  const [traceId, setTraceId] = useState(initialTraceId || '');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialTraceId) {
      setTraceId(initialTraceId);
      fetchTrace(initialTraceId);
    }
  }, [initialTraceId]);

  const fetchTrace = async (idToSearch) => {
    const id = (idToSearch || traceId).trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      let res = await fetch(`/api/mongo/operations/${id}`);
      if (!res.ok) res = await fetch(`/api/mongo/trace/${id}`);
      if (!res.ok) res = await fetch(`/api/audit/trace/${id}`);
      if (!res.ok) throw new Error(`No se encontró la traza (${res.status})`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.pasos || data.steps || [];
      setSteps(list);
    } catch (err) {
      setError(err.message);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const totalDuration =
    steps.reduce((acc, step) => acc + (typeof step.durationMs === 'number' ? step.durationMs : 10), 0) || 1;

  return (
    <div className={embedded ? '' : 'card'}>
      {!embedded && (
        <div className="card-header">
          <div className="card-title">Detalle de traza</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.55rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="Trace ID"
          value={traceId}
          onChange={(e) => setTraceId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchTrace()}
        />
        <button type="button" className="btn btn-primary" onClick={() => fetchTrace()} disabled={loading}>
          <Search size={14} /> Buscar
        </button>
      </div>

      {loading && <div className="state-box pulse">Reconstruyendo secuencia…</div>}

      {error && (
        <div style={{
          padding: '0.85rem 1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.28)',
          color: '#fecaca',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem',
          fontSize: '0.86rem',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && steps.length === 0 && (
        <div className="state-box">Seleccioná una operación del listado o ingresá un Trace ID.</div>
      )}

      {!loading && steps.length > 0 && (
        <>
          <div className="meta-grid">
            <div>
              <span>Trace ID</span><br />
              <strong className="mono" style={{ color: '#93c5fd' }}>{traceId}</strong>
            </div>
            <div>
              <span>Pasos</span><br />
              <strong>{steps.length}</strong>
            </div>
            <div>
              <span>Duración acumulada</span><br />
              <strong style={{ color: '#86efac' }}>{totalDuration} ms</strong>
            </div>
          </div>

          <div className="timeline">
            {steps.map((step, index) => {
              const isParent = step.stepOrder === 0 || step.parentSpanId == null;
              const stepPercent = Math.max(Math.round(((step.durationMs || 10) / totalDuration) * 100), 8);
              const isError = (step.statusCode || 0) >= 400;

              return (
                <div
                  key={step.id || step._id || step.spanId || index}
                  className={`step-card ${isParent ? '' : 'child'} ${isError ? 'error' : ''}`}
                >
                  <div className="step-top">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <span className={`badge ${isParent ? 'badge-service' : 'badge-channel'}`}>
                        {isParent ? 'Servicio principal' : `Paso ${step.stepOrder ?? index}`}
                      </span>
                      <span className="badge badge-muted">{step.nombre || step.serviceName || 'servicio'}</span>
                      <strong style={{ fontSize: '0.9rem' }}>
                        {step.descripcion || step.eventType || (isParent ? 'Solicitud entrante' : 'Llamado externo')}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className={`badge ${isError ? 'badge-danger' : 'badge-success'}`}>
                        {step.statusCode || 200}
                      </span>
                      <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {step.durationMs || 0} ms
                      </span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onViewPayload?.(step)}>
                        <Eye size={12} /> Request / Response
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Endpoint: </span>
                    <code style={{ color: '#e2e8f0' }}>{step.httpMethod} {step.endpoint}</code>
                  </div>

                  <div className="bar-track">
                    <div
                      className={`bar-fill ${isError ? 'err' : isParent ? '' : 'child'}`}
                      style={{ width: `${stepPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
