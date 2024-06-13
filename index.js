// /path/to/your/project/bot.js

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = createAudioPlayer();
let connection;
let idleTimeout;

const commands = [
  {
    name: 'play',
    description: 'Plays a song from YouTube',
    options: [
      {
        name: 'query',
        type: 3, // String type
        description: 'The name or URL of the song',
        required: true,
      },
    ],
  },
  {
    name: 'stop',
    description: 'Stops the music',
  },
  {
    name: 'resume',
    description: 'Resumes the music',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, member, guild, channel } = interaction;

  if (commandName === 'play') {
    const query = options.getString('query');
    if (member.voice.channel) {
      if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
        connection = joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
        });

        connection.subscribe(player);
        clearTimeout(idleTimeout);
        startIdleTimer();
      }

      const video = await findVideo(query);
      if (video) {
        const stream = ytdl(video.url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        player.play(resource);
        await interaction.reply(`Now playing: ${video.title}`);
      } else {
        await interaction.reply('No video found for your query.');
      }
    } else {
      await interaction.reply('You need to be in a voice channel to use this command.');
    }
  } else if (commandName === 'stop') {
    player.stop();
    await interaction.reply('Stopped the music.');
  } else if (commandName === 'resume') {
    player.unpause();
    await interaction.reply('Resumed the music.');
  }
});

player.on(AudioPlayerStatus.Idle, startIdleTimer);

function startIdleTimer() {
  if (connection) {
    idleTimeout = setTimeout(() => {
      connection.destroy();
    }, 10000); // 10 seconds
  }
}

async function findVideo(query) {
  const result = await ytSearch(query);
  return result.videos.length > 0 ? result.videos[0] : null;
}

client.login(process.env.DISCORD_TOKEN);
