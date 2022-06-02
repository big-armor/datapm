#!/bin/bash
# SHOULD BE RUN FROM client/installers/debian directory

set -e

# Delete build if exists
rm -rf build || true
rm -f *.deb || true

# Create directory
echo "Creating build directory..."
mkdir -p build/DEBIAN

# Move files into place
echo "Copy package files..."
cp changelog control datapm-client.links datapm-client.install postinst prerm build/DEBIAN

# Move build files into place
echo "Copy source..."
mkdir -p build/opt/datapm
cp -R ../../pkg-linux-intel64/* build/opt/datapm

# Extract version number from package.json
DATAPM_VERSION=`jq .version ../../../package.json  | tr -d '"'`
echo "DATAPM_VERSION: $DATAPM_VERSION"

echo "BUILD_NUMBER: $BUILD_NUMBER"

# Replace version number in control file
echo "Replacing datapm version in control file..."
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/DEBIAN/control
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/DEBIAN/changelog


# Build package file
dpkg-deb --build build

# Rename package file
mv build.deb datapm-client_${DATAPM_VERSION}_x64_${BUILD_NUMBER}.deb
