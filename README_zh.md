# Y-Grid

基于 HTML5 Canvas 的高性能网页表格组件。

[English](./README.md) | [한국어](./README_ko.md) | [日本語](./README_ja.md) | [Español](./README_es.md)

Fork 自 [x-spreadsheet](https://github.com/myliang/x-spreadsheet)。

## 安装

```shell
npm install y-grid
```

## 使用

```html
<div id="y-grid"></div>
```

```typescript
import YGrid from 'y-grid';
import 'y-grid/style.css';

const grid = new YGrid('#y-grid')
  .loadData({})
  .change(data => {
    // 保存数据
  });
```

### 配置项

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

### 事件

```typescript
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### 单元格操作

```typescript
// 更新单元格文本: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// 获取单元格: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// 获取单元格样式: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

### CSV 导入

```typescript
// 从文件导入
await grid.importCSV(file);

// 从文本导入
grid.importCSVText('name,age\nJohn,30\nJane,25');
```

## 功能特性

- Canvas 渲染
- 完整 TypeScript 支持
- 撤销 & 重做
- 复制、剪切、粘贴
- 单元格格式化（字体、颜色、边框、对齐）
- 合并单元格
- 冻结行/列
- 基础公式（SUM、AVERAGE、MAX、MIN、IF、AND、OR、CONCAT）
- 行/列调整大小、插入、删除、隐藏
- 多工作表
- 数据验证
- CSV 导入（内置，符合 RFC 4180 标准）

## 开发

本项目使用 npm workspaces 的 monorepo 结构，使用 TypeScript 编写。

```shell
git clone https://github.com/user/y-grid.git
cd y-grid
npm install
npm run dev
```

打开浏览器访问 http://localhost:8080。

### 命令

```shell
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run test       # 运行测试
npm run lint       # 代码检查
npm run typecheck  # 类型检查
```

## 浏览器支持

现代浏览器（Chrome、Firefox、Safari、Edge）。

## 许可证

MIT
