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

### MacOS & Windows prerequisites

Hopefully, this should Just Work™.

### Linux prerequisites

If you are developing on a Linux system, copy the override settings to the default override file:

```
cp docker-compose.linux.yml docker-compose.override.yml
```

Next, ensure that `$MW_DOCKER_UID` and `$MW_DOCKER_GID` are set in your environment:

```
export MW_DOCKER_UID=$(id -u)
export MW_DOCKER_GID=$(id -g)
```

The above lines may be added to your `.bashrc` or other shell configuration.

If you are using fish shell, make sure to set the environment variables like this:

```
set -gx MW_DOCKER_UID (id -u)
set -gx MW_DOCKER_GID (id -g)
```

### Start environment

Start the environment:

```sh
docker-compose up
```

With the container up you can execute any command that you would normaly do:

```sh
docker-compose exec pagelib npm run build
```

## Usage

### Running build

If you don't want to execute the dev environment but still want to run the build command, you can run the following commmand:

```sh
docker-compose -f docker-compose.build.yml up --build
```

For linux users execute the following command:

```sh
docker-compose -f docker-compose.build.yml -f docker-compose.build.linux.yml up --build
```

### Installing dependencies

Because node_modules is skipped in the volume, the container uses node_modules installed during the container build.

To install a new dependency you should ssh into the container and install the package:

```sh
docker-compose exec pagelib npm install
# or
docker-compose exec mobileapps npm install
```