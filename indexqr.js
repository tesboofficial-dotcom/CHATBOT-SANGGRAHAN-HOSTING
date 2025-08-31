const { makeWASocket, useMultiFileAuthState, DisconnectReason,downloadMediaMessage } = require("@whiskeysockets/baileys")
const qrcode = require('qrcode-terminal')
const {ChatRespone} = require('./chatbot')
const {kirimAduan} = require('./ReadDocument')
const {lihatAduan} = require('./ReadDocument')
const {uploadToFileIO} = require('./KlasifikasiGambar')

async function startSock() {
  function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
  }

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys")

  const sock = makeWASocket({
    auth: state,
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, isNewLogin, qr }) => {
    if (qr) {
     qrcode.generate(qr,{small : true})
    }

    if (connection === "open") {
      console.log("✅ Koneksi berhasil!")
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log("❌ Koneksi tertutup. Reconnect?", shouldReconnect)
      if (shouldReconnect) startSock()
    }
  })

  // KODE MULAI DARI SINI

  const userState = new Map()

 sock.ev.on("messages.upsert", async ({ messages, type }) => {

  const msg = messages[0];
  const tipe = Object.keys(msg.message || {})[0]
  if (!msg.message || msg.key.fromMe) return;
  if (type !== "notify") return;
 const sender = msg.key.remoteJid;
  const isGroup = sender.endsWith("@g.us"); 
  const isBroadcast = sender === "status@broadcast"; 
  if (isGroup || isBroadcast) return;
  const body = msg.message.conversation || msg.message.extendedTextMessage?.text.trim();
  console.log("Pesan masuk dari", sender, ":", body);

  const inCekSampah = userState.get(sender) === "CEKSAMPAH"
  const inMenu = userState.get(sender) === "MENUWARGA"
  const inChatbot = userState.get(sender) === "CHATBOT"
  const inTambahAduan = userState.get(sender) === "TAMBAHADUAN"

  // DIDALAM MENU

  if(inMenu){

     if(body === "1"){
     userState.set(sender,"CEKSAMPAH")
     await sock.sendMessage(sender,{
      text : "Silahkan Kirimkan Gambar Sampah"
     })
     return
    }

     if(body === "2"){
     userState.set(sender,"TAMBAHADUAN")
     await sock.sendMessage(sender,{
      text : "Silahkan Kirimkan Gambar Dan Beri Penjelasan"
     })
     return
    }

    if(body === "3"){
     await sock.sendMessage(sender,{
      text : "Ini Adalah Aduan Terbaru Warga"
     })
     ambilAduan()
     return
    }

      if(body === "5"){
        const user = msg.pushName || "Warga Sanggrahan"
     await sock.sendMessage(sender,{
      text : `hai ${user} `
     })
     return
    }

    if(body === "4"){
      userState.delete(sender)
      ngulang()
      return
    }

       await sock.sendMessage(sender, {
      text : `🙌 Halo Warga Sanggrahan!
Mau cari informasi apa hari ini? Silakan pilih menu di bawah ini:

1️⃣ Cek Nilai Ekonomi Sampah ♻️
2️⃣ Kirim Aduan atau Keluhan 📢
3️⃣ Lihat Aduan Terbaru 📝
4️⃣ Kembali ke Menu Utama 🔙

Ketik 1, 2, 3, atau 4 untuk melanjutkan ya! 👍
      `
    })
    return
  }

  // DIDALAM MENU > CEK JENIS SAMPAH 

  if(inCekSampah){
    
    if(typeof body === "string" && body.toLowerCase() === "keluar"){
      userState.set(sender,"MENUWARGA")
      ngulangMenu()
      return
    }
    if(tipe !== "imageMessage"){
      sock.sendMessage(sender,{
        text : "Silahkan Kirimkan Gambar Sampah"
      })
      return
    }else{
      await sock.sendPresenceUpdate("composing",sender)
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {logger : console}
      )
      const hasil = await uploadToFileIO(buffer)
      await sock.sendPresenceUpdate("paused",sender)
      await sock.sendMessage(sender,{
        text : `
♻️ *Hasil Analisis Jenis Sampah Anda:*

${hasil}

✅ Jika hasil ini sesuai, terima kasih sudah berkontribusi menjaga lingkungan!

🔄 Ingin cek lagi? Kirimkan gambar lainnya.
❌ Ketik *keluar* untuk kembali ke menu utama.
`
      })
      return
    }


  }


  // DIDALAM MENU > TAMBAHKAN ADUAN

  if (inTambahAduan){
     if(typeof body === "string" && body.toLowerCase() === "keluar"){
      userState.set(sender,"MENUWARGA")
      ngulangMenu()
      return
    }
    if(tipe !== "imageMessage"){
      sock.sendMessage(sender,{
        text : "Silahkan Kirimkan Gambar Dan Beri Penjelasan"
      })
       sock.sendMessage(sender,{
        text : "Ketik *keluar* jika ingin kembali"
      })
      return
    }else{

    const caption = msg.message.imageMessage?.caption || "";
    if (!caption.trim()) {
      sock.sendMessage(sender, {
        text: "Silahkan beri penjelasan pada gambar"
      });
      return;
    }

      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {logger : console}
      )
      await sock.sendPresenceUpdate("composing",sender)
      kirimAduan(caption,buffer)
      await delay(2000)
      sock.sendPresenceUpdate("paused",sender)
      await sock.sendMessage(sender,{
        text : "Berhasil Kirim Aduan"
      })
      await sock.sendMessage(sender,{
        text : "Ketik *keluar* jika tidak ingin kirim aduan lagi"
      })
      return
  }
}

