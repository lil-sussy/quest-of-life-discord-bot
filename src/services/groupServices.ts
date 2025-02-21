import prisma from "./prisma";
import { GroupType } from "@prisma/client";
import { findOrCreateUser } from "./userServices";

export interface Group {
	name: string;
	facilitatorId: string;
	type: GroupType;
	firstSession: Date;
}

export async function createGroup(group: Group) {
  const facilitator = await findOrCreateUser(group.facilitatorId);
  const existingGroup = await prisma.group.findFirst({
    where: {
      facilitatorId: group.facilitatorId,
    },
  });

  if (existingGroup) {
    throw new Error("Group already exists");
  }

	return await prisma.group.create({
		data: {
			type: group.type,
			sessions: [group.firstSession],
			members: {
				connect: [
					{
						discordId: group.facilitatorId,
					},
				],
			},
			facilitator: {
				connect: {
					discordId: group.facilitatorId,
				},
			},
		},
	});
}
