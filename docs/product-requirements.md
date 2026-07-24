# Agent Run Recorder 产品需求文档（PRD）

| 字段 | 内容 |
|---|---|
| 文档版本 | v1.4（冻结版） |
| 日期 | 2026-07-24 |
| 状态 | PRD 已冻结；M1 生产实现待门禁复审 |
| 适用范围 | V1 桌面端首发（macOS / Windows） |
| v1.1 修订 | 落地评审问答 7 项：难度校准、spool 脱敏前置、swap 口径、spool 三场景验收、备份密钥包裹、北极星重构、V1 分类级联实现 |
| v1.2 修订 | 落地决策 4 项：遥测仅内测手工导出、V1 只保留 Agent 视图、72h 停机承诺分级、下载专用更新通道与网络出站立项清单 |
| v1.3 修订 | 落地外部评审 13 项：AgentConfiguration、Task 簇、难度拆分、数据质量等级、统计推断、Session 状态机、agent-blind 分类等 |
| v1.4 修订 | 引入 TaskAgentObservation；分离 Task 整体结果与配置归因；统一观察性表述；固定 Task 级比较类别和互斥难度桶；闭合缺失数据、MID/MDE 与配对规则；修正 Run 身份、endedAt、持久化 allowlist、spool/OTLP 安全契约、连接器能力矩阵及 M1 门禁 |
| 冻结基线 | 补齐 observation 三值聚合、Run 生命周期、EvidenceReference、M2 主指标与多重比较控制、完整 Reader Testing fixture；冻结后需求变更必须新增版本并记录决策 |

---

## 1. 产品定位与目标

### 1.1 产品定位

**尽可能完整地记录可采集的 AI Agent 任务，并基于用户本人的历史记录，展示不同 AgentConfiguration 在相似任务上的观察表现。**

- 产品不局限于编程：覆盖研究、文档、数据分析、浏览器操作、办公、沟通及编程任务。
- 编程任务的 Git、PR、返工、回滚等属于 `Evidence` 的一种适配器，不作为产品基础模型。
- 数据模型按通用任务设计；V1 首发连接器以编程场景为主，当前自动证据成熟度也主要集中在编程类任务。UI 必须区分“通用模型能力”和“当前证据成熟度”，不暗示非编程场景已有同等证据。
- 产品输出属于**用户个人历史记录中的观察性比较**。任务并非随机分配给 AgentConfiguration，项目、上下文、权限、执行顺序、用户选择、前序修改和学习效应都可能造成偏差。
- 产品不得使用“证明某 Agent 更强”“纯 Agent 效应”“导致成功”等因果措辞。允许的标准表述为：

> 在你的历史记录中，该配置在此类任务上的观察表现更好。

### 1.2 目标用户

同时使用多个 AI Agent 的个人重度用户：他们关心“哪个配置在自己的哪些任务上更值得使用”，但缺乏基于本人真实使用记录的横向比较手段。

### 1.3 成功指标

| 类型 | 指标 | 目标 |
|---|---|---|
| 北极星（内测样本） | 周可信观察洞察触达率（当周查看 ≥1 条“数据质量高、且通过全部方向性结论门槛”的观察性结论的活跃用户 ÷ 主动提交诊断快照的周活跃用户） | ≥ 40%（仅为内测样本候选值，见 §13，不外推至正式版全量用户） |
| 驱动 | 结果评价活跃用户率（当周完成 ≥1 次 Run 或 Task 整体评价的活跃用户 ÷ 当周有待评价记录的活跃用户） | ≥ 60% |
| 驱动 | TaskAgentObservation 反馈覆盖率 | ≥ 70%（成熟桶目标） |
| 驱动 | 可比样本供给（达到数据质量中等等级的“指标 × 配置对 × 比较桶”占比） | ≥ 50% |
| 驱动 | Run 检出率：完整采集档 / 标准采集档 | ≥ 95% / ≥ 90% |
| 驱动 | 元数据完整率（必填 allowlist 字段非空占比） | ≥ 90% |
| 护栏 | 常驻资源占用、崩溃-free 会话率、因采集导致的 Agent 侧故障报告、通知关闭率 | 预算内 / ≥ 99.5% / 0 / < 5% |

阶段性北极星条款：冷启动期允许以内测样本的结果评价活跃用户率作为阶段性北极星；首批主方向指标达到数据质量高等级、启用 M2 推断且通过全部结论门槛后，切换为周可信观察洞察触达率。

指标性质说明：无遥测前提下，本机只计算“本周是否触达可信观察洞察”等个人状态；跨用户比例只能来自用户主动提交的内测诊断快照样本，不宣称代表正式版全量用户，也不作为正式版全量 KPI。

### 1.4 非目标（V1 明确不做）

- 云同步、团队管理、企业审计、订阅付费；
- Agent 执行、任务编排或模型路由；
- 全量内容回放；
- 用单一分数宣称某个 Agent 或配置绝对更好；
- 从观察性数据推断因果效应；
- 为缺失的 Token、成本、结果或难度数据进行虚构估算。

---

## 2. 核心概念与数据模型

### 2.1 核心对象

| 对象 | 定义 | 关键字段 |
|---|---|---|
| `Task` | 用户希望完成的目标；统计重采样与相关性控制的簇单位 | taskId、title（脱敏后）、comparisonCategoryL1/L2、categorySource、preRunDifficulty、preRunDifficultySource、postHocConfirmedDifficulty、projectRef、createdAt |
| `TaskOverallResult` | 用户确认的 Task 整体结果，独立于任何 AgentConfiguration；只用于 Task 视图和整体完成统计 | taskId、outcome、humanIntervention、source（user）、confirmedAt |
| `Session` | 来源 Agent 的会话容器；其 start/end 由来源宣告，不一定等于 Run 边界 | sessionId、connectorInstanceId、sourceSessionKey、startedAt、endedAt、identityMethod |
| `AgentConfiguration` | 观察性比较的配置实体：agentId + agentVersionGroup + modelId + modelVersion | configId、agentId、agentVersionGroup、modelId、modelVersion |
| `TaskAgentObservation` | **配置归因与指标计算单位**，等于 `Task × AgentConfiguration`；同一组合最多一条 | observationId、taskId、agentConfigId、firstRunId、terminalRunId、runCount、retryCount、firstAttemptOutcome、finalOutcome、finalRunIntervention、maxIntervention、status、settledAt、settlementSource、aggregationVersion |
| `Run` | 某次执行尝试；采集与详情展示单位 | runId、taskId（可空）、sessionId、agentConfigId（可空）、sourceTier、startedAt、endedAt、lifecycleStatus、sourceExecutionStatus、retryOf、boundarySource、identityMethod |
| `RunEvaluation` | 对单次 Run 的结果与人工干预评价 | runId、outcome、humanIntervention、source、evaluatedAt |
| `BoundaryRevision` | 已关闭 Run 在水印窗口内接收更高优先级终止信号时的只读边界修订审计 | revisionId、runId、previousEndedAt、newEndedAt、previousBoundarySource、newBoundarySource、triggerEventId、reason、revisionVersion |
| `Event` | 模型、工具、文件、命令、外部操作等结构化行为 | eventId、runId、eventType、status、durationMs、metadataSchemaVersion、metadata、identityMethod |
| `Evidence` | 验证、产物、操作结果等自动证据 | evidenceId、runId、type、referenceId、status |
| `EvidenceReference` | Evidence 的脱敏、强类型引用；不得保存开放字符串引用 | referenceId、referenceType、tokenizedRef、displayHint、schemaVersion |

枚举：

- `Outcome`：`success / partial / failed / cancelled / unknown`；未评价时为 `unknown`。
- `HumanIntervention`：`none / light_edit / heavy_edit / takeover / unknown`。
- `TaskAgentObservation.status`：`active / settled`；活动中的观察值不进入“最终结果”方向性比较。`settlementSource ∈ {task_closed, user_abandoned_config, inactivity}`。
- `Run.lifecycleStatus`：`open / closed`，只允许 `open → closed`；历史导入可以原子创建为 `closed`，关闭后不得重新打开。
- `Run.sourceExecutionStatus`：`unknown / succeeded / failed / cancelled / interrupted`，只表达来源执行状态，不等同于用户评价 Outcome。

