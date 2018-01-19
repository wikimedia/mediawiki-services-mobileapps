#!/usr/bin/env bash
set -euo pipefail

# Check for GPG signing key
if [[ -z "$( git config user.signingkey )" ]]; then
  printf "\n$0: GPG signing key required. See https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work\n" >&2
  exit 2
fi

# Check for deploy directory
if [[ -z "$( git config deploy.dir )" ]]; then
  printf "\n$0: No deploy repository found. Set a deploy repo with:\n\n  git config deploy.dir <FULL PATH TO DEPLOY REPO DIR>\n\n" >&2
  exit 2
fi

repo_dir="$( cd $( dirname $0 )/.. && pwd )"
cd "$( git config deploy.dir )"

# Get the corresponding commit in the src submodule
cd src
src_commit_id="$( git log --format="%h" -n 1 )"
cd ..

# Build the deployment tag
deploy_commit_date="$( git show -s --format=%ci | awk '{print $1;}' )"
deploy_commit_id="$( git rev-parse --short HEAD )"
tag="deploy/$deploy_commit_date/$deploy_commit_id"

# Tag the correct commit in the src repo with & push tags
cd "$repo_dir"
git tag -s "$tag" -m "deployed" $src_commit_id && git push origin "$tag" && printf "Applied new tag: $tag\n"
