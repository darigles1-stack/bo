import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Terminal } from 'lucide-react';

export default function PayloadModal({ log, onClose }) {
  const [copiedRq, setCopiedRq] = useState(false);
  const [copiedRs, setCopiedRs] = useState(false);

  if (!log) return null;

  const copyToClipboard = (data, isRq) => {
    const text = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data || '');
    navigator.clipboard.writeText(text);
    if (isRq) {
      setCopiedRq(true);
      setTimeout(() => setCopiedRq(false), 2000);
    } else {
      setCopiedRs(true);
      setTimeout(() => setCopiedRs(false), 2000);
    }
  };

  const formatJson = (data) => {
    if (!data) return '<Sin payload o nulo>';
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} color="#00d2ff" />
              Inspección de Payloads MongoDB
              <span className="badge badge-service">{log.serviceName}</span>
              <span className="badge" style={{ background: '#1f2937' }}>Step {log.stepOrder}</span>
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              TraceID: {log.traceId} &bull; SpanID: {log.spanId || 'n/a'}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Metadata banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            fontSize: '0.78rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>CUIL:</span>{' '}
              <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{log.userCuil || 'No aplica'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Canal:</span>{' '}
              <strong style={{ color: '#c4b5fd' }}>{log.channel || '-'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Endpoint:</span>{' '}
              <code style={{ color: '#38bdf8' }}>{log.httpMethod} {log.endpoint}</code>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
              <strong style={{ color: log.statusCode >= 400 ? '#f87171' : '#34d399' }}>
                {log.statusCode} ({log.statusCategory})
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Latencia:</span>{' '}
              <strong style={{ color: '#f3f4f6' }}>{log.durationMs} ms</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Blindaje PCI:</span>{' '}
              <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <ShieldCheck size={12} /> Sanitizado
              </span>
            </div>
          </div>

          {/* JSON Viewer Grid */}
          <div className="json-viewer-grid">
            {/* Request Payload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Request Payload
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(log.requestPayload, true)}
                >
                  {copiedRq ? <><Check size={12} color="#34d399" /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
              <pre className="code-box">
                {formatJson(log.requestPayload)}
              </pre>
            </div>

            {/* Response Payload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase' }}>
                  Response Payload
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(log.responsePayload, false)}
                >
                  {copiedRs ? <><Check size={12} color="#34d399" /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
              <pre className="code-box">
                {formatJson(log.responsePayload)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
