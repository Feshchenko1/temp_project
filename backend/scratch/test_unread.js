import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany({ take: 2 });
    if (users.length < 2) {
      console.log("Need at least 2 users for the test");
      return;
    }
    
    const userA = users[0];
    const userB = users[1];

    console.log(`User A: ${userA.fullName} (${userA.id})`);
    console.log(`User B: ${userB.fullName} (${userB.id})`);

    // 1. Find or create a chat
    let chat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: userA.id } } },
          { members: { some: { userId: userB.id } } }
        ]
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          isGroup: false,
          members: {
            create: [
              { userId: userA.id, role: "ADMIN" },
              { userId: userB.id, role: "MEMBER" }
            ]
          }
        }
      });
      console.log(`Created new chat: ${chat.id}`);
    } else {
      console.log(`Using existing chat: ${chat.id}`);
    }

    // 2. Create message from B to A (simulation)
    const msg = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userB.id,
        content: "Test unread message " + new Date().toISOString(),
        status: "SENT"
      }
    });

    console.log(`Created message ${msg.id} from User B to Chat ${chat.id}`);

    // 3. Check unread counts for A
    const unreadCounts = await prisma.message.groupBy({
      by: ["chatId"],
      where: {
        senderId: { not: userA.id },
        status: { not: "READ" },
        chatId: chat.id
      },
      _count: { id: true }
    });

    console.log("Unread counts for A in this chat:", unreadCounts);

    // 4. Mark as read for A
    const updateResult = await prisma.message.updateMany({
      where: {
        chatId: chat.id,
        senderId: { not: userA.id },
        status: { not: "READ" }
      },
      data: { status: "READ" }
    });

    console.log(`Marked ${updateResult.count} messages as read for User A`);

    // 5. Final check
    const finalCounts = await prisma.message.groupBy({
      by: ["chatId"],
      where: {
        senderId: { not: userA.id },
        status: { not: "READ" },
        chatId: chat.id
      },
      _count: { id: true }
    });

    if (finalCounts.length === 0) {
      console.log("SUCCESS: Final unread count is 0");
    } else {
      console.log("FAILURE: Unread counts still exist:", finalCounts);
    }
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
