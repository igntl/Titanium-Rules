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

// ====== عدل هذي القيم ======
const TOKEN = process.env.TOKEN;
const TARGET_CHANNEL_ID = "1483219896069525665"; // روم الترشيحات
const LOG_CHANNEL_ID = "1490286354175758366"; // روم اللوحة
// الرتب
const CAPTAIN_ROLE_ID = "1514077024044711936";
const BEST_CAPTAIN_ROLE_ID = "1514077091061043280";
const BELT_ROLE_ID = "1514077145448710234";
const GREATEST_CAPTAIN_ROLE_ID = "1514077221092855898";
// ===========================

const DATA_FILE = "./data.json";

// تعيين الحد الأقصى لكل رتبة
const ROLE_MAX = {
  [CAPTAIN_ROLE_ID]: 2,
  [BEST_CAPTAIN_ROLE_ID]: 3,
  [BELT_ROLE_ID]: 3,
  [GREATEST_CAPTAIN_ROLE_ID]: 4
};

function loadData() {
  return fs.readJsonSync(DATA_FILE);
}

function saveData(data) {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function getLeaderboard(data, guild) {
  const sorted = Object.entries(data.players)
    .sort((a, b) => b[1].stars - a[1].stars)
    .slice(0, 20);

  let text = "🏆 **نجوم التقسيمات:**\n\n";

  sorted.forEach(([id, info], i) => {
    const member = guild.members.cache.get(id);
    const name = member ? `<@${id}>` : `User(${id})`;
    text += `${i + 1}. ${name} — ${info.stars} ⭐\n`;
  });

  if (sorted.length === 0) {
    text += "لا يوجد بيانات بعد.";
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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const data = loadData();

  // ===== أوامر =====
  if (message.content.startsWith("!")) {
    const args = message.content.split(" ");
    const cmd = args[0].toLowerCase();

    // حذف الأمر مباشرة
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      message.delete().catch(() => {});
    }

    if (cmd === "!start") {
      data.enabled = true;
      saveData(data);
      return;
    }

    if (cmd === "!end") {
      data.enabled = false;

      const channel = await client.channels.fetch(LOG_CHANNEL_ID);
      const guild = channel.guild;

      const finalBoard = getLeaderboard(data, guild);
      await channel.send("🏆 **النتائج النهائية:**\n\n" + finalBoard);

      // reset
      data.players = {};
      data.leaderboardMessageId = null;

      saveData(data);
      return;
    }

    // ==== إضافة النجوم مباشرة
    if (cmd === "!addstar") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

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

    // ==== إزالة النجوم مباشرة
    if (cmd === "!removestar") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

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

  // ===== الترشيحات =====
  if (!data.enabled) return;
  if (message.channel.id !== TARGET_CHANNEL_ID) return;

  const mentions = [...message.mentions.users.values()];
  if (mentions.length === 0) return;

  // تحديد الحد الأقصى حسب رتبة العضو
  const memberRoles = message.member.roles.cache.map(r => r.id);
  let max = 2; // افتراضي للأعضاء العاديين
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
    if (id === message.author.id) return; // منع ترشيح نفسك

    if (!data.players[id]) {
      data.players[id] = { stars: 0 };
    }

    data.players[id].stars += 1;
  });

  saveData(data);
  updateLeaderboard();
});

client.login(TOKEN);
