---
title: Android WLAN 模块的状态机中枢
tags:
  - WLAN
  - Android
categories:
  - 技术
---

## 一、总体架构

目前 ```WifiStateMachine``` 正在被重构，Google 试图用 ```WifiStateMachinePrime``` 替代原来的 ```WifiStateMachine```，使它起到连接 WLAN 模块上下层的作用，```WifiStateMachine``` 则仅负责客户端模式的事务。新的架构将 WLAN 模块划分为多个子状态机，每个子状态机负责该管理所在模式下的状态，再由 ```WifiStateMachinePrime``` 管理不同模式的切换，进入某个模式时，启用所对应的子状态机，然后通过这个子状态机操作具体的事务。WLAN 模块中的状态机相当于上下层互动的桥梁，目前核心的几个状态机的结构如下：

{% include figure image_path="/contents//posts/android-wlan-state-machine-arch.webp" alt="Android WLAN 状态机架构图" caption="Android WLAN 模块中的状态机" %}

其中除了客户端模式，每个模式的自状态机分别集成于相应的 ```Manager``` 中，在未来的 Android 版本中，```WifiStateMachine``` 会被进一步简化，重构完成后可能会被集成到 ```ClientModeManager``` 当中，与其他模式的 ```Manager``` 结构一致。

```WifiStateMachinePrime``` 负责管理各模式子状态机的启用和关闭，它含有三种模式——客户端模式、扫描模式和热点模式，以及额外的停用模式，它们分别对应 ```ClientModeActiveState```、```ScanOnlyModeActiveState```、```WifiDisabledState``` 和 ```SoftApCallbackImpl```，其中热点模式对应的不是一个状态而是一个回调接口，这种方式是为了实现热点模式与其他模式的共存。

新的状态机架构将 WLAN 的业务分为三种模式，每种模式的事务由自状态机负责，这种分级的方式将庞大的业务逻辑进一步模块化，提供更佳的可维护性，在增减功能时也更加灵活。

## 二、WifiController

### 1. 架构

```WifiController``` 派生自 ```StateMachine```，是一种状态机，其中的状态层次结构如下：

```
DefaultState – 初始状态，所有状态的父状态；
├─ StaDisabledState – 停用 STA 状态，并关闭扫描；
│  └─ FtmModeState – 工厂测试模式状态；
├─ StaEnabledState – 启用 STA 状态；
│  └─ DeviceActiveState – 设备活跃状态，WLAN 处于客户端模式；
├─ StaDisabledWithScanState – 停用 STA 但启用扫描状态；
├─ EcmState – 启用紧急电话状态；
└─ QcStaDisablingState – 正在停用 STA 状态。
```

初始状态视硬件是否支持 ```ScanOnly``` 模式而定，支持的为 ```StaDisabledWithScanState```，不支持的为 ```StaDisabledState```。

### 2. 常见场景的状态切换

#### Ⅰ· 开启 WLAN

```WifiController``` 启动完成后将处于 ```StaDisabledState``` 或 ```StaDisabledWithScanState```。假设此时处于 ```StaDisabledState```，打开 WLAN 时，```WifiServiceImpl``` 发来一个 ```CMD_WIFI_TOGGLED``` 消息，```StaDisabledState``` 判断新的设置为打开 WLAN 后，切换至 ```DeviceActiveState```，退出 ```StaDisabledState```，然后先进入 ```StaEnabledState```，设置主机名，再进入 ```DeviceActiveState```，调用 ```WifiStateMachinePrime``` 的 ```enterClient``` 方法进入客户端模式，至此 WLAN 被开启。

#### Ⅱ· 关闭 WLAN 保留后台扫描

关闭 WLAN 保留后台扫描对应的是 ```StaDisabledWithScanState```。假设当前状态为 ```DeviceActiveState```，关闭 WLAN 时，```WifiServiceImpl```发送 ```CMD_WIFI_TOGGLED```，```DeviceActiveState``` 将消息交由父状态 ```StaEnabled``` 处理，判断设置中的 WLAN 开关处于关闭，再检查 WLAN 后台扫描开启，最后切换到 ```StaDisabledWithScanState```，最后调用 ```StaDisabledWithScanState.enter``` 方法，使 ```WifiStateMachinePrime``` 进入扫描模式，由其负责模式的切换。

#### Ⅲ· 完全关闭 WLAN

关闭 WLAN 且不具有后台扫描对应的状态视 ```StaDisabledState```。假设当前状态为 ```StaDisabledWithScanState```，当用户关闭后台扫描时，```WifiServiceImpl``` 发送 ```CMD_SCAN_ALWAYS_MODE_CHANGED``` 消息，当前状态判断后台扫描已关闭，切换至 ```StaDisabledState```，进入 ```StaDisabledState``` 时调用 ```WifiStateMachinePrime.disableWifi``` 方法关闭 WLAN 且关闭后台扫描模式，由其完成 WLAN 后台扫描的关闭。

#### Ⅳ· 打开热点

假设当前状态为 ```DeviceActiveState```，开启热点时 ```WifiServiceImpl``` 发送 ```CMD_SET_AP``` 消息，由当前状态的父状态 ```StaEnabledState``` 处理，保存当前设置的 WLAN 状态，并再次交由父状态 ```DefaultState``` 处理，其先判断设备是否处于飞行模式，若是则丢弃该消息，不进行处理，否则使用消息携带的AP配置信息，调用 ```WifiStateMachinePrime.enterSoftAPMode``` 方法进入 AP 模式，其内部调用 ```startSoftAp``` 方法完成模式的切换以及 AP 的启动。

## 三、WifiStateMachinePrime

### 1. 架构

```WifiStateMachinePrime``` 含有 ```ModeStateMachine``` 和 ```SoftApCallbackImpl``` 两个主要的成员类。```ModeStateMachine``` 内部定义了 ```ModeActiveState```，其派生了状态机的三种状态，包括 ```WifiDisabledState```、```ClientModeActiveState``` 和 ```ScanOnlyModeActiveState```，状态机的初始状态为 ```WifiDisabledState```。```SoftApCallbackImpl``` 继承自 ```ModeCallback```，实现了 ```WifiManager.SoftApCallback``` 接口。三种个态和一个回调对应了 WLAN 模块的四种模式，除了停用模式，其余每种模式对应一个 ```Manager```，每个 ```Manager``` 内部维护一个对应模式下的子状态机。

```WifiStateMachine``` 通过状态机内部管理的 ```AsyncChannel``` 和 ```Handler``` 的消息收发来与其他组件交互，而 ```WifiStateMachinePrime``` 则不同，主要是通过调用和回调的方式来与其他组件交互。上层只有 ```WifiController``` 会调用 ```WifiStateMachinePrime``` 的方法。```WifiStateMachinePrime``` 内部为每个模式构造一个 ```Callback```，分别传递给下层各模式对应的 ```Manager```，下层调用回调接口提供的方法即可实现与 ```WifiStateMachinePrime``` 的交互。

```WifiStateMachinePrime``` 的结构如下：

{% include figure image_path="/contents//posts/wifistatemachineprime.webp" alt="WifiStateMachinePrime 类图" caption="WifiStateMachinePrime 状态树及类结构示意" %}

