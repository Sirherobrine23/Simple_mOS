FROM debian:testing
ENV DEBIAN_FRONTEND="noninteractive"
RUN \
  apt update && apt install -y curl wget git && \
  curl -Ssl https://deb.nodesource.com/setup_lts.x | bash - && \
  apt install -y nodejs && \
  npm install -g npm@latest
RUN apt install -y python3-pip python3 qemu uml-utilities virt-manager libguestfs-tools qemu-block-extra

# Copy APP
WORKDIR /app
ENTRYPOINT [ "node", "Docker.js" ]
COPY ./package*.json ./
RUN npm install --no-save -d

ENV \
  SYSTEM_SIZE="200G" \
  SYSTEM_NAME="monterey" \
  INSTALL_SYSTEM="false"

COPY ./ ./