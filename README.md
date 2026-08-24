# Realtime Chat

NestJS와 Socket.IO를 기반으로 구현한 실시간 1:1 채팅 서비스입니다.

사용자, 친구 관계, 채팅방과 같은 관계형 데이터는 PostgreSQL에 저장하고, 지속적으로 누적되는 채팅 메시지는 MongoDB에 저장합니다. Redis는 로그인 세션, 사용자 Presence, Socket.IO Redis Adapter의 Pub/Sub 용도로 사용합니다.

프론트엔드는 Next.js를 사용하며, 개발 환경의 PostgreSQL, MongoDB, Redis는 Docker Compose로 구성합니다.

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
- Jest

### Database

- PostgreSQL
  - 사용자
  - 친구 관계
  - 채팅방
  - 채팅방 참여자
  - 메시지 읽음 위치

- MongoDB
  - 채팅 메시지

- Redis
  - 로그인 세션
  - 사용자 Presence
  - Presence TTL / 만료 이벤트
  - Socket.IO Redis Adapter Pub/Sub

### Development Environment

- Docker
- Docker Compose
- Colima

## Project Structure

```text
realtime-chat/
├── apps/
│   ├── api/                         # NestJS API / Socket.IO / Prisma / Mongoose
│   └── web/                         # Next.js / Socket.IO Client
│
├── docker-compose.yml               # PostgreSQL / MongoDB / Redis
├── docker-compose.multi-instance.yml
│                                    # 다중 NestJS 인스턴스 테스트 환경
│
├── .env
├── .env.example
└── README.md
```

## Main Features

현재 구현된 주요 기능은 다음과 같습니다.

### Authentication

- 회원가입
- Argon2id 기반 비밀번호 해싱
- UUID v7 기반 사용자 외부 식별자
- 로그인 / 로그아웃
- Redis 기반 로그인 세션 관리
- HttpOnly Cookie 기반 세션 전달
- SessionAuthGuard 기반 인증 처리
- 로그인 사용자 정보 조회

### Friends

- 사용자별 고유 친구 코드 생성
- 친구 코드 기반 사용자 검색
- 친구 요청
- 받은 친구 요청 목록 조회
- 친구 요청 승인 / 거절
- 친구 목록 조회
- 친구 관계 해제

### Chat

- 친구 관계인 사용자 간 1:1 채팅방 생성
- 기존 1:1 채팅방 재사용
- 채팅방 목록 조회
- Socket.IO 기반 실시간 연결
- Redis Session 기반 Socket 인증
- 채팅방 참여자 검증 및 Socket Room 입장
- 실시간 메시지 송수신
- MongoDB 기반 채팅 메시지 저장
- 채팅방별 이전 메시지 조회
- Cursor 기반 이전 메시지 Pagination
- 채팅방 진입 시 최신 메시지 위치로 자동 이동
- 이전 메시지 조회 시 기존 스크롤 위치 유지
- 과거 메시지를 확인 중일 때 상대 메시지 수신으로 인한 강제 하단 이동 방지
- 내가 메시지를 전송한 경우 최신 메시지 위치로 이동
- 메시지 입력 후 입력창 포커스 유지
- 채팅방 상대방 정보 조회 및 표시

### Read / Unread

- 사용자별 마지막 읽은 메시지 위치 저장
- `message:read` Socket 이벤트 기반 읽음 처리
- 이전 읽음 이벤트가 늦게 도착해도 읽음 위치가 뒤로 가지 않도록 조건부 업데이트
- 내가 보낸 메시지를 제외한 읽지 않은 메시지 수 계산
- 채팅방 목록에 unread count 표시

### Chat List

- 마지막 메시지 내용 및 시간 표시
- 마지막 메시지 기준 채팅방 정렬
- `chat:list:update` 이벤트 기반 실시간 채팅방 목록 갱신

### Presence

