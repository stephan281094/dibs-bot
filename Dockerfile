FROM node:alpine

WORKDIR /app
ADD . /app
RUN yarn --production

ENV PORT=80
EXPOSE 80

CMD ["yarn", "start"]
