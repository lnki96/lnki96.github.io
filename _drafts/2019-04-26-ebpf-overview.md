---
title: eBPF 概述
tags:
  - eBPF
  - Linux
  - 网络
categories:
  - 技术
---

## 一、什么是 eBPF

eBPF 即 extended BPF，顾名思义，有全面扩充既有 BPF 功能之意；而相对应的，为了后向兼容，传统的 BPF（Berkerley Packet Filter）仍被保留了下来，并被重命名为 cBPF（classical BPF）。

相对于 cBPF，eBPF 带来的改变可谓是革命性的：

- 它已经为内核追踪（Kernel Tracing）、应用性能调优/监控、流量控制（Traffic Control）等领域带来了激动人心的变革，使用 map 数据结构实现用户空间和内核的沟通，和 cBPF 动不动把整个数据包丢出来相比，安全和性能都提高不少；
- 在接口的设计以及易用性上，eBPF 也有较大的改进，摆脱了 cBPF 类似汇编的编写方式，使用封装好的高级语言接口编写，大大提高了可读性和可维护性。

{% include figure image_path="/contents/posts/ebpf_arch.webp" alt="eBPF 架构图" caption="eBPF 程序架构" %}

eBPF 在内核空间提供了一个虚拟机，它将 eBPF 程序以虚拟机指令的形式注册到内核空间，由内核程序调用这些指令来过滤封包。eBPF 程序生成的数据以 map 的形式存储于内存中，用户空间的应用程序通过这些 map 的句柄访问和读写其中的数据。下表是 eBPF map 的类型：

{% include table-wrapper caption="eBPF map 类型" table='
<table>
  <thead>
    <tr>
      <th>类型</th>
      <th><code class="language-plaintext highlighter-rouge">bpf_map_type</code></th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="6">Array</td>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_ARRAY</code></td>
      <td rowspan="5">数组结构，所有的 key 必须是整数</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_CGROUP_ARRAY</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_PERF_EVENT_ARRAY</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_PERCPU_ARRAY</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_ARRAY_OF_MAPS</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_PERF_EVENT_ARRAY</code></td>
      <td>一种特殊的数组结构，主要用于自定义函数，利用 <code class="language-plaintext highlighter-rouge">JUMP_TAIL_CALL</code> 跳转</td>
    </tr>
    <tr>
      <td rowspan="5">Hash</td>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_HASH</code></td>
      <td rowspan="5">哈希映射结构，key 为非整数类型</td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_PERCPU_HASH</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_LRU_HASH</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_LRU_PERCPU_HASH</code></td>
    </tr>
    <tr>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_HASH_OF_MAPS</code></td>
    </tr>
    <tr>
      <td>Stack Trace</td>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_STACK_TRACE</code></td>
      <td>一种映射结构，key 为非整数类型，存储特定应用在某一特定时间点的栈状态（包括内核态和用户态），key 只有两个：内核栈 ID 和用户栈 ID，利用 <code class="language-plaintext highlighter-rouge">bpf_get_stackid</code> 函数获取</td>
    </tr>
    <tr>
      <td>Longest Prefix Match Trie</td>
      <td><code class="language-plaintext highlighter-rouge">BPF_MAP_TYPE_LPM_TRIE</code></td>
      <td>最长前缀匹配字典树结构，适宜处理 key 为 CIBR 的情况</td>
    </tr>
  </tbody>
</table>
' %}

eBPF 的功能不止网络封包过滤，还可以处理 XDP、进行内核调试等等，可以注册为多种事件的回调，包括 socket、cgroup、xdp、kprobe、traceroute 等等，据此 eBPF 程序分为多种类型，用于处理不同任务，如下表：

{% include table-wrapper caption="eBPF 程序类型" table="
| ```bpf_prog_type``` | BPF prog 入口参数 | 说明 |
| - | - | - |
| ```BPF_PROG_TYPE_SOCKET_FILTER``` | ```struct __sk_buff``` | 用于过滤进出口网络报文，功能上和 cBPF 类似 |
| ```BPF_PROG_TYPE_CGROUP_SKB``` | ^^ | 用于在 network cgroup 中运行的 BPF 代码，功能上和 ```SOCKET_FILTER``` 近似 |
| ```BPF_PROG_TYPE_CGROUP_SOCK``` | ```struct bpf_sock``` | 另一个用于在 network cgroup 中运行的 BPF 代码 |
| ```BPF_PROG_TYPE_XDP``` | ```struct xdp_md``` | 用于控制 XDP（eXtreme Data Path）的 BPF 代码 |
| ```BPF_PROG_TYPE_KPROBE``` | ```struct pt_regs``` | 用于 kprobe 功能的 BPF 代码 |
| ```BPF_PROG_TYPE_TRACEPOINT``` | 不同 tracepoint 位置参数可能不同 | 用于在各个 tracepoint 节点运行 |
| ```BPF_PROG_TYPE_PERF_EVENT``` | ```struct bpf_perf_event_data``` | 用于在 perf_event 发生时回调 |
" %}

## 二、eBPF 程序实例[^1]

一个典型的 eBPF 程序，分为内核空间和用户空间两部分，总体分为

过滤网络封包时，eBPF 提供两种 socket 选项：```SO_ATTACH_FILTER``` 和 ```SO_ATTACH_BPF```，允许用户程序将自定义的 eBPF 程序绑定到 socket。

[^1]: Linux Community. BPF Samples[EB/OL]. [URL](https://elixir.bootlin.com/linux/v4.19.28/source/samples/bpf), 2019-03-10.
