---
title: Android 中的状态机实现
tags:
  - Android
categories:
  - 技术
---

状态机是一种面向对象的设计模式，用来描述对象在生命周期中的各种状态，以及它们之间的关系。状态机中每种状态只能进行某些特定的操作，且只能切换到某些状态。它的好处是使逻辑与状态机代码分离，提升代码可读性和可维护性。

## 一、架构

```StateMachine``` 实现了 Android 状态机的基本逻辑，只允许 Android 系统内部调用，它的内部结构如图：

{% include figure image_path="/contents/posts/android-statemachine.webp" alt="Android StateMachine 类图" caption="StateMachine 架构示意" %}

```StateMachine``` 所实现的状态机是一种分层状态机（Hierarchical State Machine，HSM），分层管理状态和处理消息。HSM 维护一个层次结构，也就是状态树，每一层都有一个或多个状态，这些状态派生自 ```State```，```StateMachine``` 收到的消息会被传递至这些状态，派生一种状态需要实现其 ```processMessage``` 方法来完成该状态的消息处理逻辑。

```StateMachine``` 所实现的状态机启动时，会构造一个状态树，固定每种状态及其父状态、子状态的关系，然后将当前状态设置为指定的初始状态，当前状态相当于一个指针，它在这棵状态树上游走。以下面的状态机层次结构为例，设 ```mS5``` 为初始状态，构造完成时，当前状态的转移路径为从 ```mS5``` 的最远父状态也就是 ```mP0``` 开始，依次经过 ```mP1```、```mS1```，直到 ```mS5```。

```
      mP0
     /   \
    mP1   mS0
   /   \
  mS2   mS1
 /   \     \
mS3   mS4   mS5
```

完成启动后，状态机开始处理消息。当状态机收到一个消息时，首先转给当前状态 ```mS5```，由其 ```processMessage``` 方法处理。若子状态不能处理，消息将被转给其父状态，以此类推，状态机沿着状态树逐级上溯，直到找到一个可以处理该消息的状态，比如一条只有 ```mP1``` 才能处理的消息，会经过 ```mS5```、```mS1``` 再转进 ```mP1```。如果追溯到最远父状态 ```mP0``` 依然不能处理，该消息就会被最后集中处理。

状态机内部有一个 ```Handler```，它负责维护消息队列，并完成消息管理和分发，进入状态机的消息可以选择加入这个消息队列的头部或是尾部，每次处理消息 ```Handler``` 就从消息队列头部取出一条消息，分发给相应的状态处理。处理消息时，负责处理消息的状态可以标记要切换到的新状态，待消息处理完后，状态机会自动切换过去。

```StateMachine``` 有两个特殊的 ```State```：```HaltingState``` 与 ```QuittingState```，它们出现在状态机退出的过程中，```haltingState``` 是停止、即将退出的状态，进入这个状态后，将不能再回到普通状态，此时 ```Handler``` 依然在运行，所有的消息由 ```haltedProcessMessage``` 方法处理；```QuitingState``` 是退出状态，这个状态结束后，状态机线程结束，完全退出。假设当前状态依然是 ```mS5```，停止或退出状态机时，沿着状态树先后退出 ```mS5```、```mS1```、```mP1```、```mP0```，最后如果停止则进入 ```mHaltingState```，如果退出则进入 ```mQuittingState```。

## 二、代码解读

### 1. 状态机初始化

```StateMachine``` 提供了三个构造方法，三个方法大同小异，构造时如果没有提供 ```Looper```，就使用内部线程的 ```Looper```。

```java
protected StateMachine(String name) {
    mSmThread = new HandlerThread(name);
    mSmThread.start();
    Looper looper = mSmThread.getLooper();

    initStateMachine(name, looper);
}
```

```StateMachine``` 在 ```Looper``` 所在的线程运行，状态机初始化时使用 ```Looper``` 构造一个 ```SmHandler```，用于处理状态机的通讯。

```java
private void initStateMachine(String name, Looper looper) {
    mName = name;
    mSmHandler = new SmHandler(looper, this);
}
```

```StateMachine``` 是一种 HSM，需要调用 ```addState``` 方法指定它的层级关系，为指定的父状态添加子状态，如果不指定父状态，则创建一个孤立的状态节点。状态关系信息存储于 ```mStateInfo``` 中。