```WifiStateMachinePrime``` 的控制是通过上层 ```WifiController``` 的调用实现的，而下层的反馈则通过各模式注册到下层模式 ```Manager``` 的回调接口实现。上层传来的消息由 ```WifiController``` 接收并处理，并逐级向下调用，最后由子状态机调用下层的组件；下层执行完成通过回调向子状态机报告，并逐级向上回调，最后由 ```WifiController``` 向上层发送消息。至此完成一次由上到下再由下到上的 WLAN 事务。```WifiStateMachinePrime``` 单独将热点模式的状态以回调的形式实现，使得热点模式可以与其他模式共存，也就意味着代码支持同时开启 WLAN 和热点；换句话说，对于互斥的两种模式，可以在状态机中以状态的形式实现，而对于不互斥的、独立于其他模式的，则需要在状态机外部单独实现该模式的切换。

### 2. 代码解读

#### Ⅰ· WifiDisabledState

```WifiDisabledState``` 对应 WLAN 停用模式。```WifiController``` 调用 ```disableWifi``` 方法进入该模式，内部会调用 ```changeMode``` 方法向状态机发送 ```CMD_DISABLE_WIFI``` 消息。进入时，通知相关组件停用 ```WLAN``` 扫描，并清空扫描结果。

```java
public void enter() {
    Log.d(TAG, "Entering WifiDisabledState");
    mDefaultModeManager.sendScanAvailableBroadcast(mContext, false);
    mScanRequestProxy.enableScanningForHiddenNetworks(false);
    mScanRequestProxy.clearScanResults();
    WifiGbk.clearBssCache(); // wifigbk++
}
```

退出时不做任何操作。该状态不处理任何消息，只在收到状态切换消息时进行切换。

#### Ⅱ· ClientModeActiveState

开启客户端模式时，会进入 ```ClientModeActiveState```。```WifiController``` 调用 ```enterClientMode``` 方法，内调用的 ```changeMode``` 方法向状态机发送 ```CMD_START_CLENT_MODE``` 消息。进入该状态时会启动 ```ClientModeManager```，向 ```ClientModeManager``` 提供实现的 ```Listener```，并将新启动的 ```Manager``` 加入到活跃 ```Manager``` 的集合中，```ClientModeManager.start``` 方法内部向子状态机发送 ```ClientModeStateMachine.CMD_START``` 消息，```ClientModeStateMachine``` 处于 ```IdleState``` 时，启动 WLAN 扫描过程，然后切换至 ```StartedMode```，在进入 ```StartedMode``` 的过程中调用 ```WifiStateMachine``` 提供的 ```setOperationalMode```，将 ```WifiStateMachine``` 的状态切换到 ```DisconnectedState```，准备进行 WLAN 连接，最后与电源管理组件同步 WLAN 状态。

```java
public void enter() {
    Log.d(TAG, "Entering ClientModeActiveState");

    mListener = new ClientListener();
    mManager = mWifiInjector.makeClientModeManager(mListener);
    mManager.start();
    mActiveModeManagers.add(mManager);

    updateBatteryStatsWifiState(true);
}
```

退出时，调用 ```ClientModeManager.stop``` 方法停止 ```ClientModeManager```，内部调用 ```updateWifiState``` 更新 WLAN 状态，并退出子状态机。

```java
public void exit() {
    super.exit();
    mListener = null;
}
```

#### Ⅲ· ScanOnlyModeActiveState

当停用 WLAN 但启用 WLAN 定位扫描时，会进入该模式。```WifiController``` 调用 ```enterScanOnlyMode``` 方法进入该状态，内部调用 ```changeMode``` 向状态机发送 ```CMD_START_SCAN_ONLY_MODE```，此时切换至 ```ScanOnlyModeActiveState```。进入时同样启动 ```ScanOnlyModeManager```，并提供 ```Listener```，在 ```ScanOnlyModeManager.start``` 方法内部启动子状态机，最后与电源管理组件同步 WLAN 状态。

```java
public void enter() {
    Log.d(TAG, "Entering ScanOnlyModeActiveState");

    mListener = new ScanOnlyListener();
    mManager = mWifiInjector.makeScanOnlyModeManager(mListener);
    mManager.start();
    mActiveModeManagers.add(mManager);

    updateBatteryStatsWifiState(true);
    updateBatteryStatsScanModeActive();
}
```

退出时，先停止 ```Manager```，其内部停止子状态机。

```java
public void exit() {
    super.exit();
    mListener = null;
}
```

#### Ⅳ· SoftApCallbackImpl

状态机中没有热点模式对应的状态，模式管理主要由 ```SoftApCallbackImpl``` 实现，启用该模式时，```WifiController``` 调用 ```enterSoftAPMode```，内部在与 ```WifiService``` 绑定的 ```HandlerThread``` 上调用 ```startSoftAp``` 以启动热点模式，内部启动 ```SoftApManager```，向其提供 ```SoftApCallbackImpl``` 的对象以及热点配置，并将该 ```Manager``` 加入活跃 ```Manager``` 集合中，最后与电源管理组件同步 WLAN 状态。

```java
public void enterSoftAPMode(@NonNull SoftApModeConfiguration wifiConfig) {
    mHandler.post(() -> {
        startSoftAp(wifiConfig);
    });
}

private void startSoftAp(SoftApModeConfiguration softapConfig) {
    Log.d(TAG, "Starting SoftApModeManager");

    for (ActiveModeManager manager : mActiveModeManagers) {
        if (manager instanceof SoftApManager) {
            Log.d(TAG, "SoftApModeManager already start");
            return;
        }
    }

    WifiConfiguration config = softapConfig.getWifiConfiguration();
    if (config != null && config.SSID != null) {
        Log.d(TAG, "Passing config to SoftApManager! " + config);
    } else {
        config = null;
    }

    SoftApCallbackImpl callback = new SoftApCallbackImpl();
    ActiveModeManager manager = mWifiInjector.makeSoftApManager(callback, softapConfig);
    callback.setActiveModeManager(manager);
    manager.start();
    mActiveModeManagers.add(manager);
    updateBatteryStatsWifiState(true);
}
```

退出热点模式时，```WifiController``` 调用 ```stopSoftAPMode``` 方法停止热点模式，同样是在与 ```WifiService``` 绑定的 ```HandlerThread``` 上调用 ```SoftApManager.stop``` 退出热点模式的 ```Manager```，并与电源管理组件同步 WLAN 状态。

```java
public void stopSoftAPMode() {
    mHandler.post(() -> {
        for (ActiveModeManager manager : mActiveModeManagers) {
            if (manager instanceof SoftApManager) {
                Log.d(TAG, "Stopping SoftApModeManager");
                manager.stop();
            }
        }
        updateBatteryStatsWifiState(false);
    });
}
```

热点状态发生改变时，会调用到 ```SoftApCallbackImpl.onStateChanged```，停用热点时，热点模式的 ```Manager``` 在这里从活跃 ```Manager``` 列表中移除。

```java
public void onStateChanged(int state, int reason) {
    if (state == WifiManager.WIFI_AP_STATE_DISABLED) {
        mActiveModeManagers.remove(getActiveModeManager());
        updateBatteryStatsWifiState(false);
    } else if (state == WifiManager.WIFI_AP_STATE_FAILED) {
        mActiveModeManagers.remove(getActiveModeManager());
        updateBatteryStatsWifiState(false);
    }
    if (mSoftApCallback != null) {
        mSoftApCallback.onStateChanged(state, reason);
    }
}
```

## 四、WifiStateMachine

### 1. 架构

```WifiStateMachine``` 状态树如下：

