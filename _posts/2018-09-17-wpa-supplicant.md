---
title: wpa_supplicant 连接实验
tags:
  - wpa_supplicant
  - WLAN
  - Android
categories:
  - 技术
  - 杂记
toc: false
---

此次实验是在 Android 设备中进行的，这里做个记录。
{: .notice}

首先在 Android 设置中关闭 WLAN 以及 WLAN 扫描，然后用 ```lsmod``` 查看 WLAN 驱动状态，如果没有，就用 ```insmod``` 安装，驱动路径为 ```/vendor/lib/modules/qca_cld3_wlan.ko```。

{% include figure image_path="/contents/posts/lsmod_wlan.webp" alt="lsmod 结果图" caption="lsmod 查看 wlan 驱动" %}

启动并在后台运行 wpa_supplicant 服务端，命令如下：

```
/vendor/bin/hw/wpa_supplicant -i wlan0 -D nl80211 -c /vendor/etc/wifi/wpa_supplicant.conf -I /vendor/etc/wifi/wpa_supplicant_overlay.conf -O /data/vendor/wifi/wpa/sockets
```

{% include figure image_path="/contents/posts/start-wpa_supplicant.webp" alt="wpa_supplicant 运行图" caption="运行 wpa_supplicant 服务" %}

在新终端中打开 wpa_cli（wpa_supplicant 客户端）并连接 wpa_supplicant 服务，命令如下：

```
wpa_cli -i wlan0 -p /data/vendor/wifi/wpa/sockets/
```

{% include figure image_path="/contents/posts/start-wpa_cli.webp" alt="wpa_cli 运行图" caption="运行 wpa_cli 并连接 wpa_supplicant 服务" %}

使用 ```scan``` 命令发起 WLAN 扫描：

{% include figure image_path="/contents/posts/trigger-scan.webp" alt="wpa_cli 扫描图" caption="启动 WLAN 扫描" url="" title="" %}

使用 ```scan_result```命令查看扫描结果：

{% include figure image_path="/contents/posts/get-scan-results.webp" alt="wpa_cli 扫描结果图" caption="查看扫描结果"%}

这里要连接 WLAN 的 SSID 为 ```vivo NEX S```。先使用 ```add_network``` 添加一个网络：

{% include figure image_path="/contents/posts/add-network.webp" alt="wpa_cli 添加网络图" caption="添加一个网络" %}

配置网络 ```0```，设置 SSID、密码和安全策略，命令如下：

```
set_network 0 ssid "vivo NEX S"
set_network 0 psk "12345678"
set_network 0 key_mgmt WPA-PSK
```

{% include figure image_path="/contents/posts/set-network.webp" alt="wpa_cli 配置网络图" caption="设置网络参数" %}

启用网络 ```0```，wpa_cli 会自动连接可用网络，命令如下：

```
enable_network 0
```

{% include figure image_path="/contents/posts/connect-network.webp" alt="wpa_cli 连接网络" caption="启用和连接网络" %}

在新的终端中使用 dhcpcd 获取 IP 地址，直接运行 ```dhcpcd``` 命令：

{% include figure image_path="/contents/posts/dhcpcd-get-ip.webp" alt="dhcpcd 配置 IP 地址图" caption="通过 DHCP 配置 IP 地址" %}

用 ping 来测试网络，命令如下：

```
ping 192.168.43.1
```

{% include figure image_path="/contents/posts/ping-test-network.webp" alt="PING 测试网络图" caption="测试网络连通性" %}

至此，wpa_supplicant 连接过程结束，成功连接 WLAN 并可以正常通信。
