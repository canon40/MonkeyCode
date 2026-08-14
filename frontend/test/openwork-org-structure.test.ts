import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const orgSource = readFileSync(
  new URL("../../openwork/org-structure.yaml", import.meta.url),
  "utf8",
);

test("org structure defines general manager and employees", () => {
  assert.match(orgSource, /general_manager:/);
  assert.match(orgSource, /employees:/);
  assert.match(orgSource, /subagent_type: explore/);
  assert.match(orgSource, /subagent_type: generalPurpose/);
  assert.match(orgSource, /subagent_type: bugbot/);
  assert.match(orgSource, /auto_learn:/);
});

test("cursor rules wire manager delegation and auto learn", () => {
  const managerRule = readFileSync(
    new URL("../../.cursor/rules/openwork-org-manager.mdc", import.meta.url),
    "utf8",
  );
  const learnRule = readFileSync(
    new URL("../../.cursor/rules/openwork-auto-learn.mdc", import.meta.url),
    "utf8",
  );
  assert.match(managerRule, /총괄 매니저/);
  assert.match(managerRule, /search_capabilities/);
  assert.match(learnRule, /execute_capability/);
});

test("openwork mcp config points at agent endpoint", () => {
  const mcp = JSON.parse(
    readFileSync(new URL("../../.cursor/mcp.json", import.meta.url), "utf8"),
  ) as { mcpServers: Record<string, { url: string }> };
  assert.equal(
    mcp.mcpServers.openwork.url,
    "https://api.openworklabs.com/mcp/agent",
  );
});

test("fast coding hooks and rules are wired", () => {
  const hooks = JSON.parse(
    readFileSync(new URL("../../.cursor/hooks.json", import.meta.url), "utf8"),
  ) as { hooks: Record<string, unknown[]> };
  assert.ok(Array.isArray(hooks.hooks.afterFileEdit));
  assert.ok(Array.isArray(hooks.hooks.postToolUse));
  assert.ok(Array.isArray(hooks.hooks.stop));

  const fastCoding = readFileSync(
    new URL("../../.cursor/rules/fast-coding-intervention.mdc", import.meta.url),
    "utf8",
  );
  assert.match(fastCoding, /alwaysApply: true/);
  assert.match(fastCoding, /1~3파일/);

  assert.match(orgSource, /coding_policy:/);
  assert.match(orgSource, /mode: fast/);
});