```
DefaultState - 状态机启动后的初始状态，是Wifi所有状态的父状态，处于该状态时，设备客户端模式关闭，可以开启热点；
└─ ConnectModeState - 此状态下，设备开启客户端模式，可以作为 STA 与 AP 连接；
   ├─ L2ConnectedState - 此状态下，设备与AP建立了二层连接；
   │  ├─ ObtainingIpState - 在该状态下，设备进行 IP 地址的配置；
   │  ├─ ConnectedState - 设备与 AP 连接完成后处于此状态；
   │  └─ RoamingState - 设备漫游时处于此状态。
   ├─ DisconnectingState - 设备在此状态下与 AP 断开连接；
   ├─ DisconnectedState - 设备没有连接任何 AP 时处于此状态；
   └─ FilsState - 在此状态下设备可以与支持 FILS（Fast Initial Link Setup，即快速初始链路设置，定义于 IEEE 802.11ai 标准）的网络进行连接。
```

```WifiStateMachine``` 将 WLAN 模块绝大部分业务抽象为各个状态，并定义每个状态下可以执行的操作，将复杂庞大的 WLAN 处理逻辑模块化，实现代码的可读性和可维护性；同时它有是一种分层状态机，状态机处于某种状态时只能处理某些操作，父状态负责子类的共有操作，因此也实现了代码复用。```WifiStateMachine``` 相当于连接 WLAN 模块上层与下层之间的枢纽，上层传来指令时，由当前状态进行处理，再向下层组件发出指令，下层完成这些事务后，向 ```WifiStateMachine``` 报告执行结果，同样由前状态处理，把结果返回给上层，至此结束一次 WLAN 模块的事务。当前状态可以处理的消息包括其本身以及所有父状态的可处理消息，即使当前状态将消息交由父状态处理，也视为是当前状态在处理消息。

### 2. 代码解读

#### Ⅰ· DefaultState

状态机构造时调用 ```setInitialState``` 将 ```DefaultState``` 设置为初始状态。状态机启动后，调用 ```start``` 方法，进入 ```DefaultState```。

```DefaultState``` 的 ```enter``` 与 ```exit``` 方法不执行任何操作，其本身不会主动进行状态切换，仅由 ```ClientModeManager``` 通过调用 ```setOperationalMode``` 来切换，且从 ```DefaultState``` 只能切换到 ```DisconnectedState```。切换 WLAN 模块的客户端与热点模式时，```ClientModeManager``` 调用此方法，传入要切换的模式和网络接口名称，其内部调用状态机的 ```transitionTo``` 方法切换到目标状态。初始化客户端模式时，进入 ```DisconnectedState```，退出时，进入 ```DefaultState```。

```java
public void setOperationalMode(int mode, String ifaceName) {
    if (mVerboseLoggingEnabled) {
        log("setting operational mode to " + String.valueOf(mode) + " for iface: " + ifaceName);
    }
    mModeChange = true;
    if (mode != CONNECT_MODE) {
        // we are disabling client mode...   need to exit connect mode now
        transitionTo(mDefaultState);
    } else {
        // do a quick sanity check on the iface name, make sure it isn't null
        if (ifaceName != null) {
            mInterfaceName = ifaceName;
            transitionTo(mDisconnectedState);
        } else {
            Log.e(TAG, "supposed to enter connect mode, but iface is null -> DefaultState");
            transitionTo(mDefaultState);
        }
    }
    // use the CMD_SET_OPERATIONAL_MODE to force the transitions before other messages are
    // handled.
    sendMessageAtFrontOfQueue(CMD_SET_OPERATIONAL_MODE);
}
```

#### Ⅱ· ConnectModeState

进入 ```ConnectModeState``` 时，先初始化客户端模式，并打开 WLAN，然后更新相关组件 WLAN 状态信息。

```java
public void enter() {
    Log.d(TAG, "entering ConnectModeState: ifaceName = " + mInterfaceName);
    mOperationalMode = CONNECT_MODE;
    setupClientMode();
    if (!mWifiNative.removeAllNetworks(mInterfaceName)) {
        loge("Failed to remove networks on entering connect mode");
    }
    mScanRequestProxy.enableScanningForHiddenNetworks(true);
    mWifiInfo.reset();
    mWifiInfo.setSupplicantState(SupplicantState.DISCONNECTED);

    mWifiInjector.getWakeupController().reset();

    mNetworkInfo.setIsAvailable(true);
    if (mNetworkAgent != null) mNetworkAgent.sendNetworkInfo(mNetworkInfo);

    // initialize network state
    setNetworkDetailedState(DetailedState.DISCONNECTED);

    mWifiConnectivityManager.setWifiEnabled(true);
    mWifiMetrics.setWifiState(WifiMetricsProto.WifiLog.WIFI_DISCONNECTED);
    p2pSendMessage(WifiStateMachine.CMD_ENABLE_P2P);
    mSarManager.setClientWifiState(WifiManager.WIFI_STATE_ENABLED);
    setWifiDefaultPower();
}
```

退出 ```ConnectState``` 时，与进入过程相反，先更新相关组件的 WLAN 状态信息，然后退出客户端模式。

```java
public void exit() {
    mOperationalMode = DISABLED_MODE;
    // Let the system know that wifi is not available since we are exiting client mode.
    mNetworkInfo.setIsAvailable(false);
    if (mNetworkAgent != null) mNetworkAgent.sendNetworkInfo(mNetworkInfo);

    mWifiConnectivityManager.setWifiEnabled(false);
    mWifiMetrics.setWifiState(WifiMetricsProto.WifiLog.WIFI_DISABLED);
    mSarManager.setClientWifiState(WifiManager.WIFI_STATE_DISABLED); 
    setWifiDefaultPower();

    if (!mWifiNative.removeAllNetworks(mInterfaceName)) {
        loge("Failed to remove networks on exiting connect mode");
    }
    mScanRequestProxy.enableScanningForHiddenNetworks(false);
    mScanRequestProxy.clearScanResults();
    mWifiInfo.reset();
    mWifiInfo.setSupplicantState(SupplicantState.DISCONNECTED);
    stopClientMode();
}
```

当 wpa_supplicant 报告 ```NETWORK_DISCONNECTION_EVENT``` 告知断开连接，而 ```mNetworkInfo``` 显示没有断开时，更新状态并调用 ```handleNetworkDisconnect``` 方法进行断开连接的操作，然后切换到 ```DisconnectedState```。

```java
case WifiMonitor.SUPPLICANT_STATE_CHANGE_EVENT:
    SupplicantState state = handleSupplicantStateChange(message);

    // Supplicant can fail to report a NETWORK_DISCONNECTION_EVENT
    // when authentication times out after a successful connection,
    // we can figure this from the supplicant state. If supplicant
    // state is DISCONNECTED, but the mNetworkInfo says we are not
    // disconnected, we need to handle a disconnection
    if (state == SupplicantState.DISCONNECTED
            && mNetworkInfo.getState() != NetworkInfo.State.DISCONNECTED) {
        if (mVerboseLoggingEnabled) {
            log("Missed CTRL-EVENT-DISCONNECTED, disconnect");
        }
        handleNetworkDisconnect();
        transitionTo(mDisconnectedState);
    }

    if (state == SupplicantState.COMPLETED) {
        mIpClient.confirmConfiguration();
        mWifiScoreReport.noteIpCheck();
    }
    break;
```

开始连接时，```ConnectNode``` 处理 ```CMD_START_CONNECT``` 消息。首先检查当前是否有连接请求和准备好的网络配置，并记录网络 ID 和 BSSID 等信息，若要连接的网络支持 FILS，则切换至 ```FilsState``` 进行 FILS 流程，若不支持 FILS，则告知 Android 其他组件当前要尝试与指定的连接，接着交由 wpa_supplicant 执行连接操作，若成功更新 wpa_supplicant 网络配置，则判断当前连接是否已断开，若是则切换至```DisconnectingState```，进行连接断开操作，为连接操作做准备。

