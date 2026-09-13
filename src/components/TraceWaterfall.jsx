import React, { useState, useEffect } from 'react';
import { GitBranch, Search, ArrowRight, Clock, Server, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

export default function TraceWaterfall({ initialTraceId, onViewPayload }) {
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
      // Intenta vía API backend local primero, si falla va por ms-audit proxy
      let res = await fetch(`/api/mongo/operations/${id}`);
      if (!res.ok) {
        res = await fetch(`/api/mongo/trace/${id}`);
      }
      if (!res.ok) {
        res = await fetch(`/api/audit/trace/${id}`);
      }
      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se encontró la traza en MongoDB`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.pasos || data.steps || []);
      setSteps(list);
    } catch (err) {
      setError(err.message);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular tiempo total acumulado para proporciones de waterfall
  const totalDuration = steps.reduce((acc, step) => acc + (step.durationMs || 10), 0) || 1;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <GitBranch color="#00d2ff" size={20} />
          Árbol Jerárquico Padre-Hijo (Trace Waterfall)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '500px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Pegar o escribir Trace ID..."
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTrace()}
          />
          <button className="btn btn-primary" onClick={() => fetchTrace()} disabled={loading}>
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }} className="pulse">
          Reconstruyendo cascada distribuida desde MongoDB...
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && steps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Ingresá un Trace ID arriba o hacé clic en el botón <strong>"Traza"</strong> desde la tabla de auditoría para ver la secuencia Padre-Hijo.
        </div>
      )}

      {!loading && steps.length > 0 && (
        <div>
          {/* Trace Summary Banner */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trace ID Seleccionado:</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>{traceId}</div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pasos Registrados:</span>
                <div style={{ fontWeight: 700, color: '#fff' }}>{steps.length} eventos</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Duración Estimada Total:</span>
                <div style={{ fontWeight: 700, color: '#10b981' }}>{totalDuration} ms</div>
              </div>
            </div>
          </div>

          {/* Waterfall Steps */}
          <div className="waterfall-container">
            {steps.map((step, index) => {
              const isParent = step.stepOrder === 0;
              const stepPercent = Math.max(Math.round(((step.durationMs || 10) / totalDuration) * 100), 8);
              const isError = step.statusCode >= 400 || step.statusCategory === '4XX' || step.statusCategory === '5XX';

              return (
                <div
                  key={step.id || step._id || index}
                  className="waterfall-step"
                  style={{
                    marginLeft: isParent ? '0' : `${Math.min(step.stepOrder * 24, 96)}px`,
                    borderLeft: isParent ? '3px solid #00d2ff' : '3px solid #8b5cf6'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span className="badge" style={{
                        background: isParent ? 'rgba(0, 210, 255, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                        color: isParent ? '#00d2ff' : '#c4b5fd',
                        fontWeight: 700
                      }}>
                        {isParent ? 'PADRE (Step 0)' : `HIJO (Step ${step.stepOrder})`}
                      </span>
                      <span className="badge badge-service">
                        {step.nombre || step.serviceName || 'ms'}
                      </span>
                      <strong style={{ color: '#fff', fontSize: '0.9rem' }}>
                        {step.descripcion || step.eventType || (isParent ? 'INBOUND_REQUEST' : 'OUTBOUND_CALL')}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={`badge ${isError ? 'badge-5xx' : 'badge-2xx'}`}>
                        {step.statusCode || 200}
                      </span>
                      <span className="mono-text" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                        {step.durationMs || 0} ms
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewPayload(step)}
                        title="Inspeccionar RQ/RS de este paso"
                      >
                        <Eye size={12} /> RQ/RS
                      </button>
                    </div>
                  </div>

                  {/* Operation details */}
                  <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Operación / URI:</span>{' '}
                      <code style={{ color: '#e5e7eb' }}>{step.httpMethod} {step.endpoint}</code>
                    </div>
                    {step.spanId && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Span ID:</span>{' '}
                        <span className="mono-text">{step.spanId}</span>
                      </div>
                    )}
                    {step.parentSpanId && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Parent Span:</span>{' '}
                        <span className="mono-text">{step.parentSpanId}</span>
                      </div>
                    )}
                  </div>

                  {/* Waterfall Bar */}
                  <div className="waterfall-bar-track">
                    <div
                      className="waterfall-bar-fill"
                      style={{
                        width: `${stepPercent}%`,
                        background: isError
                          ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                          : isParent
                          ? 'linear-gradient(90deg, #00d2ff, #0072ff)'
                          : 'linear-gradient(90deg, #8b5cf6, #6366f1)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
