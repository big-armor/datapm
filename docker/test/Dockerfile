# The following ARG variables can be overriden to test
# different versions of Node and Postgres
# These are the default values
#   ARG NODE=12
#   ARG POSTGRES=9.6
FROM debian:buster-slim

ARG NODE=12
ARG POSTGRES=11

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  # editors for debugging purposes
  vim nano emacs ne \
  # packages we need to build and test the code
  build-essential curl bash ca-certificates wget python-dev gnupg imagemagick lsb-release \
  # postgres server for testing GraphQL
  && curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
  && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
  && apt-get update && apt-get install -y --no-install-recommends postgresql-$POSTGRES \
  # node for front-end and graphql. git used by npm
  && curl -sL https://deb.nodesource.com/setup_$NODE.x | bash - \
  && apt-get install -y --no-install-recommends nodejs git

WORKDIR /app/docker/test/

WORKDIR /app/backend
# Copy just the package*.json files for better caching
COPY backend/package*.json ./

# allow npm to run twice in case of failure
RUN npm ci || npm ci

# copy everything now
COPY backend/ .

# nyc command for coverage needs to be able to write to this
# directory. exclude node_modules because it takes forever
RUN find ./ -not -wholename "./node_modules*" -print0 | xargs -0 chown postgres

ENV PATH "/usr/lib/postgresql/$POSTGRES/bin/:$PATH"
ENV FILESYSTEM_STORAGE_DIRECTORY "/tmp/unittest"

RUN su postgres -c 'npm run test:integration'
