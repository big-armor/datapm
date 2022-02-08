#!/bin/bash

set -e

# Extract version number from package.json
DATAPM_VERSION=`jq .version ../../../package.json  | tr -d '"'`
echo "DATAPM_VERSION: $DATAPM_VERSION"

echo "Cleaning build files..."
rm -rf build || true
rm -rf *.rpm || true

echo "Creating build directories..."
mkdir -p build/BUILD/datapm-client-${DATAPM_VERSION}
mkdir -p build/BUILDROOT
mkdir -p build/RPMS
mkdir -p build/SOURCES
mkdir -p build/SPECS
mkdir -p build/SRPMS

echo "Creating source file..."
cd ../../
tar --exclude-from=.gitignore -czvf installers/redhat/build/SOURCES/datapm-client-${DATAPM_VERSION}-source.tar.gz ./
cd installers/redhat

# echo "Linting spec file..."
# rpmlint datapm-client-x64.spec

echo "Copying Spec file..."
cp datapm-client-x64.spec build/SPECS/datapm-client-x64.spec

echo "Updating Spec file version..."
sed -i "s/x\.x\.x/$DATAPM_VERSION/g" build/SPECS/datapm-client-x64.spec

echo "Copying build files..."
cp -R ../../pkg-linux-intel64/* build/BUILD/datapm-client-${DATAPM_VERSION}

echo "Building RPM..."
rpmbuild -bb -v build/SPECS/datapm-client-x64.spec --define "_topdir `pwd`/build" 