### 2.2 核心价值链

```text
Task
├── TaskOverallResult（Task 整体结果，不归因给配置）
└── TaskAgentObservation（Task × AgentConfiguration）
    └── Run → Event / Evidence / RunEvaluation
        └── 配置内聚合 → 观察性比较
```

### 2.3 Task、TaskAgentObservation 与 Run 的关系

- 一次 Run 最多归属一个 Task 和一个 AgentConfiguration；一个 Task 可包含多个配置、每个配置可包含多个 Run。
- `TaskAgentObservation` 对 `(taskId, agentConfigId)` 设置唯一约束；其 `observationId` 必须稳定、可重复计算。
- **统计归因单位**是 `TaskAgentObservation`；**统计独立簇**是 `Task`。同一 Task 的多个配置观察值保留相关性，并在 bootstrap 时作为一个簇共同重采样。
- **eligible Run**：已归属明确的 Task 和 AgentConfiguration、`lifecycleStatus=closed`、未被判定为重复或孤儿的 Run。数据不完整的 Run仍保留，但会触发 observation 完整度标记和方向性结论阻断。
- 同一配置的多次 Run 聚合规则：
  - observation 在 Task 被用户关闭、用户明确放弃该配置，或最后一个 Run 结束后 24 小时无新增 Run 时进入 `settled`；
  - `settlementSource=inactivity` 时，后续出现开始时间晚于 settledAt 的新 Run 可自动重新变为 `active`，同时保留上一次 settled 审计记录；
  - `settlementSource=task_closed/user_abandoned_config` 时不得自动重新 active；用户必须显式执行 reopen。未显式 reopen 的后续 Run 建议创建新 Task，或保持未归属并等待用户处理；
  - 迟到导入、且开始时间不晚于 settledAt 的既有 Run 可以触发幂等重算，但必须增加 aggregationVersion 并保留重算前快照。重算后：`settlementSource=inactivity` 时，只有最新 eligible Run 的 `endedAt + 24h ≤ 当前 analysisAsOf` 才保持 settled，否则回到 active；`task_closed/user_abandoned_config` 保持 settled；
  - 所有 eligible Run 使用稳定总排序键 `(startedAt, endedAt, runId)`；`firstRunId` 取升序第一条，`terminalRunId` 取升序最后一条。不得因 terminal Run 未评价而回退到更早 Run；
  - `firstAttemptOutcome`：`firstRunId` 的 RunEvaluation 结果；缺失评价时为 `unknown`；
  - `finalOutcome`：`terminalRunId` 的 RunEvaluation 结果；缺失评价时为 `unknown`，不采用“任一 Run 成功即全部成功”的规则；
  - `retryCount = max(runCount - 1, 0)`，只计算同一配置内部的重复尝试；
  - `finalRunIntervention`：终止 Run 的干预，缺失时为 `unknown`；
  - `maxIntervention` 使用三值聚合：任一 eligible Run 已确认 `light_edit/heavy_edit/takeover` 时取已确认最高等级；只有全部 eligible Run 均已评价且均为 `none` 时取 `none`；其他情况为 `unknown`。主要“人工干预率”使用 `maxIntervention`，终止 Run 干预作为补充指标。
- 跨配置切换不计入任一配置的 `retryCount`；Task 级可另行展示 `totalRunCount - 1` 和 `configurationSwitchCount`，但不得分摊给配置。
- 示例：Task X 中 A 失败、B 成功，则 A 的 observation 记失败，B 的 observation 记成功；Task 整体结果可记成功，但不得把 Task 整体成功同时归给 A 和 B。
- 同一 Task 中存在多个配置观察值时形成**观察性配对数据**。它控制了 Task 身份差异，但不能消除顺序、上下文继承、前序修改和用户学习偏差。
- Task 归并采用“同工作区 + 执行前标题本地相似度 + 时间邻近”产生建议，用户确认；不强制。归并动作必须可撤销、有审计记录。
- Task 合并后若出现相同 AgentConfiguration 的两个 observation，必须先合并其 eligible Run、按稳定顺序重新聚合，再生成新的 observationId；原 observation 进入只读审计记录。Task 拆分时按 Run 归属重建 observation。合并、拆分和撤销均不得静默覆盖评价。
- 未归属 Task、未知 AgentConfiguration 或 observation 仍为 `active` 的 Run 只进入描述统计，不进入方向性比较。

---

## 3. 数据隐私与安全

### 3.1 即时处理管线

最高原则：**Recorder 不主动持久化原始内容。**

```text
原始事件 → 内存缓冲（提取 / 分类 / 脱敏 / allowlist 映射）
         → 结构化记录 → 加密 spool 或加密 SQLite
         ↘ 原始内容处理后立即丢弃
```

- 原始 Prompt、响应、思维内容、文件内容、命令输出：不写数据库、不写日志、不进崩溃报告、不进导出文件、不进 spool。
- 事件在写入任何持久化介质前完成结构化、脱敏和 allowlist 映射；失败时整条丢弃，仅记录原因枚举和计数。
- 崩溃报告只允许结构化字段；处理缓冲区应尽可能排除于崩溃转储。
- 操作系统 swap/pagefile 可能暂存内存内容，属 OS 层残余风险；对外承诺仅为“应用不主动持久化原始内容”。

### 3.2 字段级数据策略与封闭 allowlist

| 数据项 | 策略 |
|---|---|
| Prompt / 响应 / 思维内容 | 不持久化 |
| 文件内容 | 不持久化；只允许保存经规范化的相对路径、扩展名和产物类型 |
| 命令 | 只允许保存可执行程序名和命令类别；参数与原始命令行一律丢弃 |
| URL | 只允许保存注册域名（eTLD+1） |
| 任务标题 / 摘要 | 仅保存脱敏结果；缺失时使用匿名标题；生成于 Run 开始后的标题不得冒充执行前分类信号 |
| 来源标识 | 原生不透明 ID 可保存；包含路径、用户名或其他敏感信息的 locator 必须先用本机密钥 HMAC/tokenize，不保存原 locator |
| `metadata` | **封闭、版本化、强类型 allowlist**；只允许附录 B 字段，未知字段默认丢弃，不得透传原始 OTel attributes |
| 记录 envelope | Session、Run、Event 与 spool frame 的结构字段遵循各自冻结 schema；不得通过 envelope 携带未声明 payload |
| Evidence 引用 | 只允许附录 F 的 `EvidenceReference` 类型；原始路径、完整 URL、开放字符串 ref 一律禁止持久化 |

额外约束：

- `metadata` 不允许任意嵌套 JSON；字符串字段设定长度上限，枚举字段只接受已知值。
- 未知字段、超长值、类型不匹配值在进入 spool 前丢弃，并增加 `droppedMetadataFieldCount`。
- 导出和诊断快照沿用同一 allowlist，不得增加“调试例外”。

### 3.3 加密与密钥

- 本地数据库使用 SQLCipher（AES-256）加密。
- 系统凭据存储中的 root key 不以明文离开安全存储；应用运行时通过系统 API 使用或在受控内存中短暂取得。
- 数据库/spool DEK 与标识 tokenization key 可以用 root key 或备份口令派生 KEK 包裹后进入应用数据文件或加密备份；不得以明文持久化。
- 本地连接器认证使用由 root key 派生、可独立轮换和撤销的 connector token。token 可以写入受管连接器配置，但文件必须使用最小权限，且不得反向推导 root key。
- 准确承诺口径为：**根密钥不写入应用数据文件；所有应用秘密均不以明文持久化；导出只包含包裹后的密钥材料**。系统凭据存储本身可能使用落盘机制。
- 密钥丢失意味着数据不可恢复，首次启动时向用户明示。

### 3.4 保留、清理、导出与卸载

