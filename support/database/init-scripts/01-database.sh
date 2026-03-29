#!/bin/bash
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c 'CREATE DATABASE "keycloak"';
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c 'CREATE DATABASE "talk"';
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c 'CREATE DATABASE "review"';
