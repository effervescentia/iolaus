declare module 'jsup' {
  interface JSUP {
    set(path: string[], value: any): JSUP;
    get(path: string[]): any;
    stringify(): string;
  }

  function jsup(json: string): JSUP;

  export = jsup;
}
