# electron-speech-to-speech

A no-brainer ready-to-use Electron speech-to-speech app for your voice calls based on 100% locally run AI models

Scaffolded with `npm create @quick-start/electron@latest` `react-ts` template

## Recommended system requirements

At least 32GB RAM given that some models run CPU-side with **WASM** as the **WebGPU** support for them is experimental and buggy

Specifically, OpenAI Whisper speech transcription part runs with WebGPU while translation and voice synthesis are CPU managed

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