- 默认无限期保留；支持按时间段、Agent、项目批量清理，操作前二次确认。
- 支持 Run、TaskAgentObservation 和指标汇总导出 CSV/JSON；导出不含原始内容。
- 整库备份使用用户口令或恢复码，以 Argon2id 派生 backup KEK。备份 key manifest 包含：被 backup KEK 包裹的数据库 DEK、标识 tokenization key，以及配置备份专用 KEK；root key、connector token 和 spool DEK 不进入备份。
- 配置备份内容在进入整库备份前用配置备份专用 KEK 重加密；spool 不进入跨设备备份。恢复时目标设备生成新 root key、数据库 DEK、spool DEK 和 connector token，解包并保留原 tokenization key 以维持稳定身份，随后重加密数据库和配置备份。
- 恢复先写临时库、完整性校验通过后原子替换，错误口令零写入。四条恢复路径固定为 macOS→macOS、Windows→Windows、macOS→Windows、Windows→macOS。
- “卸载采集配置”和“删除用户数据”是独立操作；应用卸载向导提供保留数据、导出后删除、彻底删除三种选择。

### 3.5 网络出站与遥测

- 正式版只允许更新清单与安装包下载；除此之外零网络请求。
- 更新协议不得在 query、body 或自定义 header 中主动发送安装标识、当前版本、Run、Task 或行为数据。
- 不得承诺“服务端无从得知用户当前版本”。服务端或 CDN 仍可能从 IP、请求时间、缓存命中、User-Agent 或网络日志推断有限信息；隐私说明必须如实披露。
- 正式版不含遥测上报通道；内测仅通过用户审阅后手动提交的诊断快照回收汇总信号。后续如引入遥测，必须显式 opt-in 且 payload 完全可审计。

---

## 4. 产品形态与系统架构

### 4.1 形态与分发

- Tauri + React 桌面应用，首发 macOS 12+（Apple Silicon / Intel）与 Windows 10/11 x64。
- macOS 使用 Developer ID 签名与公证；Windows 使用代码签名证书。
- 自动更新走签名校验的 Tauri Updater；设置中可完全关闭自动更新。
- 更新通道可下发连接器能力配置、脱敏规则集和分类规则集，但每项内容必须签名并带版本号。

### 4.2 后台行为

- 首次授权后可随系统登录启动；设置中可关闭。
- 托盘显示采集状态、暂停状态、异常连接器数量和 spool 水位。
- 支持全局和单连接器暂停、恢复及卸载采集配置。

### 4.3 架构组件与本地接收安全

Tauri Rust 后台负责文件监听、Hook/OTLP 接收、即时处理、脱敏、身份解析、幂等写入和 SQLCipher 持久化。

#### 4.3.1 spool 契约

- spool 只保存符合附录 F RecordEnvelope/frame allowlist 的结构化记录；其中 metadata 必须符合附录 B，EvidenceReference 必须符合附录 F。spool 使用 AEAD 加密和完整性校验；算法、nonce 管理和密钥轮换方案须在技术设计文档中冻结后方可实现。
- 采用分段 append-only 格式；每个 frame 至少包含格式版本、长度、生产者/连接器标识、单调序号、密文和认证标签。
- 多进程写入必须采用“每生产者独立 segment”或等价的无共享写入设计；禁止依赖未定义行为的并发追加。
- 记录只有在 frame 持久化成功后才可向来源确认；批量刷盘窗口、最大可丢失窗口必须明确，M1 目标为“已确认记录在断电后不丢失”。
- 启动恢复时逐 frame 校验；遇到不完整尾帧只截断损坏尾部，不影响此前有效记录；认证失败的 frame 隔离并在 health() 中告警。
- 补传采用事务性 checkpoint；补传中断后可继续，且不会重复生成 Session、Run、Event 或 observation。
- 容量按 72 小时峰值负载标定，跨所有 segment 统一计算；达到 80% 时预警，溢出按完整 frame FIFO 淘汰并记录丢失区间与数量。

#### 4.3.2 OTLP 本地接收契约

- 只绑定 `127.0.0.1`；禁止默认绑定 `0.0.0.0` 或局域网地址。
- 每次安装生成本地认证令牌；支持 header/metadata 的来源必须携带令牌。无法携带令牌的连接器只能进入显式开启的兼容模式，并在 UI 中显示安全降级。
- 默认限制：单请求压缩前后大小、单请求事件数、每秒请求数和突发量；超限返回明确的 413/429，不得导致应用 OOM。
- 端口冲突时不得静默随机换端口。应用只能：原子更新受管连接器配置到用户确认的备用端口，或进入失败状态并提供修复指引。
- 请求解析失败、认证失败和限流只记录结构化计数，不记录原始 payload。

#### 4.3.3 停机保障分级

| 采集机制 | Recorder 停机时行为 | 72h 不丢承诺 |
|---|---|---|
| Hook shim / 本地结构化 producer | 写入加密 spool | 适用 |
| 文件监听 | 来源文件作为持久层，重启后按 import ledger 回填 | 适用，受来源保留期约束 |
| 直接 OTLP 推送 | 来源可能丢弃 | 不适用，标记“仅在线时采集”；配置带磁盘队列的 Collector 后另行评估 |

### 4.4 规模假设与性能预算

- 设计上限：1000 万 Event / 10 万 Run；超过后引导归档。
- 100 万 Event 下，Run 列表、Task 详情和对比查询 P95 < 500ms；1000 万 Event 冒烟可用。
- 常驻预算：空闲 CPU（5 分钟均值）< 1%；内存常驻 < 150MB；事件洪峰 CPU（1 分钟均值）< 10%。
- macOS 能耗验收不使用不可复现的“Energy Impact 百分比”。使用固定参考设备、固定 OS、固定负载的配对测试：
  - 8 小时后台空闲/正常负载场景中，Recorder 进程累计 CPU time ≤ 4.8 分钟；
  - 与禁用 Recorder 的对照相比，整机电量额外消耗中位数 ≤ 2 个百分点，至少 5 次配对运行并报告离散度。
- 首次历史导入：90 天 / 1 万 Run < 15 分钟；可取消、可恢复、幂等。

---

## 5. 连接器（Agent 接入）

### 5.1 产品目标矩阵

以下表格是产品目标，不代表已经验证的工程支持。真实支持范围以 §5.2 和附录 D 的冻结能力矩阵为准。

| Agent | 目标采集档位 | 目标采集方式 | 历史导入目标 |
|---|---|---|---|
| Codex | 完整采集 | OTel / 官方事件能力 | 条件支持 |
| Claude Code | 完整采集 | OTel / 官方事件能力 | 条件支持 |
| Gemini CLI | 完整采集 | OTel | 条件支持 |
| OpenCode | 完整采集 | 事件与导出 | 条件支持 |
| Cursor | 标准采集 | Hooks / 稳定会话格式 | 视官方能力 |
| GitHub Copilot CLI | 标准采集 | Hooks | 视官方能力 |
| Windsurf | 标准采集 | Hooks | 视官方能力 |
| Kiro | 标准采集 | Hooks | 视官方能力 |

采集档位是能力契约，不是营销标签：

- **完整采集档**：必须稳定识别 Session/Run 身份与边界、AgentConfiguration、开始/结束与来源执行状态，并覆盖模型、工具、Token、错误等冻结矩阵声明的必需事件；支持的每个“Agent 版本 × OS”均通过完整 contract fixture。
- **标准采集档**：必须稳定识别 Run 身份、边界、AgentConfiguration、开始/结束和来源执行状态，但允许缺少工具级、Token、成本或部分 Evidence 信号；缺失能力必须在矩阵和 UI 中逐项标注。
- 不满足标准采集档最小能力时标记为“实验/不支持”，不得参与方向性比较。
- 指标只有在双方连接器对该指标具备相同且已验证的可观测能力时才可比较；降档不能修复系统性测量差异。

### 5.2 连接器能力矩阵、接口与 fixture

统一接口：

```text
detect()
capabilities()
installCapture()
uninstallCapture()
importHistory(since, cursor)
health()
```

每个连接器在进入采集实现前必须冻结一行能力矩阵，至少包含：

- 连接器版本和支持的 Agent 版本范围；
- 支持的 OS / 架构；
- 采集机制、事件粒度和字段覆盖；
- 原生 Event / Session / Run ID 是否可用；
- 历史导入来源、游标和保留期；
- Recorder 停机行为与 72h 保障等级；
- Run 边界来源和降级规则；
- 本地认证能力；
- 配置修改范围、卸载恢复方式；
- 已知缺失字段、降级 UI 和禁用条件。

