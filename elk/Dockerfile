# syntax=docker/dockerfile:1

FROM alpine:latest

RUN apk add --no-cache jq bash curl openssl
RUN mkdir -p /certs/elastic

COPY elastic-init.sh /init.sh

CMD bash /init.sh