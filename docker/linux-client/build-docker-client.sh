#!/bin/sh

# TODO: This script and docker file do not work. Leaving for now, but I have plans
# in the future

# If it doesn't exist, make a link to the client/dist directory
rm -rf dist
cp -R ../../client/dist dist


# Build the client
docker buildx build --platform linux/amd64 -t datapm/client:latest -f Dockerfile-client .