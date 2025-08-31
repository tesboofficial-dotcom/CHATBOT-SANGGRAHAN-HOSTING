require("dotenv").config()

const fs = require("fs")
const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const localPath = "./dummy.txt"; // file dummy lokal
const remotePath = "dummy.txt"; // nama file di Supabase Storage

async function uploadFile() {
  try {
    const fileContent = fs.readFileSync(localPath);
    const { data, error } = await supabase.storage
      .from("auth-bucket")
      .upload(remotePath, fileContent, { upsert: true });

    if (error) throw error;
    console.log(`✅ Uploaded: ${remotePath}`);
    return data;
  } catch (err) {
    console.error("❌ Upload failed:", err.message);
  }
}

fs.writeFileSync(localPath, "Hello, ini file dummy untuk testing upload 🚀");
uploadFile();
