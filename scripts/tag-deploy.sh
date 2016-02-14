#!/usr/bin/env bash
set -euo pipefail

if [[ -z "$( git config user.signingkey )" ]]; then
  echo "$0: GPG signing key required." >&2
  exit 2
fi

repo_dir="$( cd $( dirname $0 )/.. && pwd )"
deploy_dir="$( git config deploy.dir )"

cd "$deploy_dir"
deploy_commit_date="$( git show -s --format=%ci | awk '{print $1;}' )"
deploy_commit_id="$( git rev-parse --short HEAD )"
tag="deploy/$deploy_commit_date/$deploy_commit_id"

cd "$repo_dir"
git tag -s "$tag" -m "deployed" && git push --tags