```java
case CMD_START_CONNECT:
    mIsFilsConnection = false;
    /* connect command coming from auto-join */
    netId = message.arg1;
    int uid = message.arg2;
    bssid = (String) message.obj;

    synchronized (mWifiReqCountLock) {
        if (!hasConnectionRequests()) {
            if (mNetworkAgent == null) {
                loge("CMD_START_CONNECT but no requests and not connected,"
                        + " bailing");
                break;
            } else if (!mWifiPermissionsUtil.checkNetworkSettingsPermission(uid)) {
                loge("CMD_START_CONNECT but no requests and connected, but app "
                        + "does not have sufficient permissions, bailing");
                break;
            }
        }
    }

    config = mWifiConfigManager.getConfiguredNetworkWithoutMasking(netId);
    logd("CMD_START_CONNECT sup state "
            + mSupplicantStateTracker.getSupplicantStateName()
            + " my state " + getCurrentState().getName()
            + " nid=" + Integer.toString(netId)
            + " roam=" + Boolean.toString(mIsAutoRoaming));
    if (config == null) {
        loge("CMD_START_CONNECT and no config, bail out...");
        break;
    }
    mTargetNetworkId = netId;
    setTargetBssid(config, bssid);

    if (mEnableConnectedMacRandomization.get()) {
        configureRandomizedMacAddress(config);
    }

    String currentMacAddress = mWifiNative.getMacAddress(mInterfaceName);
    mWifiInfo.setMacAddress(currentMacAddress);
    Log.i(TAG, "Connecting with " + currentMacAddress + " as the mac address");

    if (config.allowedKeyManagement.get(WifiConfiguration.KeyMgmt.FILS_SHA256) ||
          config.allowedKeyManagement.get(WifiConfiguration.KeyMgmt.FILS_SHA384)) {
        mFilsConfig = config;
        transitionTo(mFilsState);
        break;
    }
    reportConnectionAttemptStart(config, mTargetRoamBSSID,
            WifiMetricsProto.ConnectionEvent.ROAM_UNRELATED);
    if (mWifiNative.connectToNetwork(mInterfaceName, config)) {
        mWifiMetrics.logStaEvent(StaEvent.TYPE_CMD_START_CONNECT, config);
        lastConnectAttemptTimestamp = mClock.getWallClockMillis();
        targetWificonfiguration = config;
        mIsAutoRoaming = false;
        if (getCurrentState() != mDisconnectedState) {
            transitionTo(mDisconnectingState);
        }
    } else {
        loge("CMD_START_CONNECT Failed to start connection to network " + config);
        reportConnectionAttemptEnd(
                WifiMetrics.ConnectionEvent.FAILURE_CONNECT_NETWORK_FAILED,
                WifiMetricsProto.ConnectionEvent.HLF_NONE);
        replyToMessage(message, WifiManager.CONNECT_NETWORK_FAILED,
                WifiManager.ERROR);
        break;
    }
    break;
```

```ConnectModeState``` 还负责处理 ```WifiMonitor.FILS_NETWORK_CONNECTION_EVENT``` 和 ```WifiMonitor.NETWORK_CONNECTION_EVENT``` 消息，使用当前的网络配置进行连接，视网络配置完成相应的 EAP 身份认证，然后通知其他 Android 组件状态改变，并切换到 ```ObtainingIpState```。若连接的网络 ID 未知，则发送 ```CMD_DISCONNECT``` 消息断开连接。

```java
case WifiMonitor.FILS_NETWORK_CONNECTION_EVENT:
case WifiMonitor.NETWORK_CONNECTION_EVENT:
    if (mVerboseLoggingEnabled) log("Network connection established");
    mLastNetworkId = message.arg1;
    mWifiConfigManager.clearRecentFailureReason(mLastNetworkId);
    mLastBssid = (String) message.obj;
    reasonCode = message.arg2;

    config = getCurrentWifiConfiguration();
    if (config != null) {
        mWifiInfo.setBSSID(mLastBssid);
        mWifiInfo.setNetworkId(mLastNetworkId);
        mWifiInfo.setMacAddress(mWifiNative.getMacAddress(mInterfaceName));

        ScanDetailCache scanDetailCache =
                mWifiConfigManager.getScanDetailCacheForNetwork(config.networkId);
        if (scanDetailCache != null && mLastBssid != null) {
            ScanResult scanResult = scanDetailCache.getScanResult(mLastBssid);
            if (scanResult != null) {
                mWifiInfo.setFrequency(scanResult.frequency);
            }
        }
        mWifiConnectivityManager.trackBssid(mLastBssid, true, reasonCode);
        // We need to get the updated pseudonym from supplicant for EAP-SIM/AKA/AKA'
        if (config.enterpriseConfig != null
                && TelephonyUtil.isSimEapMethod(
                        config.enterpriseConfig.getEapMethod())) {
            String anonymousIdentity =
                    mWifiNative.getEapAnonymousIdentity(mInterfaceName);
            if (anonymousIdentity != null) {
                config.enterpriseConfig.setAnonymousIdentity(anonymousIdentity);
            } else {
                Log.d(TAG, "Failed to get updated anonymous identity"
                        + " from supplicant, reset it in WifiConfiguration.");
                config.enterpriseConfig.setAnonymousIdentity(null);
            }
            mWifiConfigManager.addOrUpdateNetwork(config, Process.WIFI_UID);
        }
        sendNetworkStateChangeBroadcast(mLastBssid);
        mIpReachabilityMonitorActive = true;
        transitionTo(mObtainingIpState);
    } else {
        logw("Connected to unknown networkId " + mLastNetworkId
                + ", disconnecting...");
        sendMessage(CMD_DISCONNECT);
    }
    break;
```

处理 ```WifiMonitor.NETWORK_DISCONNECTION_EVENT``` 消息时进行断开连接操作。首先获取当前 BSSID 对应的扫描结果，并依据扫描结果、当前目标网络的配置以及 SSID 是否一致来判断是否已经建立了连接，若当前状态不是 ```FilsState``` 或没有建立连接，则切换到 ```DisconnectedState```。

```java
case WifiMonitor.NETWORK_DISCONNECTION_EVENT:
    if (mVerboseLoggingEnabled) log("ConnectModeState: Network connection lost ");
    mLastNetworkId = message.arg1;
    mWifiConfigManager.clearRecentFailureReason(mLastNetworkId);
    mLastBssid = (String) message.obj;

    ScanResult scanResult = getScanResultForBssid(mLastBssid);
    boolean mConnectionInProgress =
        (targetWificonfiguration != null) && (scanResult != null) &&
        !targetWificonfiguration.SSID.equals("\""+scanResult.SSID+"\"");
    handleNetworkDisconnect(mConnectionInProgress);
    if (getCurrentState() != mFilsState || !mConnectionInProgress)
        transitionTo(mDisconnectedState);
    break;
```

#### Ⅲ· L2ConnectedState

进入 ```L2ConnectedState``` 时，设备与 AP 完成关联，状态机更新 AP 相关信息，并构造 ```WifiNetworkAgent``` 对象，开始进行数据收发，最后将连接状态设置为已关联，禁止切换国家码。

