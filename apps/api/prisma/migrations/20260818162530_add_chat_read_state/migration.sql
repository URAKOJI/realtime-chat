-- AlterTable
ALTER TABLE "chat_room_members" ADD COLUMN     "lastReadAt" TIMESTAMP(3),
ADD COLUMN     "lastReadMessageId" VARCHAR(24);
