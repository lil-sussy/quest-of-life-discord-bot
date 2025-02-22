import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder, ThreadChannel, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import config from '../config.json';
import { GroupType } from '@prisma/client';
import { Command } from "../interfaces/Command";
import ExtendedClient from '../classes/Client';
import { createGroup } from '../services/groupServices';
import { createInviteInteraction } from '../features/createInviteInteraction';

const command: Command = {
    global: false,
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
        const parentId = (interaction.channel as ThreadChannel).parentId;
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
            interaction.deferReply({ ephemeral: true });
            const group = await createGroup({
                name: interaction.options.getString('group_name', true),
                facilitatorId: interaction.options.getUser('facilitator', true).id,
                type: parentId === config.threads["4weeksGroupThread"] ? GroupType.FOUR_WEEKS : GroupType.SIXTEEN_WEEKS,
                firstSession: new Date(interaction.options.getString('first_session', true)),
            });

            // Get recent thread participants (last 100 messages)
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            await createInviteInteraction(interaction, messages, group);

        } catch (error) {
            console.error('Group setup error:', error);
            await interaction.editReply({
                content: `❌ Failed to setup group. Please check the input format and try again.\n\n \`\`\`${error}\`\`\``,
            });
        }
    }
};
export default command;