require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

// 🧠 إنشاء البوت
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🎯 هذا الروم فقط يشتغل فيه البوت
const CHANNEL_ID = '1483219896069525665';

// ⚽ قائمة الأندية (تقدر تعدلها)
const clubs = [
  { label: 'Barcelona', value: 'barca', color: 0x004D98 },
  { label: 'Real Madrid', value: 'madrid', color: 0xFFFFFF },
  { label: 'Liverpool', value: 'liverpool', color: 0xC8102E },
  { label: 'Manchester United', value: 'united', color: 0xDA291C },
  { label: 'Manchester City', value: 'city', color: 0x6CABDD },
  { label: 'Chelsea', value: 'chelsea', color: 0x034694 },
  { label: 'Arsenal', value: 'arsenal', color: 0xEF0107 },
  { label: 'PSG', value: 'psg', color: 0x004170 },

  { label: 'Al Nassr', value: 'nassr', color: 0xFCD116 },
  { label: 'Al Hilal', value: 'hilal', color: 0x0033A0 },
  { label: 'Al Ittihad', value: 'ittihad', color: 0xFFCC00 },
  { label: 'Al Ahli', value: 'ahli', color: 0x006C35 }
];

// 🧠 دالة: تجيب الرول أو تنشئه إذا مو موجود
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

// ✅ لما البوت يشتغل
client.once('ready', () => {
  console.log(`✅ البوت شغال: ${client.user.tag}`);
});

// 📩 أمر !clubs
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  // ❗ يشتغل فقط في هذا الروم
  if (msg.channel.id !== CHANNEL_ID) return;

  if (msg.content === '!clubs') {

    // 🎨 شكل الرسالة
    const embed = new EmbedBuilder()
      .setTitle('⚽ اختر ناديك المفضل')
      .setDescription('تقدر تختار أكثر من نادي من القائمة 👇')
      .setColor('#5865F2');

    // 📋 القائمة
    const menu = new StringSelectMenuBuilder()
      .setCustomId('clubs_select')
      .setPlaceholder('اضغط هنا واختر ناديك')
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions(
        clubs.map(club => ({
          label: club.label,
          value: club.value
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await msg.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
});

// 🎮 لما المستخدم يختار
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const member = interaction.member;

  for (const value of interaction.values) {
    const club = clubs.find(c => c.value === value);
    if (!club) continue;

    const role = await getOrCreateRole(interaction.guild, club);

    // 🔄 إذا عنده الرول يشيله، إذا لا يعطيه
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
    } else {
      await member.roles.add(role);
    }
  }

  await interaction.reply({
    content: '✅ تم تحديث الأندية حقك',
    ephemeral: true
  });
});

// 🔐 تسجيل الدخول
client.login(process.env.TOKEN);