```java
private final StateInfo addState(State state, State parent) {
    if (mDbg) {
        mSm.log("addStateInternal: E state=" + state.getName() + ",parent="
                + ((parent == null) ? "" : parent.getName()));
    }
    StateInfo parentStateInfo = null;
    if (parent != null) {
        parentStateInfo = mStateInfo.get(parent);
        if (parentStateInfo == null) {
            // Recursively add our parent as it's not been added yet.
            parentStateInfo = addState(parent, null);
        }
    }
    StateInfo stateInfo = mStateInfo.get(state);
    if (stateInfo == null) {
        stateInfo = new StateInfo();
        mStateInfo.put(state, stateInfo);
    }

    // Validate that we aren't adding the same state in two different hierarchies.
    if ((stateInfo.parentStateInfo != null)
            && (stateInfo.parentStateInfo != parentStateInfo)) {
        throw new RuntimeException("state already added");
    }
    stateInfo.state = state;
    stateInfo.parentStateInfo = parentStateInfo;
    stateInfo.active = false;
    if (mDbg) mSm.log("addStateInternal: X stateInfo: " + stateInfo);
    return stateInfo;
}
```

构造完成后，调用 ```start``` 方法启动状态机，其内部调用 ```mSmHandler``` 的 ```completeConstruction``` 方法，完成状态机构造的动作。```completeConstruction``` 方法首先遍历状态树，并找到树的最大深度，用于确定状态栈的大小，并构造初始的状态栈，所有动作完成后，发送 ```SM_INIT_CMD``` 消息，报告状态机已构造完成。

```java
private final void completeConstruction() {
    if (mDbg) mSm.log("completeConstruction: E");

    /**
      * Determine the maximum depth of the state hierarchy
      * so we can allocate the state stacks.
      */
    int maxDepth = 0;
    for (StateInfo si : mStateInfo.values()) {
        int depth = 0;
        for (StateInfo i = si; i != null; depth++) {
            i = i.parentStateInfo;
        }
        if (maxDepth < depth) {
            maxDepth = depth;
        }
    }
    if (mDbg) mSm.log("completeConstruction: maxDepth=" + maxDepth);

    mStateStack = new StateInfo[maxDepth];
    mTempStateStack = new StateInfo[maxDepth];
    setupInitialStateStack();

    /** Sending SM_INIT_CMD message to invoke enter methods asynchronously */
    sendMessageAtFrontOfQueue(obtainMessage(SM_INIT_CMD, mSmHandlerObj));

    if (mDbg) mSm.log("completeConstruction: X");
}
```

构造状态栈时，先构造临时状态栈，从初始状态开始，上溯状态树，依次放入临时状态栈中，直到最远父状态，最后再将临时状态栈内容以相反的顺序保存至状态栈中。

```java
private final void setupInitialStateStack() {
    if (mDbg) {
        mSm.log("setupInitialStateStack: E mInitialState=" + mInitialState.getName());
    }

    StateInfo curStateInfo = mStateInfo.get(mInitialState);
    for (mTempStateStackCount = 0; curStateInfo != null; mTempStateStackCount++) {
        mTempStateStack[mTempStateStackCount] = curStateInfo;
        curStateInfo = curStateInfo.parentStateInfo;
    }

    // Empty the StateStack
    mStateStackTopIndex = -1;

    moveTempStateStackToStateStack();
}
```

```moveTempStateStackToStateStack``` 方法将临时状态栈按相反顺序保存到状态栈中。

```java
private final int moveTempStateStackToStateStack() {
    int startingIndex = mStateStackTopIndex + 1;
    int i = mTempStateStackCount - 1;
    int j = startingIndex;
    while (i >= 0) {
        if (mDbg) mSm.log("moveTempStackToStateStack: i=" + i + ",j=" + j);
        mStateStack[j] = mTempStateStack[i];
        j += 1;
        i -= 1;
    }

    mStateStackTopIndex = j - 1;
    if (mDbg) {
        mSm.log("moveTempStackToStateStack: X mStateStackTop=" + mStateStackTopIndex
                + ",startingIndex=" + startingIndex + ",Top="
                + mStateStack[mStateStackTopIndex].state.getName());
    }
    return startingIndex;
}
```

```SmHandler``` 从 ```Looper``` 取得 ```SM_INIT_CMD``` 消息，调用 ```handleMessage``` 进行处理，内部再调用 ```invokeEnterMethods```，以进入到初始状态。

