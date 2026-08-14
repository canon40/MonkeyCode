import { existsSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontendRoot = pathResolve(dirname(fileURLToPath(import.meta.url)), "..");

const aliasResolvers = [
  {
    match: (specifier) => specifier === "@/i18n",
    resolve: () => pathResolve(frontendRoot, "test/fixtures/mock-i18n.ts"),
  },
  {
    match: (specifier) => specifier.startsWith("@/"),
    resolve: (specifier) => {
      const relativePath = specifier.slice(2);
      const candidates = [
        pathResolve(frontendRoot, "src", `${relativePath}.ts`),
        pathResolve(frontendRoot, "src", relativePath, "index.ts"),
        pathResolve(frontendRoot, "src", relativePath),
      ];
      return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
    },
  },
];

export async function resolve(specifier, context, nextResolve) {
  for (const resolver of aliasResolvers) {
    if (!resolver.match(specifier)) {
      continue;
    }

    const filePath = resolver.resolve(specifier);
    return nextResolve(pathToFileURL(filePath).href, context);
  }

  return nextResolve(specifier, context);
}
