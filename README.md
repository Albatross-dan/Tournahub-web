# Tournahub

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E.svg?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)

A modern, high-performance tournament management platform engineered for organizing and tracking matches, eSports, and competitive sports leagues. Designed with precision, responsive ergonomics, and robust real-time updates.

---

## 🌟 Key Features

- **Automated Fixtures & Match Generation**: Seamlessly generate fair group-stage fixtures or knockout bracket trees with advanced dynamic seeding.
- **Dynamic Leaderboards & Standings**: Instantly calculated standings tables with real-time updates showcasing points, goals difference, matches played, and clean head-to-head records.
- **Interactive Knockout Trees**: Interactive visual visualizers for knockout stages (Quarterfinals, Semifinals, and Finals) built with smooth layout animations.
- **Advanced Participant Verification**: Built-in phone validation powered by `libphonenumber-js` supporting dynamic region codes, local patterns, and standard international formats.
- **Real-Time Data Syncing**: Fluid background cache updates and offline-ready persistence using TanStack Query.
- **Bespoke Responsive Layouts**: Visual experiences optimized desktop-first, with dedicated custom touch ergonomics for mobile and tablet screens.

---

## 🛠️ Technology Stack

- **Framework**: `React-19` with `Vite` for ultra-fast, cold-start compilation.
- **Type Safety**: Fully typed with strict `TypeScript`.
- **Backend & Authentication**: Built on `Supabase` covering robust Relational DB structures, Row-Level Security (RLS) policies, and secure auth flows.
- **Styling & Animations**: Rapid fluid styling using `Tailwind CSS` (v4), accompanied by layout animations via `Motion`.
- **Form Handlers**: Fast validation leveraging `React Hook Form` and `Zod` schemas.
- **Utility Integrations**: Global timezone detection, localized display formats, and smart phone verification.

---

## 🚀 Getting Started

Follow these steps to set up and run Tournahub locally.

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### 1. Clone the repository and install dependencies

```bash
# Install packages
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory. You can use the values outlined in `.env.example` as a template:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Development Server

Start the application locally:

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 📦 Production Deployment

To compile the application code for optimal fast-loading production delivery:

```bash
# Build static production assets
npm run build
```

This compiles optimized files into the `dist/` directory, ready to be hosted on Netlify, Vercel, Cloud Run, or any static deployment service.

---

## 🛡️ License

Manufactured for tournament coordinators worldwide. Custom setups and private licenses can be adjusted per implementation guidelines.
