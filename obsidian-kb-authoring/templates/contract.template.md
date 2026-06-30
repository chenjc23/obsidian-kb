---
title: {{title}}
type: contract
created: {{created}}
updated: {{updated}}
repo: global
sources:
  - <!-- 填:path:func() durable 证据,不带行号 -->
confidence: <!-- 填:high|medium|low -->
status: active
contract-kind: <!-- 填:http|rpc|mq|event|tlv|socket|frame -->
producer:
  - <!-- 填:仓名;status:partial 时未知一端留空并在 coverage 记录 -->
consumer:
  - <!-- 填:仓名;status:partial 时未知一端留空并在 coverage 记录 -->
version: <!-- 填:v1 -->
---

# 契约：{{title}}
> <!-- 填:边界种类 / 消息标识 / producer → consumer 一句话 -->

## 消息/接口标识
<!-- 填:协议名、message ID、TLV type、command ID、operation code、topic、route、method、event name -->

## Payload Schema
| 字段 | 类型 | 必填 | 取值范围 | 含义 |
|---|---|---|---|---|
<!-- 填:逐字段一行 -->

## Producer
<!-- 填:[[repos/{repo}/submodules/{topic}/子模块设计]] 或 [[repos/{repo}/flows/{主题}/跨边界数据流]] — 发送场景;partial 时未知留「对端待 ingest」 -->

## Consumer
<!-- 填:[[repos/{repo}/submodules/{topic}/子模块设计]] 或 [[repos/{repo}/flows/{主题}/跨边界数据流]] — 消费场景;partial 时未知留「对端待 ingest」 -->

## 接收方发现证据
<!-- 填:注册表 / 路由表 / topic 订阅 / message-code switch / decoder / handler 绑定 / 命名约定 -->

## 使用该契约的流程
<!-- 填:[[repos/{repo}/flows/{主题}#跨边界]] -->