`capabilities()` 必须由冻结矩阵生成或与其自动一致性校验，不得返回产品意向值。

每个支持的“Agent 版本范围 × OS”必须有可提交到仓库的脱敏 fixture 包和 contract test，至少覆盖：成功、失败、取消、工具报错、多轮、重复导入、合法重复工具调用、乱序、迟到、超时边界、显式边界、停机回填和能力降级。

每个连接器独立 semver 版本化；第三方能力变化时可以通过签名能力配置降级或禁用，但不得改变历史数据解释而不保留版本。

### 5.3 版本化标准事件与身份规范

```text
NormalizedRunEvent {
  schemaVersion
  metadataSchemaVersion
  connectorVersion
  connectorInstanceId
  eventId
  eventIdentityMethod
  sourceEventId?          // 仅不透明、无敏感内容时保存
  sourceSessionKey?       // 原生 ID 或本机 tokenized key
  sourceRunKey?           // 原生 ID 或本机 tokenized key
  sourceLocatorToken?     // HMAC 后的稳定来源定位符
  sourceOffsetOrOrdinal?
  timestamp
  eventType
  status
  metadata                // 封闭 allowlist
}
```

身份优先级：

```text
来源原生事件 ID
> 稳定文件偏移 / trace-span ID / 来源定位符
> 连接器定义并经 fixture 验证的确定性 fallback
```

规则：

- `connectorInstanceId` 表示一个逻辑来源实例，在卸载/重装采集配置时保持稳定；只有用户显式重置来源身份时才可更换。
- `eventId` 必须命名空间化到 `connectorInstanceId`，防止不同来源实例或工作区碰撞。
- fallback 不得使用原始 Prompt、响应、文件内容、完整命令、命令参数或其他被禁止持久化的内容参与哈希。
- 合法的两次相同工具调用必须能生成不同 eventId；fallback 必须包含稳定 occurrence ordinal 或等价的来源位置。
- `sessionId`：优先由原生 session key 命名空间化生成；无原生 key 时使用稳定来源 locator token + session 起始边界定位符。
- `runId`：优先由原生 run key 命名空间化生成；无原生 key 时使用 `sessionId + run opening boundary locator` 生成，不使用事件内容哈希。
- Event 去重、Session 去重和 Run 去重是三个独立契约；不得声称 Event 幂等自然保证 Run 不重复。
- 数据库必须对稳定来源键建立唯一约束；历史导入事务同时提交 Event、Session、Run 和 import ledger checkpoint。

#### 历史导入账本

`ImportLedger` 至少包含：connectorInstanceId、sourceArtifactToken、connectorVersion、schemaVersion、cursor/offset、lastCommittedIdentity、status、startedAt、completedAt。

- `sourceArtifactToken` 对原始路径/locator 使用本机密钥 HMAC，不保存原始绝对路径。
- 重复导入、升级后重导、崩溃续传都从最后原子 checkpoint 继续。
- 连接器无法提供稳定 locator/offset 时，不得宣称支持幂等历史导入。

### 5.4 安装与卸载规范

- 安装前备份原配置，保留最近 5 份；使用结构化幂等合并而非覆盖。
- 配置备份可能包含第三方 Token 或证书，必须使用应用密钥加密、设置仅当前用户可读权限，并纳入卸载/彻底删除清单；恢复时采用三方差异合并，不得静默覆盖安装后用户新增的修改。
- Recorder 写入的键记录于归属清单；卸载只删除自有内容。
- 已存在的 OTel exporter 不直接覆盖；提供并行 Collector、兼容配置或明确降级。
- 所有端口、认证令牌和配置变更必须原子写入；失败时恢复原状态。

### 5.5 合规

- 对闭源 Agent 修改配置或安装 Hook 前，完成对应 ToS 评估并留存结论。
- 安装界面逐项明示将修改的文件、配置和监听端口，用户确认后执行。

### 5.6 Run 边界识别与 endedAt

- `Session` 为一等对象；Session start/end 不等于 Run start/end。
- Run 生命周期只使用 `open / closed`：识别 opening boundary 后进入 open；显式结束、来源键切换、静默超时、取消、失败或导入完成后原子进入 closed。关闭事务必须同时写入 `endedAt`、`boundarySource` 和最终 `sourceExecutionStatus`；事务失败时保持 open，由恢复流程幂等重试。
- RunEvaluation/Outcome 是用户评价层，不参与 Run 生命周期转换；Run 关闭后触发一次结果收件箱候选通知，重复恢复不得重复通知。
- 边界优先级固定为：`explicit(3) > source-key/session-switch(2) > timeout(1)`（默认静默超时 15 分钟，可按连接器配置）。
- Run 一旦关闭不重开。迟到普通事件可以在水印窗口内附着到已关闭 Run，但只能位于已确定时间边界内，不能延长边界。
- 已关闭 Run 在水印窗口内收到事件时间戳位于当前边界内、且优先级严格高于当前 `boundarySource` 的终止信号时，允许创建 `BoundaryRevision`：Run 保持 closed，事务性更正 `endedAt/boundarySource/sourceExecutionStatus`，revisionVersion 单调增加，并保留旧值、触发事件 ID 和更正原因。允许 `timeout→switch→explicit` 连续升级；同级或降级信号不得修订。修订不得重复通知，受影响 observation 只按 aggregationVersion 幂等重算。
- 落在原关闭边界之后的迟到终止信号不得改写旧 Run；按连接器规则进入新 Run 或记为孤儿事件。
- `endedAt` 按边界类型计算：

```text
explicit:
  endedAt = max(显式结束时间, 已归属事件的最大时间戳)
  若后者更晚，记录 clockSkewAdjusted=true；不增加静默超时时长

session-switch / source-key-switch:
  endedAt = 最后一个已归属事件时间

timeout:
  endedAt = 最后一个已归属事件时间 + 静默超时时长
```

- 不得对已有显式结束的 Run 再统一加 15 分钟。
- 迟到/乱序事件的水印回看窗口默认 24 小时；超窗或落在关闭边界之后的事件按连接器规则进入新 Run 或记为孤儿事件。
- `retryOf` 只表达 Run 级执行链；TaskAgentObservation 的重试数仍按同一配置内 Run 数聚合。
- 每条 Run 记录 `boundarySource ∈ {explicit, source-key-switch, session-switch, timeout}` 和连接器版本。

---

## 6. 结果收件箱与评价

### 6.1 触发与通知策略

- Run 结束后进入结果收件箱；桌面通知邀请补充评价。
- 5 分钟窗口内多个结束事件合并通知；免打扰默认 22:00–9:00；每周主动提醒上限默认 3 次。

### 6.2 评价项与结果作用域

- **Run 评价**：完全完成 / 部分完成 / 失败 / 取消；人工干预：无 / 轻度 / 重度 / 接管。
- **Task 整体评价**：可选，单独评价整个 Task 的最终结果和整体人工干预；不得自动分摊到任何 AgentConfiguration。系统可以计算只读的 `DerivedTaskStatus` 预览，但它不是 `TaskOverallResult`、不进入正式统计；只有用户确认后才创建或更新正式 TaskOverallResult。
- **任务类别修正**：修改 `Task.comparisonCategory`，同一 Task 下全部 Run 与 observation 立即继承同一类别；保留修改时间、来源和旧值。
- **难度回顾确认**：结果收件箱中的难度修正写入 `postHocConfirmedDifficulty`，不得覆盖 `preRunDifficulty`。
- 通知内支持一键提交 Run 结果；收件箱内完成一单完整评价目标 ≤ 10 秒。

### 6.3 HumanIntervention 自动信号

- 编程类：Run 结束后 30 分钟内，相关相对路径集合上的 git 变更量占比只生成干预建议。
- 通用类：产物文件在 Run 后 24 小时内发生修改时生成“可能被修改”建议。
- 自动信号永远不直接写入用户确认值；未经确认时保留 `unknown` 或标记为 `suggested`。

---

## 7. 任务分类与难度估计

### 7.1 分类体系

一级类别：编程 / 研究 / 文档 / 数据分析 / 浏览器操作 / 办公 / 沟通 / 其他；二级标签可扩展。