```java
@Override
public final void handleMessage(Message msg) {
    if (!mHasQuit) {
        if (mSm != null && msg.what != SM_INIT_CMD && msg.what != SM_QUIT_CMD) {
            mSm.onPreHandleMessage(msg);
        }

        if (mDbg) mSm.log("handleMessage: E msg.what=" + msg.what);

        /** Save the current message */
        mMsg = msg;

        /** State that processed the message */
        State msgProcessedState = null;
        if (mIsConstructionCompleted || (mMsg.what == SM_QUIT_CMD)) {
            /** Normal path */
            msgProcessedState = processMsg(msg);
        } else if (!mIsConstructionCompleted && (mMsg.what == SM_INIT_CMD)
                && (mMsg.obj == mSmHandlerObj)) {
            /** Initial one time path. */
            mIsConstructionCompleted = true;
            invokeEnterMethods(0);
        } else {
            throw new RuntimeException("StateMachine.handleMessage: "
                    + "The start method not called, received msg: " + msg);
        }
        performTransitions(msgProcessedState, msg);

        // We need to check if mSm == null here as we could be quitting.
        if (mDbg && mSm != null) mSm.log("handleMessage: X");

        if (mSm != null && msg.what != SM_INIT_CMD && msg.what != SM_QUIT_CMD) {
            mSm.onPostHandleMessage(msg);
        }
    }
}
```

```invokeEnterMethods``` 的参数为一个整数，表示第一个要进入的状态在栈中的索引位置，从该位置开始依次调用每个状态的 ```enter``` 方法，直到到达栈顶。

```java
private final void invokeEnterMethods(int stateStackEnteringIndex) {
    for (int i = stateStackEnteringIndex; i <= mStateStackTopIndex; i++) {
        if (stateStackEnteringIndex == mStateStackTopIndex) {
            // Last enter state for transition
            mTransitionInProgress = false;
        }
        if (mDbg) mSm.log("invokeEnterMethods: " + mStateStack[i].state.getName());
        mStateStack[i].state.enter();
        mStateStack[i].active = true;
    }
    mTransitionInProgress = false; // ensure flag set to false if no methods called
}
```

至此，状态机的初始化过程完成。

### 2. 消息处理

```StateMachine``` 收到的消息由 ```mSmHandler``` 负责管理和分发，在 ```handleMessage``` 方法内部，收到消息并且判断 ```StateMachine``` 已经启动完成时，就会调用 ```mSmHandler``` 的 ```processMsg``` 方法，```processMsg``` 获取状态栈栈顶——即当前状态的信息，然后调用所对应的 ```State``` 对象的 ```processMessage``` 方法，在状态内完成消息处理逻辑。若当前状态无法处理该消息，或是处理完后需要父状态继续处理，则继续调用父状态 ```State``` 对象的 ```processMessage``` 方法，直到消息处理完成，若所有父状态都不能处理，则调用 ```mSmHandler``` 的 ```unHandledMessage```，尝试最后一次消息处理。该方法返回最后处理消息的状态，抑或是 ```null```。

```java
private final State processMsg(Message msg) {
    StateInfo curStateInfo = mStateStack[mStateStackTopIndex];
    if (mDbg) {
        mSm.log("processMsg: " + curStateInfo.state.getName());
    }

    if (isQuit(msg)) {
        transitionTo(mQuittingState);
    } else {
        while (!curStateInfo.state.processMessage(msg)) {
            /**
              * Not processed
              */
            curStateInfo = curStateInfo.parentStateInfo;
            if (curStateInfo == null) {
                /**
                  * No parents left so it's not handled
                  */
                mSm.unhandledMessage(msg);
                break;
            }
            if (mDbg) {
                mSm.log("processMsg: " + curStateInfo.state.getName());
            }
        }
    }
    return (curStateInfo != null) ? curStateInfo.state : null;
}
```

### 3. 状态切换

每个状态在消息处理时，可以选择切换到指定状态，这个过程通过调用状态机的 ```transitionTo``` 方法触发。状态切换完成后，下一个消息将由新的状态处理。可以看到实际上是调用的 ```mSmHandler.transitionTo``` 方法。

```java
public final void transitionTo(IState destState) {
    mSmHandler.transitionTo(destState);
}
```

```mSmHandler.transitionTo``` 仅标记状态切换的目标状态，实际上不会执行切换操作，这是为了在状态切换前，完成包括当前状态和一系列父状态的消息处理逻辑，待消息处理完成并返回到 ```mSmHandler.handleMessage``` 方法后再通过调用 ```performTransitions``` 方法执行切换。

```java
/** @see StateMachine#transitionTo(IState) */
private final void transitionTo(IState destState) {
    if (mTransitionInProgress) {
        Log.wtf(mSm.mName, "transitionTo called while transition already in progress to " +
                mDestState + ", new target state=" + destState);
    }
    mDestState = (State) destState;
    if (mDbg) mSm.log("transitionTo: destState=" + mDestState.getName());
}
```

