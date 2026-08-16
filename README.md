# Realtime Chat

NestJS와 Socket.IO를 기반으로 구현하는 실시간 1:1 채팅 서비스입니다.

사용자 및 친구 관계와 같은 관계형 데이터는 PostgreSQL에 저장하고, 지속적으로 누적되는 채팅 메시지는 MongoDB에 저장합니다. Redis는 로그인 세션 관리와 향후 Socket.IO 서버 확장을 위한 Pub/Sub 용도로 활용합니다.

프론트엔드는 Next.js를 사용하며, 개발 환경의 PostgreSQL, MongoDB, Redis는 Docker Compose를 통해 구성합니다.

## Tech Stack

### Frontend

- Next.js 16
- TypeScript
- Tailwind CSS
- Socket.IO Client

### Backend

- NestJS
- TypeScript
- Socket.IO
- Prisma
- Mongoose

### Database

- PostgreSQL
  - 사용자
  - 친구 관계
  - 채팅방
  - 채팅방 참여자

- MongoDB
  - 채팅 메시지

- Redis
  - 로그인 세션 관리
  - 사용자 접속 상태 관리 (예정)
  - Socket.IO Pub/Sub (예정)

### Development Environment

- Docker
- Docker Compose
- Colima

## Project Structure

```text
realtime-chat/
├── apps/
│   ├── api/                # NestJS Backend
│   └── web/                # Next.js Frontend
│
├── docker/                 # Docker 관련 설정 및 초기화 파일
│
├── docker-compose.yml
├── .env
├── .env.example
└── README.md
```

## Main Features

현재 구현된 주요 기능은 다음과 같습니다.

- 회원가입
- Argon2id 기반 비밀번호 해싱
- UUID v7 기반 사용자 외부 식별자
- 로그인 / 로그아웃
- Redis 기반 로그인 세션 관리
- HttpOnly Cookie 기반 세션 전달
- SessionAuthGuard 기반 인증 처리
- 로그인 사용자 정보 조회
- 사용자별 고유 친구 코드 생성
- 친구 코드 기반 사용자 검색
- 친구 요청
- 받은 친구 요청 목록 조회
- 친구 요청 승인 / 거절
- 친구 목록 조회
- 친구 관계 해제

향후 다음 기능을 구현할 예정입니다.

- 친구 관계인 사용자 간 1:1 채팅방 생성
- Socket.IO 기반 실시간 메시지 송수신
- MongoDB 기반 채팅 메시지 저장 및 조회
- 채팅방별 이전 메시지 조회
- 읽지 않은 메시지 수
- 메시지 읽음 처리
- 사용자 온라인 / 오프라인 상태
- 마지막 메시지 기반 채팅방 정렬
- Socket.IO Redis Adapter를 활용한 다중 서버 환경
- 테스트 코드

## Architecture

```text
Next.js
   │
   │ REST API / Socket.IO
   ▼
NestJS
   │
   ├── PostgreSQL
   │   ├── User
   │   ├── Friendship
   │   ├── ChatRoom
   │   └── ChatRoomMember
   │
   ├── MongoDB
   │   └── Message
   │
   └── Redis
       ├── Session
       ├── Presence
       └── Socket.IO Pub/Sub
```

## Local Development

현재 애플리케이션은 로컬에서 실행하고, PostgreSQL, MongoDB, Redis만 Docker 환경에서 실행합니다.

```text
Host
├── Next.js
└── NestJS

Docker / Colima
├── PostgreSQL
├── MongoDB
└── Redis
```

### 1. Environment Variables

루트 디렉터리에 `.env` 파일을 생성합니다.

`.env.example`을 복사하여 사용할 수 있습니다.

```bash
cp .env.example .env
```

예시:

```env
POSTGRES_USER=realtime_chat
POSTGRES_PASSWORD=realtime_chat_password
POSTGRES_DB=realtime_chat
POSTGRES_PORT=5432

MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=realtime_chat_mongo_password
MONGO_PORT=27017

REDIS_PASSWORD=realtime_chat_redis_password
REDIS_PORT=6379
```

`.env` 파일은 Git에 포함하지 않습니다.

## Docker

### Colima 실행

macOS에서 Docker Runtime으로 Colima를 사용하는 경우:

