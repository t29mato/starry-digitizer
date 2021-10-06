# This file is for deploying in Hacobune
# https://manual.c1.hacobuneapp.com/docs/resource
ARG VARIANT="16"
FROM node:${VARIANT}
RUN npm install --global @vue/cli http-server

WORKDIR /app
COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . .

RUN yarn ssg-build

EXPOSE 8080
CMD ["http-server", "dist"]
