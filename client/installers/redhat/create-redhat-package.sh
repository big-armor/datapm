#!/bin/bash

set -e

# Extract version number from package.json
DATAPM_VERSION=`jq .version ../../../package.json  | tr -d '"'`
echo "DATAPM_VERSION: $DATAPM_VERSION"

echo "Cleaning build files..."
rm -rf build || true
rm -rf *.rpm || true

echo "Creating build directories..."
mkdir -p build/BUILD
mkdir -p build/BUILDROOT
mkdir -p build/RPMS
mkdir -p build/SOURCES
mkdir -p build/SPECS
mkdir -p build/SRPMS

echo "Linting spec file..."
rpmlint datapm-client-x64.spec

echo "Copying Spec file..."
cp datapm-client-x64.xspec build/SPECS/datapm-client-x64.spec

echo "Updating Spec file version..."
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/SPECS/datapm-client-x64.spec

echo "Building RPM..."
rpmbuild -bb ~/build/SPECS/datapm-client-x64.spec


