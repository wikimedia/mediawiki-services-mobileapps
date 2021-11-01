FROM docker-registry.wikimedia.org/nodejs12-devel AS prep
USER 0
ENV HOME="/root"
ENV DEBIAN_FRONTEND="noninteractive"
RUN apt-get update && apt-get install -y "git" "build-essential" "python" "pkg-config" && rm -rf /var/lib/apt/lists/*
RUN (getent group "65533" || groupadd -o -g "65533" -r "somebody") && (getent passwd "65533" || useradd -l -o -m -d "/home/somebody" -r -g "somebody" -u "65533" "somebody") && mkdir -p "/srv/service" && chown "65533":"65533" "/srv/service" && mkdir -p "/opt/lib" && chown "65533":"65533" "/opt/lib"
RUN (getent group "900" || groupadd -o -g "900" -r "runuser") && (getent passwd "900" || useradd -l -o -m -d "/home/runuser" -r -g "runuser" -u "900" "runuser")
USER 65533
ENV HOME="/home/somebody"
WORKDIR "/srv/service"
ENV APP_BASE_PATH="/srv/service" LINK="g++"
COPY --chown=65533:65533 ["package.json", "./"]
RUN npm install "--only=production" && npm dedupe