```java
public void enter() {
    mRssiPollToken++;
    if (mEnableRssiPolling) {
        sendMessage(CMD_RSSI_POLL, mRssiPollToken, 0);
    }
    if (mNetworkAgent != null) {
        loge("Have NetworkAgent when entering L2Connected");
        setNetworkDetailedState(DetailedState.DISCONNECTED);
    }
    setNetworkDetailedState(DetailedState.CONNECTING);

    final NetworkCapabilities nc;
    if (mWifiInfo != null && !mWifiInfo.getSSID().equals(WifiSsid.NONE)) {
        nc = new NetworkCapabilities(mNetworkCapabilitiesFilter);
        nc.setSSID(mWifiInfo.getSSID());
    } else {
        nc = mNetworkCapabilitiesFilter;
    }
    mNetworkAgent = new WifiNetworkAgent(getHandler().getLooper(), mContext,
            "WifiNetworkAgent", mNetworkInfo, nc, mLinkProperties, 60, mNetworkMisc);

    clearTargetBssid("L2ConnectedState");
    mCountryCode.setReadyForChange(false);
    mWifiMetrics.setWifiState(WifiMetricsProto.WifiLog.WIFI_ASSOCIATED);
}
```

退出时，断开网络连接，允许切换国家码，并更新连接的状态为已断开。

```java
public void exit() {
    mIpClient.stop();
    mIsIpClientStarted = false;

    if (mVerboseLoggingEnabled) {
        StringBuilder sb = new StringBuilder();
        sb.append("leaving L2ConnectedState state nid=" + Integer.toString(mLastNetworkId));
        if (mLastBssid !=null) {
            sb.append(" ").append(mLastBssid);
        }
    }
    if (mLastBssid != null || mLastNetworkId != WifiConfiguration.INVALID_NETWORK_ID) {
        handleNetworkDisconnect();
    }
    mCountryCode.setReadyForChange(true);
    mWifiMetrics.setWifiState(WifiMetricsProto.WifiLog.WIFI_DISCONNECTED);
    mWifiStateTracker.updateState(WifiStateTracker.DISCONNECTED);
}
```

DHCP 成功配置 IP 地址后，```DhcpClient``` 发送 ```DhcpClinet.CMD_POST_DHCP_ACTION``` 消息，同时 ```IpClient``` 会发送 ```CMD_IPV4_PROVISIONING_SUCCESS``` 消息，进而调用 ```handleIPV4Success``` 方法，其内部调用的 ```updateLinkProperties``` 将发送 ```CMD_IP_CONFIGURATION_SUCCESSFUL``` 消息，最后告知其他 Android 组件连接结果，若连接成功，切换至 ```ConnectedState```，否则切换至 ```DisconnectingState```。

```java
case DhcpClient.CMD_POST_DHCP_ACTION:
    handlePostDhcpSetup();
    // We advance to mConnectedState because IpClient will also send a
    // CMD_IPV4_PROVISIONING_SUCCESS message, which calls handleIPv4Success(),
    // which calls updateLinkProperties, which then sends
    // CMD_IP_CONFIGURATION_SUCCESSFUL.
    //
    // In the event of failure, we transition to mDisconnectingState
    // similarly--via messages sent back from IpClient.
    break;
case CMD_IPV4_PROVISIONING_SUCCESS: {
    handleIPv4Success((DhcpResults) message.obj);
    sendNetworkStateChangeBroadcast(mLastBssid);
    break;
}
case CMD_IPV4_PROVISIONING_FAILURE: {
    handleIPv4Failure();
    break;
}
case CMD_IP_CONFIGURATION_SUCCESSFUL:
    handleSuccessfulIpConfiguration();
    reportConnectionAttemptEnd(
            WifiMetrics.ConnectionEvent.FAILURE_NONE,
            WifiMetricsProto.ConnectionEvent.HLF_NONE);
    if (getCurrentWifiConfiguration() == null) {
        // The current config may have been removed while we were connecting,
        // trigger a disconnect to clear up state.
        mWifiNative.disconnect(mInterfaceName);
        transitionTo(mDisconnectingState);
    } else {
        sendConnectedState();
        transitionTo(mConnectedState);
    }
    break;
```

如果 IP 地址配置丢失，则会收到 ```CMD_IP_CONFIGURATION_LOST``` 消息，此时清空数据包发送计数器，并更新网络配置，然后等待 30 秒，若超时后 DHCP 仍未正确配置 IP 地址，则断开当前连接，切换至 ```DisconnectingState```。

```java
case CMD_IP_CONFIGURATION_LOST:
    // Get Link layer stats so that we get fresh tx packet counters.
    getWifiLinkLayerStats();
    handleIpConfigurationLost();
    reportConnectionAttemptEnd(
            WifiMetrics.ConnectionEvent.FAILURE_DHCP,
            WifiMetricsProto.ConnectionEvent.HLF_NONE);
    transitionTo(mDisconnectingState);
    break;
```

同样地，若 Internet 连接丢失，则收到 ```CMD_IP_REACHABILITY_LOST``` 消息，若关闭了连接监视器或使用静态配置的 IP 地址，则跳过处理，否则断开连接并尝试重新连接，最后切换至 ```DisconnectingState```。

```java
case CMD_IP_REACHABILITY_LOST:
    if (mVerboseLoggingEnabled && message.obj != null) log((String) message.obj);
    if (mIpReachabilityDisconnectEnabled) {
        if (mDisconnectOnlyOnInitialIpReachability && !mIpReachabilityMonitorActive) {
            logd("CMD_IP_REACHABILITY_LOST Connect session is over, skip ip reachability lost indication.");
            break;
        }
        //#ifdef VENDOR_EDIT
        WifiConfiguration currentConfig = getCurrentWifiConfiguration();
        boolean isUsingStaticIp =
            (currentConfig.getIpAssignment() == IpConfiguration.IpAssignment.STATIC);
        if (isUsingStaticIp) {
            logd("User use static ip to connnect, skip ip reachability lost");
            break;
        }
        //#endif VENDOR_EDIT
        handleIpReachabilityLost();
        mWifiDiagnostics.captureBugReportData(WifiDiagnostics.REPORT_REASON_NUD_FAILURE);
        transitionTo(mDisconnectingState);
    } else {
        logd("CMD_IP_REACHABILITY_LOST but disconnect disabled -- ignore");
    }
    break;
```

收到 ```CMD_DISCONNECT```，正常断开连接，并切换至 ```DisconnectingState```。

```java
case CMD_DISCONNECT:
    mWifiMetrics.logStaEvent(StaEvent.TYPE_FRAMEWORK_DISCONNECT,
            StaEvent.DISCONNECT_GENERIC);
    mWifiNative.disconnect(mInterfaceName);
    transitionTo(mDisconnectingState);
    break;
```

请求断开 P2P 连接，将处理 ```WifiP2pServiceImpl.DISCONNECT_WIFI_REQUEST``` 消息，正常断开连接，并置临时断开标志，切换至 ```DisconnectingState```。

```java
case WifiP2pServiceImpl.DISCONNECT_WIFI_REQUEST:
    if (message.arg1 == 1) {
        mWifiMetrics.logStaEvent(StaEvent.TYPE_FRAMEWORK_DISCONNECT,
                StaEvent.DISCONNECT_P2P_DISCONNECT_WIFI_REQUEST);
        mWifiNative.disconnect(mInterfaceName);
        mTemporarilyDisconnectWifi = true;
        transitionTo(mDisconnectingState);
    }
    break;
```

```CMD_RESET_SIM_NETWORKS``` 消息用于重置 EAP-SIM 网络，若 SIM 卡被移除或 SIM 卡配置无效，且当前网络配置使用的是 EAP-SIM 的认证方式，则正常断开连接，并切换至 ```DisconnectingState```。此消息处理完成后，交由父状态继续处理。

