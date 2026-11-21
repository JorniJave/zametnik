import XLSX from 'xlsx-js-style';

const HEADER_FILL = { fgColor: { rgb: '2D3A5C' } };
const HEADER_FONT = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
const BORDER = {
  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
  right: { style: 'thin', color: { rgb: 'CCCCCC' } },
};
const ALT_FILL = { fgColor: { rgb: 'F5F7FB' } };

/** Функция `cellRef`. */
function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

/** Функция `styleRange`. */
function styleRange(
  ws: XLSX.WorkSheet,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  style: XLSX.CellObject['s']
) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ref = cellRef(r, c);
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...ws[ref].s, ...style };
    }
  }
}

/** Стили для обычных таблиц (задачи, события). */
export function styleTableSheet(ws: XLSX.WorkSheet, colCount: number): XLSX.WorkSheet {
  const range = ws['!ref'];
  if (!range) return ws;
  const decoded = XLSX.utils.decode_range(range);
  const lastRow = decoded.e.r;
  const lastCol = Math.min(decoded.e.c, colCount - 1);

  ws['!cols'] = Array.from({ length: lastCol + 1 }, (_, i) => ({
    wch: i === 0 ? 14 : i === 3 ? 28 : 12,
  }));

  styleRange(ws, 0, 0, 0, lastCol, {
    fill: HEADER_FILL,
    font: HEADER_FONT,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER,
  });

  for (let r = 1; r <= lastRow; r++) {
    styleRange(ws, r, 0, r, lastCol, {
      fill: r % 2 === 0 ? ALT_FILL : undefined,
      alignment: { vertical: 'top', wrapText: true },
      border: BORDER,
    });
  }

  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
  return ws;
}