### 7.2 Task 级固定比较类别

用于效能比较的类别是 `Task.comparisonCategory`，同一 Task 下所有 Run 和 TaskAgentObservation 必须继承同一值。

比较类别的来源优先级：

1. 用户在首个 Run 开始前明确选择；
2. 只使用首个 Run 开始前已存在的脱敏标题进行规则分类；
3. Task 首次归并时继承已确认的 Task 类别；
4. 未知。

禁止直接用于比较分桶的执行后变量：工具调用直方图、产物类型、域名、路径扩展名、耗时、轮次、Token、错误类型和 Agent/source。

- 执行后信号只能生成 `postRunCategorySuggestion`，不得自动改变比较桶。
- 用户确认建议后可以修改 Task 类别，但必须同步更新整个 Task，并保留审计记录。
- 生成于 Run 开始后的 Agent 标题视为执行后信号，不得冒充执行前标题。
- 规则集独立版本化；详情页展示类别来源和规则版本。
- 未分类 Task 单列，不跨类别排名。

### 7.3 难度估计与互斥桶

- `preRunDifficulty` 为 Task 级、Agent 无关的执行前值；来源为 `user_pre_run / rule_pre_run / unknown`。
- 一旦首个 Run 开始，`preRunDifficulty` 不可被结果收件箱覆盖；后续人工修正写入 `postHocConfirmedDifficulty`。
- 执行前规则只允许使用执行前标题和已确认类别；轮次、耗时、工具数、产物数等不得进入。
- `executionComplexity` 为 Run 级事后描述变量，禁止参与比较分层。
- 比较使用互斥桶：

```text
低：1–2
中：3
高：4–5
未知：单独展示
```

- `postHocConfirmedDifficulty` 可用于回顾视图和敏感性分析，不用于主要方向性结论。
- 难度规则校准仍使用“预测值与人工金标准相差不超过 1 级”的准确率指标，但这不等于比较桶可以重叠。

### 7.4 分类与难度验收

- 一级类别自动分类只使用 §7.2 允许的执行前特征；分层准确率各类 ≥ 70%、总体 ≥ 80%，未分类率 ≤ 20%。
- 每版本抽样 400 个 Task，每类 ≥ 50；低频类别不足时合并报告，不宣称单类精度。
- preRunDifficulty 每版本抽样 200 个 Task，±1 级命中率 ≥ 85%。
- 同一 Task 使用不同 AgentConfiguration 重放时，比较类别和 preRunDifficulty 桶必须完全一致。

---

## 8. 效能分析与观察性对比

### 8.1 指标集

不生成单一 Agent 总分。配置对比的主要指标按 `TaskAgentObservation` 计算：

- 首试成功率：`firstAttemptOutcome = success`；
- 配置最终成功率：`finalOutcome = success`；
- 部分完成率、失败率和取消率；
- 有自动证据支持的最终完成率；
- 人工干预率：`maxIntervention ∈ {light_edit, heavy_edit, takeover}`；`unknown` 不计入已知分母；
- 人工接管率：`maxIntervention = takeover`；
- 配置内重试次数：`retryCount`；
- 配置总耗时、Token/credits/真实成本：聚合同一 observation 下所有 Run，同时保留 Run 级明细；
- 工具错误率和任务中断率：Run 级描述统计，可按 observation 汇总展示；
- 编程附加证据：Git 采用、返工、PR、回滚；其他任务使用产物生成、外部操作成功和用户反馈。

Task 整体成功率、Task 总尝试次数和配置切换次数单独展示，**不用于 AgentConfiguration 归因**。

### 8.2 归因、分层与聚类

- 每个 Task 对每个 AgentConfiguration 最多贡献一个 observation。
- A 失败、B 成功时，A 记失败、B 记成功；Task 整体成功另存。
- 对比只发生在同一互斥桶内：

| 桶维度 | 规则 |
|---|---|
| Task 比较类别 | 固定 Task 级类别，见 §7.2 |
| preRunDifficulty | 低 / 中 / 高 / 未知，互斥 |
| 时间窗口 | 默认近 30 天，以 Task 首次 Run 时间归桶 |
| 采集档位 | 同档优先；跨档对比质量上限为中 |

- 分析数据行是 TaskAgentObservation，bootstrap 重采样单位是 Task，确保同一 Task 的多个配置观察值作为相关簇共同进入或离开样本。
- 同一 Task 同时有双方 observation 时，单列“观察性配对”数量和配对结果；不得称为最高证据等级。
- 顺序执行的后一个配置可能继承前一配置的修改、上下文或用户经验；并行执行也可能受不同权限和环境影响。

### 8.3 观察性结论边界与 UI 文案

- 双方 `modelId + modelVersion` 相同时标注：**同模型 AgentConfiguration 对比**。
- 模型不同时标注：**不同模型 AgentConfiguration 对比**。
- 禁止使用“纯 Agent 差异”“纯 Agent 效应”“证明更强”“因使用该 Agent 导致”等措辞。
- M2 允许的方向性结论模板：

> 在你的历史记录中，配置 A 在该类任务上的观察完成率高于配置 B；这不是随机实验结果，仍可能受任务选择、顺序和上下文差异影响。

### 8.4 数据质量等级

数据质量按**每个“指标 × AgentConfiguration 配置对 × 比较桶”**独立计算。`n` 指该指标值已知的 TaskAgentObservation 数量，双方分别计算。

| 等级 | 条件 |
|---|---|
| 高 | 双方分别 `n ≥ 20`；双方 observation 反馈覆盖率分别 ≥ 70%；双方元数据完整率分别 ≥ 90%；双方 Task 归并覆盖率分别 ≥ 90%；且双方均为完整采集档 |
| 中 | 双方分别 `n ≥ 5`；双方反馈覆盖率分别 ≥ 40%；双方元数据完整率分别 ≥ 70%；双方 Task 归并覆盖率分别 ≥ 70% |
| 低 | 任一条件未达到中等级；明确提示“数据不足，不建议据此选择配置” |

补充规则：

- 跨采集档位对比的质量上限为中。
- `Task 归并覆盖率 = 可进入该桶的已结束 Run 中已归属 Task 的比例`，双方分别计算并进入正式降档规则。未归并 Run 只使用其开始前可得的 provisional category/difficulty 判断覆盖率分母，不进入效果指标。
- 反馈覆盖率按 TaskAgentObservation、且按具体指标计算，不再使用 Run 级总覆盖率替代。
- 同步展示双方 `n_total / n_known / unknown`、反馈覆盖率、元数据完整率、Task 归并覆盖率、配对 observation 数和采集档位。
- 数据质量等级只表示数据条件，不表示差异真实存在。

### 8.5 缺失结果与方向性结论门槛

对于 success/failed 等二元指标，每方展示 unknown 极端假设范围：

```text
rate_low  = known_success / total_eligible_observations
rate_high = (known_success + unknown) / total_eligible_observations

Δ_sensitivity = [A_low - B_high, A_high - B_low]
```

方向性结论必须同时满足：

1. 数据质量为高；中等级只展示描述统计、区间和阻断原因；
2. 95% 区间不包含 0；
3. `Δ_sensitivity` 不跨越 0；
4. 双方反馈覆盖率绝对差 ≤ 20 个百分点；
5. 双方没有 `data_incomplete / category_posthoc_changed / task_merge_conflict / metric_capability_mismatch / boundary_estimate / stats_validation_failed` 等版本化阻断标记；
6. 指标为 stats-v1 注册的主方向指标“配置最终成功率”，且该周冻结分析快照中的多重比较校正通过；
7. 任一方观察成功率为 0% 或 100% 时，stats-v1 将其视为边界估计并阻断方向性结论；只有后续统计规范冻结并验证边界可用方法后才可放开。

任一条件不满足时，只展示描述统计和阻断原因，不输出“哪一方观察表现更好”。

### 8.6 统计推断、MID 与 MDE

