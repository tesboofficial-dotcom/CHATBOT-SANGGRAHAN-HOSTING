const axios = require('axios')
const FormData = require('form-data');
const {google} = require('googleapis')


const auth = new google.auth.GoogleAuth({
    credentials : JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/documents.readonly"]
})

const authSheet = new google.auth.GoogleAuth({
    credentials : JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_UPDATED),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
})



async function kirimAduan(caption,imageBuffer){
    const client = await authSheet.getClient()
    const sheet = google.sheets({version : "v4", auth : client})
    const time = new Date().toLocaleString("id-ID", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
}); 
    const spreadsheetId = "14xNxTRMvJshFJR_HV5SmGocFy7lPNtmQam9LdhTUeAI"
    const imageLink = await uploadImage(imageBuffer)
    const range = 'A2:C';


    await sheet.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody : {
            values : [[time,caption,imageLink]]
        }
    })

}

async function readDocs(){
    const id = '1qSvjRS1MsLSiVaiAjRmjOZFr_laEg89KNgqZSXnssas'
    const client = await auth.getClient()
    const docs = google.docs({version : "v1", auth : client})

    const res = await docs.documents.get({
        documentId : id
    })

    const content = res.data.body.content

    const text = content.map(el => el.paragraph?.elements?.map(e => e.textRun?.content).join("") || "")
    .join("\n");

    return text
}



async function uploadImage(filePathOrBuffer, fileName = 'image.jpg') {
  const form = new FormData();
  const uploadcareAPI = process.env.UPLOADCARE_API

  form.append('UPLOADCARE_PUB_KEY', uploadcareAPI); 
  form.append('UPLOADCARE_STORE', '1'); 
  form.append('file', filePathOrBuffer, fileName); 

  const res = await axios.post('https://upload.uploadcare.com/base/', form, {
    headers: form.getHeaders()
  });

  const { file } = res.data;


  const cdnUrl = `https://ucarecdn.com/${file}/`;
  return cdnUrl
}

async function lihatAduan(){
    const client = await authSheet.getClient()
    const spreadsheetId = "14xNxTRMvJshFJR_HV5SmGocFy7lPNtmQam9LdhTUeAI"
    const sheets = google.sheets({version : 'v4', auth : client})
    const range = 'A2:C'

    const respone = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
    })
    const allRows = respone.data.values || [];
    const last3 = allRows.slice(-3)
    return last3
}


module.exports = {readDocs,kirimAduan,lihatAduan}
