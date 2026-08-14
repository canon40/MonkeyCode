import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeTaskStreamPayload,
  extractAcpTextContent,
} from "../src/components/console/task/task-stream-decode.ts";

test("extractAcpTextContent reads text blocks and nested content", () => {
  assert.equal(extractAcpTextContent({ type: "text", text: "你好" }), "你好");
  assert.equal(extractAcpTextContent({ text: "无前缀类型" }), "无前缀类型");
  assert.equal(
    extractAcpTextContent({ content: [{ content: { text: "嵌套" } }] }),
    "嵌套",
  );
});

test("decodeTaskStreamPayload accepts inline objects and raw JSON strings", () => {
  assert.deepEqual(decodeTaskStreamPayload({ update: { sessionUpdate: "plan" } }), {
    update: { sessionUpdate: "plan" },
  });
  assert.deepEqual(decodeTaskStreamPayload('{"update":{"sessionUpdate":"plan"}}'), {
    update: { sessionUpdate: "plan" },
  });
});
