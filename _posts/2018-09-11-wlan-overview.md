---
title: IEEE 802.11 概览
tags:
  - 网络
  - WLAN
categories:
  - 技术
---

关于无线网络，我们常提到 WLAN、Wi-Fi、IEEE 802.11 a/b/g/n/ac 等名词，它们似乎都可以指无线网络，这里先了解它们的概念和区别：

WLAN
: Wireless LAN，即无线局域网，一种局域网形式，物理介质为无线电波

IEEE 802.11
: 由 IEEE 制定的无线网络标准，a/b/g/n/ac 是该标准的几个迭代版本，IEEE 802.11 是现今 WLAN 的通用标准

Wi-Fi
: 一种基于 IEEE 802.11 标准的技术实现，是现今 WLAN 最常采用的技术，它也是 Wi-Fi 联盟的商用标志，用于产品的 WLAN 技术认证。

## 一、背景

### 1. 技术族谱[^1]

IEEE 802 家族由一系列局域网标准组成，主要对 OSI 参考模型的最下面两层作出规范，涵盖了物理层和数据链路层组件。IEEE 802.11 是无线局域网标准，提供了物理层和 MAC 的规范。IEEE 802.11 与以太网有较深的渊源，被称为“无线以太网”，在配置 IEEE 802.11 网络时，不需要对传统的以太网做很多调整便可以将服务扩展至无线网络中，为网络设备带来了可移动性。

下图是部分 IEEE 802 家族的成员，可以看到家族成员之间的关系及其在 OSI 模型中的角色定位：

{% include figure image_path="/contents/posts/ieee802-family.webp" alt="IEEE 802 家族图" caption="IEEE 802 家族" %}

IEEE 802.11 涵盖了 OSI 模型的物理层和数据链路层，将物理层进一步细分为 PLCP 和 PMD 两个子层，PLCP（Physical Layer Convergence Procedure）负责将 MAC 映射到传输媒介，PMD（Physical Medium Dependent）负责帧的传送。分层结构如下图：

{% include figure image_path="/contents/posts/ieee80211-phy-mac.webp" alt="IEEE 802.11 PHY 组件图" caption="IEEE 802.11 物理层结构" %}

目前 IEEE 802.11 已被淘汰，由 IEEE 802.11a/b/g/n/ac 等修订标准替代，各修订版本主要是针对物理层做优化。下表是各版本的特性及差异：