```performTransitions``` 方法负责执行状态的切换流程。首先调用 ```setupTempStateStackWithStatesToEnter``` 方法来获得当前状态和目的状态的公共父状态，然后调用 ```invokeExitMethods``` 方法从当前状态沿状态栈逐级退出到公共父状态，再调用 ```invokeEnterMethods``` 方法从公共父状态进入到目的状态，最后调用 ```moveDeferredMessageAtFrontOfQueue``` 方法将延时消息列表的消息导入到消息队列头部。若在此过程中，目的状态发生改变，则再次执行，直到最终的状态与目的状态一致。

```java
private void performTransitions(State msgProcessedState, Message msg) {
    /**
      * If transitionTo has been called, exit and then enter
      * the appropriate states. We loop on this to allow
      * enter and exit methods to use transitionTo.
      */
    State orgState = mStateStack[mStateStackTopIndex].state;

    /**
      * Record whether message needs to be logged before we transition and
      * and we won't log special messages SM_INIT_CMD or SM_QUIT_CMD which
      * always set msg.obj to the handler.
      */
    boolean recordLogMsg = mSm.recordLogRec(mMsg) && (msg.obj != mSmHandlerObj);

    if (mLogRecords.logOnlyTransitions()) {
        /** Record only if there is a transition */
        if (mDestState != null) {
            mLogRecords.add(mSm, mMsg, mSm.getLogRecString(mMsg), msgProcessedState,
                    orgState, mDestState);
        }
    } else if (recordLogMsg) {
        /** Record message */
        mLogRecords.add(mSm, mMsg, mSm.getLogRecString(mMsg), msgProcessedState, orgState,
                mDestState);
    }

    State destState = mDestState;
    if (destState != null) {
        /**
          * Process the transitions including transitions in the enter/exit methods
          */
        while (true) {
            if (mDbg) mSm.log("handleMessage: new destination call exit/enter");

            /**
              * Determine the states to exit and enter and return the
              * common ancestor state of the enter/exit states. Then
              * invoke the exit methods then the enter methods.
              */
            StateInfo commonStateInfo = setupTempStateStackWithStatesToEnter(destState);
            // flag is cleared in invokeEnterMethods before entering the target state
            mTransitionInProgress = true;
            invokeExitMethods(commonStateInfo);
            int stateStackEnteringIndex = moveTempStateStackToStateStack();
            invokeEnterMethods(stateStackEnteringIndex);

            /**
              * Since we have transitioned to a new state we need to have
              * any deferred messages moved to the front of the message queue
              * so they will be processed before any other messages in the
              * message queue.
              */
            moveDeferredMessageAtFrontOfQueue();

            if (destState != mDestState) {
                // A new mDestState so continue looping
                destState = mDestState;
            } else {
                // No change in mDestState so we're done
                break;
            }
        }
        mDestState = null;
    }

    /**
      * After processing all transitions check and
      * see if the last transition was to quit or halt.
      */
    if (destState != null) {
        if (destState == mQuittingState) {
            /**
              * Call onQuitting to let subclasses cleanup.
              */
            mSm.onQuitting();
            cleanupAfterQuitting();
        } else if (destState == mHaltingState) {
            /**
              * Call onHalting() if we've transitioned to the halting
              * state. All subsequent messages will be processed in
              * in the halting state which invokes haltedProcessMessage(msg);
              */
            mSm.onHalting();
        }
    }
}
```

```setupTempStateStackWithStatesToEnter``` 方法构造一个临时状态栈，其中保存状态树中目标状态到公共父状态的依赖路径，并返回栈顶的内容，即当前状态和目的状态的公共父状态，如果没有公共父状态，则返回空。

```java
private final StateInfo setupTempStateStackWithStatesToEnter(State destState) {
    /**
      * Search up the parent list of the destination state for an active
      * state. Use a do while() loop as the destState must always be entered
      * even if it is active. This can happen if we are exiting/entering
      * the current state.
      */
    mTempStateStackCount = 0;
    StateInfo curStateInfo = mStateInfo.get(destState);
    do {
        mTempStateStack[mTempStateStackCount++] = curStateInfo;
        curStateInfo = curStateInfo.parentStateInfo;
    } while ((curStateInfo != null) && !curStateInfo.active);

    if (mDbg) {
        mSm.log("setupTempStateStackWithStatesToEnter: X mTempStateStackCount="
                + mTempStateStackCount + ",curStateInfo: " + curStateInfo);
    }
    return curStateInfo;
}
```

