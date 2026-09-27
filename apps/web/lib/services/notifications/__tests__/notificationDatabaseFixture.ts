type Row = Record<string, unknown>;
/** In-memory query behavior for notification recovery tests. */
export function notificationDatabase(state: {
  tables: Record<string, Row[]>;
  failTable: string;
}) {
  return {
    from(table: string) {
      const filters: ((row: Record<string, unknown>) => boolean)[] = [];
      let operation = 'select';
      let values: Record<string, unknown> = {};
      let single = false;
      const query = {
        select: () => query,
        single: () => {
          single = true;
          return query;
        },
        maybeSingle: () => {
          single = true;
          return query;
        },
        limit: () => query,
        order: () => query,
        neq: (key: string, value: unknown) => {
          filters.push((row) => row[key] !== value);
          return query;
        },
        in: (key: string, values: unknown[]) => {
          filters.push((row) => values.includes(row[key]));
          return query;
        },
        lte: (key: string, value: string) => {
          filters.push((row) => String(row[key]) <= value);
          return query;
        },
        lt: (key: string, value: number | string) => {
          filters.push((row) =>
            typeof value === 'number'
              ? Number(row[key]) < value
              : String(row[key]) < value
          );
          return query;
        },
        eq: (key: string, value: unknown) => {
          filters.push((row) => row[key] === value);
          return query;
        },
        update: (value: Record<string, unknown>) => {
          operation = 'update';
          values = value;
          return query;
        },
        insert: (value: Record<string, unknown>) => {
          operation = 'insert';
          values = value;
          return query;
        },
        delete: () => {
          operation = 'delete';
          return query;
        },
        then(resolve: (value: unknown) => unknown) {
          if (state.failTable === table)
            return Promise.resolve(
              resolve({ error: { message: 'database unavailable' } })
            );
          const rows = state.tables[table] ?? [];
          const matches = rows.filter((row) =>
            filters.every((filter) => filter(row))
          );
          if (operation === 'update')
            matches.forEach((row) => Object.assign(row, values));
          if (operation === 'insert') {
            if (values.id && rows.some((row) => row.id === values.id)) {
              return Promise.resolve(
                resolve({ data: null, error: { code: '23505' } })
              );
            }
            rows.push(values);
          }
          if (operation === 'delete')
            state.tables[table] = rows.filter((row) => !matches.includes(row));
          return Promise.resolve(
            resolve({
              data: structuredClone(
                single
                  ? operation === 'insert'
                    ? values
                    : (matches[0] ?? null)
                  : matches
              ),
              count: matches.length,
              error: null,
            })
          );
        },
      };
      return query;
    },
  };
}
