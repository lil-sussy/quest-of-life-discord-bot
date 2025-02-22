import { ChatInputCommandInteraction, Message, StringSelectMenuBuilder, ActionRowBuilder, Collection } from 'discord.js';
import { Group } from '@prisma/client';

export const createInviteInteraction = async (interaction: ChatInputCommandInteraction, messages: Collection<string, Message<true>>, group: Group) => {
  const participants = messages
    .map(m => m.author)
    .filter(a => !a.bot && a.id !== interaction.user.id)
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .slice(0, 7); // Discord select menu max 25 options, using 7 as requested

  if (participants.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`inviteGroupFollowup`)
      .setPlaceholder('Select members to add to the group, if one is not visible, you can add them later')
      .setMinValues(1)
      .setMaxValues(participants.length)
      .addOptions(participants.map(p => ({
        label: `${p.displayName}#${p.username}`,
        value: p.id
      })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({
      content: `✅ Would you like to add members to the group?`,
      components: [row],
    });
  } else {
    await interaction.editReply({
      content: `⚠️ No recent members found to invite. You can manually add members later.`
    });
  }
};