- M1 只提供描述统计：样本量、原始比例、unknown、覆盖率、配对数量和配置内重试；**不宣布赢家，不显示方向性结论**。
- M2 才启用区间、缺失敏感性和方向性结论门槛。
- stats-v1 的主方向指标仅为“配置最终成功率”。其他指标可以展示描述统计和探索性区间，但不得生成“哪一方观察表现更好”的方向文案，也不计入北极星。
- 历史比例和差值是当前记录的确定性描述量；95% 区间的推断目标是“同一用户未来 30 天内，在相同类别、难度桶和可比采集条件下的可交换相似 Task”。该推断依赖任务分配和环境在窗口内近似稳定的假设，不代表因果效应。
- 每周一用户本地时区 00:00 生成一次带 `analysisAsOf` 和时区的冻结分析快照。stats-v1 的比较 family 固定为该快照中主方向指标“配置最终成功率”的全部无序配置对 × 比较桶，入选资格仅为：双方均有 eligible settled observation、达到高数据质量的非统计门槛、连接器具备同等指标能力、且没有结构性 blocker。CI 是否跨 0、unknown 敏感性、边界比例和观察差值不得用于筛除 family 成员。
- 完成率差值 `Δ = rate_A - rate_B`，A/B 按稳定 configId 排序。点估计与 bootstrap 只使用 finalOutcome 已知的 eligible settled observation；unknown 不进入点估计，但必须进入 §8.5 极端敏感性。
- Task 簇 bootstrap 在双方 Task 并集上按 Task 重采样 10,000 次，保留 Task 内所有 observation；同一 Task 在单次 replicate 中使用同一 multiplicity。缺少任一比较侧的 replicate 重新抽样并记录计数，最终必须得到 10,000 个有效 replicate。随机种子由 `HMAC(statsVersion + analysisAsOf + comparisonKey)` 确定。
- 95% percentile 区间使用未舍入 replicate 的 2.5/97.5 百分位。bootstrap 双侧 p 值固定为 `min(1, 2 × min((1 + count(Δ* ≤ 0)) / 10001, (1 + count(Δ* ≥ 0)) / 10001))`。BH 使用未舍入 p 值升序排列，p 值相同按 comparisonKey 排序，`q=0.05`；family 中的边界比例测试固定 `p=1` 且方向性阻断。已知真值数据集必须验证覆盖率和 FDR。
- 纯配对补充视图只使用同时包含双方已知 observation 的 Task，使用配对 Task bootstrap；始终标注“观察性配对”。

**MID（Minimum Important Difference）**：产品认为值得关注的最小实际差异，与样本量无关。初始默认值：二元完成/干预指标为 10 个百分点；按指标配置、带版本号。只有区间整体超过 `+MID` 或低于 `-MID` 时，UI 才可标注“达到产品关注阈值”。

**MDE（Minimum Detectable Effect）**：在当前样本量与预设检验参数下可检测的最小差异，是能力说明，不是观察到的效果。

固定参数：

- 双侧 `α = 0.05`；
- 统计功效 `1 - β = 0.80`；
- 二元率保守基线 `p0 = 0.50`；
- 主对比/混合配对数据：使用双方实际 n 的两独立比例正态近似，数值求解最小可检测绝对差；该值不利用配对信息，只作为统一的规划近似，不参与方向性结论；
- 纯配对补充视图：使用 McNemar 功效近似，假设总不一致对比例 `q = 0.50`，单独标记“配对 MDE（q=0.50 假设）”；
- 参数变化必须提升统计规范版本，不得静默改变历史展示。

MDE 与 MID 必须同时展示名称和解释，不得互换术语。

---

## 9. 主界面需求

1. **Run 时间线与筛选**：按时间、Agent、模型、Task 类别、难度桶、结果和干预程度筛选。
2. **Task / Run 结构化详情**：展示 Task 整体结果、各 TaskAgentObservation、Run 事件流、证据和评价状态；不含原始内容。
3. **结果收件箱**：Run 评价、Task 整体评价、类别确认和难度回顾确认；明确字段作用域。
4. **对比视图**：
   - 按 AgentConfiguration 比较；
   - 使用“同模型 AgentConfiguration 对比 / 不同模型 AgentConfiguration 对比”标签；
   - M1 只显示描述统计和“不得据此宣布赢家”的提示；
   - M2 显示数据质量、Δ、95% 区间、unknown 敏感性范围、MID、MDE、覆盖率差异、Task 归并覆盖率和方向性结论阻断原因；只有 stats-v1 注册的主方向指标通过全部门槛与 FDR 校正后才显示方向文案；
   - 单列观察性配对数量和结果，不使用“最高证据”等文案。
5. **数据完整度与连接器健康**：显示冻结能力矩阵摘要、最近事件、采集档位、停机保障、spool 水位、认证/端口状态、丢失区间和修复流程。

---

## 10. 验收标准

1. macOS、Windows 分别完成目标连接器的安装、暂停、恢复和卸载验证；实际支持范围与冻结能力矩阵一致。
2. M1 四个连接器在生产实现前具备完整能力矩阵、支持版本范围和脱敏 fixture；reference parser/test harness 的 contract test 全部通过。
3. Run 边界金标准 100% 通过，包含 explicit、source-key/session 切换、timeout、关闭不重开、迟到/乱序和跨边界事件。
4. `endedAt` 按边界类型计算；显式结束 Run 不额外增加静默超时时长。
5. 每个连接器执行 20 个已知 Run；完整档检出率 ≥ 95%，标准档 ≥ 90%。
6. 身份与导入验收：
   - 两次内容相同但合法独立的工具调用不得误去重；
   - 原始内容不得进入任何 ID 哈希；
   - 重复导入不产生重复 Session、Run、Event 或 TaskAgentObservation；
   - 导入中断后从 ledger checkpoint 恢复；
   - 缺乏稳定来源定位的连接器不得标记“支持幂等历史导入”。
7. TaskAgentObservation 归因金标准：
   - `(taskId, configId)` 唯一；
   - A 失败、B 成功时分别归因；
   - 同一配置多 Run 只贡献一个 observation；
   - retryCount 只计算配置内 Run；
   - Task 整体结果不写入任一 observation；
   - 同一 Task 的多个 observation 在 bootstrap 中作为同一簇。
8. 分类与难度：同一 Task 的所有 Run/observation 继承相同类别和互斥难度桶；执行后信号不能自动改变比较桶；结果收件箱修改只写 postHocConfirmedDifficulty。
9. spool 未溢出、溢出、补传中断和 72h 峰值容量场景全部通过；加密、认证标签、并发 producer、断电恢复和损坏尾帧截断均有自动化测试。
10. OTLP 只绑定 loopback；认证、请求大小、事件数、限流、端口冲突和兼容模式降级均通过安全测试。
11. 隐私扫描覆盖数据库、WAL、spool、导出、备份、配置备份、临时目录、崩溃产物和 import ledger；RecordEnvelope、metadata 与 EvidenceReference 分别符合冻结 allowlist，不存在原始 Prompt、响应、文件内容、完整命令、完整 URL、开放字符串 Evidence ref 或未知 OTel 属性。
12. 100 万 Event 下核心查询 P95 < 500ms；1000 万 Event 冒烟可用。
13. 固定硬件资源测试符合 §4.4，并保存硬件、OS、负载、重复次数和原始测量结果。
14. M1 对比页只显示描述统计，不出现“赢家”“更强”“纯 Agent 差异”或其他因果/方向性结论。
15. M2 已知真值数据集验证 Task 簇 bootstrap 覆盖率不低于标称水平，并验证周冻结分析快照的 FDR 控制；区间含 0、数据质量未达到高等级、任一方比例处于 0%/100% 边界或 FDR 未通过时不输出方向性结论。
16. unknown 全成功/全失败敏感性范围计算正确；覆盖率差 > 20 个百分点、敏感性跨 0 或归并覆盖率不足时必须阻断方向性结论。
17. 数据质量门槛按“指标 × 配置对 × 桶”计算，且高/中门槛要求双方分别达到，不得使用双方合计 n。
18. 四条跨设备备份恢复路径全部成功；错误口令零写入，恢复原子化。
19. Reader Testing 使用完整 fixture：同一 Task 中配置 A 有 2 个 eligible Run（首次失败/轻度修改，终止失败/重度修改），配置 B 有 1 个 eligible Run（成功/无干预），用户尚未提交 Task 整体评价，因此不存在正式 TaskOverallResult。独立读者必须一致回答：A finalOutcome=failed、retryCount=1、maxIntervention=heavy_edit；B finalOutcome=success、retryCount=0、maxIntervention=none；Task 视图的正式整体结果显示 unknown，系统只能显示 derived success 预览。目标正确率 100%。

