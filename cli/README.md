# Hashbin CLI — Linux Command-Line Tool

A standalone command-line tool for [hashbin.net](https://hashbin.net) trusted file timestamping. Zero dependencies beyond Python 3.8+.

## Installation

```bash
# Download and install
sudo cp hashbin /usr/local/bin/hashbin
sudo chmod +x /usr/local/bin/hashbin

# Or install for current user only
cp hashbin ~/.local/bin/hashbin
chmod +x ~/.local/bin/hashbin
```

## Usage

### Stamp a file

```bash
hashbin stamp myfile.pdf
hashbin stamp *.jpg --include-name     # include file names in records
hashbin stamp document.pdf --token "YOUR_JWT"  # authenticated stamp
```

### Verify a file or hash

```bash
hashbin verify myfile.pdf
hashbin verify abc123def456...         # raw SHA-256 hash
hashbin verify abc123 --algorithm md5  # specify algorithm
```

### Health check

```bash
hashbin health
```

## GNOME Integration

### Desktop file (optional)

```bash
cp hashbin.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/
```

This lets you open files with Hashbin from the GNOME application menu.

### Nautilus right-click script

```bash
mkdir -p ~/.local/share/nautilus/scripts
cp hashbin-nautilus-stamp.sh ~/.local/share/nautilus/scripts/"Hashbin Stamp"
chmod +x ~/.local/share/nautilus/scripts/"Hashbin Stamp"
```

Now you can right-click any file in Nautilus → **Scripts → Hashbin Stamp** to create a timestamp.

Requires `zenity` (installed by default on GNOME).

## How it works

1. Files are hashed **locally** on your machine (MD5, SHA-1, SHA-256, SHA-512)
2. Only the hashes and file size are sent to hashbin.net — **your file never leaves your computer**
3. The server returns an HMAC-signed timestamp proving the file existed at that moment
4. You can verify any file or hash later with `hashbin verify`

## Shell Completion

### Bash

```bash
# Load for current session
source hashbin-completion.bash

# Install permanently
sudo cp hashbin-completion.bash /etc/bash_completion.d/hashbin
```

### Zsh

```bash
# Install completion function
mkdir -p ~/.zsh/completions
cp _hashbin ~/.zsh/completions/_hashbin

# Add to ~/.zshrc (if not already):
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit; compinit
```

## Environment

- **`NO_COLOR`** — set to disable colored output
- Supports Python 3.8+
- No external dependencies

## Links

- Website: https://hashbin.net
- Source: https://github.com/blekinge/hashbin-time-vault
