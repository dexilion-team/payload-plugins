import {
  type Config,
  type Plugin,
  type CollectionConfig,
  type Payload,
  type CollectionAfterOperationHook,
  type CollectionAfterErrorHook,
  AuthenticationError,
  Forbidden,
  Locked,
  LockedAuth,
  NotFound,
  UnauthorizedError,
  ValidationError,
} from "payload";
import type { PayloadRequest } from "payload";
import { AuditAction, AuditLogOptions } from "./types";
import { getIpAddress, inferOperationFromRequest } from "./utils";

const READ_OPERATIONS: AuditAction[] = [
  "count",
  "countVersions",
  "find",
  "findByID",
  "findDistinct",
  "findVersionByID",
  "findVersions",
  "read",
];

const WRITE_OPERATIONS: AuditAction[] = [
  "create",
  "delete",
  "deleteByID",
  "restoreVersion",
  "update",
  "updateByID",
];

const AUTH_OPERATIONS: AuditAction[] = [
  "forgotPassword",
  "login",
  "refresh",
  "resetPassword",
  "unlock",
];

export const auditLogPlugin = (options: AuditLogOptions = {}): Plugin => {
  const {
    enabled = true,
    collections: collectionSlugsToAudit = [],
    logger,
    logSuccessful = [...WRITE_OPERATIONS, ...AUTH_OPERATIONS],
    logFailed = true,
  } = options;

  if (!enabled) {
    return (incomingConfig: Config): Config => incomingConfig;
  }

  const shouldLogSuccessfulOperation = (operation: AuditAction): boolean => {
    if (logSuccessful === true) return true;
    if (logSuccessful === false) return false;
    return (logSuccessful as AuditAction[]).includes(operation);
  };

  const shouldLogFailedOperation = (
    operation: AuditAction | "unknown",
  ): boolean => {
    if (logFailed === true) return true;
    if (logFailed === false) return false;
    if (operation === "unknown") return false;
    return (logFailed as AuditAction[]).includes(operation);
  };

  return (incomingConfig: Config): Config => {
    const config: Config = { ...incomingConfig };

    collectionSlugsToAudit?.forEach((slug) => {
      const collection = config.collections?.find(
        (col: CollectionConfig) => col.slug === slug,
      );

      if (!collection) {
        throw new Error(
          `[@dexilion/payload-auditlog] Collection with slug "${slug}" does ` +
            `not exist in the Payload configuration. Please ensure it is ` +
            `defined before using the audit log plugin.`,
        );
      }

      /**
       * Logs failed operations after they occur. This runs in an afterError hook
       * to ensure that any errors are captured in the log, and to prevent
       * duplicate logs for failed operations.
       *
       * The plugin attempts to infer the operation from the request context
       * when possible, but in cases where the operation cannot be reliably
       * inferred, "unknown" is used as a placeholder action.
       */
      const afterError: CollectionAfterErrorHook = async ({
        collection: col,
        req,
        error,
      }) => {
        const operation = inferOperationFromRequest(req);
        const apiError = error as any;
        let shouldLog = false;

        if (error instanceof AuthenticationError) {
          // Failed login : bad credentials supplied
          shouldLog = true;
        } else if (error instanceof LockedAuth) {
          // Failed login : account is locked out
          shouldLog = true;
        } else if (error instanceof UnauthorizedError) {
          // No valid authentication token (HTTP 401)
          shouldLog = true;
        } else if (error instanceof Forbidden) {
          // Authenticated but access control denied (HTTP 403)
          shouldLog = true;
        } else if (error instanceof NotFound) {
          // Resource not found during a read : potential unauthorized probing
          const isRead =
            operation === "find" ||
            operation === "findByID" ||
            operation === "findVersionByID" ||
            operation === "findVersions";
          shouldLog = isRead;
        } else if (error instanceof ValidationError) {
          // Validation failure on a write operation
          const isWrite = WRITE_OPERATIONS.includes(operation as AuditAction);
          shouldLog = isWrite;
        } else if (error instanceof Locked) {
          // Attempt to modify a locked document
          shouldLog = true;
        }

        if (!shouldLog || !shouldLogFailedOperation(operation)) return;

        logger?.(
          {
            userId: req.user?.id ? String(req.user.id) : null,
            userEmail: (req.user as any)?.email ?? null,
            action: operation,
            collection: col?.slug ?? slug,
            documentId: req.routeParams?.id ? String(req.routeParams.id) : null,
            timestamp: new Date(),
            status: "failure",
            errorType: error.constructor.name,
            errorMessage: error.message,
            errorStatus: apiError.status,
            ipAddress: getIpAddress(req),
          },
          req.payload,
        );
      };

      /**
       * Logs successful operations after they occur. Note that if an operation fails
       * and triggers afterError, the afterOperation hook will not run — this prevents
       * duplicate logs for failed operations, and ensures that failure logs contain
       * accurate error information.
       */
      const afterOperation: CollectionAfterOperationHook = async ({
        collection: col,
        req,
        operation,
        result,
      }) => {
        if (!shouldLogSuccessfulOperation(operation as AuditAction)) {
          return result;
        }

        const docId = (result as any)?.id ?? null;

        logger?.(
          {
            userId: req.user?.id ? String(req.user.id) : null,
            userEmail: (req.user as any)?.email ?? null,
            action: operation as AuditAction,
            collection: col.slug,
            documentId: docId,
            timestamp: new Date(),
            status: "success",
            ipAddress: getIpAddress(req),
          },
          req.payload,
        );

        return result;
      };

      collection.hooks = {
        ...collection.hooks,
        afterOperation: [
          afterOperation,
          ...(collection.hooks?.afterOperation ?? []),
        ],
        afterError: [afterError, ...(collection.hooks?.afterError ?? [])],
      };
    });

    return config;
  };
};