{% include table-wrapper caption="[IEEE 802.11 版本比较](https://zh.wikipedia.org/wiki/IEEE_802.11ac)" table="
| 标准 | 频段 | 最大带宽 | 调制方式 | 最大传输速率 |
| - | - | - | - | - |
| 802.11 | 2.4 GHz | 20 MHz | FHSS<br>DSSS | 2 Mbps |
| 802.11a | 5 GHz | 20 MHz | OFDM | 54 Mbps |
| 802.11b | 2.4 GHz | 20 MHz | HR-DSSS | 11 Mbps |
| 802.11g | 2.4 GHz | 20 MHz | OFDM | 54 Mbps |
| 802.11n | 2.4 GHz<br>5 GHz | 40 MHz | MIMO-OFDM | 150 Mbps (40 MHz 1x1)<br>600 Mbps (40MHz 4x4) |
| 802.11ac Wave 1 | 5 GHz | 80 MHz | MIMO-OFDM | 433.3 Mbps (80 MHz 1x1)<br>1.3 Gbps (80 MHz 3x3) |
| 802.11ac Wave 2 | 5 GHz | 160 MHz | MIMO-OFDM | 866.7 Mbps (160 MHz 1x1)<br>6.9 Gbps (160 MHz 8x8) |
" %}

IEEE 802.11ac 有两个细分版本，Wave 1 于 2014 年发布，支持 80 MHz 带宽和 3x3 SU-MIMO，Wave 2 于2016 年发布，增加了对 160 MHz 带宽和 8x8 MU-MIMO 的支持，提供更高吞吐量。

### 2. 有关组织

#### IEEE (Institute of Electrical and Electronics Engineers)

电气电子工程师协会，是一个非营利性的电子技术和信息工程师的协会，被国际标准化组织授权为可以指定标准的组织，设有众多标准委员会，其中最为著名的是IEEE 802委员会，致力于局域网标准的制定。

#### Wi-Fi Alliance

Wi-Fi 联盟，是由行业众多公司组建的商业联盟，拥有 Wi-Fi 商标，主要负责建立和执行无线网络标准、优化互操作性与兼容性，并推动无线网络技术，主要业务是无限相容性认证，通过认证的需要符合 IEEE 802.11 无线标准、WPA/WPA2 安全标准、EAP 认证标准。

## 二、一些物理层的概念

### 1. 频段和信道

802.11 工作组为 WLAN 划分了 4 个独立的频段：2.4 GHz、3.6 GHz、4.9 GHz 和 5.8 GHz，每个频段又划分为若干信道。对于这些频段和信道的使用，各个国家制定的政策有所不同，内容包括最大发射功率、调制方式等。

{% include figure image_path="/contents/posts/1920px-2.4_GHz_Wi-Fi_channels_(802.11b,g_WLAN).svg.webp" alt="WLAN 2.4 GHz 信道图" caption="[WLAN 2.4 GHz 信道](https://zh.wikipedia.org/wiki/WLAN%E4%BF%A1%E9%81%93%E5%88%97%E8%A1%A8)" %}

WLAN 在 2.4 GHz 频段可以使用的具体频率是 2.412 GHz ~ 2.472 GHz（信道中心频率），总共是 80 MHz 的带宽，这个频段划分出 13 个相互重叠的信道，在 OFDM 调制中，每个信道的带宽是 20 MHz（DSSS调制是 22 MHz），换言之，2.4 GHz频段工作时只有三个互不干扰的信道，分别为 1、6、11。

5 GHz 频段的频率是 4.915GHz ~ 5.825GHz，一共划分了 32 个信道，每个信道带宽有 10 MHz、20 MHz、40 MHz、80 MHz 和 160 MHz 不等，有 22 个互不干扰的信道。

### 2. 调制方式

802.11 常用调制方式有 DSSS 和 OFDM。

DSSS（直接序列展频）是利用 10 个以上的 chip 来表示原来的 0 和 1，使原本高频率、窄频的信号转换为低功率的宽频信号，完成扩频，接收方再以同样的规则解扩，从各 chip 中恢复原信号。

OFDM（正交频分复用）将一整段频段分割成数个子载波，而且让每个子载波相互正交，使得他们在频谱上并不互相重叠，可以降低干扰，传输端将信号摆置在频域上，透过反傅里叶转换转换至时域，增加循环前缀后传送出去，接收端去除信号循环前缀，再将时域信号转换回频域，解出原信号。

### 3. MIMO

SISO 和 MIMO 是 WLAN 天线发送和接收信号的两种方式。SISO (Single Input Single Output) 即单输入单输出，顾名思义是通信时一根发射天线对应一根接收天线；MIMO (Multiple Input Multiple Output) 即多输入多输出，表示多根发射天线和多跟接收天线的通信；除此之外还有 SIMO 和 MISO 等。早期的 802.11 采用 SISO，传输速率较慢，MIMO 通过增加天线数量大幅提高传输速率。

MIMO 传输如下图，假设有 ```m``` 根发射天线，```n``` 根接收天线，那么可以得到 ```m × n``` 的传输矩阵，即可以产生 ```m × n``` 个信道。理论上信道容量和天线数量成正比。

{% include figure image_path="/contents/posts/Structure-of-multiple-input-multiple-output-MIMO-systems-with-N-transmit-TX-and-L.webp" alt="MIMO 示意图" caption="MIMO 传输示意" %}

MIMO 工作时，发射端将高速率的数据流拆分为几个低速率的子数据流，这些子数据流在不同天线上以相同频段发射，接收端将同时来自多根天线的信号以一定方式复原为原数据流。发射端使用多根天线平行发射子数据流，这种方式被称为空分复用，可以成倍提高信道容量；同时接收端多根天线接收到相同的信号，这被称为空间分集，提升信道的可靠性。此外MIMO还有波束成形、预编码等技术，它们并不互斥，可以互相配合应用。

802.11ac Wave 2 引入了 MU-MIMO，即多用户多输出多输入，与单用户不同的是，发射端可以同时与多个接收端通信，各接收端互不干扰。

## 三、WLAN 网络的组织方式[^1]

### 1. WLAN 网络组成

一个 WLAN 网络中，有工作站（STA）、接入点（AP）、基本服务集（BSS）、扩展服务集（ESS）、骨干网络等成员。如下图：

{% include figure image_path="/contents/posts/80211-ess.webp" alt="ESS 示意图" caption="WLAN 组网示意" %}

AP 是 WLAN 存在的基础，STA 通过与 AP 关联加入 WLAN。BSS 是 802.11 网络组网的基本单元，一个 BSS 对应于一个 AP，它的服务范围也就是 AP 的信号覆盖范围。一个 AP 的信号覆盖范围有限，802.11 允许将多个 BSS 串联为一个 ESS，隶属于同一个 ESS 的 STA 可以相互通信。ESS 中各 BSS 连接至同一个骨干网络，为了在 ESS 中实现跨 BSS 通信，相应的 AP 之间要能够在骨干网络中建立 OSI 第二层的连接，骨干网络通常是以太网。

在安全方面，802.11i 提供了 WLAN 安全机制，使用 802.11i 所定义和改良的身份验证协议和机密性协议的网络，被称为 RSN（Robust Security Network），其中的连接则为RSNA（RSN Associations）。

### 2. WLAN 网络类型

BSS 根据组网结构不同分为两类，一类是集中于 AP 的基础结构型网络（BSS），一种是无 AP 的独立型网络（IBSS）。

{% include figure image_path="/contents/posts/80211-bss-type.webp" alt="BSS 类型图" caption="独立型与基础结构型网络的基本服务集" %}

基础结构性网络（Infrastructure BSS）是有 AP 参与的无线网络。AP 是基础结构型网络的关键，它向外界周期性地广播 Beacon 帧，宣告网络的存在，STA 在连入基础结构型网络时，必须先与 AP 建立关联。AP 负责处理网络中所有通信，STA1 与 STA2 通信时，发往 STA2 的数据必须从 STA1 发至 AP，然后由 AP 转发至 STA2。基础结构型网络服务集被界定在 AP 的传输范围之内。

独立型网络（Independent BSS，简称 IBSS）是没有 AP 参与的无线网络。在 IBSS 中，STA 之间可以直接通信。IBSS 由两个或更多的 STA 组成，服务集覆盖范围不固定，由各 STA 轮流广播 Beacon 帧来宣告网络的存在。

### 3. WLAN 网络的运作方式

与以太网相比，WLAN 为设备提供了可移动性，为了让网络能够正确追踪移动节点及帧传递，802.11 定义了 9 种服务，见下表，其中前 3 种用来传送数据，其余 6 种均属管理操作。

{% include table-wrapper caption="WLAN 服务" table="
| 服务 | 用途 |
| - | - |
| 分布式 | 传递帧时，可使用此服务来决定目的地在网络上的地址 |
| 整合 | 用来将帧传递至无线网络以外的 IEEE 802 LAN |
| MSDU 传送 | 用来传递数据至接收端 |
| 关联 | 用来建立 AP（作为网关使用）于特定移动式工作站间的关联 |
| 重新关联 | 用来变更 AP（作为网关使用）于特定移动式工作站间的关联 |
| 取消关联 | 用来从网络移除无线工作站 |
| 身份验证 | 建立关联之前用来进行身份验证（利用 MAC 地址） |
| 解除身份验证 | 用来终结一段身份验证关系，其副作用是终止当前关联 |
| 机密性 | 用来防止窃听 |
| 传输功率控制（TPC） | 频谱管理，降低工作站传输功率以减少干扰 |
| 动态频率选择（DFS） | 频谱管理，避免在 5 GHz 频段干扰雷达操作 |
" %}

[^1]: Gast, M. S. 802.11® 无线网络权威指南[M]. 第 2 版. O'Reilly Taiwan 公司. 南京 - 东南大学出版社, 2007.12: 24-37
