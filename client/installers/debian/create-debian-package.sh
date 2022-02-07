#!/bin/bash
# SHOULD BE RUN FROM client/installers/debian directory

set -e

# Delete build if exists
rm -rf build || true
rm -f *.deb || true

# Create disk file
mkdir -p build/debian/source

# Move files into place
cp changelog control datapm-client.links datapm-client.install rules build/debian

# Move build files into place
cp -R ../../pkg-linux-intel64/* build/debian/source

# Extract version number from package.json
DATAPM_VERSION=`jq .version ../../../package.json  | tr -d '"'`

# Replace version number in control file
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/debian/control

# Build package file
dpkg-buildpackage -uc -tc -rfakeroot

# Build Package
dpkg --contents ../datapm-client_$DATAPM_VERSION*.deb

