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

# Check for deploy directory commit in past 2 hours
if [[ -z "$( git log --since="2 hours ago" )" ]]; then
  printf "\nWARNING: The most recent deploy commit is:\n\n"
  printf "$( git log -1 )\n\n"
  printf "This isn't very recent. You may need to pull the most recent changes.\n\n"
  read -p "Continue anyway? (y/N) " -n 1 -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo
    exit 1
  fi
fi

# Build the deployment tag
deploy_commit_date="$( git show -s --format=%ci | awk '{print $1;}' )"
deploy_commit_id="$( git rev-parse --short HEAD )"
tag="deploy/$deploy_commit_date/$deploy_commit_id"

# Tag the latest code repo commit with it & push tags
cd "$repo_dir"
git tag -s "$tag" -m "deployed" && git push --tags && printf "Applied new tag: $tag\n"
