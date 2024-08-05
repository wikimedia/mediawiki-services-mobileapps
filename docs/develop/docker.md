# Docker Developer Environment

An easy way to run mobileapps with a few commands and keep the development environment consistent across different OSes. This is a WIP. For now, proceed with caution and use your local environment with the right node and npm versions for changes that will be committed (for example, updates to package-lock.json).

This repo docker configuration was created by a prototype command line tool that can also be used as a shortcut for the `docker-compose` commands above, more information [here](https://github.com/wikimedia/ocean).

## Requirements

You'll need a locally running Docker and Docker Compose:

  - [Docker installation instructions][docker-install]
  - [Docker Compose installation instructions][docker-compose]

[docker-install]: https://docs.docker.com/install/
[docker-compose]: https://docs.docker.com/compose/install/

---

**Linux users**

We recommend installing `docker-compose` by [downloading the binary release](https://docs.docker.com/compose/install/#install-compose-on-linux-systems).
You can also use `pip`, your OS package manager, or even run it in a container, but downloading the binary release is the easiest method.

---

## Quickstart

Ensure that `$MW_DOCKER_UID` and `$MW_DOCKER_GID` are set in your environment:

```
export MW_DOCKER_UID=$(id -u)
export MW_DOCKER_GID=$(id -g)
```

The above lines may be added to your `.bashrc` or other shell configuration.
You can also define them in `.env` in the root of the mobileapps project.

```
echo "MW_DOCKER_GID=$(id -g)" >> .env
echo "MW_DOCKER_UID=$(id -u)" >> .env
```

If you are using fish shell, make sure to set the environment variables like this:

```
set -gx MW_DOCKER_UID (id -u)
set -gx MW_DOCKER_GID (id -g)
```

### Install dependencies
Install npm dependencies if not already installed:

```sh
docker compose run mobileapps npm install
```

```sh
docker compose run pagelib npm install
```

### Start environment

```sh
docker-compose up -d
```

With the container up you can execute any command that you would normaly do:

```sh
docker-compose exec pagelib npm run build
```

## Usage

### Running build

If you don't want to execute the dev environment but still want to run the build command, you can run the following commmand:

```sh
docker-compose run pagelib npm run build
```

### Running tests

If you don't want to execute the dev environment but still want to run the test command, you can run the following commmand:

```sh
docker-compose run mobileapps npm run test
docker-compose run pagelib npm run test
```