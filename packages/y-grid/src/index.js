/* global window, document */
import { h } from './component/element';
import DataProxy from './core/data-proxy';
import Sheet from './component/sheet';
import Bottombar from './component/bottombar';
import { cssPrefix } from './config';
import { locale } from './locale/locale';
import { parseCSV, parseCSVFile } from './core/csv-parser';
import './index.less';


class YGrid {
  constructor(selectors, options = {}) {
    let targetEl = selectors;
    this.options = { showBottomBar: true, ...options };
    this.sheetIndex = 1;
    this.datas = [];
    if (typeof selectors === 'string') {
      targetEl = document.querySelector(selectors);
    }
    this.bottombar = this.options.showBottomBar ? new Bottombar(() => {
      if (this.options.mode === 'read') return;
      const d = this.addSheet();
      this.sheet.resetData(d);
    }, (index) => {
      const d = this.datas[index];
      this.sheet.resetData(d);
    }, () => {
      this.deleteSheet();
    }, (index, value) => {
      this.datas[index].name = value;
      this.sheet.trigger('change');
    }) : null;
    this.data = this.addSheet();
    const rootEl = h('div', `${cssPrefix}`)
      .on('contextmenu', evt => evt.preventDefault());
    // create canvas element
    targetEl.appendChild(rootEl.el);
    this.sheet = new Sheet(rootEl, this.data);
    if (this.bottombar !== null) {
      rootEl.child(this.bottombar.el);
    }
  }

  addSheet(name, active = true) {
    const n = name || `sheet${this.sheetIndex}`;
    const d = new DataProxy(n, this.options);
    d.change = (...args) => {
      this.sheet.trigger('change', ...args);
    };
    this.datas.push(d);
    // console.log('d:', n, d, this.datas);
    if (this.bottombar !== null) {
      this.bottombar.addItem(n, active, this.options);
    }
    this.sheetIndex += 1;
    return d;
  }

  deleteSheet() {
    if (this.bottombar === null) return;

    const [oldIndex, nindex] = this.bottombar.deleteItem();
    if (oldIndex >= 0) {
      this.datas.splice(oldIndex, 1);
      if (nindex >= 0) this.sheet.resetData(this.datas[nindex]);
      this.sheet.trigger('change');
    }
  }

  loadData(data) {
    const ds = Array.isArray(data) ? data : [data];
    if (this.bottombar !== null) {
      this.bottombar.clear();
    }
    this.datas = [];
    if (ds.length > 0) {
      for (let i = 0; i < ds.length; i += 1) {
        const it = ds[i];
        const nd = this.addSheet(it.name, i === 0);
        nd.setData(it);
        if (i === 0) {
          this.sheet.resetData(nd);
        }
      }
    }
    return this;
  }

  getData() {
    return this.datas.map(it => it.getData());
  }

  cellText(ri, ci, text, sheetIndex = 0) {
    this.datas[sheetIndex].setCellText(ri, ci, text, 'finished');
    return this;
  }

  cell(ri, ci, sheetIndex = 0) {
    return this.datas[sheetIndex].getCell(ri, ci);
  }

  cellStyle(ri, ci, sheetIndex = 0) {
    return this.datas[sheetIndex].getCellStyle(ri, ci);
  }

  reRender() {
    this.sheet.table.render();
    return this;
  }

  on(eventName, func) {
    this.sheet.on(eventName, func);
    return this;
  }

  validate() {
    const { validations } = this.data;
    return validations.errors.size <= 0;
  }

  change(cb) {
    this.sheet.on('change', cb);
    return this;
  }

  /**
   * Import CSV file into the grid
   * @param {File} file - CSV file to import
   * @param {Object} options - Parse options
   * @param {string} options.delimiter - Field delimiter (auto-detect if not specified)
   * @param {boolean} options.hasHeader - First row is header (default: true)
   * @returns {Promise<{rowCount: number, colCount: number}>}
   */
  async importCSV(file, options = {}) {
    const result = await parseCSVFile(file, options);
    this.loadCSVData(result);
    return {
      rowCount: result.rowCount,
      colCount: result.colCount,
    };
  }

  /**
   * Import CSV text into the grid
   * @param {string} text - CSV text to import
   * @param {Object} options - Parse options
   * @returns {{rowCount: number, colCount: number}}
   */
  importCSVText(text, options = {}) {
    const result = parseCSV(text, options);
    this.loadCSVData(result);
    return {
      rowCount: result.rowCount,
      colCount: result.colCount,
    };
  }

  /**
   * Load parsed CSV data into grid
   * @private
   */
  loadCSVData(result) {
    const { headers, data } = result;
    if (data.length === 0 && headers.length === 0) return;

    // Include headers as first row
    const allRows = headers.length > 0 ? [headers, ...data] : data;
    const rows = { len: allRows.length };

    allRows.forEach((row, ri) => {
      const cells = {};
      row.forEach((cell, ci) => {
        if (cell !== '') {
          cells[ci] = { text: cell };
        }
      });
      if (Object.keys(cells).length > 0) {
        rows[ri] = { cells };
      }
    });

    this.loadData([{ rows }]);
  }

  static locale(lang, message) {
    locale(lang, message);
  }
}

const ygrid = (el, options = {}) => new YGrid(el, options);

if (window) {
  window.YGrid = YGrid;
  window.ygrid = ygrid;
}

export default YGrid;
export {
  YGrid,
  ygrid,
};

// CSV Parser exports
export * as csvParser from './core/csv-parser';
