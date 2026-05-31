# Financia SaaS — Control Financiero Personal

Plataforma moderna, profesional y automatizada para administrar tu vida financiera desde cualquier lugar.

## Stack Tecnológico

- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** SQLite (WAL mode, foreign keys)
- **Frontend:** React 18 + TypeScript + Vite
- **Charts:** Recharts (gráficas avanzadas)
- **PWA:** Workbox (instalable en Android/iOS/Desktop)
- **IA:** OpenAI GPT-4o-mini (con fallback local)
- **WS:** WebSocket (sincronización en tiempo real)
- **Auth:** JWT + bcrypt

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
# Instalar dependencias del servidor
cd server && npm install

# Instalar dependencias del cliente
cd ../client && npm install

# (Opcional) Sembrar base de datos con datos demo
cd ../server && npm run seed
```

## Ejecución

```bash
# Iniciar servidor (puerto 3001)
cd server && npm run dev

# En otra terminal, iniciar cliente (puerto 5173)
cd client && npm run dev
```

O desde la raíz:

```bash
npm install -g concurrently
npm run dev
```

## Credenciales Demo

- **Email:** demo@financia.app
- **Password:** demo1234

## Arquitectura

```
financia-saas/
├── server/                  # Backend API
│   ├── src/
│   │   ├── index.ts         # Servidor Express + WebSocket
│   │   ├── config.ts        # Configuración
│   │   ├── database.ts      # SQLite schema + migraciones
│   │   ├── middleware/
│   │   │   └── auth.ts      # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts      # Registro/Login/Perfil
│   │   │   ├── accounts.ts  # CRUD cuentas
│   │   │   ├── transactions.ts  # CRUD transacciones
│   │   │   ├── debts.ts     # CRUD deudas
│   │   │   ├── goals.ts     # CRUD metas
│   │   │   ├── analytics.ts # Dashboard, tendencias, health score
│   │   │   ├── ai.ts        # IA: análisis, plan pagos, predicciones
│   │   │   └── reports.ts   # PDF + Excel export
│   │   └── services/
│   │       └── ai.ts        # Servicio IA (OpenAI + fallback local)
│   └── .env
├── client/                  # Frontend React + PWA
│   ├── src/
│   │   ├── App.tsx          # Router + Protected Routes
│   │   ├── main.tsx         # Entry point
│   │   ├── styles.css       # Diseño premium oscuro
│   │   ├── types/           # TypeScript interfaces
│   │   ├── services/        # API, WebSocket, Cache
│   │   ├── components/      # Layout y shared
│   │   └── pages/           # 7 páginas/dashboards
│   └── vite.config.ts       # PWA + proxy
└── package.json
```

## Funcionalidades

### Core
- ✅ Dashboard principal con métricas en tiempo real
- ✅ Gestión de cuentas (CRUD)
- ✅ Registro de ingresos y gastos
- ✅ Control de deudas con progreso
- ✅ Metas financieras
- ✅ Calendario de pagos
- ✅ Recordatorios automáticos

### Analítica
- ✅ Gráficas de gastos por categoría
- ✅ Tendencia mensual (ingresos vs gastos)
- ✅ Health Score financiero
- ✅ Predicciones inteligentes
- ✅ Reportes PDF
- ✅ Exportación Excel

### IA
- ✅ Análisis financiero inteligente
- ✅ Detección de gastos innecesarios
- ✅ Plan personalizado de pago de deudas
- ✅ Proyección libre de deudas
- ✅ Consejos de salud financiera

### Técnico
- ✅ PWA instalable (Android/iOS/Windows/Mac)
- ✅ Sincronización WebSocket en tiempo real
- ✅ Autenticación JWT segura
- ✅ SQLite con WAL mode
- ✅ Diseño responsive (mobile-first)
- ✅ Modo oscuro premium
