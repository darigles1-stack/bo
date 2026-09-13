# 🏛️ Salminus Backoffice (React + Vite) — Panel de Auditoría MongoDB & Control DIAG.FLOW
**Banco de Corrientes S.A. — Plataforma Salminus**  
*Versión:* 2.0.0 (React 18 + Vite) | *Fecha:* Septiembre 2026 | *Ambiente:* Dev / Staging / Prod

---

## 📌 1. Propósito del Backoffice

Esta aplicación web construida en **React 18 con Vite** proporciona un panel administrativo moderno de alta fidelidad para:
1. **Consultar e inspeccionar los logs de auditoría en tiempo real en MongoDB** (`audit_full_payloads`) mediante doble vía:
   - **Directa**: Conector nativo MongoDB (`mongodb://localhost:27017/salminus_audit`).
   - **Microservicios**: Consumo REST a través de `ms-audit` (puerto 8089).
2. **Revisar payloads completos de Request y Response** con blindaje PCI-DSS, metadatos de canal, dispositivo y latencia.
3. **Explorar el Árbol Jerárquico Padre-Hijo (Trace Waterfall)**: Permite visualizar paso a paso la ejecución de una transacción desde el evento Padre (INBOUND `ms-auth`) hasta las llamadas downstream Hijas (OUTBOUND `ms-bsmproxy`, `ms-btservicesproxy`, etc.).
4. **Controlar el Diagnóstico en Caliente (DIAG.FLOW)**: Activar o desactivar flags de diagnóstico por microservicio directamente en DB2 (`faccnl.btc011`) y Redis sin reiniciar instancias.
5. **Explorador Directo BSON MongoDB**: Inspeccionar el estado de la base de datos `salminus_audit`, conteo de documentos y estructura BSON cruda.

---

## 🚀 2. Cómo Iniciar el Backoffice

### Opción A (Recomendada - 1 Solo Clic): Mediante el script automático
Doble clic en Windows sobre `start-backoffice.bat` o ejecutar en PowerShell/CMD:
```powershell
cd c:\Proyectos\MicroServi\back_office_salminus
.\start-backoffice.bat
```
*El script levantará el backend API en el puerto 3031, el dev server de Vite en el puerto 3000 y abrirá automáticamente tu navegador en `http://localhost:3000`.*

### Opción B: Ejecución manual con npm
```powershell
cd c:\Proyectos\MicroServi\back_office_salminus
# Iniciar backend conector MongoDB:
npm run server

# En otra consola, iniciar React Vite:
npm run dev
```
Acceder en el navegador a: [http://localhost:3000](http://localhost:3000)

### Opción C: Compilar bundle para producción
```powershell
npm run build
npm run server
```
*El servidor Node servirá automáticamente la versión compilada en `http://localhost:3031`.*

---

## 🧭 3. Vistas y Componentes React

- **Auditoría MongoDB (`AuditTable.jsx`)**: Métricas de éxito/fallo en vivo, filtros combinados (CUIL, TraceID, Canal, Microservicio, Categoría HTTP) y tabla con badges y acciones.
- **Modal RQ/RS (`PayloadModal.jsx`)**: Visor dual con formateo JSON, resaltado y botón de copiado con 1 clic.
- **Árbol Padre-Hijo (`TraceWaterfall.jsx`)**: Cascada cronológica de ejecución distribuida por `stepOrder`.
- **Panel DIAG.FLOW (`DiagFlowControl.jsx`)**: Grilla de microservicios con switches dinámicos y temporizador de TTL regresivo.
- **Explorador BSON MongoDB (`MongoDirectExplorer.jsx`)**: Estadísticas de motor Mongo, colecciones y vista previa de documentos BSON.

- Permite ajustar las URLs base de `ms-audit` (por defecto `http://localhost:8089`) y `ms-preferencia` (por defecto `http://localhost:8099`), y el intervalo de refresco automático.

---

## 🔌 4. Endpoints del Backend Consumidos

| Función | Microservicio | Endpoint |
| :--- | :--- | :--- |
| **Últimos 50 eventos** | `ms-audit` (8089) | `GET /api/v1/audit/latest` |
| **Búsqueda por Trace ID** | `ms-audit` (8089) | `GET /api/v1/audit/trace/{traceId}` |
| **Búsqueda por CUIL** | `ms-audit` (8089) | `GET /api/v1/audit/cuil/{cuil}` |
| **Filtro por Canal** | `ms-audit` (8089) | `GET /api/v1/audit/channel/{channel}` |
| **Healthcheck Auditoría** | `ms-audit` (8089) | `GET /api/v1/audit/ping` |
| **Configuraciones DIAG.FLOW** | `ms-preferencia` (8099) | `GET /admin/diag/config` |
| **Actualizar DIAG.FLOW** | `ms-preferencia` (8099) | `PUT /admin/diag/config/{service}` |
