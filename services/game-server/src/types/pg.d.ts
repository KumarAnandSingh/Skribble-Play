declare module "pg" {
  interface QueryResultRow {
    [column: string]: unknown;
  }

  interface QueryResult<R extends QueryResultRow = QueryResultRow> {
    rows: R[];
    rowCount: number;
  }

  interface PoolConfig {
    connectionString?: string;
  }

  class Pool {
    constructor(config?: PoolConfig);
    query<R extends QueryResultRow = QueryResultRow>(queryText: string, values?: unknown[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }

  const pg: {
    Pool: typeof Pool;
  };

  export { Pool, PoolConfig, QueryResult, QueryResultRow };
  export default pg;
}
