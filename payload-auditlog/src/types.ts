import { CollectionConfig, Payload } from "payload";

export type AuditAction =
  | "count"
  | "countVersions"
  | "create"
  | "delete"
  | "deleteByID"
  | "find"
  | "findByID"
  | "findDistinct"
  | "findVersionByID"
  | "findVersions"
  | "forgotPassword"
  | "login"
  | "read"
  | "refresh"
  | "resetPassword"
  | "restoreVersion"
  | "unlock"
  | "update"
  | "updateByID";

export type AuditLogEntry = {
  userId: string | null;
  userEmail?: string | null;
  action: AuditAction | "unknown";
  collection: string;
  documentId?: number | string | null;
  timestamp: Date;
  status: "success" | "failure";
  errorType?: string;
  errorMessage?: string;
  errorStatus?: number;
  ipAddress?: string;
};

export type AuditLogOptions = {
  /** Whether the plugin is enabled. Default: true */
  enabled?: boolean;
  /** Collection slugs to audit */
  collections?: CollectionConfig["slug"][];
  /** Logger function called for each audit event */
  logger?: (data: AuditLogEntry, payload: Payload) => Promise<void> | void;
  /**
   * Operations to log on success. Pass an array of operation names, true for
   * all operations, or false to disable success logging entirely.
   * Default: all write and auth operations (reads excluded because they
   * are high-volume).
   */
  logSuccessful?: AuditAction[] | boolean;
  /**
   * Operations to log on failure. Pass an array of operation names, true for
   * all operations, or false to disable failure logging entirely.
   * Default: true (all audit-worthy failures are logged).
   */
  logFailed?: AuditAction[] | boolean;
};