---

## 11. 里程碑、优先级与 M1 开工门禁

### 11.1 M1 生产实现开工门禁

M1 产品主干与可发布生产实现只有在以下产物全部评审通过后方可开始。为完成门禁，允许在隔离目录进行不会进入产品主干的 PoC、reference parser、fixture harness 和协议验证代码。

| 门禁 | 必须冻结的产物 |
|---|---|
| G1 归因模型 | TaskAgentObservation schema、唯一约束、聚合规则、TaskOverallResult 作用域和归因 fixture |
| G2 身份与导入 | Event/Session/Run ID 规范、连接器 fallback、ImportLedger schema、事务与迁移策略 |
| G3 连接器契约 | Codex / Claude Code / Gemini CLI / OpenCode 的版本×OS 能力矩阵和 fixture 包 |
| G4 本地安全 | RecordEnvelope/metadata/EvidenceReference allowlist、脱敏与 NER fixture、配置备份保护、spool 加密/完整性/断电恢复设计、OTLP 认证/限流/端口策略 |
| G5 M1 产品边界 | 描述统计字段、禁用方向性结论、观察性文案和 Reader Testing 脚本 |

**当前门禁状态：未通过。** G1/G5 的 PRD 产物与 Reader Testing 已通过；G2–G4 尚需技术设计、可执行 contract fixture 和逐连接器证据，全部通过后方可开始生产实现。

### 11.2 里程碑

| 里程碑 | 范围 | 优先级 |
|---|---|---|
| M1 内部可用 | 即时处理、加密落库、TaskAgentObservation、M1 四连接器、Run 身份与边界、结果收件箱、时间线/详情、**描述统计对比**、托盘与暂停/恢复 | P0 |
| M2 观察推断 | 标准采集四连接器、90 天历史导入、数据质量等级、Task 簇 bootstrap、unknown 敏感性、MID/MDE、方向性结论门槛、导出和健康中心 | P1 |
| M3 发布打磨 | 难度规则精化、Git 适配器、性能/资源优化、签名公证、自动更新和双端全量验收 | P2 |

---

## 12. 风险登记表

| # | 风险 | 概率 | 影响 | 等级 | 缓解措施 |
|---|---|---|---|---|---|
| 1 | Task 跨配置时结果错误归因 | 中 | 高 | 高 | TaskAgentObservation 唯一约束、归因金标准、TaskOverallResult 分离 |
| 2 | 观察性比较被误读为因果结论 | 高 | 高 | 高 | 统一文案、M1 禁止方向结论、M2 多重门槛和 Reader Testing |
| 3 | 执行后变量污染类别或难度分桶 | 中 | 高 | 高 | Task 级固定类别、preRunDifficulty 不可覆盖、post-run 只建议 |
| 4 | Event 去重正确但 Session/Run 重复 | 中 | 高 | 高 | 三层身份契约、唯一来源键、ImportLedger 原子 checkpoint |
| 5 | 即时处理走样导致隐私违约 | 中 | 高 | 高 | 封闭 allowlist、持久化前脱敏、全介质扫描 |
| 6 | spool/OTLP 本地攻击或断电损坏 | 中 | 高 | 高 | AEAD、认证、限流、segment 恢复、故障注入 |
| 7 | 评价疲劳与差异性缺失导致偏差 | 高 | 高 | 高 | 一键评价、unknown 敏感性、覆盖率差门槛 |
| 8 | 第三方能力变化 | 高 | 中 | 高 | 冻结能力矩阵、fixture、独立版本、可禁用配置 |
| 9 | 跨档位比较误导 | 中 | 中 | 中 | 质量上限为中、显式能力差异 |
| 10 | 常驻资源超标 | 低 | 中 | 低 | 固定硬件、可复现资源验收 |

---

## 13. 开放问题

1. 脱敏规则集与本地 NER 的维护和签名更新机制。
2. MID 初始 10 个百分点是否需按指标和类别差异化；首批用户数据只用于校准，不改变历史版本。
3. 配对 MDE 的 `q = 0.50` 保守假设是否在积累足够配对样本后改为预注册的经验分层值。
4. 成本数据来源和价格版本维护方式。
5. 缺标题 Task 的匿名命名与搜索体验。
6. 同一 Task 并行执行多个配置时的归并与“是否共享上下文”标记交互。
7. 长期商业模式方向。
8. 北极星目标值 ≥ 40% 的基线校准。
9. 正式版后是否引入显式 opt-in 遥测；当前决策仍为零遥测。

---

## 附录 A：指标定义表

| 指标 | 分析单位 | 定义 | 分母与缺失处理 |
|---|---|---|---|
| 首试成功率 | TaskAgentObservation | firstRunId 的 RunEvaluation.outcome = success | firstAttemptOutcome 已知的 observation；unknown 单独展示 |
| 配置最终成功率 | TaskAgentObservation | terminalRunId 的 outcome = success | finalOutcome 已知且 observation=settled；unknown 单独展示 |
| 配置最终部分完成率 | TaskAgentObservation | finalOutcome = partial | 同上 |
| 配置失败率 | TaskAgentObservation | finalOutcome = failed | 同上 |
| 证据支持完成率 | TaskAgentObservation | finalOutcome 为 success/partial，且终止 Run 存在由该任务类型 Evidence 适配器判定为匹配的 Evidence | finalOutcome 已知、EvidenceReference 合法且连接器具备对应证据能力的 observation |
| 人工干预率 | TaskAgentObservation | maxIntervention 为 light_edit/heavy_edit/takeover | maxIntervention 已知的 observation |
| 人工接管率 | TaskAgentObservation | maxIntervention = takeover | 同上 |
| 配置内重试次数 | TaskAgentObservation | runCount - 1 | 所有可归因 observation；报告中位数和分布 |
| 配置总耗时 | TaskAgentObservation | observation 下所有已结束 Run duration 求和 | 数据不完整时标记，不进入方向性结论 |
| Token / credits / 成本 | TaskAgentObservation | observation 下所有 Run 求和 | 来源缺失时不可比较，不估算 |
| 工具错误率 | Run / observation 描述 | error tool_call ÷ total tool_call | 只作描述统计 |
| Task 整体成功率 | Task | TaskOverallResult.outcome = success | 不按配置分组，不用于配置归因 |
| Task 额外尝试次数 | Task | max(totalRunCount - 1, 0) | 只作 Task 描述；不等同于任一配置的 retryCount |
| 配置切换次数 | Task | 相邻 Run 的 agentConfigId 变化次数 | 只作 Task 描述 |
| 反馈覆盖率 | 指标 × 配置 × 桶 | 该指标已知 settled observation ÷ 全部 eligible settled observation | 双方分别计算；active observation 单独展示，不进入分母 |
| 元数据完整率 | 指标 × 配置 × 桶 | 满足“指标 × 连接器能力”required-field registry 的 observation 比例 | 双方分别计算；registry 随统计规范版本冻结 |
| Task 归并覆盖率 | 配置 × 桶 | 已归属 Task 的 eligible ended Run ÷ 全部 eligible ended Run | 双方分别计算并降档 |

注：TaskAgentObservation 是配置指标行；Task 是聚类与重采样单位。Run 级指标不得通过简单把多次重试当作独立样本进入完成率推断。

## 附录 B：NormalizedRunEvent metadata 封闭 allowlist

除下表外的 OTel attribute、Hook 字段或连接器 payload 字段一律丢弃。所有字段必须有明确类型、长度上限和枚举版本。

