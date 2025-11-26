# Y-Grid

HTML5 Canvas ベースの高性能ウェブグリッドコンポーネント。

[English](./README.md) | [中文](./README_zh.md) | [한국어](./README_ko.md) | [Español](./README_es.md)

[x-spreadsheet](https://github.com/myliang/x-spreadsheet) からフォーク。

## インストール

```shell
npm install y-grid
```

## 使用方法

```html
<div id="y-grid"></div>
```

```typescript
import YGrid from 'y-grid';
import 'y-grid/style.css';

const grid = new YGrid('#y-grid')
  .loadData({})
  .change(data => {
    // データを保存
  });
```

### オプション

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

### イベント

```typescript
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### セル操作

```typescript
// セルテキストを更新: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// セルを取得: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// セルスタイルを取得: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

### CSV インポート

```typescript
// ファイルからインポート
await grid.importCSV(file);

// テキストからインポート
grid.importCSVText('name,age\nJohn,30\nJane,25');
```

## 機能

- Canvas ベースのレンダリング
- 完全な TypeScript サポート
- 元に戻す & やり直し
- コピー、カット、ペースト
- セルの書式設定（フォント、色、罫線、配置）
- セルの結合
- 行/列の固定
- 基本的な数式（SUM、AVERAGE、MAX、MIN、IF、AND、OR、CONCAT）
- 行/列のサイズ変更、挿入、削除、非表示
- 複数シート
- データ検証
- CSV インポート（内蔵、RFC 4180 準拠）

## 開発

TypeScript で書かれた npm workspaces ベースのモノレポです。

```shell
git clone https://github.com/user/y-grid.git
cd y-grid
npm install
npm run dev
```

ブラウザで http://localhost:8080 を開きます。

### コマンド

```shell
npm run dev        # 開発サーバーを起動
npm run build      # 本番用ビルド
npm run test       # テストを実行
npm run lint       # リントチェック
npm run typecheck  # 型チェック
```

## ブラウザサポート

モダンブラウザ（Chrome、Firefox、Safari、Edge）。

## ライセンス

MIT
