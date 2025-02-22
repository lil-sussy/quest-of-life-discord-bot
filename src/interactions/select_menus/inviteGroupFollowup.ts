import { AnySelectMenuInteraction, Client } from 'discord.js';
import prisma from '../../services/prisma';
import config from '../../config.json';

const selectMenu = {
    name: 'inviteGroupFollowup',
    execute: async (client: Client, interaction: AnySelectMenuInteraction) => {
        // Verify facilitator role
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        const isFacilitator = member?.roles.cache.some(role => role.name === config.moderation.moderatorRoleName);

        if (!isFacilitator) {
            return interaction.reply({
                content: '❌ You need the Facilitator role to use this feature',
                ephemeral: true
            });
        }

        try {
            // Get the group from the database
            const group = await prisma.group.findFirst({
                where: {
                    id: interaction.customId.split('_')[1] // Storing group ID in customId
                },
                include: { members: true }
            });

            if (!group) {
                return interaction.reply({
                    content: '❌ Group not found',
                    ephemeral: true
                });
            }

            // Add selected members to the group
            const selectedIds = interaction.values;
            await prisma.group.update({
                where: { id: group.id },
                data: {
                    members: {
                        connect: selectedIds.map(id => ({ discordId: id }))
                    }
                }
            });

            await interaction.reply({
                content: `✅ Successfully added ${selectedIds.length} members to the group!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Member addition error:', error);
            await interaction.reply({
                content: '❌ Failed to add members. Please try again.',
                ephemeral: true
            });
        }
    }
};

export default selectMenu;