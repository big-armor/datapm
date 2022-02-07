#!/bin/bash
# SHOULD BE RUN FROM client/installers/debian directory

# Create disk file
mkdir -p build/DEBIAN

# Move files into place
cp datapm.install postinstall control build/DEBIAN

# Move build files into place
cp -R ../../pkg-linux-intel64/* build

# Build package file
dpkg-deb --build build
