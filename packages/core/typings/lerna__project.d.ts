declare module '@lerna/project' {
  interface Package {
    readonly name: string;
    readonly private?: boolean;
  }

  export function getPackages(): Package[];
}
