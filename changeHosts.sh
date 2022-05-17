#!/bin/bash

MONKSHU_PATH="$( cd "$( dirname "$0" )" && pwd )"
DOMAIN=${1:-`hostname --fqdn`}
FILES="$MONKSHU_PATH/backend/apps/telemeet/conf/telemeet.json $MONKSHU_PATH/frontend/apps/telemeet/js/constants.mjs $MONKSHU_PATH/../monkshu/backend/server/conf/blackboard.json $MONKSHU_PATH/frontend/apps/telemeet/conf/httpd.json $MONKSHU_PATH/../monkshu/backend/server/conf/httpd.json"

echo Using domain name $DOMAIN
read -p "OK to configure? [Y|N] " -n 1 -r ; echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

cp "$MONKSHU_PATH/backend/apps/telemeet/conf/httpd.json" "$MONKSHU_PATH/../monkshu/backend/server/conf/httpd.json"
for file in $FILES; do
    echo Processing file $file
    sed -i -r -e "s/https:\/\/[\.0-9]*?/https:\/\/$DOMAIN/g" "$file"
    sed -i -r -e "s/\[\"127.0.0.1:9090\".*?\]/[\"$DOMAIN:9090\"]/g" "$file"
    sed -i -r -e "s/C\:\/Users\/.*?_privkey.pem/\/etc\/letsencrypt\/live\/$DOMAIN\/privkey.pem/g" "$file"
    sed -i -r -e "s/C\:\/Users\/.*?_fullchain.pem/\/etc\/letsencrypt\/live\/$DOMAIN\/fullchain.pem/g" "$file"
done