```java
case CMD_RESET_SIM_NETWORKS:
    if (message.arg1 == 0 // sim was removed
            && mLastNetworkId != WifiConfiguration.INVALID_NETWORK_ID) {
        WifiConfiguration config =
                mWifiConfigManager.getConfiguredNetwork(mLastNetworkId);
        if (TelephonyUtil.isSimConfig(config)) {
            mWifiMetrics.logStaEvent(StaEvent.TYPE_FRAMEWORK_DISCONNECT,
                    StaEvent.DISCONNECT_RESET_SIM_NETWORKS);
            mWifiNative.disconnect(mInterfaceName);
            transitionTo(mDisconnectingState);
        }
    }
    /* allow parent state to reset data for other networks */
    return NOT_HANDLED;
```

#### Ⅳ· ObtainingIpState

进入 ```ObtainingIpState``` 时，首先重置省电程序以与新关联的 AP 同步，IP 地址的配置方式可能在 DHCP 和静态配置之间切换，此时需要重置 ```IpClient```，最后构建 ```IpClient``` 所需要的配置，并启动配置过程。

```java
public void enter() {
    final WifiConfiguration currentConfig = getCurrentWifiConfiguration();
    final boolean isUsingStaticIp =
            (currentConfig.getIpAssignment() == IpConfiguration.IpAssignment.STATIC);
    if (mVerboseLoggingEnabled) {
        final String key = currentConfig.configKey();
        log("enter ObtainingIpState netId=" + Integer.toString(mLastNetworkId)
                + " " + key + " "
                + " roam=" + mIsAutoRoaming
                + " static=" + isUsingStaticIp);
    }

    setNetworkDetailedState(DetailedState.OBTAINING_IPADDR);

    clearTargetBssid("ObtainingIpAddress");

    mWifiNative.setPowerSave(mInterfaceName, false);

    if (!mIsFilsConnection) {
        stopIpClient();
    }

    mIpClient.setHttpProxy(currentConfig.getHttpProxy());
    if (!TextUtils.isEmpty(mTcpBufferSizes)) {
        mIpClient.setTcpBufferSizes(mTcpBufferSizes);
    }
    final IpClient.ProvisioningConfiguration prov;

    if (mIsFilsConnection && mIsIpClientStarted) {
        setPowerSaveForFilsDhcp();
    } else if (!isUsingStaticIp) {
        prov = IpClient.buildProvisioningConfiguration()
                    .withPreDhcpAction()
                    .withApfCapabilities(mWifiNative.getApfCapabilities(mInterfaceName))
                    .withNetwork(getCurrentNetwork())
                    .withDisplayName(currentConfig.SSID)
                    .withRandomMacAddress()
                    .build();
        mIpClient.startProvisioning(prov);
        mIsIpClientStarted = true;
    } else {
        StaticIpConfiguration staticIpConfig = currentConfig.getStaticIpConfiguration();
        prov = IpClient.buildProvisioningConfiguration()
                    .withStaticConfiguration(staticIpConfig)
                    .withApfCapabilities(mWifiNative.getApfCapabilities(mInterfaceName))
                    .withNetwork(getCurrentNetwork())
                    .withDisplayName(currentConfig.SSID)
                    .build();
        mIpClient.startProvisioning(prov);
        mIsIpClientStarted = true;
    }
    // Get Link layer stats so as we get fresh tx packet counters
    getWifiLinkLayerStats();
    mIsFilsConnection = false;
}
```

```ObtainingIpState``` 退出时不进行任何操作。

#### Ⅴ· RoamingState

进入 ```RoamingState``` 时，启动看门狗计时器，并发送一条开始计时延时消息，标记连接的状态为未关联。

```java
public void enter() {
    if (mVerboseLoggingEnabled) {
        log("RoamingState Enter"
                + " mScreenOn=" + mScreenOn );
    }

    // Make sure we disconnect if roaming fails
    roamWatchdogCount++;
    logd("Start Roam Watchdog " + roamWatchdogCount);
    sendMessageDelayed(obtainMessage(CMD_ROAM_WATCHDOG_TIMER,
            roamWatchdogCount, 0), ROAM_GUARD_TIMER_MSEC);
    mAssociated = false;
}
```

```RoamingState``` 退出时不进行任何操作。

```WifiMonitor.SUPPLICANT_STATE_CHANGE_EVENT``` 消息用于处理漫游中的连接和断开操作，若消息包含在 ```WifiMonitor.NETWORK_DISCONNECTION_EVENT``` 消息之前的断开连接事件，其 BSSID 和状态机中维护的 BSSID 一致，则代表之前错过了一次连接断开事件的处理，这里进行断开连接的剩余工作，并切换至 ```DisconnectedState```；若消息包含的是关联信息，则进行更新状态机所维护的信息。

```java
case WifiMonitor.SUPPLICANT_STATE_CHANGE_EVENT:
    /**
      * If we get a SUPPLICANT_STATE_CHANGE_EVENT indicating a DISCONNECT
      * before NETWORK_DISCONNECTION_EVENT
      * And there is an associated BSSID corresponding to our target BSSID, then
      * we have missed the network disconnection, transition to mDisconnectedState
      * and handle the rest of the events there.
      */
    StateChangeResult stateChangeResult = (StateChangeResult) message.obj;
    if (stateChangeResult.state == SupplicantState.DISCONNECTED
            || stateChangeResult.state == SupplicantState.INACTIVE
            || stateChangeResult.state == SupplicantState.INTERFACE_DISABLED) {
        if (mVerboseLoggingEnabled) {
            log("STATE_CHANGE_EVENT in roaming state "
                    + stateChangeResult.toString() );
        }
        if (stateChangeResult.BSSID != null
                && stateChangeResult.BSSID.equals(mTargetRoamBSSID)) {
            handleNetworkDisconnect();
            transitionTo(mDisconnectedState);
        }
    }
    if (stateChangeResult.state == SupplicantState.ASSOCIATED) {
        // We completed the layer2 roaming part
        mAssociated = true;
        if (stateChangeResult.BSSID != null) {
            mTargetRoamBSSID = stateChangeResult.BSSID;
        }
    }
    break;
```

```CMD_ROAM_WATCHDOG_TIMER``` 消息表示看门狗计时器超时，网络失去响应，断开连接，并切换到 ```DisconnectedState```。

```java
case CMD_ROAM_WATCHDOG_TIMER:
    if (roamWatchdogCount == message.arg1) {
        if (mVerboseLoggingEnabled) log("roaming watchdog! -> disconnect");
        mWifiMetrics.endConnectionEvent(
                WifiMetrics.ConnectionEvent.FAILURE_ROAM_TIMEOUT,
                WifiMetricsProto.ConnectionEvent.HLF_NONE);
        mRoamFailCount++;
        handleNetworkDisconnect();
        mWifiMetrics.logStaEvent(StaEvent.TYPE_FRAMEWORK_DISCONNECT,
                StaEvent.DISCONNECT_ROAM_WATCHDOG_TIMER);
        mWifiNative.disconnect(mInterfaceName);
        transitionTo(mDisconnectedState);
    }
    break;
```

漫游时连接网络，将对 ```WifiMonitor.NETWORK_CONNECTION_EVENT``` 消息进行处理。关联完成后，更新状态机信息，并告知其他 Android 组件连接结果，漫游结束，切换至 ```ConnectedState```。连接过程中的 IP 地址更新由 ```IpClient``` 的 ```IPReachabilityMonitor``` 负责。

