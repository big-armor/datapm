#!/bin/bash
# SHOULD BE RUN FROM client/installers/debian directory

set -e

# Delete build if exists
rm -rf build || true
rm -f *.deb || true

# Create directory
echo "Creating build directory..."
mkdir -p build/debian/source

# Move files into place
echo "Copy package files..."
cp changelog control datapm-client.links datapm-client.install rules build/debian

# Move build files into place
echo "Copy source..."
cp -R ../../pkg-linux-intel64/* build/debian/source

# Extract version number from package.json
DATAPM_VERSION=`jq .version ../../../package.json  | tr -d '"'`
echo "DATAPM_VERSION: $DATAPM_VERSION"

# Replace version number in control file
echo "Replacing datapm version in control file..."
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/debian/control

# Build package file
echo "Building package..."
cd build
dpkg-buildpackage -uc -tc -rfakeroot

# Build Package
echo "Creating Package"
dpkg --contents ../datapm-client_$DATAPM_VERSION*.deb

