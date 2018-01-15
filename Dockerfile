FROM node:9.2-alpine
MAINTAINER sergio.gordillo@vizzuality.com

ENV NAME vocabulary-tag
ENV USER microservice

RUN apk update && apk upgrade && \
    apk add --no-cache --update bash git openssh python build-base curl

RUN addgroup $USER && adduser -s /bin/bash -D -G $USER $USER

RUN npm install --unsafe-perm -g bunyan  grunt-cli

RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
RUN cd /opt/$NAME && npm install

COPY entrypoint.sh /opt/$NAME/entrypoint.sh
COPY config /opt/$NAME/config

WORKDIR /opt/$NAME

COPY ./app /opt/$NAME/app
RUN chown $USER:$USER /opt/$NAME

# Tell Docker we are going to use this ports
EXPOSE 4100


ENTRYPOINT ["./entrypoint.sh"]
