declare module '@lerna/project' {
  interface Package {
    readonly name: string;
  }

  // tslint:disable-next-line
  export function getPackages(): Readonly<Package[]>;
}
