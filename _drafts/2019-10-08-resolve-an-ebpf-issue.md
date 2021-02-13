---
title: 记一个 Android eBPF 问题的调试过程
tags:
  - netd
  - eBPF
  - iptables
  - 网络
  - Android
categories:
  - 技术
  - 杂记
---

打开流量节省模式，发现王者荣耀无法联网，定位问题发现是一个典型的 eBPF 程序 bug，这里做个记录。
