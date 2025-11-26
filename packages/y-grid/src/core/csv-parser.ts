/**
 * CSV Parser - RFC 4180 compliant
 * Handles quoted fields, escaped quotes, different delimiters
 */

export interface CSVParseOptions {
  delimiter?: string; // Field delimiter (default: auto-detect)
  hasHeader?: boolean; // First row is header (default: true)
  skipEmptyLines?: boolean; // Skip empty lines (default: true)
}

export interface CSVParseResult {
  headers: string[];
  data: string[][];
  rowCount: number;
  colCount: number;
}

/**
 * Auto-detect delimiter from first line
 */
function detectDelimiter(line: string): string {
  const delimiters = [',', '\t', ';', '|'];
  const counts = delimiters.map((d) => {
    let count = 0;
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === d && !inQuotes) count++;
    }
    return { delimiter: d, count };
  });

  // Return delimiter with highest count
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ',';
}

/**
 * Parse a single CSV line (RFC 4180 compliant)
 * Handles quoted fields with delimiters, escaped quotes, etc.
 */
export function parseCSVLine(line: string, delimiter = ','): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentCell += '"';
        i += 2;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
      }
    } else if (char === delimiter && !insideQuotes) {
      // Field separator (only outside quotes)
      cells.push(currentCell.trim());
      currentCell = '';
      i++;
    } else if (char === '\r') {
      // Skip carriage return
      i++;
    } else {
      // Regular character
      currentCell += char;
      i++;
    }
  }

  // Push the last cell
  cells.push(currentCell.trim());

  return cells;
}

/**
 * Parse CSV text into rows and columns
 */
export function parseCSV(text: string, options: CSVParseOptions = {}): CSVParseResult {
  const { hasHeader = true, skipEmptyLines = true } = options;

  // Split into lines (handle both \n and \r\n)
  const lines = text.split(/\r?\n/);

  if (lines.length === 0) {
    return { headers: [], data: [], rowCount: 0, colCount: 0 };
  }

  // Auto-detect delimiter from first non-empty line
  const firstNonEmptyLine = lines.find((l) => l.trim().length > 0) || '';
  const delimiter = options.delimiter || detectDelimiter(firstNonEmptyLine);

  const data: string[][] = [];
  let headers: string[] = [];
  let maxCols = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines if configured
    if (skipEmptyLines && !line.trim()) {
      continue;
    }

    const row = parseCSVLine(line, delimiter);
    maxCols = Math.max(maxCols, row.length);

    if (hasHeader && headers.length === 0) {
      headers = row;
    } else {
      data.push(row);
    }
  }

  // If no header, generate column names (A, B, C, ...)
  if (!hasHeader && headers.length === 0) {
    headers = Array.from({ length: maxCols }, (_, i) => String.fromCharCode(65 + (i % 26)));
  }

  return {
    headers,
    data,
    rowCount: data.length,
    colCount: maxCols,
  };
}

/**
 * Parse CSV file
 */
export async function parseCSVFile(
  file: File,
  options: CSVParseOptions = {}
): Promise<CSVParseResult> {
  const text = await file.text();
  return parseCSV(text, options);
}
