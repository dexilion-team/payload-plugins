import "payload";

declare module "payload" {
  interface GeneratedTypes {
    db: {
      defaultIDType: string;
    };
    collections: {
      tenants: {
        id: string;
        name: string;
      };
      users: {
        id: string;
        email: string;
        name?: string;
        password: string;
        tenant?: Array<string | GeneratedTypes["collections"]["tenants"]>;
      };
      pages: {
        id: string;
        title: string;
        tenant: string | GeneratedTypes["collections"]["tenants"];
      };
    };
    user: GeneratedTypes["collections"]["users"];
  }
}

declare global {
  var payload: Awaited<
    ReturnType<(typeof import("payload"))["default"]["init"]>
  >;
}

export {};
