declare module 'sql.js' {
  export interface Database {
    run(sql: string): void;
    prepare(sql: string): Statement;
    export(): ArrayBuffer;
  }

  export interface Statement {
    step(): boolean;
    getAsObject(): any;
    bind(params?: any[]): boolean;
    free(): boolean;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayBuffer | Buffer) => Database;
  }

  function initSqlJs(config?: any): Promise<SqlJsStatic>;
  export default initSqlJs;
}
