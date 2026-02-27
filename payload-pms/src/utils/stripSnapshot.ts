export const stripSnapshot = (
  where: Record<string, any>,
): Record<string, any> => {
  if (!where || typeof where !== "object") {
    return where;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(where)) {
    if (key === "snapshot") continue;
    if (key === "and" || key === "or") {
      const filtered = (value as any[])
        .map(stripSnapshot)
        .filter((v: Record<string, any>) => Object.keys(v).length > 0);
      if (filtered.length > 0) result[key] = filtered;
    } else {
      result[key] = value;
    }
  }
  return result;
};
