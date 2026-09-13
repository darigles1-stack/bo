# CONTEXT: Backoffice Salminus (React + Vite)
**Banco de Corrientes S.A. — Plataforma Salminus Middleware**

## 1. Identificación del Proyecto
* **Nombre:** `back_office_salminus`
* **Tipo:** Single Page Application (SPA) en React 18 + Vite con Backend API Express / MongoDB Driver
* **Puertos de Red:**
  * Frontend React (Vite Dev Server): `3000`
  * Backend API & Conector MongoDB (Express): `3031`
  * Microservicio de Auditoría upstream (`ms-audit`): `8089`
  * Microservicio de Preferencias & DIAG.FLOW upstream (`ms-preferencia`): `8099`
  * Motor de Base de Datos NoSQL MongoDB: `27017` (`salminus_audit`)

## 2. Propósito y Alcance
Proporcionar una interfaz gráfica corporativa moderna para el equipo de desarrollo, arquitectura y operaciones SRE de Banco de Corrientes, permitiendo:
1. **Auditoría e Inspección Visual en Tiempo Real:** Visualizar los registros de auditoría almacenados en la colección `audit_full_payloads` de MongoDB con información completa de requests, responses, cabeceras, códigos HTTP y latencias.
2. **Validación de Blindaje PCI-DSS:** Confirmar visualmente que contraseñas, tokens JWT, CVVs y PINs viajen ofuscados con asteriscos antes de ser persistidos.
3. **Árbol Jerárquico Padre-Hijo (Trace Waterfall):** Reconstruir la secuencia de ejecución distribuida de una transacción identificada por `traceId` (Paso 0: Inbound Controller, Paso 1: Outbound BSM, Paso 2: Outbound Bantotal BTS).
4. **Control Centralizado DIAG.FLOW:** Activar o apagar banderas de diagnóstico detallado en caliente para microservicios individuales o globales, con definición de TTL y justificación de auditoría.
5. **Explorador Directo BSON MongoDB:** Monitoreo y consulta cruda de colecciones en `salminus_audit` mediante el driver nativo de MongoDB.

## 3. Arquitectura del Componente
```
   [ Navegador Web ] (http://localhost:3000)
          │
     Vite Dev Server (Port 3000)
          │ (Proxy inverso /api/*)
          ├──► /api/mongo/* ──► Backend Express (Port 3031) ──► MongoDB (Port 27017: salminus_audit)
          ├──► /api/audit/* ──► ms-audit (Port 8089) ────────► MongoDB (audit_full_payloads)
          └──► /api/pref/*  ──► ms-preferencia (Port 8099) ──► DB2 BTC011 / Redis Sentinel
```

## 4. Estándar de Ejecución
* **Arranque en 1 Clic (Windows):** `start-backoffice.bat` (instala dependencias si faltan, levanta backend 3031, frontend 3000 y abre el navegador).
* **Arranque por Comandos:**
  * Terminal 1: `npm run server`
  * Terminal 2: `npm run dev`
* **Compilación de Producción:** `npm run build` genera bundle estático en `dist/`.