### 4. 消息传递

向 ```StateMachine``` 传递消息时，最常用的是 ```sendMessage``` 方法，有多个 ```sendMessage``` 重载，但都大同小异，内部调用 ```mSmHandler``` 的 ```sendMessage``` 方法。

```java
public void sendMessage(Message msg) {
    // mSmHandler can be null if the state machine has quit.
    SmHandler smh = mSmHandler;
    if (smh == null) return;

    smh.sendMessage(msg);
}
```

此外，发送消息时还可以调用 ```deferMessage``` 方法，该方法传递的消息将等待当前状态被切换后再处理，同样地，内部调用的是 ```mSmHandler``` 的 ```deferMessage``` 方法。

```java
public final void deferMessage(Message msg) {
    mSmHandler.deferMessage(msg);
}
```

```mSmHandler``` 的 ```deferMessage``` 方法将消息添加到一个列表中。

```java
private final void deferMessage(Message msg) {
    if (mDbg) mSm.log("deferMessage: msg=" + msg.what);

    /* Copy the "msg" to "newMsg" as "msg" will be recycled */
    Message newMsg = obtainMessage();
    newMsg.copyFrom(msg);

    mDeferredMessages.add(newMsg);
}
```

在状态切换完成后，会调用 ```moveDeferredMessageAtFontOfQueue``` 方法完成消息列表更新，从列表最后的消息开始，依次放入消息队列的头部。

```java
private final void moveDeferredMessageAtFrontOfQueue() {
    /**
      * The oldest messages on the deferred list must be at
      * the front of the queue so start at the back, which
      * as the most resent message and end with the oldest
      * messages at the front of the queue.
      */
    for (int i = mDeferredMessages.size() - 1; i >= 0; i--) {
        Message curMsg = mDeferredMessages.get(i);
        if (mDbg) mSm.log("moveDeferredMessageAtFrontOfQueue; what=" + curMsg.what);
        sendMessageAtFrontOfQueue(curMsg);
    }
    mDeferredMessages.clear();
}
```

### 5. 状态机退出

状态机退出流程通过 ```quit``` 或 ```quitNow``` 方法触发。```quit``` 内部调用了 ```mSmHandler``` 的 ```quit``` 方法。

```java
public final void quit() {
    // mSmHandler can be null if the state machine is already stopped.
    SmHandler smh = mSmHandler;
    if (smh == null) return;

    smh.quit();
}
```

```mSmHandler.quit``` 方法发送一个 ```SM_QUIT_CMD``` 消息，告知退出，如[前文](#2-消息处理)所述，该消息在处理时被传入 ```processMsg```，直接标记切换的目标状态为 ```QuittingState```。该状态不处理任何消息，其 ```processMessage``` 只会返回未处理。```performTransitions``` 执行到退出状态的切换后，调用 ```cleanupAfterQuitting``` 停止状态机线程并清空状态机信息。

```java
private final void cleanupAfterQuitting() {
    if (mSm.mSmThread != null) {
        // If we made the thread then quit looper which stops the thread.
        getLooper().quit();
        mSm.mSmThread = null;
    }

    mSm.mSmHandler = null;
    mSm = null;
    mMsg = null;
    mLogRecords.cleanup();
    mStateStack = null;
    mTempStateStack = null;
    mStateInfo.clear();
    mInitialState = null;
    mDestState = null;
    mDeferredMessages.clear();
    mHasQuit = true;
}
```

```quitNow``` 方法与 ```quit``` 方法基本一致，只是将 ```SM_QUIT_CMD``` 消息放置在消息队列头部，这样状态机将不等待消息队列处理完成便立即退出。

```java
private final void quitNow() {
    if (mDbg) mSm.log("quitNow:");
    sendMessageAtFrontOfQueue(obtainMessage(SM_QUIT_CMD, mSmHandlerObj));
}
```

此外还有停止状态 ```HaltingState```，可通过调用 ```transitionToHaltingState``` 切换过去，该状态只是停止普通状态下的消息处理，不会停止状态机线程或清空状态机信息，消息仍可以由 ```haltedProcessMessage``` 方法处理。```transitionToHaltingState``` 方法实际调用的是 ```mSmHandler.transitionTo``` 方法，传入的参数为 ```mSmHandler.mHaltingState```。

```java
public final void transitionToHaltingState() {
    mSmHandler.transitionTo(mSmHandler.mHaltingState);
}
```
