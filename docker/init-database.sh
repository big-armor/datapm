#!/bin/bash
set -e

psql -U postgres -c 'select 1' -d $POSTGRES_DB &>dev/null || psql -U postgres -tc 'create database $POSTGRES_DB'