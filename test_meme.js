const https = require('https');

https.get('https://meme-api.com/gimme', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            console.log('Meme API Response:', JSON.parse(data));
        } catch (e) {
            console.error('Failed to parse Meme API response:', data);
        }
    });
}).on('error', (err) => {
    console.error('Meme API Request Error:', err.message);
});
