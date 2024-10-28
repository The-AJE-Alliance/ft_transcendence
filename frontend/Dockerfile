# syntax=docker/dockerfile:1

FROM owasp/modsecurity-crs:nginx

USER root

RUN apt-get update && apt-get install -y --no-install-recommends jq
RUN chown -R nginx:nginx /etc/ssl/

COPY 99-generate-ssl-certificate.sh /docker-entrypoint.d
COPY default.conf.template /etc/nginx/templates/conf.d/default.conf.template

USER nginx