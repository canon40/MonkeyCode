# Git 提交与推送规则

- 禁止直接向 `main` 分支提交或推送代码。
- MonkeyCode：本地仓库路径为 `/Users/caiqj/project/company/xiaomakuaiz/MonkeyCode`，所有提交和推送都必须使用 `feat/design-preview-workbench` 分支。
- OhMyAgent：本地仓库路径为 `/Users/caiqj/project/company/xiaomakuaiz/MonkeyCode/agent`，所有提交和推送都必须使用 `feature/monkeydesign-integration` 分支。
- 推送前必须确认当前仓库和分支正确；通过 Pull Request 合并到 `main`。

## `ohmydesign-tmp` 例外

- 远程仓库：`git@github.com:ACaiCaiOnTheRoadSide/ohmydesign-tmp.git`。
- 本地仓库路径：`/Users/caiqj/project/company/monkeydesign`。
- 仓库作用：MonkeyDesign 的可信设计能力 Package，维护 Scenario、Pipeline、Contract、Skill rules、模板及静态缩略图、结构化模板搜索索引、Registry、完整性校验和发布测试，供 OhMyAgent 与 MonkeyCode 设计流程加载使用。
- 固定的设计流程与内容收集规则应维护在此 Package 的 Skill rules 中，不得硬编码到 OhMyAgent 或 MonkeyCode。
- 此仓库不适用上面的功能分支与 Pull Request 规则；代码直接提交并推送到 `main`，不要创建长期功能分支。
- 提交前必须确认当前仓库为 `ohmydesign-tmp`、当前分支为 `main`，并运行与改动相匹配的 Package 校验；不得提交 `.DS_Store` 等本地文件。
