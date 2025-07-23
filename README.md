# electron-speech-to-speech - free unlimited local speech-to-speech and real-time captioning solution

A no-brainer ready-to-use Electron based speech-to-speech and live captions app for your voice calls based on 100% locally run AI models

## Main features
1) **Entire speech-to-speech** (transcription, translation, voice synthesis) pipeline utilizing OpenAI Whisper, VITS Kokoro and various other open-source AI models running on **WASM** and **WebGPU**
2) **Live captions** using my [**whisper.cpp** Node.js addon](https://www.npmjs.com/package/@kutalia/whisper-node-addon) supporting GPU acceleration through **Vulkan API** and **Apple Metal**, or **OpenBLAS** for CPU inference on Windows. It can transcribe **up to 99 languages** and also optionally translate to English. You can not only caption your **system's audio** but also any input stream as well (recommended to use virtual audio device for voice calls, more on that below)
3) **Cross-platform** - while Windows build is provided and the app is optimized for it, you can compile for other platforms (Mac, Linux) with a single npm command

## Installation
Just visit [releases](https://github.com/Kutalia/electron-speech-to-speech/releases) and download an installer for your platform from *Assets* section of the latest release. For example, *.exe* file for Windows

Currently only Windows builds are provided

## Recommended system requirements

At least 32GB RAM given that some models run CPU-side with **WASM** as the **WebGPU** support for them is experimental and buggy

Specifically, during speech-to-speech OpenAI Whisper transcription models run on WebGPU while translation and voice synthesis are CPU managed

## Misc. Recommendations

To be used inside voice chat apps like Discord, you will need a virtual audio input device that will be a target for this program.
VB-Cable is a free software which is confirmed to be working as of now on Windows 11:

https://vb-audio.com/Cable/

Here's how to use it:

1. install at least one pair of virtual input and output devices
2. Go to _control panel_, _sound settings_, _playback_ tab and verify there's an entry with the virtual device name you defined during installation (_CABLE-A Input_, for example)
3. (Optional) If you want to hear synthesized speech output yourself: close the window, go to _recording_ tab, double click your installed virtual device (_CABLE-A Output_, for example), then _listen_ tab and check _Listen to this device_.
4. Choose the respective option in the Electron app from the second select field, so it corresponds to your virtual audio device name.

Also, you can make this device as your default input device by opening the same window as defined in _2)_, right clicking on the device and selecting both _Set as Default Device_ and _Set as Default Communication Device_. That way you won't have to reconfigure your VC apps (unless you're already using specific options there).

Same goes for live captions input device. Choose:
- *System Audio* if you wish to caption output audio from your computer
- a microphone device for transcribing your voice
- a virtual audio device to only caption incoming streams from specific configured apps.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

*Scaffolded with `npm create @quick-start/electron@latest` `react-ts` template*
