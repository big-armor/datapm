#!/bin/zsh

########
# Run this from the ./client directory of the root of this project
########

# Exit when any command fails
set -e

# $1 The path to the file to be signed
function signFile {
    echo ""
    echo "### Signing $1 with $APPLE_DEVELOPER_CERTIFICATE_ID"
    /usr/bin/codesign --force --options runtime --entitlements ./installers/macos/macOS-x64/macos-runtime-entitlements.plist -s "Developer ID Application: $APPLE_DEVELOPER_CERTIFICATE_ID" --timestamp $1 -v
}


# Extract the certificates from environment variables
echo ""
echo "###   Extracting certificates from environment variables"
echo $MACOS_CERTIFICATE | base64 -D > certificate.p12
echo $MACOS_INSTALLER_CERTIFICATE | base64 -D > installer-certificate.p12

# Create a temporary keychain (will fail if the key chain already exists)
echo ""
echo "###   Creating temporary keychain"
security create-keychain -p $MACOS_KEYCHAIN_TEMPORARY_PASSWORD build.keychain  || true
security default-keychain -s build.keychain
security unlock-keychain -p $MACOS_KEYCHAIN_TEMPORARY_PASSWORD build.keychain

echo ""
echo "###  Setting temporary keychain as to search list"
security list-keychains -d user -s build.keychain

echo ""
echo "###   Importing app signing certificate"
security import certificate.p12 -k build.keychain -P $MACOS_CERTIFICATE_PWD -T /usr/bin/codesign -T /usr/bin/productsign

echo ""
echo "###   Importing installer signing certificate"
security import installer-certificate.p12 -k build.keychain -P $MACOS_INSTALLER_CERTIFICATE_PWD -T /usr/bin/productsign

echo ""
echo "###   Clean up certificate files"
rm -f certificate.p12
rm -f installer-certificate.p12

echo ""
echo "###   Partitioning temporary keychain"
security set-key-partition-list -S apple-tool:,apple:,teamid:$APPLE_TEAM_ID -s -k $MACOS_KEYCHAIN_TEMPORARY_PASSWORD build.keychain

echo ""
echo "###    Listing keys in keychain"
security find-identity -v -p basic build.keychain

# Sign the applications
signFile ./pkg-macos-intel64/datapm
# signFile ./pkg-macos-arm64/datapm


# Sign the node modules as well
ar=( $(find pkg-macos-intel64/**/*.node ) ); 
ar+=( $(find pkg-macos-intel64/**/*.node.bak ) ); 
# ar+=( $(find pkg-macos-arm64/**/*.node ) ); 
# ar+=( $(find pkg-macos-arm64/**/*.node.bak ) ); 
for i in "${ar[@]}"; do signFile $i; done

# Prepare for Installer creation
echo ""
echo "###   Preparing for installer creation"
mkdir -p ./installers/macos/macOS-x64/application/x86_64
cp -R ./pkg-macos-intel64/. ./installers/macos/macOS-x64/application/x86_64

# mkdir -p ./installers/macos/macOS-x64/application/arm64
# cp -R ./pkg-macos-arm64/. ./installers/macos/macOS-x64/application/arm64

# Create the installer
echo ""
echo "###   Creating installer"
cd installers/macos/macOS-x64
./build-macos-x64.sh DataPM $DATAPM_VERSION $BUILD_NUMBER
cd ../../../

# Import the apple connect api key
echo ""
echo "###   Importing apple connect api key"
echo $MACOS_APPLE_CONNECT_API_KEY | base64 -D > apple-connect-api-key.p8
xcrun notarytool store-credentials Notarize --key apple-connect-api-key.p8 --key-id $MACOS_APPLE_CONNECT_KEY_ID --issuer $MACOS_APPLE_CONNECT_ISSUER

# Submit the installer for notarization by Apple
echo ""
echo "###   Submitting installer for notarization"
xcrun notarytool submit ./installers/macos/macOS-x64/target/pkg-signed/*.pkg --team-id $APPLE_TEAM_ID --progress --wait --keychain-profile "Notarize"

echo ""
echo "###   Attaching notarization ticket"
xcrun stapler staple ./installers/macos/macOS-x64/target/pkg-signed/*.pkg

echo ""
echo "###   Cleanup temporary key chain"
security delete-keychain build.keychain

echo ""
echo "###   Revert back to login keychain as default"
security list-keychains -d user -s login.keychain

echo ""
echo "###   Set login as the default key chain again"
security default-keychain -d user -s login.keychain
