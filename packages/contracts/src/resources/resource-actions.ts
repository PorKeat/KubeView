export interface GenericResourceRef {
  apiVersion: string;
  kind: string;
  resource: string;
  name: string;
  namespace?: string;
}

export interface ResourceGetParams extends GenericResourceRef {
  contextName?: string;
}

export interface ResourceApplyParams {
  contextName?: string;
  yaml: string;
  resource?: string;
  dryRun?: boolean;
  name?: string;
  namespace?: string;
}

export interface ResourceDeleteParams extends GenericResourceRef {
  contextName?: string;
}

export interface ResourceCapabilitiesParams {
  contextName?: string;
  apiVersion: string;
  kind: string;
  resource: string;
  name?: string;
  namespace?: string;
}

export interface ResourceGetResult extends GenericResourceRef {
  yaml: string;
}

export interface ResourceApplyResult {
  apiVersion: string;
  kind: string;
  resource: string;
  name: string;
  namespace?: string;
  created: boolean;
  dryRun: boolean;
  yaml: string;
}

export interface ResourceDeleteResult {
  deleted: boolean;
}

export interface ResourceCapabilities {
  get: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  reasons?: Record<string, string>;
}
