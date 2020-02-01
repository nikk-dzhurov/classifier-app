#!/bin/bash

$ANDROID_HOME/platform-tools/adb "$@" reverse tcp:8081 tcp:8081
$ANDROID_HOME/platform-tools/adb "$@" reverse tcp:8097 tcp:8097