```java
case WifiMonitor.NETWORK_CONNECTION_EVENT:
    if (mAssociated) {
        if (mVerboseLoggingEnabled) {
            log("roaming and Network connection established");
        }
        mLastNetworkId = message.arg1;
        mLastBssid = (String) message.obj;
        mWifiInfo.setBSSID(mLastBssid);
        mWifiInfo.setNetworkId(mLastNetworkId);
        int reasonCode = message.arg2;
        mWifiConnectivityManager.trackBssid(mLastBssid, true, reasonCode);
        sendNetworkStateChangeBroadcast(mLastBssid);

        // Successful framework roam! (probably)
        reportConnectionAttemptEnd(
                WifiMetrics.ConnectionEvent.FAILURE_NONE, WifiMetricsProto.ConnectionEvent.HLF_NONE);

        clearTargetBssid("RoamingCompleted");

        mIpReachabilityMonitorActive = true;
        transitionTo(mConnectedState);
    } else {
        messageHandlingStatus = MESSAGE_HANDLING_STATUS_DISCARD;
    }
    break;
```

断开连接时处理 ```WifiMonitor.NETWORK_DISCONNECTION_EVENT``` 消息，若要断开的 BSSID 与当前的 BSSID 一致，则断开连接，并切换至 ```DisconnectedState```。

```java
case WifiMonitor.NETWORK_DISCONNECTION_EVENT:
    // Throw away but only if it corresponds to the network we're roaming to
    String bssid = (String) message.obj;
    if (true) {
        String target = "";
        if (mTargetRoamBSSID != null) target = mTargetRoamBSSID;
        log("NETWORK_DISCONNECTION_EVENT in roaming state"
                + " BSSID=" + bssid
                + " target=" + target);
    }
    if (bssid != null && bssid.equals(mTargetRoamBSSID)) {
        handleNetworkDisconnect();
        transitionTo(mDisconnectedState);
    }
    break;
```

#### Ⅵ· ConnectedState

进入 ```ConnectedState``` 时，发送一个延时 10 秒的消息，告知 IP 可达性检测结束，在这段时间内，进行 IP 可达性检测，发送消息后注册连接状态，并关闭漫游，开始追踪网络状态追踪。

```java
public void enter() {
    if (mVerboseLoggingEnabled) {
        log("Enter ConnectedState "
                + " mScreenOn=" + mScreenOn);
    }

    mWifiConnectivityManager.handleConnectionStateChanged(
            WifiConnectivityManager.WIFI_STATE_CONNECTED);

    if (mIpReachabilityMonitorActive)
        sendMessageDelayed(obtainMessage(CMD_IP_REACHABILITY_SESSION_END, 0, 0), 10000);

    registerConnected();
    lastConnectAttemptTimestamp = 0;
    targetWificonfiguration = null;

    // Not roaming anymore
    mIsAutoRoaming = false;

    if (testNetworkDisconnect) {
        testNetworkDisconnectCounter++;
        logd("ConnectedState Enter start disconnect test " +
                testNetworkDisconnectCounter);
        sendMessageDelayed(obtainMessage(CMD_TEST_NETWORK_DISCONNECT,
                testNetworkDisconnectCounter, 0), 15000);
    }

    mLastDriverRoamAttempt = 0;
    mTargetNetworkId = WifiConfiguration.INVALID_NETWORK_ID;
    mWifiInjector.getWifiLastResortWatchdog().connectedStateTransition(true);
    mWifiStateTracker.updateState(WifiStateTracker.CONNECTED);
}
```

退出时，结束网络状态追踪。

```java
@Override
public void exit() {
    logd("WifiStateMachine: Leaving Connected state");
    mWifiConnectivityManager.handleConnectionStateChanged(
              WifiConnectivityManager.WIFI_STATE_TRANSITIONING);

    mLastDriverRoamAttempt = 0;
    mWifiInjector.getWifiLastResortWatchdog().connectedStateTransition(false);
}
```

```CMD_UNWANTED_NETWORK``` 消息表示网络状况不理想，若选择断开连接，则断开连接并切换至 ```DisconnectingState```，否则，若是验证失败，则连接之前配置的网络，否则使用当前配置尝试重新连接。

```java
case CMD_UNWANTED_NETWORK:
    if (message.arg1 == NETWORK_STATUS_UNWANTED_DISCONNECT) {
        mWifiMetrics.logStaEvent(StaEvent.TYPE_FRAMEWORK_DISCONNECT,
                StaEvent.DISCONNECT_UNWANTED);
        mWifiNative.disconnect(mInterfaceName);
        transitionTo(mDisconnectingState);
    } else if (message.arg1 == NETWORK_STATUS_UNWANTED_DISABLE_AUTOJOIN ||
            message.arg1 == NETWORK_STATUS_UNWANTED_VALIDATION_FAILED) {
        Log.d(TAG, (message.arg1 == NETWORK_STATUS_UNWANTED_DISABLE_AUTOJOIN
                ? "NETWORK_STATUS_UNWANTED_DISABLE_AUTOJOIN"
                : "NETWORK_STATUS_UNWANTED_VALIDATION_FAILED"));
        config = getCurrentWifiConfiguration();
        if (config != null) {
            // Disable autojoin
            if (message.arg1 == NETWORK_STATUS_UNWANTED_DISABLE_AUTOJOIN) {
                mWifiConfigManager.setNetworkValidatedInternetAccess(
                        config.networkId, false);
                mWifiConfigManager.updateNetworkSelectionStatus(config.networkId,
                        WifiConfiguration.NetworkSelectionStatus
                        .DISABLED_NO_INTERNET_PERMANENT);
            } else {
                mWifiConfigManager.incrementNetworkNoInternetAccessReports(
                        config.networkId);
                // If this was not the last selected network, update network
                // selection status to temporarily disable the network.
                if (mWifiConfigManager.getLastSelectedNetwork() != config.networkId
                        && !config.noInternetAccessExpected) {
                    Log.i(TAG, "Temporarily disabling network because of"
                            + "no-internet access");
                    mWifiConfigManager.updateNetworkSelectionStatus(
                            config.networkId,
                            WifiConfiguration.NetworkSelectionStatus
                                    .DISABLED_NO_INTERNET_TEMPORARY);
                }
            }
        }
    }
    return HANDLED;
```

```CMD_START_ROAM``` 表示开始漫游，调用 ```WifiConfigManager``` 的 ```getConfiguredNetworkWithoutMasking``` 方法获得当前网络的全部配置，告知其他 Android 组件即将漫游，漫游成功后切换至 ```RoamingState```，若失败则告知其他 ```Android``` 组件漫游结束，保持当前状态。

```java
case CMD_START_ROAM:
    // Clear the driver roam indication since we are attempting a framework roam
    mLastDriverRoamAttempt = 0;

    /* Connect command coming from auto-join */
    int netId = message.arg1;
    ScanResult candidate = (ScanResult)message.obj;
    String bssid = SUPPLICANT_BSSID_ANY;
    if (candidate != null) {
        bssid = candidate.BSSID;
    }
    config = mWifiConfigManager.getConfiguredNetworkWithoutMasking(netId);
    if (config == null) {
        loge("CMD_START_ROAM and no config, bail out...");
        break;
    }

    setTargetBssid(config, bssid);
    mTargetNetworkId = netId;

    logd("CMD_START_ROAM sup state "
            + mSupplicantStateTracker.getSupplicantStateName()
            + " my state " + getCurrentState().getName()
            + " nid=" + Integer.toString(netId)
            + " config " + config.configKey()
            + " targetRoamBSSID " + mTargetRoamBSSID);

    reportConnectionAttemptStart(config, mTargetRoamBSSID,
            WifiMetricsProto.ConnectionEvent.ROAM_ENTERPRISE);
    if (mWifiNative.roamToNetwork(mInterfaceName, config)) {
        lastConnectAttemptTimestamp = mClock.getWallClockMillis();
        targetWificonfiguration = config;
        mIsAutoRoaming = true;
        mWifiMetrics.logStaEvent(StaEvent.TYPE_CMD_START_ROAM, config);
        transitionTo(mRoamingState);
    } else {
        loge("CMD_START_ROAM Failed to start roaming to network " + config);
        reportConnectionAttemptEnd(
                WifiMetrics.ConnectionEvent.FAILURE_CONNECT_NETWORK_FAILED,
                WifiMetricsProto.ConnectionEvent.HLF_NONE);
        replyToMessage(message, WifiManager.CONNECT_NETWORK_FAILED,
                WifiManager.ERROR);
        messageHandlingStatus = MESSAGE_HANDLING_STATUS_FAIL;
        break;
    }
    break;
```