- Redis TTL 기반 사용자 활성 상태 관리
- 활성 화면에서 주기적인 Presence heartbeat 전송
- TTL 만료를 이용한 비정상 종료 상태 자동 정리
- Redis expired 이벤트 기반 오프라인 상태 전파
- 친구 목록 및 채팅방 헤더에 온라인 / 오프라인 상태 표시
- `presence:update` 기반 실시간 상태 변경

### Frontend Navigation

- 로그인 후 공통 Bottom Navigation
- 친구 / 채팅 / 내 정보 화면 분리
- 채팅 상세 화면에서는 Bottom Navigation 숨김
- 내 정보 조회
- 로그아웃
- 공통 Button 컴포넌트 적용

### Scaling

- Socket.IO Redis Adapter 적용
- 사용자별 Socket Room 구성
- 다중 NestJS 인스턴스 간 Socket 이벤트 전달
- 서로 다른 NestJS 인스턴스에 연결된 사용자 간 실시간 메시지 전달 검증
- 다중 인스턴스 환경에서 다음 이벤트 전달 검증
  - `message:new`
  - `chat:list:update`
  - `presence:update`

### Testing

- Jest 기반 주요 비즈니스 로직 단위 테스트
- ChatService 테스트
  - 친구 관계 검증
  - 자기 자신과 채팅방 생성 방지
  - 기존 1:1 채팅방 재사용
  - 신규 채팅방 생성
  - 채팅방 접근 권한
  - 읽음 위치 조건부 업데이트

- MessagesService 테스트
  - 본인 메시지 unread 제외
  - 마지막 읽음 이후 unread 계산
  - 잘못된 ObjectId 검증
  - 읽음 포인터 데이터 정합성 검증
  - 최근 메시지 조회

- PresenceService 테스트
  - 최초 heartbeat 온라인 전환
  - 기존 온라인 상태 heartbeat 갱신
  - 온라인 상태 조회
  - Presence 삭제

## Architecture

```text
                              ┌─────────────────┐
                              │     Next.js     │
                              │   Socket.IO     │
                              └────────┬────────┘
                                       │
                             REST API / WebSocket
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                  ┌──────▼──────┐             ┌──────▼──────┐
                  │  NestJS #1  │             │  NestJS #2  │
                  └──────┬──────┘             └──────┬──────┘
                         │                           │
                         └─────────────┬─────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │ PostgreSQL  │    │   MongoDB   │    │    Redis    │
             │             │    │             │    │             │
             │ User        │    │ Message     │    │ Session     │
             │ Friendship  │    │             │    │ Presence    │
             │ ChatRoom    │    │             │    │ Pub/Sub     │
             │ Member      │    │             │    │ TTL Event   │
             └─────────────┘    └─────────────┘    └─────────────┘
```

## Data Storage Strategy

데이터 특성에 따라 저장소 역할을 분리했습니다.

### PostgreSQL

데이터 관계와 정합성이 중요한 정보를 저장합니다.

```text
User
Friendship
ChatRoom
ChatRoomMember
```

`ChatRoomMember`에는 사용자의 마지막 읽은 메시지 ID와 읽은 시점을 저장합니다.

```text
lastReadMessageId
lastReadAt
```

읽지 않은 메시지 수 자체를 저장하지 않고, 마지막 읽은 메시지 이후 MongoDB 메시지를 기준으로 계산합니다.

### MongoDB

지속적으로 생성되고 누적되는 채팅 메시지를 저장합니다.

```text
Message
```

채팅 메시지는 채팅방 식별자와 생성 순서를 기준으로 조회하며, Cursor 기반 Pagination을 통해 이전 메시지를 순차적으로 조회합니다.

메시지 순서 판단에는 `createdAt`과 MongoDB `_id`를 함께 사용합니다.

### Redis

영구 저장보다 빠른 접근과 일시적인 상태 관리가 필요한 데이터를 관리합니다.

```text
Session
Presence
Socket.IO Pub/Sub
```

#### Session

로그인 세션을 Redis에 저장하고, HttpOnly Cookie의 `sessionId`를 통해 인증합니다.

