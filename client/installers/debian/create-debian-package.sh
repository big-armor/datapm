#!/bin/bash
# SHOULD BE RUN FROM client/installers/debian directory

set -e

# Delete build if exists
rm -rf build || true
rm -f *.deb || true

# Create disk file
mkdir -p build/DEBIAN


# Move files into place
cp control build/DEBIAN
cp datapm-client.links build

# Move build files into place
cp -R ../../pkg-linux-intel64/* build

# Extract version number from package.json
DATAPM_VERSION=`jq .version ../../../package.json  | tr -d '"'`

# Replace version number in control file
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/DEBIAN/control

# Build package file
dpkg-deb --build build

# Rename package file
mv build.deb datapm-client_${DATAPM_VERSION}_x64.deb
