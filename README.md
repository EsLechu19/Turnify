# Turnify

Base inicial del MVP: aplicación móvil (Expo), aplicación web (Vite + React) y Supabase.

## Estructura

- `apps/mobile`: aplicación móvil con Expo (SDK 57).
- `apps/web`: aplicación web con Vite y React + TypeScript.
- `packages/types`: tipos compartidos.
- `supabase/migrations`: migraciones de la base de datos.
- `docs/adr`: decisiones de arquitectura.

## Operations

- [Called-ticket Android push runbook](docs/operations/called-ticket-push.md)

## Requisitos previos

- Node.js LTS.
- Expo CLI (solo para desarrollo móvil).
- Supabase CLI (solo para migraciones locales).

## Configuración

1. Copie `.env.example` a `.env` y complete los valores.
2. Instale las dependencias (pendiente, ver Pasos siguientes).

## Pasos siguientes

- Ejecutar `npm install` en la raíz (instalación de workspaces).
- Generar el proyecto Expo con `npx create-expo-app` o inicializar con la versión SDK 57.
- Generar el proyecto web con `npm create vite@latest`.