// DIDALAM MENU > LIHAT ADUAN

async function ambilAduan() {
    const hasil = await lihatAduan()
      await sock.sendPresenceUpdate("composing", sender);
    for (const [waktu, caption, fotoUrl] of hasil){
      await sock.sendMessage(sender,{
        image : {url : fotoUrl},
         caption: `🕒 ${waktu}\n📢 ${caption}`,
      })
    
     await delay(1000);
    await sock.sendPresenceUpdate("paused", sender);
    }
    ngulangMenu()
  }

  // DIDALAM CHATBOT
  if (inChatbot){

    if (typeof body === "string" && body.toLowerCase() === "keluar"){
      userState.delete(sender)
      ngulang()
      return
    }else{
      await sock.sendPresenceUpdate("composing",sender)
      await delay(2000);
      const respone = await ChatRespone(body)
      await sock.sendPresenceUpdate("pause",sender)
      await sock.sendMessage(sender,{ 
        text : respone
      })
      return
    }

  }


  if(body === "1"){
    userState.set(sender,"MENUWARGA")
        await sock.sendMessage(sender, {
      text : 
   `🙌 Halo Warga Sanggrahan!
Mau cari informasi apa hari ini? Silakan pilih menu di bawah ini:

1️⃣ Cek Nilai Ekonomi Sampah ♻️
2️⃣ Kirim Aduan atau Keluhan 📢
3️⃣ Lihat Aduan Terbaru 📝
4️⃣ Kembali ke Menu Utama 🔙

Ketik 1, 2, 3, atau 4 untuk melanjutkan ya! 👍
      `
    })
    return
  }

   if(body === "2"){
    userState.set(sender,"CHATBOT")
      await sock.sendMessage(sender, {
  text: `
👋 *Hai! Kamu sudah terhubung dengan Asisten Pintar Sanggrahan.*

Silakan tanyakan apa saja seputar kampung kami — mulai dari informasi umum, jadwal rutin ,tempat penting, kontak penting hingga program yang sedang berjalan.
`
});

await sock.sendMessage(sender, {
  text: `
❌ Ketik *keluar* kapan saja jika sudah tidak ada yang ingin ditanyakan.  
Aku siap membantu 24/7! 😊
`
});
    return
  }


  // PESAN UTAMA
  await sock.sendMessage(sender,{
    text : `👋 Halo! Selamat datang di Asisten Sanggrahan!
Saya siap membantu kamu 24 jam 💬✨

Silakan pilih salah satu menu di bawah ini:

1️⃣ Saya Warga Kampung Sanggrahan
2️⃣ Ngobrol dengan Asisten Pintar 🤖

Ketik saja 1 atau 2 untuk melanjutkan ya! ✅
`
  })


  async function ngulang() {
    await sock.sendMessage(sender,{
    text : `👋 Halo! Selamat datang di Asisten Sanggrahan!
Saya siap membantu kamu 24 jam 💬✨

Silakan pilih salah satu menu di bawah ini:

1️⃣ Saya Warga Kampung Sanggrahan
2️⃣ Ngobrol dengan Asisten Pintar 🤖

Ketik saja 1 atau 2 untuk melanjutkan ya! ✅
`
  })
  }

  async function ngulangMenu() {
    await sock.sendMessage(sender,{
     text : `🙌 Halo Warga Sanggrahan!
Mau cari informasi apa hari ini? Silakan pilih menu di bawah ini:

1️⃣ Cek Nilai Ekonomi Sampah ♻️
2️⃣ Kirim Aduan atau Keluhan 📢
3️⃣ Lihat Aduan Terbaru 📝
4️⃣ Kembali ke Menu Utama 🔙

Ketik 1, 2, 3, atau 4 untuk melanjutkan ya! 👍
      `
  })
  }

});
}

module.exports={startSock}
