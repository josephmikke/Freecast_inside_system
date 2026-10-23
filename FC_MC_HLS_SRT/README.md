# HLS → SRT Module for WeatherNation Channels

**Author:** Dmitry Shylgenko  
**Version:** 1.0  
**Last Updated:** August 2025  

This repository provides a complete solution to ingest HLS streams (e.g., from WeatherNation) and repackage them into low-latency SRT streams for contribution to AWS MediaConnect or other SRT-based workflows.

---

## 📘 Table of Contents

- [System Requirements](#-system-requirements)
- [Build FFmpeg with SRT Support](#-build-ffmpeg-with-srt-support)
- [Build HLS → SRT Module](#-build-hls--srt-module)
- [Run the HLS → SRT Module](#-run-hls--srt-module)
---

## System Requirements

### OS
- Linux (Ubuntu 24.04 recommended), macOS, or Windows (via WSL)

### Architecture
- x86_64, ARM64 (aarch64) supported

### Minimum Resources
- RAM: 1 GB (2+ GB recommended)
- Disk: 2–3 GB free space
- CPU: 1+ core
- Privileges: `sudo` access required for dependency installation

---

## 🔧 Build FFmpeg with SRT Support

###  Install Build Dependencies
```bash
sudo apt update
sudo apt install -y \
    libssl-dev \
    libboost-all-dev \
    libcurl4-openssl-dev \
    autoconf \
    automake \
    build-essential \
    pkgconf \
    cmake
```

###  Install SRT library
```bash
git clone https://github.com/Haivision/srt.git
cd srt
# Configure and build
cmake -B build   -DCMAKE_INSTALL_PREFIX=/usr  \
 -DENABLE_SHARED=ON   -DUSE_STATIC_LIBSTDCXX=ON
cmake --build build
sudo cmake --install build
```

###  Build FFmpeg
```bash
git clone https://github.com/FreeCastInc/FC_MC_HLS_SRT.git
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg/
git checkout release/7.1
git apply ../FC_MC_HLS_SRT/scte_35.patch
./configure --prefix=/usr/local --enable-nonfree \
--enable-shared --disable-x86asm --enable-openssl \
--enable-protocol=https --enable-libsrt
make
sudo make install
```
---

## 🔧 Build HLS->SRT Module

```base
# we already cloned this git repo in 2.3 
cd FC_MC_HLS_SRT
mkdir build
cd build
cmake ..
make
sudo make install
sudo ldconfig
```
---

## 🔧 Run HLS->SRT Module

We succeed to build hls->srt module through passed 3. we can confirm that module is installed corretly through following step.

```bash
hls-srt
Usage: hls-srt <m3u8URL> <srtURL> <channelName>
```
### How to install PM2 binary

PM2, or Process Manager 2, is an open-source, production-ready process manager specifically designed for Node.js applications. Its primary purpose is to help manage, monitor, and keep Node.js applications running continuously, especially in production environments.

#### Install NVM (Node Version Manager)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
exec bash
```

we can confirm 
```bash
nvm --version #check result the below.
0.39.7
```

#### Install Node latest Version

```bash
nvm install --lts 
nvm use --lts
```

#### Install PM2 

```bash
npm install -g pm2
#confirmation installed successfully
pm2 --version
6.0.8
```

### How to run HLS-SRT module for Weathernation.

#### Weathernation Primary 

"https://stream.weathernationtv.com/HLS/ND1/playlistSCTE35.m3u8" is Weathernation Primary channel HLS link 67.202.3.121:9000 is the MediaConnect’s info of Weathernation  Primary If you create MediaConnect, please update script file with new ip and port.

ex: 
```bash
hls-srt "https://stream.weathernationtv.com/HLS/ND1/playlistSCTE35.m3u8" "srt://xx.xx.xx.xx:yyyyy?mode=caller&pkt_size=1316" SRT-weathernation-primary
```
xx.xx.xx.xx is new MC IP and yyyy is new Port

##### Run Primary Service on Server.
```bash
#FC_MC_HLS_SRT cloned alread in 2.3
cd FC_MC_HLS_SRT/apps/freecast
pm2 start SRT-weathernation-primary.sh
#how to check running service status.
pm2 list
```

#### Weathernation Backup
Weathernation Backup flow is same as Weathernation Primary. But script filename is different.

SRT-weathernation-backup.sh





