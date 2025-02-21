import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import config from '../config.json';
import { GroupType } from '@prisma/client';
import { Command } from "../interfaces/Command";
import ExtendedClient from '../classes/Client';
import { createGroup } from '../services/groupServices';

export const command: Command = {
    global: true,
    options: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup a new support group')
        .addUserOption(option =>
            option.setName('facilitator')
                .setDescription('Group facilitator')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('group_name')
                .setDescription('Name for this group')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('first_session')
                .setDescription('First session date (YYYY-MM-DD)')
                .setRequired(true)
        ),
  async execute(client: ExtendedClient, interaction: ChatInputCommandInteraction): Promise<void> {
        // Verify thread context
        if (!interaction.channel?.isThread()) {
            interaction.reply({
                content: '❌ This command must be used in a group thread',
                ephemeral: true
            });
            return;
        }

        // Check if thread belongs to configured forums
        const parentId = interaction.channel?.parentId;
        const validForums = [config.threads["4weeksGroupThread"], config.threads["16weeksGroupThread"]];
        if (!parentId || !validForums.includes(parentId)) {
            interaction.reply({
                content: '❌ This thread is not in a valid group forum',
                ephemeral: true
            });
            return;
        }

        // Verify facilitator role
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        const isFacilitator = member?.roles.cache.some(role => role.name === config.moderation.moderatorRoleName);
        if (!isFacilitator) {
            interaction.reply({
                content: '❌ You need the Facilitator role to use this command',
                ephemeral: true,
            });
            return;
        }

        try {
            // Create group in database
            const group = await createGroup({
                name: interaction.options.getString('group_name', true),
                facilitatorId: interaction.options.getUser('facilitator', true).id,
                type: parentId === config.threads["4weeksGroupThread"] ? GroupType.FOUR_WEEKS : GroupType.SIXTEEN_WEEKS,
                firstSession: new Date(interaction.options.getString('first_session', true)),
            });

            await interaction.reply({
                content: `✅ Group **${interaction.options.getString('group_name', true)}** setup successfully!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Group setup error:', error);
            await interaction.reply({
                content: `❌ Failed to setup group. Please check the input format and try again.\n\n \`\`\`${error}\`\`\``,
                ephemeral: true
            });
        }
    }
};