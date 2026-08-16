Architecture :
┌───────────────────────────────────────────────┐
│                  Frontend                     │
│                                               │
│ React 19 + TypeScript                         │
│ Vite + Tailwind CSS                           │
│                                               │
│ src/App.tsx                                   │
│ src/components/                               │
└──────────────────────┬────────────────────────┘
                       │
                       │ HTTP REST API
                       │ JSON
                       ▼
┌───────────────────────────────────────────────┐
│                  Backend                      │
│                                               │
│ Express + TypeScript                          │
│ server/server.ts                              │
│                                               │
│ JWT Authentication                            │
│ bcrypt Password Hashing                       │
│ REST API Endpoints                             │
└──────────────────────┬────────────────────────┘
                       │
                       │ SQL Queries
                       ▼
┌───────────────────────────────────────────────┐
│                 Database                      │
│                                               │
│ SQLite                                        │
│                                               │
│ taskflow.db                                   │
└───────────────────────────────────────────────┘
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
3. Run the app:
   `npm start`
