import { ChatInputCommandInteraction, SlashCommandBuilder, ThreadChannel } from 'discord.js';
import { Command } from '../interfaces/Command';
import ExtendedClient from '../classes/Client';
import prisma from '../services/prisma';
import config from '../config.json';
import { createInviteInteraction } from '../features/createInviteInteraction';

const command: Command = {
    global: false,
    options: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite members to an existing group')
        .addStringOption(option =>
            option.setName('group_name')
                .setDescription('Name of the group to invite to')
                .setRequired(true)
        ),
    async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction): Promise<void> {
        // Verify thread context
        if (!interaction.channel?.isThread()) {
            await interaction.reply({
                content: '❌ This command must be used in a group thread',
                ephemeral: true
            });
            return;
        }

        // Verify facilitator role
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        const isFacilitator = member?.roles.cache.some(role => role.name === config.moderation.moderatorRoleName);
        if (!isFacilitator) {
            await interaction.reply({
                content: '❌ You need the Facilitator role to use this command',
                ephemeral: true
            });
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // Get the specified group
            const groupName = interaction.options.getString('group_name', true);
            const group = await prisma.group.findFirst({
                where: {
                    name: groupName,
                    facilitator: { discordId: interaction.user.id }
                }
            });

            if (!group) {
                await interaction.editReply({
                    content: '❌ Group not found or you are not its facilitator'
                });
                return;
            }

            // Get recent messages and create invite interaction
            const messages = await (interaction.channel as ThreadChannel).messages.fetch({ limit: 100 });
            await createInviteInteraction(interaction, messages, group);

        } catch (error) {
            console.error('Invite command error:', error);
            await interaction.editReply({
                content: '❌ Failed to process invite command. Please try again.'
            });
        }
    }
};

export default command;