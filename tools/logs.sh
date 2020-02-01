#!/bin/bash

$ANDROID_HOME/platform-tools/adb "$@" logcat *:S ReactNative:V ReactNativeJS:V
