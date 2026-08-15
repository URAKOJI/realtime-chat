-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "uid" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "friend_code" CHAR(8) NOT NULL,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_uid_key" ON "users"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_friend_code_key" ON "users"("friend_code");
