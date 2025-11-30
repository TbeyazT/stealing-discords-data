require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const process = require("process")
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const { log } = require('console');
const { text } = require('stream/consumers');

let mainWindow;
const UPLOADS_FILE = path.join(__dirname, 'uploads.json');
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

if (!fs.existsSync(UPLOADS_FILE)) {
  fs.writeFileSync(UPLOADS_FILE, JSON.stringify([]));
}

function saveUploadedFile(file) {
  let uploads = [];

  if (fs.existsSync(UPLOADS_FILE)) {
    try {
      const fileContent = fs.readFileSync(UPLOADS_FILE, 'utf8');
      uploads = fileContent ? JSON.parse(fileContent) : [];
    } catch (err) {
      console.error(`Error reading or parsing ${UPLOADS_FILE}:`, err);
      uploads = [];
    }
  }

  const existingIndex = uploads.findIndex((upload) => upload.fileName === file.fileName);
  if (existingIndex !== -1) {
    uploads[existingIndex] = file;
  } else {
    uploads.push(file);
  }

  fs.writeFileSync(UPLOADS_FILE, JSON.stringify(uploads, null, 2));
}

async function uploadFile(filePath, guild, eventId) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileName = path.basename(filePath);
  const totalChunks = Math.ceil(fs.statSync(filePath).size / CHUNK_SIZE);

  console.log(`Uploading file: ${fileName} (${totalChunks} chunks)`);

  let uploadChannel = guild.channels.cache.find((c) => c.name === `upload-${fileName}`);
  if (!uploadChannel) {
    uploadChannel = await guild.channels.create({
      name: `upload-${fileName.replace(/\s+/g, '-').toLowerCase()}`,
      type: ChannelType.GuildText,
    });
  }

  const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
  const messageIds = [];
  let chunkIndex = 0;

  for await (const chunk of stream) {
    chunkIndex++;

    const chunkFileName = `${fileName}.part${String(chunkIndex).padStart(4, '0')}`;

    const message = await uploadChannel.send({
      content: `Uploading chunk: ${chunkFileName}`,
      files: [{ name: chunkFileName, attachment: chunk }],
    });

    messageIds.push(message.id);
    mainWindow.webContents.send('upload-progress', {
      eventId,
      progress: (chunkIndex / totalChunks) * 100,
    });
  }

  saveUploadedFile({
    fileName,
    fileSize: fs.statSync(filePath).size,
    status: 'uploaded',
    channelId: uploadChannel.id,
    messageIds,
  });

  mainWindow.webContents.send('upload-complete', { eventId, fileName });
  //await fetchUsedData();
}

async function fetchAllMessages(channel) {
  let messages = [];

  let message = await channel.messages
    .fetch({ limit: 1 })
    .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

  while (message) {
    await channel.messages
      .fetch({ limit: 100, before: message.id })
      .then(messagePage => {
        messagePage.forEach(msg => messages.push(msg));

        message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      });
  }

  return messages;
}

async function downloadFile(fileName, guild, eventId) {
  // Retrieve file details from uploads.json
  const uploads = JSON.parse(fs.readFileSync(UPLOADS_FILE));
  const fileDetails = uploads.find((upload) => upload.fileName === fileName);

  if (!fileDetails || !fileDetails.channelId || !fileDetails.messageIds) {
    throw new Error(`No message IDs or channel ID found for file: ${fileName}`);
  }

  const downloadChannel = guild.channels.cache.get(fileDetails.channelId);
  if (!downloadChannel) {
    throw new Error(`Channel not found for file: ${fileName}`);
  }

  const saveFolder = path.join(__dirname, 'downloads');
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder);
  }

  const originalFilePath = path.join(saveFolder, fileName);
  const writeStream = fs.createWriteStream(originalFilePath);

  const messageIds = fileDetails.messageIds;
  let chunkIndex = 0;
  const totalChunks = messageIds.length;

  for (const messageId of messageIds) {
    chunkIndex++;
    const message = await downloadChannel.messages.fetch(messageId);

    const attachment = message.attachments.first();
    if (!attachment) {
      throw new Error(`No attachment found for message ID: ${messageId}`);
    }

    const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
    writeStream.write(Buffer.from(response.data));

    mainWindow.webContents.send('download-progress', {
      eventId,
      progress: (chunkIndex / totalChunks) * 100,
    });
  }

  writeStream.end();

  mainWindow.webContents.send('download-complete', {
    eventId,
    fileName,
    filePath: originalFilePath,
  });
}

ipcMain.handle('fetch-used-data', async () => {
  try {
    if (!fs.existsSync(UPLOADS_FILE)) {
      return '0.00';
    }

    const uploads = JSON.parse(fs.readFileSync(UPLOADS_FILE, 'utf8') || '[]');
    const totalDataUsed = uploads.reduce(
      (acc, upload) => acc + (upload.fileSize || 0), 
      0
    );

    mainWindow.webContents.send("total-data-used", (totalDataUsed / 1024 / 1024 / 1024).toFixed(2));
  } catch (error) {
    console.error('Error calculating total data used:', error);
    mainWindow.webContents.send("total-data-used", "0.00");
  }
});

ipcMain.handle('start-upload', async (event, { filePath }) => {
  try {
    if (!filePath) {
      throw new Error('File name or content is missing');
    }

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) throw new Error('Guild not found');

    const eventId = Date.now();
    await uploadFile(filePath, guild, eventId);
  } catch (error) {
    console.error(error);
    mainWindow.webContents.send('upload-error', { error: error.message });
  }
});

ipcMain.handle("log",async(event,Text) => {
  console.log(Text);
})

ipcMain.handle('start-download', async (event, { fileName }) => {
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) throw new Error('Guild not found');
    const eventId = Date.now();
    await downloadFile(fileName, guild, eventId);
  } catch (error) {
    mainWindow.webContents.send('download-error', { error: error.message });
  }
});

ipcMain.handle('fetch-uploads', () => {
  const uploads = JSON.parse(fs.readFileSync(UPLOADS_FILE));
  mainWindow.webContents.send('uploads-list', uploads);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    autoHideMenuBar:true
  });
  mainWindow.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  createWindow();
  client.login(process.env.TOKEN);
});