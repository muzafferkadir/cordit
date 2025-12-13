FROM node:20-alpine

WORKDIR /app

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

# Socket.io URL for browser connection (backend exposed port)
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
