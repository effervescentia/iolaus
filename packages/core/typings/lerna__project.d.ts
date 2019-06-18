declare module '@lerna/project' {
  interface Package {
    readonly name: string;
  }

  export function getPackages(): Package[];
}
