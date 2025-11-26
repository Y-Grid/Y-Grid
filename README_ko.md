# Y-Grid

HTML5 Canvas 기반 고성능 웹 그리드 컴포넌트.

[English](./README.md) | [中文](./README_zh.md) | [日本語](./README_ja.md) | [Español](./README_es.md)

[x-spreadsheet](https://github.com/myliang/x-spreadsheet)에서 포크됨.

## 설치

```shell
npm install y-grid
```

## 사용법

```html
<div id="y-grid"></div>
```

```typescript
import YGrid from 'y-grid';
import 'y-grid/style.css';

const grid = new YGrid('#y-grid')
  .loadData({})
  .change(data => {
    // 데이터 저장
  });
```

### 옵션

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

### 이벤트

```typescript
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### 셀 작업

```typescript
// 셀 텍스트 업데이트: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// 셀 가져오기: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// 셀 스타일 가져오기: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

### CSV 가져오기

```typescript
// 파일에서 가져오기
await grid.importCSV(file);

// 텍스트에서 가져오기
grid.importCSVText('name,age\nJohn,30\nJane,25');
```

## 기능

- Canvas 기반 렌더링
- 완전한 TypeScript 지원
- 실행 취소 & 다시 실행
- 복사, 잘라내기, 붙여넣기
- 셀 서식 (글꼴, 색상, 테두리, 정렬)
- 셀 병합
- 행/열 고정
- 기본 수식 (SUM, AVERAGE, MAX, MIN, IF, AND, OR, CONCAT)
- 행/열 크기 조정, 삽입, 삭제, 숨기기
- 다중 시트
- 데이터 유효성 검사
- CSV 가져오기 (내장, RFC 4180 준수)

## 개발

TypeScript로 작성된 npm workspaces 기반 모노레포입니다.

```shell
git clone https://github.com/user/y-grid.git
cd y-grid
npm install
npm run dev
```

브라우저에서 http://localhost:8080 을 엽니다.

### 명령어

```shell
npm run dev        # 개발 서버 시작
npm run build      # 프로덕션 빌드
npm run test       # 테스트 실행
npm run lint       # 린트 검사
npm run typecheck  # 타입 검사
```

## 브라우저 지원

최신 브라우저 (Chrome, Firefox, Safari, Edge).

## 라이선스

MIT