Socket.IO 연결 시에도 동일한 Redis Session을 조회하여 사용자를 인증합니다.

#### Presence

사용자의 활성 상태는 Redis TTL 기반 heartbeat 방식으로 관리합니다.

```text
활성 화면
   ↓
presence:heartbeat
   ↓
presence:{userUid}
TTL 갱신
```

heartbeat가 중단되면 TTL 만료 후 Presence key가 삭제되고, Redis expired 이벤트를 통해 오프라인 상태를 실시간으로 전달합니다.

#### Socket.IO Pub/Sub

Socket.IO Redis Adapter를 사용하여 여러 NestJS 인스턴스 간 Socket Room 이벤트를 전달합니다.

각 NestJS 인스턴스는 어떤 인스턴스에 사용자의 Socket이 연결되어 있는지 직접 관리하지 않고, Redis Pub/Sub을 통해 실시간 이벤트를 공유합니다.

## Chat Flow

```text
친구 목록
   │
   │ 채팅하기
   ▼
1:1 채팅방 생성 또는 기존 채팅방 반환
   │
   ▼
채팅방 화면
   │
   ├── REST API로 이전 메시지 조회
   │
   └── Socket.IO 연결
          │
          ├── Redis Session 인증
          ├── 채팅방 참여자 검증
          └── Socket Room 입장
                    │
                    ▼
               message:send
                    │
                    ▼
              MongoDB 저장
                    │
                    ▼
               message:new
                    │
             ┌──────┴──────┐
             ▼             ▼
          사용자 A       사용자 B
```

## Read Flow

```text
메시지 화면 반영
   │
   ▼
message:read
   │
   ├── 사용자 인증
   ├── 채팅방 참여자 검증
   ├── 메시지 존재 여부 검증
   └── 기존 읽음 위치와 비교
              │
              ▼
ChatRoomMember.lastReadMessageId 갱신
```

이전 메시지에 대한 읽음 이벤트가 늦게 도착해도 현재 읽음 위치보다 과거라면 업데이트하지 않고 성공 처리합니다.

## Presence Flow

```text
사용자 화면 활성
   │
   ▼
presence:heartbeat
   │
   ▼
Redis
presence:{userUid}
TTL 갱신
   │
   ├── heartbeat 지속
   │      └── 온라인 유지
   │
   └── heartbeat 중단
          │
          ▼
       TTL 만료
          │
          ▼
Redis expired event
          │
          ▼
presence:update(false)
```

## Multi-Instance Socket Flow

```text
User A
  │
  ▼
NestJS #1
  │
  │ server.to(room).emit(...)
  ▼
Redis Adapter
  │
  │ Pub/Sub
  ▼
NestJS #2
  │
  ▼
User B
```

## Local Development

일반 개발 환경에서는 Next.js와 NestJS를 로컬에서 실행하고 PostgreSQL, MongoDB, Redis만 Docker에서 실행합니다.

```text
Host
├── Next.js (3000)
└── NestJS (3001)

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

DATABASE_URL=postgresql://realtime_chat:realtime_chat_password@postgres:5432/realtime_chat

MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=realtime_chat_mongo_password
MONGO_PORT=27017

MONGODB_URI=mongodb://root:realtime_chat_mongo_password@mongo:27017/realtime_chat?authSource=admin

REDIS_PASSWORD=realtime_chat_redis_password
REDIS_PORT=6379
```

`.env` 파일은 Git에 포함하지 않습니다.

로컬에서 NestJS를 직접 실행하는 경우 PostgreSQL과 MongoDB의 host는 `localhost`를 사용합니다.

Next.js에서는 API 서버 주소를 다음 환경변수로 사용합니다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

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

Docker Volume은 유지되므로 데이터는 삭제되지 않습니다.

DB 데이터를 포함하여 완전히 초기화하려면:

```bash
docker compose down -v
```

