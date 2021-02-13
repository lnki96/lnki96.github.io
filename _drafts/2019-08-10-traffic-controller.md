---
title: Android 流量监控
tags:
  - netd
  - eBPF
  - iptables
  - 网络
  - Android
categories:
  - 技术
---

Android 流量监控涵盖流量统计和流量控制两个方面，由 netd 流量控制组件管理，依赖 iptables、eBPF 等内核程序进行底层操作。目前 Android 流量监控机制在底层默认启用 eBPF，从 Android P 开始，Android 引入了这套 eBPF 程序来实现流量监控，同时将在后续版本中逐步弃用旧版内核模块 xt_qtaguid。新的基础架构更灵活且更易于维护，并且不需要任何外部内核代码。

## 一、流量统计

### 1. 架构

{% include figure image_path="/contents/posts/android_traffic_stats.webp" alt="流量统计架构图" caption="流量统计相关组件架构" %}

## 二、流量控制

### 1. 架构

{% include figure image_path="/contents/posts/android_traffic_control.webp" alt="流量控制架构图" caption="流量控制相关组件架构" %}

流量控制又分为两部分：带宽控制和防火墙，前者关注按流量计费网络下应用的流量分配，后者关注用户设置的网络安全策略。
