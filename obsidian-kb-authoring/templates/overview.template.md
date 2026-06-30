---
title: {{title}}
type: overview
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:path:func() 或仓库结构证据 -->
confidence: <!-- 填:high|medium|low -->
status: active
depends-on:
  - <!-- 填:{repo}/{外部仓或子模块};须与正文「依赖边界」双链一致,无则删本字段 -->
---

# {{repo}} 概览
> <!-- 填:本仓定位、核心职责、上下文边界,前三行让 agent 抓住全貌 -->

## 仓库定位
<!-- 填:本仓服务的业务/技术目标,与工作区其它仓的关系 -->

## 模块定义
<!-- 填:仓内主要模块或目录职责;细化设计放 [[repos/{repo}/submodules/{topic}/子模块设计]] -->

## 职责边界
<!-- 填:本仓负责什么、不负责什么、外部依赖交给谁 -->

## 依赖边界
<!-- 填:依赖的外部仓/接口/契约;跨边界接口链 [[repos/{repo}/api-depend]] 或 [[global/contracts/X]] -->

## 相关流程
<!-- 填:[[repos/{repo}/flows/{主题}/主干流程]] 或 [[repos/{repo}/usecases/{场景}]] -->
