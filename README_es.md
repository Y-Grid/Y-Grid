# Y-Grid

Componente de cuadrícula web de alto rendimiento basado en HTML5 Canvas.

[English](./README.md) | [中文](./README_zh.md) | [한국어](./README_ko.md) | [日本語](./README_ja.md)

Fork de [x-spreadsheet](https://github.com/myliang/x-spreadsheet).

## Instalación

```shell
npm install y-grid
```

## Uso

```html
<div id="y-grid"></div>
```

```typescript
import YGrid from 'y-grid';
import 'y-grid/style.css';

const grid = new YGrid('#y-grid')
  .loadData({})
  .change(data => {
    // guardar datos
  });
```

### Opciones

```typescript
{
  mode: 'edit', // edit | read
  showToolbar: true,
  showGrid: true,
  showContextmenu: true,
  view: {
    height: () => document.documentElement.clientHeight,
    width: () => document.documentElement.clientWidth,
  },
  row: {
    len: 100,
    height: 25,
  },
  col: {
    len: 26,
    width: 100,
    indexWidth: 60,
    minWidth: 60,
  },
  style: {
    bgcolor: '#ffffff',
    align: 'left',
    valign: 'middle',
    textwrap: false,
    strike: false,
    underline: false,
    color: '#0a0a0a',
    font: {
      name: 'Helvetica',
      size: 10,
      bold: false,
      italic: false,
    },
  },
}
```

### Eventos

```typescript
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### Operaciones de Celda

```typescript
// Actualizar texto de celda: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// Obtener celda: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// Obtener estilo de celda: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

### Importar CSV

```typescript
// Importar desde archivo
await grid.importCSV(file);

// Importar desde texto
grid.importCSVText('name,age\nJohn,30\nJane,25');
```

## Características

- Renderizado basado en Canvas
- Soporte completo de TypeScript
- Deshacer y Rehacer
- Copiar, Cortar, Pegar
- Formato de celdas (fuente, color, bordes, alineación)
- Combinar celdas
- Congelar filas/columnas
- Fórmulas básicas (SUM, AVERAGE, MAX, MIN, IF, AND, OR, CONCAT)
- Redimensionar, insertar, eliminar, ocultar filas/columnas
- Múltiples hojas
- Validación de datos
- Importación CSV (integrado, compatible con RFC 4180)

## Desarrollo

Este es un monorepo usando npm workspaces, escrito en TypeScript.

```shell
git clone https://github.com/user/y-grid.git
cd y-grid
npm install
npm run dev
```

Abre tu navegador y visita http://localhost:8080.

### Comandos

```shell
npm run dev        # Iniciar servidor de desarrollo
npm run build      # Compilar para producción
npm run test       # Ejecutar pruebas
npm run lint       # Verificar código
npm run typecheck  # Verificar tipos
```

## Soporte de Navegadores

Navegadores modernos (Chrome, Firefox, Safari, Edge).

## Licencia

MIT
