require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔒 حط ايدي الروم هنا
const CHANNEL_ID = '1483219896069525665';

// ⚽ الأندية
const clubs = [
  { label: 'Barcelona', value: 'barca', emoji: '<:barca:ID>', color: 0x004D98 },
  { label: 'Real Madrid', value: 'madrid', emoji: '<:madrid:ID>', color: 0xFFFFFF },
  { label: 'Liverpool', value: 'liverpool', emoji: '<:liverpool:ID>', color: 0xC8102E },
  { label: 'Manchester United', value: 'united', emoji: '<:united:ID>', color: 0xDA291C },
  { label: 'Manchester City', value: 'city', emoji: '<:city:ID>', color: 0x6CABDD },
  { label: 'Chelsea', value: 'chelsea', emoji: '<:chelsea:ID>', color: 0x034694 },
  { label: 'Arsenal', value: 'arsenal', emoji: '<:arsenal:ID>', color: 0xEF0107 },
  { label: 'PSG', value: 'psg', emoji: '<:psg:ID>', color: 0x004170 },
  { label: 'Bayern Munich', value: 'bayern', emoji: '<:bayern:ID>', color: 0xDC052D },
  { label: 'Juventus', value: 'juve', emoji: '<:juve:ID>', color: 0x000000 },

  { label: 'Al Nassr', value: 'nassr', emoji: '<:nassr:ID>', color: 0xFCD116 },
  { label: 'Al Hilal', value: 'hilal', emoji: '<:hilal:ID>', color: 0x0033A0 },
  { label: 'Al Ittihad', value: 'ittihad', emoji: '<:ittihad:ID>', color: 0xFFCC00 },
  { label: 'Al Ahli', value: 'ahli', emoji: '<:ahli:ID>', color: 0x006C35 }
];

// 🧠 إنشاء الرول تلقائي
async function getOrCreateRole(guild, club) {
  let role = guild.roles.cache.find(r => r.name === club.label);

  if (!role) {
    role = await guild.roles.create({
      name: club.label,
      color: club.color,
      reason: 'Club role created by bot'
    });
  }

  return role;
}

// ✅ تشغيل البوت
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 📩 أمر !clubs
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.channel.id !== CHANNEL_ID) return;

  if (msg.content === '!clubs') {

    const embed = new EmbedBuilder()
      .setTitle('⚽ اختر ناديك')
      .setDescription('تقدر تختار أكثر من نادي 👇')
      .setColor('#2b2d31');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('clubs_select')
      .setPlaceholder('اختار أنديتك')
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions(
        clubs.map(c => ({
          label: c.label,
          value: c.value,
          emoji: c.emoji
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await msg.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
});

// 🎮 التفاعل مع الاختيار
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const member = interaction.member;
  const selected = interaction.values;

  for (const value of selected) {
    const club = clubs.find(c => c.value === value);
    if (!club) continue;

    const role = await getOrCreateRole(interaction.guild, club);

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
    } else {
      await member.roles.add(role);
    }
  }

  await interaction.reply({
    content: '✅ تم تحديث أنديتك',
    ephemeral: true
  });
});

client.login(process.env.TOKEN);
