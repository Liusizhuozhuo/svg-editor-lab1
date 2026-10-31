# SVG Editor Lab1

使用 TypeScript、面向对象和 Command 模式实现命令行 SVG 编辑器。
需求来源：[实验任务书](phase_cli_1.md)。架构与开发记录：[doc/README.md](doc/README.md)。

## 当前进度

已完成第 6 阶段：全部图形编辑命令及其撤销重做。可以在终端输入命令，也可从标准输入回放脚本。
当前支持 init、全部图形编辑命令、undo/redo、tree/show/help，以及六种内置图形。read/save/canvas 留到第 7 阶段，当前不能读写 SVG 文件。

## 环境与命令

需要 Node.js 20 或更高版本，以及 npm。当前验证环境为 Node.js 20.17.0、npm 10.8.2。

```powershell
npm ci
npm run cli
npm run check
```

- `npm run cli`：编译后启动交互式 CLI，提示符为 `svg>`。
- `npm run typecheck`：严格类型检查，不输出文件。
- `npm run build`：编译到 `dist/`。
- `npm test`：先编译，再运行 Node.js 内置测试发现器；当前 113 项领域、命令、解析与进程集成测试。
- `npm run check`：严格类型检查，然后执行编译与测试。

测试位于 `tests/*.test.mjs`，包括领域模型、命令历史、参数解析、格式化与真实进程脚本回放。
不提交 `node_modules/` 或 `dist/`；提交 `package-lock.json` 保证依赖可复现。

## 使用示例

运行 `npm run cli` 后逐行输入（不要复制提示符）：

```text
init 800 600
create g node
create rect r1 10 20 100 50 #4a90d9 in node
create text t1 20 40 "Hello world" in node
move node 30 0
tree
undo
show r1
redo
help
```

使用 Ctrl+C 结束交互；输入流结束也会退出。双引号包裹带空格参数，支持空文本 `""`；引号内 `\"` 表示双引号、`\\` 表示反斜杠，其他反斜杠序列保留原样。只有行首（忽略前导空白）的 `#` 是注释，颜色值 `#ffffff` 不受影响；不支持行尾注释。

回放已提供的流程图示例（Windows PowerShell 中运行）：

```powershell
npm run build
cmd /c "node dist/main.js < examples\phase5.txt"
cmd /c "node dist/main.js < examples\phase6.txt"
```

这里用输入重定向传递原始 UTF-8 文件，避免旧版 PowerShell 管道把中文转换为其他编码。脚本模式不输出欢迎语和提示符；成功结果到 stdout，错误到 stderr，每个错误一行且继续执行后续命令。回放不是事务，之前已成功执行的命令不会因后续报错回滚。

当前 `help` 列出 16 个命令和六种 create 参数格式。新增命令：

```text
delete <id>
scale <id> <factor>
set <id> <attr> <value>
group <newGid> <id1> [id2 ...]
ungroup <gid>
addto <gid> <id>
front <id>
back <id>
```

分组按原文档顺序收编；跨父级时新组放到最近公共祖先下的最早受影响位置。根级容器不能 ungroup（任务书要求），可以先在 scene 等外层容器中组织节点。set g fill 修改组自身样式，不覆盖孩子显式颜色；解组/换父级不补偿继承样式。read/save/canvas 尚未接入，不应将当前结果视为完整实验验收。

## 协作约定

每轮完成一个可验证阶段，报告改动与验证结果，再由用户手动提交。未经用户要求不代为 commit、push 或打标签。
不提前生成后续完整实现或大量空类；必要验证与架构记录随阶段更新。最终验收后再打 `final` 标签。
