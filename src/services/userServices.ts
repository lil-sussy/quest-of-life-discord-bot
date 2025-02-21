import prisma from "./prisma";


export async function findOrCreateUser(discordId: string) {
  const user = await prisma.user.findUnique({
    where: {
      discordId,
    },
  });

  if (!user) {
    await prisma.user.create({
      data: {
        discordId,
      },
    });
  }

  return user;
}
