FROM node:18 AS builder

WORKDIR /app
COPY package*.json ./
ARG REACT_ENV_FILE
RUN echo "$REACT_ENV_FILE" > .env
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]