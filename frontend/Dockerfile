FROM node:lts

RUN mkdir -p /opt/app && chmod +rw /opt/app

WORKDIR /opt/app

COPY . .

RUN yarn install

EXPOSE 3000

CMD [ "yarn", "start" ]