# AndroBase Troubleshooting & Android FAQ

## 1. Server stops when screen turns off

**Cause**: Android battery optimization puts the device CPU into deep sleep (Doze mode) and terminates non-foreground sockets.

**Solution**:
1. Acquire a Termux wakelock:
   ```bash
   termux-wake-lock
   ```
2. Disable Battery Optimization:
   - Go to Android **Settings > Apps > Termux > Battery / Power Usage**.
   - Change setting to **Unrestricted** / **Do not optimize**.
3. On Xiaomi / MIUI / HyperOS:
   - Enable "Autostart" in app permissions.
   - Set battery saver to "No restrictions".
4. On Samsung One UI:
   - Remove Termux from "Sleeping apps" and "Deep sleeping apps" in Device Care.

---

## 2. Process killed with "[Killed] 137" (Android 12+ Phantom Process Killer)

**Cause**: Android 12 introduced a feature that limits background child processes to a maximum of 32 per app.

**Solution**:
Run this command once from your computer via USB debugging (ADB):
```bash
adb shell "/system/bin/device_config put activity_manager max_phantom_processes 2147483647"
```

---

## 3. "Cannot connect from computer over Wi-Fi"

**Checklist**:
1. Verify both the smartphone and laptop are connected to the exact same Wi-Fi SSID.
2. Check if your Wi-Fi router has **AP Isolation / Client Isolation** enabled (common in guest networks and university Wi-Fi). If isolation is enabled, devices on the same Wi-Fi cannot communicate with each other.
3. Use the phone's **Wi-Fi Hotspot**:
   - Turn on Portable Hotspot on your Android phone.
   - Connect your laptop to the phone's hotspot Wi-Fi.
   - The phone server is consistently available at `http://192.168.43.1:3000`.

---

## 4. "Native module build failed (node-gyp / Python / make)"

**Solution**:
AndroBase's core engine is built specifically without native binary dependencies (`node-gyp`, C++ compilers, or Python builds). It runs in pure Node.js on any ARMv7 or ARM64 Android device. If you see build errors, ensure you are running `node server.ts` and not attempting to install incompatible external native packages.