#### Ⅶ· DisconnectingState

进入 ```DisconnectingState``` 时，对断开连接过程计时，并发送看门狗计时器的延时消息。

```java
public void enter() {

    if (mVerboseLoggingEnabled) {
        logd(" Enter DisconnectingState State screenOn=" + mScreenOn);
    }

    disconnectingWatchdogCount++;
    logd("Start Disconnecting Watchdog " + disconnectingWatchdogCount);
    sendMessageDelayed(obtainMessage(CMD_DISCONNECTING_WATCHDOG_TIMER,
            disconnectingWatchdogCount, 0), DISCONNECTING_GUARD_TIMER_MSEC);
}
```

退出时不进行任何操作。

```CMD_DISCONNECTING_WATCHDOG_TIMER``` 表示断开连接看门狗计时器消息，在有效段时间内等待 wpa_supplicant 连接网络，若直到超时都没有进行连接，则正常进行断开连接，并切换到 ```DisconnectedState```。这里的等待是为了完成 WLAN 重新连接的过程。

```java
case CMD_DISCONNECTING_WATCHDOG_TIMER:
    if (disconnectingWatchdogCount == message.arg1) {
        if (mVerboseLoggingEnabled) log("disconnecting watchdog! -> disconnect");
        handleNetworkDisconnect();
        transitionTo(mDisconnectedState);
    }
    break;
```

改状态如果在收到 ```WifiMonitor.NETWORK_DISCONNECTION_EVENT``` 消息之前收到了 ```WifiMonitor.SUPPLICANT_STATE_CHANGE_EVENT``` 消息，则表示错过了当前断开连接的处理，直接将消息放入延迟列表，并在切换到 ```DisconnectedState``` 后处理。

```java
case WifiMonitor.SUPPLICANT_STATE_CHANGE_EVENT:
    deferMessage(message);
    handleNetworkDisconnect();
    transitionTo(mDisconnectedState);
    break;
```

#### Ⅷ· FilsState

```FilsState``` 在进入时配置 FILS 参数，然后启动 ```IpClient``` 的配置过程。

```java
public void enter() {
    if (mVerboseLoggingEnabled) {
        Log.d(TAG, "Filsstate enter");
    }
    final IpClient.ProvisioningConfiguration prov =
        mIpClient.buildProvisioningConfiguration()
                  .withPreDhcpAction()
                  .withApfCapabilities(mWifiNative.getApfCapabilities(mInterfaceName))
                  .build();
          prov.mRapidCommit = true;
          prov.mDiscoverSent = true;
          mIpClient.startProvisioning(prov);
        mIsIpClientStarted = true;
}
```

```FilsState``` 退出时不进行任何操作。

使用 FILS 与 AP 建立链路后，状态机将处理 ```WifiMonitor.NETWORK_CONNECTION_EVENT``` 消息，更新状态机所维护的网络配置信息，然后视网络配置进行 EAP 身份验证，告知其他 Android 组件所连接的 BSSID，并切换到 ```ObtainingIpState``` 来配置IP地址。

```java
case WifiMonitor.NETWORK_CONNECTION_EVENT:
    if (mVerboseLoggingEnabled)
        log("Network connection established with FILS " + mIsFilsConnection);
    mLastNetworkId = message.arg1;
    mLastBssid = (String) message.obj;
    int reasonCode = message.arg2;
    config = getCurrentWifiConfiguration();
    if (config != null) {
        mWifiInfo.setBSSID(mLastBssid);
        mWifiInfo.setNetworkId(mLastNetworkId);
        mWifiConnectivityManager.trackBssid(mLastBssid, true, reasonCode);
        // We need to get the updated pseudonym from supplicant for EAP-SIM/AKA/AKA'
        if (config.enterpriseConfig != null
                && TelephonyUtil.isSimEapMethod(
                        config.enterpriseConfig.getEapMethod())) {
            String anonymousIdentity =
                    mWifiNative.getEapAnonymousIdentity(mInterfaceName);
            if (anonymousIdentity != null) {
                config.enterpriseConfig.setAnonymousIdentity(anonymousIdentity);
            } else {
                Log.d(TAG, "Failed to get updated anonymous identity"
                        + " from supplicant, reset it in WifiConfiguration.");
                config.enterpriseConfig.setAnonymousIdentity(null);
            }
            mWifiConfigManager.addOrUpdateNetwork(config, Process.WIFI_UID);
        }
        sendNetworkStateChangeBroadcast(mLastBssid);
        transitionTo(mObtainingIpState);
    }
    break;
```

### 3. 常见场景下的状态切换

#### Ⅰ· 开机完成打开 WLAN

开机完成后，```WifiStateMachine``` 已完成初始化和启动过程，处于 ```DefaultState```，注册的 ```BroadcastReciever``` 会收到 ```ACTION_LOCKED_BOOT_COMPLETED``` 的 ```Intent```，然后发送 ```CMD_BOOT_COMPLETED``` 消息，```DefaultState``` 处理该消息并调用 ```getAdditionalWifiServiceInterfaces``` 方法与其他 WLAN 相关组件建立连接；打开 WLAN 时，```ClientModeManager``` 调用 ```seOperationalMode``` 方法，状态机从 ```DefaultState``` 切换到 ```DisconnectedState```，并完成 WLAN 客户端模式的初始化。

#### Ⅱ· WLAN 连接完成

开始连接时，状态机处于 ```ConnectModeState``` 的某个子状态，```WiFiConnectivityManager``` 调用 ```startConnectToNetwork``` 方法，该方法发送 ```CMD_START_COMMAND``` 消息，```ConnectModeState``` 处理该消息，完成与 AP 的身份验证与关联过程，若一切顺利则会切换到 ```ObtainingIpState``` 进行 IP 地址的配置，获取到新 DHCP 结果时，```IpClient``` 发送 ```CMD_IPV4_PROVISIONING_SUCCESS``` 消息，```ObtainingIpState``` 将该消息转交父状态 ```L2ConnectedState``` 处理，调用 ```handleIPv4Success``` 完成 IP 地址配置，配置成功后 ```IpClient``` 发送 ```CMD_IP_CONFIGURATION_SUCCESSFUL``` 消息，同样由父状态 ```L2ConnectedState``` 负责处理，并切换至 ```ConnectedState```。

#### Ⅲ· 开启热点

开启热点时，```ClientModeManager``` 调用 ```setOperationMode``` 方法，使状态机的当前状态切换到 ```DefaultState```，这个过程包含会经过 ```ConnectModeState``` 的退出流程，关闭 WLAN 的客户端模式，为开启热点模式做准备。热点的状态管理由 ```WifiStateMachinePrime``` 负责。

#### Ⅳ· 关闭 WLAN

关闭 WLAN 时，```WifiStateMachie``` 的调用过程与开启热点时一致，同样是由 ```ClientModeManager``` 调用 ```setOperationalMode``` 方法来直接触发状态的切换，最终切换至 ```DefaultState```。
