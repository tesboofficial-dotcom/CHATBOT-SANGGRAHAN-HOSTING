require('dotenv').config();
const {Groq} = require('groq-sdk')
const {readDocs} = require('./ReadDocument')


async function ChatRespone(pertanyaan){
    const groq = new Groq({apiKey : process.env.GROQ_API_KEY})
    const text = await readDocs()
    
    try{
        const completion = await groq.chat.completions.create({
            messages : [
                {
                    role : "system",
                    content : `
Anda adalah asisten cerdas bernama "Tanya Sanggrahan" yang bertugas menjawab pertanyaan seputar Wilayah Sanggrahan secara akurat dan informatif, hanya berdasarkan isi dokumen resmi berikut:
 Penting: Jangan gunakan tanda bintang (*), markdown, atau format teks khusus. 
Jawaban harus berupa teks polos tanpa penekanan.

"""
${text}
"""

Jawablah pertanyaan dari pengguna dengan:
- Bahasa yang sopan dan mudah dipahami.
- Tetap fokus hanya pada informasi dalam dokumen.
- Jika pertanyaan tidak relevan dengan dokumen, jawab dengan: "Maaf, informasi tersebut tidak tersedia dalam dokumen yang saya miliki. Silahkan Kontak Ke Pengurus Kampung Kami"

Tugas Anda adalah membantu menjelaskan profil, sejarah, data wilayah, jumlah penduduk, batas wilayah, dan informasi geografis lainnya dari Kelurahan Semaki sesuai isi dokumen.
`
                },
                {
                    role : "user",
                    content : pertanyaan
                }
            ],
              model: "openai/gpt-oss-120b",  
        temperature: 0.3,  
        max_tokens: 1000, 
        top_p: 0.9,  
        frequency_penalty: 0.2,  
        presence_penalty: 0,  
        })

        const respone = completion.choices[0]?.message?.content || "tidak ada respone"
        return respone
    }catch(error){
        console.log(error)
        return "ada kesalahan sistem, sistem segera aktif kembali, mohon maaf atas kekecewaan anda"
    }

}

module.exports = {ChatRespone}