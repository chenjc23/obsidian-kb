# call-tree — 调用树摸底

产出:`repos/{repo}/flows/{topic}/调用树.md`(先 `scaffold flow --repo {repo} --topic {主题} --member 调用树` 拿本件骨架文本,填好后 Write 到打印路径)。`{主题}` 文件夹名默认中文。

从指定入口函数开始递归追踪被调函数。每个函数记录:函数名/签名、仓库根起的文件路径、一句话职责、是否含条件分支及数量、是否外部调用(RPC/DB/MQ/文件系统/网络/子进程)、是否跨协议/消息/事件/topic/socket/TLV 边界、展开后链到对应分支页 `[[分支主题]]`。

树格式示例:

```text
├── computeRoute() [src/route/compute.go] — 算路总入口,3 条分支
│   ├── loadTopology() [src/topo/loader.go] — 加载拓扑,外部调用:DB
│   └── preprocessResource() [src/resource/prep.go] — 资源预处理
```

不用 `...`/「等」/任何占位符跳过节点。超过 200 节点则拆分并在 `自查报告.md` 记录。
