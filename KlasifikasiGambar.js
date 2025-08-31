const axios = require('axios')
const FormData = require('form-data');
const { file } = require('googleapis/build/src/apis/file');
require('dotenv').config();
const {Groq} = require('groq-sdk')

async function uploadToFileIO(filePathOrBuffer, fileName = 'image.jpg') {
  const form = new FormData();
  const UploadCareAPI = process.env.UPLOADCARE_API

  form.append('UPLOADCARE_PUB_KEY', UploadCareAPI); 
  form.append('UPLOADCARE_STORE', '1'); 
  form.append('file', filePathOrBuffer, fileName); 

  const res = await axios.post('https://upload.uploadcare.com/base/', form, {
    headers: form.getHeaders()
  });

  const { file } = res.data;


  const cdnUrl = `https://ucarecdn.com/${file}/`;
  return await ImageCaption(cdnUrl)
}

async function ImageCaption(fileurl){
    const groq = new Groq({
      apiKey : process.env.GROQ_API_KEY
    });
     const chatCompletion = await groq.chat.completions.create({
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": `Tolong analisis gambar ini dan jawab dengan format berikut:

1. Apakah benda atau sampah ini termasuk 'berharga dan dapat dijual ulang' atau 'tidak berharga'?
2. Sebutkan apakah sampah ini termasuk organik, anorganik, atau B3.
3. Jelaskan secara singkat alasan kenapa benda ini berharga atau tidak, termasuk jika terdapat kode daur ulang (contoh: kode segitiga ♻️ dengan angka 1, 2, 5 menunjukkan plastik yang masih bisa digunakan ulang).

Jawab hanya dalam format seperti ini:

1. [Ya/Tidak] benda ini [berharga/tidak berharga]  
2. Jenis: [organik/anorganik/B3]  
3. Alasan: [alasan singkat tapi jelas, tambahkan edukasi kode jika ada]  

Jangan tambahkan informasi lain selain 3 poin itu.` },
          {
            "type": "image_url",
            "image_url": {
              "url": fileurl
            }
          }
        ]
      }
    ],
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "temperature": 1,
    "max_completion_tokens": 1024,
    "top_p": 1,
    "stream": false,
    "stop": null
  });

   const hasil =  chatCompletion.choices[0].message.content
   return hasil
}


module.exports = {uploadToFileIO}