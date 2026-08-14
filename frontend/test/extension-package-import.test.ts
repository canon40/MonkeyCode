import assert from "node:assert/strict";
import test from "node:test";

import cn from "../src/i18n/resources/cn.ts";
import { formatExtensionImportResult } from "../src/pages/console/manager/extension-package.ts";

function translateManagerSkills(key: string, options?: Record<string, unknown>) {
  const segments = key.replace(/^managerSkills\./, "").split(".");
  let value: unknown = cn.managerSkills;
  for (const segment of segments) {
    if (value && typeof value === "object" && segment in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      return key;
    }
  }
  if (typeof value !== "string") {
    return key;
  }
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ""));
}

test("格式化扩展包导入结果", () => {
  assert.equal(
    formatExtensionImportResult(
      {
        created_skills: 1,
        updated_skills: 2,
        created_images: 3,
        updated_images: 4,
      },
      translateManagerSkills,
    ),
    "新增 1 个 Skills，更新 2 个 Skills，新增 3 个镜像，更新 4 个镜像",
  );
});

test("格式化扩展包导入结果时缺省计数按 0 处理", () => {
  assert.equal(
    formatExtensionImportResult({}, translateManagerSkills),
    "新增 0 个 Skills，更新 0 个 Skills，新增 0 个镜像，更新 0 个镜像",
  );
});
