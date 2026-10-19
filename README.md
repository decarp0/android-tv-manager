# Field Console

A local React UI for connecting to Android TV over Wi-Fi ADB, inspecting apps, streaming logcat, and undoing package changes. The backend binds to `127.0.0.1`; it is not a LAN web server.

## Requirements

- macOS, Linux, or Windows with Node.js 22+ and npm
- Android platform-tools (`adb`) on `PATH`
- Android TV Developer options enabled

## Run

```sh
npm install
npm run dev
```

Open the one-time URL printed by the server. It includes a random local access token; keep it private. The app and backend are both bound to localhost.

For production mode:

```sh
npm run build
npm start
```

## Windows setup

Install Node.js 22+ and Android SDK Platform-Tools. Add the directory containing `adb.exe` to your user `PATH`, then open a new PowerShell window and verify it is available:

```powershell
adb version
npm install
npm run dev
```

Alternatively, run `scripts\start-windows.bat` from File Explorer or a terminal. It checks Node.js, warns if ADB is missing, installs dependencies on first run, and starts the app. You can also run `.\scripts\start-windows.ps1` from PowerShell.

If you do not want to add Platform-Tools to `PATH`, set `ADB_PATH` before starting the app:

```powershell
$env:ADB_PATH = 'C:\Android\platform-tools\adb.exe'
npm run dev
```

Allow Android Debug Bridge through Windows Firewall on private networks if device discovery or connections are blocked.

## Linux setup

Install Node.js 22+ and Android SDK Platform-Tools using your distribution or the official Android download. Ensure `adb` is on `PATH`, then verify it and start the app:

```sh
adb version
npm install
npm run dev
```

Alternatively, set `ADB_PATH` to the full `adb` executable path before starting:

```sh
export ADB_PATH="$HOME/Android/platform-tools/adb"
npm run dev
```

On Linux, automatic subnet discovery uses `ip route`; install `iproute2` if that command is unavailable. Firewalls, VPNs, or blocked mDNS traffic can limit automatic discovery, but you can still enter the device IP and port manually.

## Connect without USB

On Android 11+, enable **Developer options → Wireless debugging**. Choose **Pair device with pairing code** and enter the displayed pairing port and six-digit code in **Connection**. The code is redacted from the console. Then connect to the separate IP address and connection port shown on the Wireless debugging screen.

If using port 5555 instead, enter the box IP and `5555` in the connection bar. Some firmware requires `adb tcpip 5555` from a USB session and may reset that mode after reboot.

On the **Connection** page, **Scan network** lists Android Wireless debugging endpoints advertised over ADB mDNS and probes the active local IPv4 subnet for legacy ADB on port `5555`. The probe checks up to 512 private IPv4 hosts and only tests whether TCP port `5555` accepts a connection. Choose a Connect endpoint to fill the connection IP/port, or a Pair endpoint to fill the pairing IP/port. Larger subnets and IPv6 are not scanned; manual entry remains available.

The current connected target reported Android 11, model `MiTV-AFKR0`, device `jaws`; the UI can connect to other Android ADB devices too.

## Current features

- Wi-Fi ADB connect, disconnect and Android 11+ pairing
- ADB mDNS discovery and local IPv4 probing for legacy ADB port 5555
- Right-side command/output console and live logcat stream
- Embedded live H.264 video (scrcpy 3.3.3, up to 1280 px / 30 fps, no audio), still screenshots, and allowlisted D-pad, OK, Back and Home controls over Wi-Fi ADB
- Package inventory with search and type/state/assessment filters, plus disable/enable and uninstall-for-user actions
- Upload and install a single APK over Wi-Fi (updates compatible existing apps; 512 MiB maximum)
- Protected core/active launcher packages
- Local package-action history with restore/undo

Network diagnostics, deeper crash/performance tooling, saved fix scripts, file management, a curated safety database and LG webOS support are not implemented yet. Package names are shown as reported by Android; review them carefully before changing system packages.

The **Remote** page starts video only when requested and stops the temporary scrcpy server when the view closes. The server binary is downloaded from the official Genymobile/scrcpy 3.3.3 release and checked against its published SHA-256 during `npm install`; this requires internet access during installation. The TV does not need a permanently installed app. Live decoding requires a modern browser with WebCodecs; still screenshots remain available as a fallback. Android may show a black image for DRM-protected video or other secure surfaces.
