---
title: {{title}}
type: module
created: {{created}}
updated: {{updated}}
repo: {{repo}}
sources:
  - <!-- 填:path:func() durable 证据,不带行号 -->
confidence: <!-- 填:high|medium|low -->
status: active
depends-on:
  - <!-- 填:{repo}/{被依赖模块};须与正文「依赖（出）」双链一致,无则删本字段 -->
---

# 模块：{{title}}
> <!-- 填:职责一句话 / public entry / 它依赖谁、谁依赖它 -->

## 职责
<!-- 填:这个模块负责什么,边界在哪 -->

## 公共接口
<!-- 填:对外暴露的函数/类/入口,签名 + 一句话 -->

## 依赖（出）
<!-- 填:[[repos/{repo}/modules/X]],每条与 frontmatter depends-on 一致 -->

## 被依赖（入·反向链接）
<!-- 填:[[repos/{repo}/modules/Y]],谁链向了本模块 -->

## 相关流程
<!-- 填:[[repos/{repo}/flows/{主题}]] -->
