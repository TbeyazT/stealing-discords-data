***
# TbeyazT Storage (Discord Data Store)

A modern, dark-themed desktop application that utilizes Discord's server infrastructure as a "Cloud Storage" backend. Built with **Electron**, **React**, and **Discord.js**.

![Status](https://img.shields.io/badge/Status-Educational_Only-purple) ![License](https://img.shields.io/badge/License-MIT-blue)

![Overview](./photos/overview.png)

## 📂 Project Overview

This application allows you to upload files from your computer to a Discord server. Since Discord has a file size limit (usually 10MB for free users), this app **bypasses that limit** by splitting large files into small chunks.

### How it Works
1.  **Chunking:** When you select a file, the app splits it into **10MB chunks**.
2.  **Uploading:** A Discord bot uploads these chunks as attachments to a specific channel on your server.
3.  **Indexing:** The app saves a local `uploads.json` file containing the message IDs and metadata.
4.  **Downloading:** When you click download, the app fetches all the chunks from Discord, stitches them back together, and saves the original file to your disk.

---

## 🛠️ Required Modules & Tech Stack

This project relies on the following libraries. You can install them all at once using `npm`.

### Core Dependencies
*   **`electron`**: The framework to run web technologies as a desktop app.
*   **`react` / `react-dom`**: The UI library.
*   **`discord.js`**: To interact with the Discord API (send/receive files).
*   **`axios`**: To download the file streams from Discord's CDN.
*   **`dotenv`**: To manage security tokens.
*   **`framer-motion`**: For the smooth animations in the UI.
*   **`react-icons`**: For the UI icons (Cloud, HDD, etc.).

---

## 🚀 Installation & Setup

Follow these steps to get the project running locally.

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (Version 16 or higher recommended).
*   A Discord Account and a Server (Guild) where you have Admin rights.

### 2. Install Dependencies
Open your terminal in the project folder and run:

```bash
npm install
npm install framer-motion react-icons axios discord.js dotenv
```

### 3. Create a Discord Bot
1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Create a **New Application**.
3.  Go to the **Bot** tab and click **Add Bot**.
4.  **Important:** Scroll down to "Privileged Gateway Intents" and enable:
    *   `PRESENCE INTENT`
    *   `SERVER MEMBERS INTENT`
    *   `MESSAGE CONTENT INTENT`
5.  Copy your **Bot Token**.
6.  Invite the bot to your server with `Administrator` permissions.

### 4. Configuration
Create a file named `.env` in the root of your project folder. Add your bot token inside:

```env
TOKEN=your_discord_bot_token_here
GUILD_ID=your_guild_id
```

---

## 🏃‍♂️ How to Run

You need to run the React Server and the Electron process simultaneously.

**Option 1: Two Terminals (Easiest)**
1.  **Terminal 1:** Start React
    ```bash
    npm start
    ```
    *(Ignore the browser window if it opens).*

2.  **Terminal 2:** Start Electron
    ```bash
    npm run electron
    # OR
    npx electron .
    ```

**Option 2: Single Command (If configured)**
If you installed `concurrently`, you can add a script to package.json and run:
```bash
npm run dev
```

---

## ⚠️ Disclaimer & Terms of Service

**Please Read Carefully:**
This project is for **educational purposes only**. Using Discord as a file hosting service (hosting data not related to Discord communication) violates the [Discord Terms of Service](https://discord.com/terms).

*   **Risk:** Your bot or account could be banned by Discord.
*   **Usage:** Do not use this for critical data storage.
*   **Liability:** The creator of this code is not responsible for any data loss or account bans.

---

## 🎨 Features
*   **Great UI:** Glassmorphism design with deep purple aesthetics.
*   **Real-time Progress:** Visual progress bars for both uploads and downloads.
*   **Data Tracking:** Automatically calculates and displays total GB used.
*   **File Management:** Lists stored files with status indicators.
