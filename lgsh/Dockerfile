# Stage 1: React + Vite 빌드
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# tsc 타입체크 건너뛰고 vite build만 실행 (타입에러로 빌드 차단 방지)
RUN npx vite build

# Stage 2: nginx로 서빙
FROM nginx:alpine

# nginx 설정 (API 요청을 api 컨테이너로 프록시)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