> `-v` 옵션을 사용하면 PostgreSQL, MongoDB, Redis 저장 데이터가 삭제됩니다.

## Multi-Instance Test

Socket.IO Redis Adapter를 검증하기 위한 별도의 Compose 파일을 사용합니다.

```text
docker-compose.multi-instance.yml
```

일반 인프라와 멀티 인스턴스 구성을 함께 실행합니다.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.multi-instance.yml \
  up -d --build
```

테스트 환경:

```text
Web A : 3000 → API A : 3001
Web B : 3003 → API B : 3002

API A ─┐
       ├── PostgreSQL
API B ─┼── MongoDB
       └── Redis
```

두 사용자를 서로 다른 API 인스턴스에 연결한 상태에서 다음 이벤트가 정상적으로 전달되는지 확인합니다.

```text
message:new
chat:list:update
presence:update
```

로그 확인:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.multi-instance.yml \
  logs -f api-a
```

종료:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.multi-instance.yml \
  down
```

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

컨테이너를 종료하거나 삭제해도 Volume을 명시적으로 삭제하지 않는 한 데이터는 유지됩니다.

## Test

API의 주요 비즈니스 로직은 Jest 기반 단위 테스트로 검증합니다.

전체 테스트:

```bash
cd apps/api
npm test
```

특정 테스트:

```bash
npm test -- chat.service.spec.ts
npm test -- messages.service.spec.ts
npm test -- presence.service.spec.ts
```

Coverage 확인:

```bash
npm test -- --coverage
```

Coverage 결과는 프로젝트의 모든 파일이 아닌 주요 비즈니스 로직 테스트를 중심으로 확인합니다.

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

- [x] 1:1 채팅방 생성
- [x] 친구 관계 검증
- [x] 기존 1:1 채팅방 재사용
- [x] 채팅방 목록 조회
- [x] Socket.IO 연결
- [x] Redis Session 기반 Socket 인증
- [x] 채팅방 참여자 검증 및 입장
- [x] 실시간 메시지 송수신
- [x] MongoDB 메시지 저장
- [x] 이전 메시지 조회
- [x] Cursor 기반 이전 메시지 Pagination
- [x] 채팅 스크롤 UX 처리

### Phase 5 - Improvements

- [x] 로그인 후 공통 Bottom Navigation
- [x] 친구 / 채팅 / 내 정보 화면 분리
- [x] 마지막 메시지 기반 채팅방 정렬
- [x] 읽지 않은 메시지 수
- [x] 메시지 읽음 처리
- [x] 사용자 접속 상태
- [x] 채팅방 목록 실시간 갱신
- [x] Socket.IO Redis Adapter
- [x] NestJS 다중 인스턴스 환경 테스트
- [x] 주요 비즈니스 로직 테스트 코드 작성

## Status

Docker 기반 PostgreSQL, MongoDB, Redis 개발 환경과 Prisma 기반 사용자, 친구 관계, 채팅방 스키마 구성이 완료되었습니다.

회원가입, 로그인, 로그아웃, Redis Session 기반 인증, 친구 코드 기반 친구 관계 기능을 구현했습니다.

친구 관계인 사용자 간 1:1 채팅방 생성과 기존 채팅방 재사용, Socket.IO 기반 실시간 메시지 송수신, MongoDB 기반 메시지 저장 및 Cursor Pagination을 구현했습니다.

사용자별 마지막 읽음 메시지를 기준으로 메시지 읽음 처리와 unread count를 구현했으며, 마지막 메시지 기반 채팅방 정렬과 실시간 채팅 목록 갱신을 적용했습니다.

Redis TTL 기반 Presence와 Socket.IO Redis Adapter를 적용했으며, 여러 NestJS 인스턴스 환경에서 서로 다른 인스턴스에 연결된 사용자 간 실시간 이벤트 전달을 검증했습니다.

ChatService, MessagesService, PresenceService의 주요 비즈니스 규칙에 대한 Jest 단위 테스트를 작성했습니다.