| 字段 | 类型/限制 | 说明 |
|---|---|---|
| toolCategory | enum：read/write/edit/search/shell/browser/network/data/document/media/other/unknown | 工具类别 |
| relativePath | UTF-8 string，最长 512 bytes | 规范化相对路径；不含盘符、绝对路径、用户名、`.`/`..` segment 或 NUL |
| fileExtension | lowercase ASCII string，最长 16 chars | 只保留不含点号的扩展名；其他记 unknown |
| artifactType | enum：document/spreadsheet/code/image/audio/video/archive/other/unknown | 产物类型 |
| tokenInput / tokenOutput | unsigned 64-bit integer | 来源提供的计数 |
| credits | decimal(18,6)，非负 | 来源提供 |
| costAmount / costCurrency | decimal(18,6)，非负 + ISO-4217 三字母 currency | 来源提供真实成本；缺失不留字段 |
| errorType | enum：auth/permission/not_found/timeout/rate_limit/validation/tool_failure/network/cancelled/unknown | 不含错误原文 |
| domain | ASCII/Punycode string，最长 253 chars | eTLD+1；PSL 版本随 metadataSchemaVersion 冻结 |
| executable | lowercase ASCII string，最长 64 chars，且命中版本化 allowlist | 只保留程序名 |
| commandCategory | enum：build/test/lint/format/package/git/file/network/process/other/unknown | 不含参数 |
| exitCodeClass | enum：success/nonzero/signal/unknown | 归一化退出状态 |
| artifactCount | unsigned 32-bit integer | 结构化数量 |
| droppedMetadataFieldCount | unsigned 32-bit integer | 被 allowlist 丢弃的字段数 |

以下字段可用于 Run 详情或执行后建议，但**不得直接用于比较类别或 preRunDifficulty**：toolCategory、relativePath/fileExtension、artifactType、domain、executable、commandCategory、errorType、Token、成本及任何执行后计数。

## 附录 C：spool 负载、持久性与安全验收

| 推算项 | 取值 |
|---|---|
| 设计上限 | 1000 万 Event / 10 万 Run |
| 日均事件 | 约 1.4 万 |
| 峰值 | 日均 5 倍，约 7 万 Event/日 |
| 72 小时 | 约 21 万结构化记录 |
| 单条均长 | 约 0.5KB（需以 fixture 实测校准） |
| 默认容量 | 建议 256MB，按加密 frame 开销复核 |

必须验证：

- 所有 frame 加密且认证；篡改可检测；
- 多 producer 并发不会交叉破坏 frame；
- 已确认记录在进程崩溃和模拟断电后可恢复；
- 不完整尾帧可安全截断；
- 补传 checkpoint 原子且幂等；
- 溢出以完整 frame FIFO 淘汰，丢失时间窗和数量准确；
- 72 小时峰值注入零淘汰；
- spool 中的 frame/envelope 字段符合附录 F，metadata 字段符合附录 B，EvidenceReference 符合附录 F；不存在未知字段或原始内容。

对外口径必须带适用范围：仅对“spool 覆盖 / 文件回填”连接器承诺 Recorder 停机 72 小时内不丢；直接 OTLP 推送不适用。

## 附录 D：连接器冻结能力矩阵模板

M1 的四个连接器必须在开工门禁前将所有 `TBD` 替换为已验证值，并附 fixture 路径和评审人。

| 字段 | Codex | Claude Code | Gemini CLI | OpenCode |
|---|---|---|---|---|
| 连接器版本 | TBD | TBD | TBD | TBD |
| 支持 Agent 版本范围 | TBD | TBD | TBD | TBD |
| 支持 OS/架构 | TBD | TBD | TBD | TBD |
| 采集机制 | TBD | TBD | TBD | TBD |
| 事件粒度 | TBD | TBD | TBD | TBD |
| 原生 Event ID | TBD | TBD | TBD | TBD |
| 原生 Session ID | TBD | TBD | TBD | TBD |
| 原生 Run ID | TBD | TBD | TBD | TBD |
| 稳定 locator/offset | TBD | TBD | TBD | TBD |
| 历史导入与游标 | TBD | TBD | TBD | TBD |
| 停机保障等级 | TBD | TBD | TBD | TBD |
| Run 边界规则 | TBD | TBD | TBD | TBD |
| 本地认证方式 | TBD | TBD | TBD | TBD |
| 字段覆盖 | TBD | TBD | TBD | TBD |
| 指标可比能力 | TBD | TBD | TBD | TBD |
| 配置修改路径/范围 | TBD | TBD | TBD | TBD |
| 卸载与恢复方式 | TBD | TBD | TBD | TBD |
| 已知缺失字段 | TBD | TBD | TBD | TBD |
| 降级行为 | TBD | TBD | TBD | TBD |
| 降级 UI/禁用条件 | TBD | TBD | TBD | TBD |
| fixture 路径 | TBD | TBD | TBD | TBD |
| 已验证版本/日期 | TBD | TBD | TBD | TBD |
| 评审人 | TBD | TBD | TBD | TBD |

## 附录 E：统计规范版本

初始统计规范版本：`stats-v1`。

| 参数 | 固定值 |
|---|---|
| 主方向指标 | 配置最终成功率 |
| 主估计量 | TaskAgentObservation 二元率差值 |
| 聚类单位 | Task |
| 分析快照 | 每周一本地时区 00:00；记录 analysisAsOf 与时区 |
| comparisonKey | `sorted(configId pair) + category + difficultyBucket + windowStart + windowEnd + statsVersion` |
| family | 快照内主方向指标全部达到高质量非统计资格的配置对 × 桶；不按效果、CI 或敏感性预筛 |
| Bootstrap | 10,000 次，percentile 95% interval |
| Bootstrap 样本 | finalOutcome 已知的 eligible settled observation；unknown 只进入极端敏感性 |
| 方向性最低数据质量 | 高 |
| 边界比例 | 任一方 0%/100% 时阻断方向性结论 |
| α | 0.05，双侧 |
| 多重比较 | 每周冻结 family；Benjamini–Hochberg FDR q=0.05 |
| Power | 0.80 |
| MDE baseline | p0 = 0.50 |
| Paired MDE discordance | q = 0.50 |
| Binary MID | 10 个百分点 |
| 反馈覆盖率差阻断阈值 | 20 个百分点 |

任何参数、样本选择、聚类规则、missingness 规则或 conclusion gate 的变化必须生成新的统计规范版本，并在历史对比中显示所用版本。

## 附录 F：持久化 envelope 与 EvidenceReference allowlist

### F.1 RecordEnvelope

RecordEnvelope 只允许以下结构字段；业务 payload 必须与 `recordType` 对应，并引用本 PRD 核心对象表或附录中同名的冻结强类型 schema，不允许附加开放 JSON：

| 字段 | 说明 |
|---|---|
| envelopeSchemaVersion | envelope schema 版本 |
| recordType | task / task-overall-result / session / run / boundary-revision / run-evaluation / event / evidence / evidence-reference / observation / import-ledger |
| recordId | 已按 §5.3 规范化的稳定 ID |
| connectorInstanceId | 来源实例命名空间 |
| connectorVersion | 连接器版本 |
| producedAt | 结构化记录生成时间 |
| metadataSchemaVersion | metadata 版本；无 metadata 时为空 |
| payloadCiphertext | AEAD 加密后的强类型 payload |

spool frame 可以额外包含：frameVersion、segmentId、producerId、monotonicOrdinal、frameLength、nonce、authenticationTag 和 checkpoint 信息。除此之外的 frame/envelope 字段默认拒绝。

### F.2 EvidenceReference

| referenceType | 允许内容 |
|---|---|
| artifact | `tokenizedRef` 为 HMAC-SHA-256 的 43 字符 base64url（无 padding）+ 附录 B `artifactType`；不得保存绝对路径 |
| domain-action | 附录 B `domain` + `actionType ∈ {open,create,update,delete,send,publish,download,upload,other}`；不得保存完整 URL |
| verification | `verificationType ∈ {test,lint,build,typecheck,security,manual,other}` + `status ∈ {passed,failed,unknown}`；不得保存命令或输出 |
| git | 本机 HMAC-SHA-256 repo token + `objectType ∈ {commit,pr,revert}` + 43 字符不可逆 object token；不得保存远端完整 URL、分支名或提交信息 |

`displayHint` 只能由 artifactType、fileExtension、domain、verificationType 或 objectType 组合生成，最长 64 UTF-8 bytes；不得接收来源自由文本。不支持的 referenceType、开放字符串 ref 或未知字段在持久化前丢弃。
