# 第 8 阶段验收记录

代码与自动化验收通过，浏览器视觉核验待人工完成；不将测试通过等同于作业已提交。任务书原件保持不变。

## 命令覆盖

| 功能 | 验收依据 |
|---|---|
| init | 默认/自定画布、失败保留原文档、清除路径与历史屏障 |
| read、save | 六类图形与嵌套往返、中文/转义、缺失 ID 避让、重复 ID、文件错误不破坏状态 |
| canvas | 查询不改历史、宽高修改原子性、成功修改历史屏障 |
| create | 六种图形、可选样式、in 子句、重复 ID、非法容器、box 拒绝 |
| delete | 删除子树、释放 ID、一次 undo 恢复整个子树 |
| move、scale | 叶子与容器递归、几何溢出原子性、精确撤销重做 |
| set | 类型属性白名单、文本、公共样式、恢复未显式设置的属性 |
| group、ungroup | 保持相对顺序、祖先冲突、跨父级分组、禁止根级解组、一次撤销 |
| addto、front、back | 父子归属、环检测、同级绘制顺序及恢复 |
| tree、show、help | 子树、关键几何/样式、父级、全部 19 个命令、查询不入栈 |
| undo、redo | 新编辑清 redo、失败保留历史、文档操作屏障、混合编辑完整恢复 |

## 实测结果

- `npm run check`：严格类型检查、编译、151 项测试通过。
- `tests/acceptance.test.mjs` 直接提取任务书第 6 节与 6.1 版本 A 的 `svg>` 命令，启动真实 CLI，核对输出、错误及导出模型。8 元素统计正确，先前文档误计已纠正。
- `tests/architecture.test.mjs` 扫描当前静态 import、一类一文件与公共字段声明约定；检查 TreeStructure 的三个指定调用方。搭配人工审查，不能替代通用 AST 或运行时依赖分析。
- 两个名字分发点：CommandRouter 和 ShapeFactory；均保留待重构 TODO。内层 domain/commands/application 不依赖文件系统或具体仓储。
- 验收产物在 `../examples/acceptance/`。typical.stderr.txt 有且只有任务书的两条预期错误；flowchart.stderr.txt 为空。

## 支持边界与未完成检查

- SVG 支持子集详见根 README：六类图形，几何与三种公共样式；transform、CSS、扩展元素/属性、任意 viewBox 不支持，明确报错。背景知识中的复杂 SVG 不作为“已支持”展示。
- `canvas` 修改需同时给宽高；save 使用最近成功 read/save 路径；成功文档操作清空旧历史。这些是任务书未完全规定部分的明确实现选择。
- 普通 g 的样式遵循 SVG 继承；解组和换父级不补偿继承样式。结构历史使用 O(N) 拓扑快照；超深树、超大文件和系统级断电恢复不在本次验证范围。
- 脚本遇错继续运行，退出码为 0；自动验收检查 stderr，不能只依赖退出码。
- Chrome 应用访问授权超时，浏览器视觉检查未完成。请打开 flowchart.svg，确认蓝色“开始”节点、橙色“处理数据 v2”节点与黑色连线均正常，且两个节点同高。demo.svg 应显示白底、英文标题、红圆和蓝矩形。
- PlantUML 保留源码和内嵌包图，未做渲染图片检查。box/Web/动态插件属于后续范围。

## 用户提交步骤

按已约定的流程，修复与验收定稿分开提交。在工程根目录执行：

```powershell
git diff --check
git add src/infrastructure/SvgReader.ts tests/persistence.test.mjs
git diff --cached --stat
git commit -m "fix: validate SVG doctype structurally and align ID errors"

git add README.md doc tests/acceptance.test.mjs tests/architecture.test.mjs examples/acceptance
git diff --cached --stat
git commit -m "test: complete lab acceptance checks and documentation"
git push origin main
```

完成浏览器人工检查后，先确认工作区状态及最终提交，再打标签：

```powershell
git status --short
git log -1 --oneline
git tag -a final -m "Lab1 final submission"
git push origin final
```

若人工检查发现问题，先修复、验证并提交，再打 final；不要强制覆盖已有标签。GitHub 远程状态与截止时间由用户确认。本轮未执行 commit/push/tag。
