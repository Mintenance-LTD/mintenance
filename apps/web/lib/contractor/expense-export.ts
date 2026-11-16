export function isTestExpense(expense: { description: string }): boolean {
  return /^TEST ONLY\s*[-–—:]/i.test(expense.description.trim());
}

/** Escape text and spreadsheet formulas as well as commas, quotes and newlines. */
export function expenseCsvCell(value: string | number): string {
  let text = String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
