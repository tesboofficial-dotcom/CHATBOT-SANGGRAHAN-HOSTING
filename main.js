require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const {startSock} = require('./indexqr')
const chokidar = require('chokidar')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

  function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
  }

async function downloadAuthFile(fileName) {
  const { data, error } = await supabase
    .storage
    .from("auth-bucket") 
    .download(fileName);

  if (error) throw error;

  const buffer = Buffer.from(await data.arrayBuffer());
  const content = buffer.toString("utf8");

  return JSON.parse(content);
}


async function uploadFile(localPath){
   try {
    const fileContent = fs.readFileSync(localPath);
    const remotePath = localPath.split("\\").pop();

    const { data, error } = await supabase.storage
      .from('auth-bucket')
      .upload(remotePath, fileContent, { upsert: true });

    if (error) throw error;
    console.log(`Uploaded: ${remotePath}`);
    return data;
  } catch (err) {
    console.error('Upload failed:', err.message);
  }
}

async function loadAuth() {
  if (!fs.existsSync("./auth_info_baileys")) {
    fs.mkdirSync("./auth_info_baileys");
  }

  const { data: files, error } = await supabase
    .storage
    .from("auth-bucket")
    .list("", { limit: 100 });

  if (error) throw error;

  console.log("Files found in bucket:", files);

  // Filter hanya file .json (atau ganti sesuai kebutuhanmu)
  const filteredFiles = files.filter(f => f.name.endsWith(".json"));

  for (let f of filteredFiles) {
    console.log("⬇️ Downloading:", f.name);
    const fileContent = await downloadAuthFile(f.name);

    fs.writeFileSync(
      `./auth_info_baileys/${f.name}`,
      JSON.stringify(fileContent, null, 2)
    );
  }

  console.log("✅ Semua file auth tersinkronisasi dari Supabase");
}


function watchAndUpload(){
  const watcher = chokidar.watch("./auth_info_baileys",{ignoreInitial : true})

  watcher.on('add',filePath => {
    console.log('file baru :' , filePath)
    uploadFile(filePath)
  })

   watcher.on('change',filePath => {
    console.log('file diubah :' , filePath)
    uploadFile(filePath)
  })


}

async function runBot(){
  await loadAuth()
  watchAndUpload()
  delay(4000)
  startSock()
}

runBot()
