#!/bin/bash


# ensure we are in the right dir
cd $(dirname $0)/..;

# check for a git dir
if [[ ! -e .git ]]; then
    echo "No .git directory here, exiting" >&2;
    exit 1;
fi

# be on master and get the updates
git checkout master;
git fetch origin;

# inspect what has changed
flist=$(git diff --name-only origin/master);

if [[ -z "${flist}" ]]; then
    # no changes, we are done
    exit 0;
fi

# there are updates, do them
git pull;

if echo -e "${flist}" | grep -i package.json > /dev/null; then
    # package.json has been changed, need to rebuild the modules
    rm -rf node_modules;
    #npm install;
    /home/ppchelko/.nvm/versions/node/v6.17.1/bin/npm install;
fi

# now, restart the service
systemctl restart mobileapps;

exit $?;

