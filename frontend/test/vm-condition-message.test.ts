import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import cn from "../src/i18n/resources/cn.ts";
import en from "../src/i18n/resources/en.ts";
import {
  getVmMessageFromConditions,
  mapVmConditionMessage,
  resolveVmConditionMessageKey,
} from "../src/utils/vm-condition-message.ts";

const translate = (key: string) => {
  const lookup: Record<string, string> = {
    "commonUtils.vmCondition.networkExchangeFull": cn.commonUtils.vmCondition.networkExchangeFull,
    "commonUtils.vmCondition.networkDeviceMissing": cn.commonUtils.vmCondition.networkDeviceMissing,
    "commonUtils.vmCondition.startupFailed": cn.commonUtils.vmCondition.startupFailed,
  };
  return lookup[key] ?? key;
};

test("resolveVmConditionMessageKey maps RTNETLINK exchange full errors", () => {
  const raw = "Startup failed: RTNETLINK answers: Exchange full";
  assert.equal(resolveVmConditionMessageKey(raw), "networkExchangeFull");
});

test("resolveVmConditionMessageKey maps missing network device errors", () => {
  const raw = 'Startup failed: Cannot find device "fc2260f82f40"';
  assert.equal(resolveVmConditionMessageKey(raw), "networkDeviceMissing");
});

test("resolveVmConditionMessageKey maps generic startup failures", () => {
  assert.equal(resolveVmConditionMessageKey("Startup failed: container runtime exited"), "startupFailed");
  assert.equal(resolveVmConditionMessageKey("start instance failed: status=500"), "startupFailed");
});

test("mapVmConditionMessage returns friendly copy for known VM failures", () => {
  const raw = "Startup failed: start instance failed: RTNETLINK answers: Exchange full";
  assert.equal(mapVmConditionMessage(raw, translate), cn.commonUtils.vmCondition.networkExchangeFull);
});

test("mapVmConditionMessage preserves unknown messages", () => {
  const raw = "Image pull failed: connection timed out";
  assert.equal(mapVmConditionMessage(raw, translate), raw);
});

test("getVmMessageFromConditions reads the latest VM condition message", () => {
  assert.equal(
    getVmMessageFromConditions(
      [
        { message: "Pulling image" },
        { message: "Startup failed: start instance failed: RTNETLINK answers: Exchange full" },
      ],
      translate,
    ),
    cn.commonUtils.vmCondition.networkExchangeFull,
  );
});

test("vm condition resources provide Chinese and English copy", () => {
  assert.match(cn.commonUtils.vmCondition.networkExchangeFull, /网络资源/);
  assert.match(en.commonUtils.vmCondition.networkExchangeFull, /network resources/i);
});

test("common utilities wire vm condition mapping through i18n", () => {
  const source = readFileSync(new URL("../src/utils/common.tsx", import.meta.url), "utf8");
  assert.match(source, /resolveVmConditionMessage\(rawMessage, translateVmConditionMessage\)/);
  assert.match(source, /translateVmConditionMessage\(key: string\)/);
});
