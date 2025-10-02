# 🌋 Reforger

> Extract and recreate frontend source code from sourcemaps

[![npm version](https://badge.fury.io/js/reforger.svg)](https://badge.fury.io/js/reforger)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A powerful CLI tool that recreates frontend codebases given a website url

Generate the codebase of your favourite website in seconds!

## ✨ Features

- 🔍 **Inspect** websites for sourcemaps
- ⚡ **Generate** original source code from sourcemaps
- 🍪 **Cookie support** for authenticated requests
- 🎨 **Beautiful CLI** with colors and emojis
- 🔧 **Flexible curl options** support

## 🚀 Installation

```bash
npm install -g reforger
```

## 📖 Usage

### Basic Commands

```bash
# Inspect a website for sourcemaps
reforge inspect https://example.com

# Generate source code from sourcemaps
reforge generate https://example.com

# Show help
reforge --help
```

### Advanced Usage

```bash
# With authentication cookies
reforge generate --cookie "session=abc123; auth=token" https://example.com

# With custom headers
reforge inspect -H "Authorization: Bearer token" https://example.com

# Custom output directory
reforge generate -o ./my-output https://example.com

# Combine options
reforge generate --cookie "session=abc123" -o ./extracted https://example.com
```

## 🛠️ Commands

### `inspect`
Inspects a URL for sourcemaps using curl.

```bash
reforge inspect [curl-options...] <url>
```

**Options:**
- `--cookie <cookie-string>` - Send cookies with the request
- `-H, --header <header>` - Send custom headers
- `-o, --output <path>` - Specify output path (default: ./temp1)

### `generate`
Recreates frontend code from sourcemaps.

```bash
reforge generate [curl-options...] <url>
```

**Options:**
- `--cookie <cookie-string>` - Send cookies with the request
- `-H, --header <header>` - Send custom headers
- `-o, --output <path>` - Specify output path (default: ./temp1)

## 📁 Output Structure

After running `reforge generate`, you'll get a directory structure like:

```
temp1/
├── src/
│   ├── components/
│   │   └── Button.js
│   ├── utils/
│   │   └── helpers.js
│   └── styles/
│       └── main.css
└── node_modules/
    └── ...
```

## 📸 Screenshots

### Actual Output Code Structure
![Reforger Generated Code Output](assets/reforge-code.png)
*An example of the recreated frontend code structure in the output directory.*

### Terminal Logs and Sourcemap Discovery
![Reforger CLI Terminal Output](assets/reforge-sc.png)
*A screenshot showing the Reforger CLI in action, displaying discovered sourcemaps and terminal logs.*

## 🔧 Requirements

- Node.js 14+ 
- npm or yarn
- Internet connection for fetching sourcemaps

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and legitimate reverse engineering purposes only. Please respect website terms of service and only use on websites you own or have permission to analyze.

## 🐛 Issues

Found a bug? Have a feature request? Please [open an issue](https://github.com/Mike-Medvedev/reforger/issues).

## 📊 Stats

- ⭐ Stars: [![GitHub stars](https://img.shields.io/github/stars/Mike-Medvedev/reforger.svg)](https://github.com/Mike-Medvedev/reforger/stargazers)
- 🍴 Forks: [![GitHub forks](https://img.shields.io/github/forks/Mike-Medvedev/reforger.svg)](https://github.com/Mike-Medvedev/reforger/network)
- 📦 Downloads: [![npm downloads](https://img.shields.io/npm/dm/reforger.svg)](https://www.npmjs.com/package/reforger)

---

Made by [Michael Medvedev](https://github.com/Mike-Medvedev)