# AutoImport Italia - Interface Admin

Interface d'administration pour la plateforme AutoImport Italia, développée avec React, TypeScript, Vite et Shadcn UI.

## 🚀 Technologies utilisées

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool et dev server
- **Tanstack Router** - Routing moderne et type-safe
- **Shadcn UI** - Composants UI (theme neutral)
- **Tailwind CSS** - Framework CSS utility-first
- **Lucide React** - Icônes
- **Radix UI** - Composants accessibles

## 📦 Installation

```bash
npm install
```

## 🔧 Développement

Démarrer le serveur de développement :

```bash
npm run dev
```

L'application sera accessible sur http://localhost:5173/

## 🏗️ Build

Créer une version de production :

```bash
npm run build
```

Prévisualiser la version de production :

```bash
npm run preview
```

## 📁 Structure du projet

```
admin/
├── src/
│   ├── components/
│   │   ├── layout/          # Composants de layout (sidebar, header, dashboard-layout)
│   │   └── ui/              # Composants UI Shadcn
│   ├── lib/
│   │   └── utils.ts         # Utilitaires (cn helper)
│   ├── routes/              # Routes Tanstack Router
│   │   ├── __root.tsx       # Route racine
│   │   ├── index.tsx        # Dashboard principal
│   │   ├── users.tsx        # Gestion des utilisateurs
│   │   ├── vehicles.tsx     # Gestion des véhicules
│   │   ├── quotes.tsx       # Gestion des devis
│   │   ├── imports.tsx      # Gestion des importations
│   │   ├── sellers.tsx      # Gestion des vendeurs
│   │   ├── conversations.tsx # Messagerie
│   │   ├── documents.tsx    # Gestion des documents
│   │   ├── notifications.tsx # Notifications
│   │   ├── external-listings.tsx # Listings externes
│   │   └── analytics.tsx    # Analytics
│   ├── index.css            # Styles globaux + theme Shadcn
│   └── main.tsx             # Point d'entrée
├── public/                  # Assets statiques
└── package.json
```

## 🎨 Theme

Le projet utilise le **theme neutral** de Shadcn UI avec une palette de couleurs sobre et professionnelle, parfaitement adaptée à une interface d'administration.

## 📊 Pages disponibles

### ✅ Pages complètes avec données mock
- **Dashboard** (`/`) - Vue d'ensemble avec statistiques
- **Utilisateurs** (`/users`) - Liste et gestion des utilisateurs
- **Véhicules** (`/vehicles`) - Catalogue de véhicules
- **Devis** (`/quotes`) - Gestion des devis
- **Importations** (`/imports`) - Suivi des importations

### 🚧 Pages en cours de développement
- **Vendeurs** (`/sellers`)
- **Conversations** (`/conversations`)
- **Documents** (`/documents`)
- **Notifications** (`/notifications`)
- **Listings externes** (`/external-listings`)
- **Analytics** (`/analytics`)

## 🔗 Intégration Backend

L'application est prête à être connectée au backend NestJS. Les pages utilisent actuellement des données mock qui peuvent être facilement remplacées par des appels API.

### Endpoints backend disponibles (à intégrer)

```typescript
// Authentification
POST /auth/login
POST /auth/register
GET  /auth/me

// Utilisateurs
GET    /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id

// Véhicules
GET    /vehicles
GET    /vehicles/:id
POST   /vehicles
PATCH  /vehicles/:id
DELETE /vehicles/:id

// Devis
GET    /quotes
POST   /quotes
PATCH  /quotes/:id/accept
PATCH  /quotes/:id/reject

// Importations
GET    /imports
GET    /imports/:id
PATCH  /imports/:id

// Et plus...
```

## 🎯 Prochaines étapes

1. ✅ Setup initial du projet
2. ✅ Configuration Tailwind + Shadcn UI
3. ✅ Layout dashboard avec sidebar et header
4. ✅ Pages principales avec données mock
5. 🔄 Intégration API backend
6. 🔄 Authentification JWT
7. 🔄 Gestion d'état globale (TanStack Query)
8. 🔄 Formulaires de création/édition
9. 🔄 Upload de fichiers (documents)
10. 🔄 Système de notifications temps réel

## 📝 Notes

- Les données actuelles sont des mocks et doivent être remplacées par les vrais appels API
- L'authentification n'est pas encore implémentée
- Le routing est entièrement type-safe grâce à Tanstack Router
- Tous les composants UI suivent les guidelines de Shadcn UI

## 🤝 Contribution

Pour ajouter une nouvelle page :

1. Créer un fichier dans `src/routes/` (ex: `my-page.tsx`)
2. Utiliser le composant `DashboardLayout`
3. Exporter la route avec `createFileRoute`
4. Ajouter le lien dans le sidebar (`src/components/layout/sidebar.tsx`)

## 📄 License

Projet privé - AutoImport Italia
