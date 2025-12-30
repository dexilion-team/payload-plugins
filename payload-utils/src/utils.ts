export function recursivelyMergeObjects<T>(target: T, source: Partial<T>): T {
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      if (
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        // Both target and source values are objects, merge them recursively
        target[key] = recursivelyMergeObjects(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[Extract<keyof T, string>];
      } else {
        // Target value is not an object, replace it with the source object
        target[key] = sourceValue as T[Extract<keyof T, string>];
      }
    } else {
      // Source value is not an object, replace the target value
      target[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return target;
}