```bash
colima start
```

### Infrastructure 실행

```bash
docker compose up -d
```

현재 다음 컨테이너가 실행됩니다.

- PostgreSQL
- MongoDB
- Redis

상태 확인:

```bash
docker compose ps
```

로그 확인:

```bash
docker compose logs
```

### Infrastructure 종료

```bash
docker compose down
```

`docker compose down`을 실행해도 Docker Volume은 유지되므로 데이터는 삭제되지 않습니다.

DB 데이터를 포함하여 완전히 초기화하려면:

```bash
docker compose down -v
```

> `-v` 옵션을 사용하면 PostgreSQL, MongoDB, Redis의 저장 데이터가 삭제됩니다.

## Docker Volumes

데이터베이스 데이터는 Docker Named Volume을 사용하여 관리합니다.

```text
postgres_data
mongo_data
redis_data
```

Docker Volume 확인:

```bash
docker volume ls
```

컨테이너를 종료하거나 삭제하더라도 Volume을 명시적으로 삭제하지 않는 한 데이터는 유지됩니다.

## Development Roadmap

### Phase 1 - Infrastructure

- [x] Next.js 프로젝트 구성
- [x] NestJS 프로젝트 구성
- [x] PostgreSQL Docker 환경 구성
- [x] MongoDB Docker 환경 구성
- [x] Redis Docker 환경 구성

### Phase 2 - Authentication

- [x] PostgreSQL / Prisma 연결
- [x] User 모델 설계 및 migration
- [x] 회원가입
- [x] Argon2id 기반 비밀번호 해싱
- [x] UUID v7 기반 외부 식별자 적용
- [x] 로그인
- [x] Redis Session 적용
- [x] HttpOnly Cookie 기반 세션 전달
- [x] 로그아웃
- [x] SessionAuthGuard 구현
- [x] 인증 사용자 정보 조회 (`GET /users/me`)

### Phase 3 - Friends

- [x] 사용자별 친구 코드 생성
- [x] 친구 코드 검색
- [x] 친구 요청
- [x] 받은 친구 요청 목록 조회
- [x] 친구 요청 승인 / 거절
- [x] 친구 목록 조회
- [x] 친구 관계 해제

### Phase 4 - Chat

- [ ] 1:1 채팅방 생성
- [ ] 친구 관계 검증
- [ ] Socket.IO 연결
- [ ] 채팅방 입장
- [ ] 실시간 메시지 송수신
- [ ] MongoDB 메시지 저장
- [ ] 이전 메시지 조회

### Phase 5 - Improvements

- [ ] 읽지 않은 메시지 수
- [ ] 메시지 읽음 처리
- [ ] 사용자 접속 상태
- [ ] 채팅방 최근 메시지 정렬
- [ ] Socket.IO Redis Adapter
- [ ] NestJS 다중 인스턴스 환경 테스트
- [ ] 주요 비즈니스 로직 테스트 코드 작성

## Data Storage Strategy

데이터의 특성에 따라 저장소를 분리합니다.

### PostgreSQL

데이터 관계와 정합성이 중요한 정보를 저장합니다.

```text
User
Friendship
ChatRoom
ChatRoomMember
```

### MongoDB

지속적으로 생성되고 누적되는 채팅 메시지를 저장합니다.

```text
Message
```

### Redis

영구 저장보다 빠른 접근과 일시적인 상태 관리가 필요한 데이터를 관리합니다.

```text
Session
Presence
Socket.IO Pub/Sub
```

## Status

Docker 기반 PostgreSQL, MongoDB, Redis 개발 환경과 Prisma 기반 사용자 및 친구 관계 스키마 구성이 완료되었습니다.

현재 회원가입, 로그인, 로그아웃, Redis 세션 관리, HttpOnly Cookie 기반 인증, SessionAuthGuard, 인증 사용자 정보 조회 기능을 구현했습니다.

친구 코드 기반 사용자 검색, 친구 요청, 받은 요청 조회, 승인 및 거절, 친구 목록 조회, 친구 관계 해제 기능까지 구현된 상태입니다.

다음 단계에서는 친구 관계인 사용자 간 1:1 채팅방과 실시간 메시지 처리 기능을 구현할 예정입니다.
