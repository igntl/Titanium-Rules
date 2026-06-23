const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const fs = require('fs-extra');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ====== القيم ======
const TOKEN = process.env.TOKEN;
const TARGET_CHANNEL_ID = "1483164935436374096"; // روم الترشيحات
const LOG_CHANNEL_ID = "1514467163224801280"; // روم اللوحة

// الرتب
const CAPTAIN_ROLE_ID = "1487063117375602819";
const BEST_CAPTAIN_ROLE_ID = "1487063698303352923";
const BELT_ROLE_ID = "1496134224795799592";
const GREATEST_CAPTAIN_ROLE_ID = "1498335510358266006";

// رتبة التحكم بالنجوم
const STAR_MANAGER_ROLE_ID = "1490133596709584976";

// حد الترشيحات لكل رتبة
const ROLE_MAX = {
  [CAPTAIN_ROLE_ID]: 2,
  [BEST_CAPTAIN_ROLE_ID]: 3,
  [BELT_ROLE_ID]: 3,
  [GREATEST_CAPTAIN_ROLE_ID]: 4
};

const DATA_FILE = "./data.json";

function loadData() {
  return fs.readJsonSync(DATA_FILE);
}

function saveData(data) {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function getLeaderboard(data, guild) {
  const sorted = Object.entries(data.players)
    .sort((a, b) => b[1].stars - a[1].stars);

  let text = "🏆 **نجوم التقسيمات:**\n\n";

  if (sorted.length === 0) {
    text += "لا يوجد بيانات بعد.";
  } else {
    sorted.forEach(([id, info], i) => {
      const member = guild.members.cache.get(id);
      const name = member ? `<@${id}>` : `User(${id})`;
      text += `${i + 1}. ${name} — ${info.stars} ⭐\n`;
    });
  }

  return text;
}

async function updateLeaderboard() {
  const data = loadData();
  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  const guild = channel.guild;

  const content = getLeaderboard(data, guild);

  if (!data.leaderboardMessageId) {
    const msg = await channel.send(content);
    data.leaderboardMessageId = msg.id;
    saveData(data);
  } else {
    try {
      const msg = await channel.messages.fetch(data.leaderboardMessageId);
      await msg.edit(content);
    } catch {
      const msg = await channel.send(content);
      data.leaderboardMessageId = msg.id;
      saveData(data);
    }
  }
}

// ===== ترشيحات =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = loadData();

  // أوامر إضافة/حذف يدوي
  if (message.content.startsWith("!")) {
    const args = message.content.split(" ");
    const cmd = args[0].toLowerCase();

    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      message.delete().catch(() => {});
    }

    if (cmd === "!addstar") {
      if (!message.member.roles.cache.has(STAR_MANAGER_ROLE_ID)) return;

      const user = message.mentions.users.first();
      const amount = parseInt(args[2]) || 1;
      if (!user) return;

      if (!data.players[user.id]) data.players[user.id] = { stars: 0 };
      data.players[user.id].stars += amount;

      saveData(data);
      updateLeaderboard();

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      logChannel.send(`✅ ${message.author} أعطى ${user} ${amount} ⭐`);
      return;
    }

    if (cmd === "!removestar") {
      if (!message.member.roles.cache.has(STAR_MANAGER_ROLE_ID)) return;

      const user = message.mentions.users.first();
      const amount = parseInt(args[2]) || 1;
      if (!user || !data.players[user.id]) return;

      data.players[user.id].stars -= amount;
      if (data.players[user.id].stars < 0) data.players[user.id].stars = 0;

      saveData(data);
      updateLeaderboard();

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      logChannel.send(`⚠️ ${message.author} أزال ${amount} ⭐ من ${user}`);
      return;
    }
  }

  // التحقق من القناة المخصصة للترشيحات
  if (message.channel.id !== TARGET_CHANNEL_ID) return;

  const mentions = [...message.mentions.users.values()];
  if (mentions.length === 0) return;

  const memberRoles = message.member.roles.cache.map(r => r.id);
  let max = 2;

  for (const r of memberRoles) {
    if (ROLE_MAX[r]) {
      max = ROLE_MAX[r];
      break;
    }
  }

  if (mentions.length > max) {
    return message.reply(`ترشيحك لن يتم اعتماده بسبب ان ماعندك رتبة تسمح لك ترشح اكثر من ${max}`);
  }

  // إزالة التكرار
  const unique = [...new Set(mentions.map(u => u.id))];

  unique.forEach(id => {
    if (id === message.author.id) return; // منع ترشيح نفسه

    if (!data.players[id]) {
      data.players[id] = { stars: 0 };
    }

    // ✅ هنا: **أي عدد من الترشيحات مسموح**
    data.players[id].stars += 1;
  });

  saveData(data);
  updateLeaderboard();
});

client.login(TOKEN);
