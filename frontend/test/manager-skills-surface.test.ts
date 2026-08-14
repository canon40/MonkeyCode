import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import cn from "../src/i18n/resources/cn.ts";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const navSource = readFileSync(
  new URL("../src/components/manager/nav-teams.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../src/pages/console/manager/page.tsx", import.meta.url),
  "utf8",
);
const skillsSource = readFileSync(
  new URL("../src/pages/console/manager/skills.tsx", import.meta.url),
  "utf8",
);

test("管理后台挂载 Skills 页面路由和侧边栏入口", () => {
  assert.match(appSource, /TeamManagerSkills/);
  assert.match(appSource, /path="skills"/);
  assert.match(navSource, /to="\/manager\/skills"/);
  assert.match(navSource, /t\("managerShell\.nav\.skills"\)/);
  assert.match(pageSource, /"\/manager\/skills"/);
  assert.match(pageSource, /t\("managerShell\.nav\.skills"\)/);
});

test("添加 Skill 对话框默认选中输入文本并放在上传文件左侧", () => {
  const tabsMatch = skillsSource.match(/<Tabs defaultValue="paste">[\s\S]*?<\/Tabs>/);
  assert.ok(tabsMatch, "Add Skill tabs should default to the text input tab");

  const tabsSource = tabsMatch[0];
  const pasteTabIndex = tabsSource.indexOf('t("managerSkills.tabs.paste")');
  const uploadTabIndex = tabsSource.indexOf('t("managerSkills.tabs.upload")');

  assert.ok(pasteTabIndex >= 0, "Add Skill tabs should use paste tab i18n key");
  assert.ok(uploadTabIndex >= 0, "Add Skill tabs should use upload tab i18n key");
  assert.ok(pasteTabIndex < uploadTabIndex, "paste tab should appear before upload tab");
  assert.equal(cn.managerSkills.tabs.paste, "输入文本");
  assert.equal(cn.managerSkills.tabs.upload, "上传文件");
  assert.doesNotMatch(tabsSource, /粘贴文本/);
});

test("添加 Skill 对话框不显示默认解析提示", () => {
  assert.doesNotMatch(skillsSource, /请选择文件或粘贴完整 SKILL\.md 内容/);
});

test("添加 Skill 对话框不显示解析成功提示", () => {
  assert.doesNotMatch(skillsSource, /已解析/);
});

test("添加 Skill 对话框的元数据表单在输入内容前也可编辑", () => {
  const addDialogMatch = skillsSource.match(/function AddSkillDialog[\s\S]*?function EditSkillDialog/);
  assert.ok(addDialogMatch, "AddSkillDialog source should be present");

  const addDialogSource = addDialogMatch[0];
  const metaFormMatch = addDialogSource.match(/<SkillMetaForm[\s\S]*?\/>/);
  assert.ok(metaFormMatch, "AddSkillDialog should render SkillMetaForm");

  assert.doesNotMatch(metaFormMatch[0], /disabled=\{!formEnabled\}/);
  assert.match(addDialogSource, /<Button onClick=\{handleSubmit\} disabled=\{!formEnabled \|\| parsing\}>/);
});
