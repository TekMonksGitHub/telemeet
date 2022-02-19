#!/bin/bash

MONKSHU_PATH="$( cd "$( dirname "$0" )" && pwd )"
DOMAIN=${1:-`hostname --fqdn`}
FILES="$MONKSHU_PATH/backend/apps/telemeet/conf/telemeet.json $MONKSHU_PATH/frontend/apps/telemeet/js/constants.mjs"

echo Using domain name $DOMAIN
read -p "OK to configure? [Y|N] " -n 1 -r ; echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

for file in $FILES; do
    echo Processing file $file
    sed -i -r -e "s/http:\/\/localhost:8080/https:\/\/$DOMAIN/g" "$file"
    sed -i -r -e "s/http:\/\/localhost:9090/https:\/\/$DOMAIN:9090/g" "$file"
done