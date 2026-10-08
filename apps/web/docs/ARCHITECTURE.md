# Turnify Web - Arquitectura y estructura

## Resumen
El front de `turnify-web` se ha reorganizado para ser más mantenible y escalable.
La estructura ahora separa componentes comunes, de dominio, vistas, hooks y utilidades.

## Estructura principal

```
apps/web/src/
├── components/
│   ├── common/          # Componentes reutilizables base
│   │   ├── layout/      # PageHeader, SectionCard, StatsRow, CardGrid, TwoColumnGrid, FiltersBar
│   │   ├── data-display/# EmptyState, CardNote, MiniStat, InfoCell, Badge
│   │   ├── forms/       # SelectField, TextField, NumberField, TextareaField, SwitchField, RadioGroup, CheckboxGroup, SegmentedControl
│   │   ├── modals/      # DetailModal, ConfirmModal, FormModal
│   │   └── charts/      # (preparado para futuros gráficos reutilizables)
│   └── domain/          # Componentes específicos del negocio (preparado para uso futuro)
│       ├── queue/
│       ├── team/
│       ├── services/
│       ├── history/
│       └── config/
├── hooks/               # useMediaQuery, useFilters, usePrint
├── utils/               # (utilidades futuras)
├── data/                # Tipos y fixtures
├── views/               # Vistas principales
└── components/ui/       # Componentes UI de bajo nivel (Button, Card, Modal, etc.)
```

## Componentes comunes creados

| Componente | Archivo | Uso |
|------------|---------|-----|
| `PageHeader` | `components/common/layout/PageHeader.tsx` | Header unificado con título, subtítulo y acciones |
| `SectionCard` | `components/common/layout/SectionCard.tsx` | Card con encabezado estándar (título, detalle, acción) |
| `StatsRow` | `components/common/layout/StatsRow.tsx` | Fila de tarjetas de estadísticas |
| `CardGrid` | `components/common/layout/CardGrid.tsx` | Grid responsive para cards |
| `TwoColumnGrid` | `components/common/layout/TwoColumnGrid.tsx` | Grid de 2 columnas |
| `FiltersBar` | `components/common/layout/FiltersBar.tsx` | Barra de filtros con búsqueda |
| `SelectField` | `components/common/forms/SelectField.tsx` | Campo select + label + ayuda |
| `TextField` | `components/common/forms/TextField.tsx` | Campo texto + label + ayuda |
| `NumberField` | `components/common/forms/NumberField.tsx` | Campo numérico + label + ayuda |
| `TextareaField` | `components/common/forms/TextareaField.tsx` | Textarea + label + ayuda |
| `SwitchField` | `components/common/forms/SwitchField.tsx` | Switch + label + detalle |
| `RadioGroup` | `components/common/forms/RadioGroup.tsx` | Grupo de radio buttons |
| `CheckboxGroup` | `components/common/forms/CheckboxGroup.tsx` | Grupo de checkboxes |
| `SegmentedControl` | `components/common/forms/SegmentedControl.tsx` | Control segmentado |
| `DetailModal` | `components/common/modals/DetailModal.tsx` | Modal de detalle |
| `ConfirmModal` | `components/common/modals/ConfirmModal.tsx` | Modal de confirmación |
| `FormModal` | `components/common/modals/FormModal.tsx` | Modal de formulario |
| `MiniStat` | `components/common/data-display/MiniStat.tsx` | Estadística mini |
| `InfoCell` | `components/common/data-display/InfoCell.tsx` | Celda de info |
| `CardNote` | `components/common/data-display/CardNote.tsx` | Nota dentro de card |
| `EmptyState` | `components/common/data-display/EmptyState.tsx` | Estado vacío |

## Vistas refactorizadas

| Vista | Cambios realizados |
|-------|--------------------|
| `configuration-view.tsx` | Usa `PageHeader`, `StatsRow`, `CardGrid`, `SectionCard`, y todos los campos comunes |
| `dashboard-view.tsx` | Usa `PageHeader` y `TwoColumnGrid` |
| `services-view.tsx` | Usa `PageHeader`, `StatsRow`, `SectionCard` |
| `team-view.tsx` | Usa `PageHeader`, `StatsRow`, `SectionCard` |
| `history-view.tsx` | Usa `PageHeader` y `StatsRow` |
| `queue-view.tsx` | Header, secciones y grids reemplazados por componentes comunes |

## Hooks reutilizables

| Hook | Archivo | Descripción |
|------|---------|-------------|
| `useMediaQuery` | `hooks/useMediaQuery.ts` | Detecta media queries responsive |
| `useFilters` | `hooks/useFilters.ts` | Helper para filtrado |
| `usePrint` | `hooks/usePrint.ts` | Maneja `beforeprint`/`afterprint` |

## Notas
- **Diseño visual**: no se cambió nada, solo se extrajo estructura.
- **TypeScript**: `verbatimModuleSyntax` está habilitado, los imports de tipos deben usar `import type`.
- **Tokens CSS**: se usan `var(--surface)`, `var(--ink)`, `var(--border)`, `var(--text-*)` existentes.

## Próximos pasos sugeridos
1. Crear componentes de dominio más específicos (ej. `StationCard`, `StaffRow`, `ServiceRow`, `HistoryRow`) en `components/domain/`.
2. Extraer más lógica de vistas a hooks (`useQueueState`, `useTeamFilters`, etc.).
3. Agregar Storybook o pruebas unitarias por componente.
