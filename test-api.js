const fs = require('fs');
const path = require('path');

async function testApi() {
    try {
        const imagePath = 'C:/Users/Djodjo.Nkouka.ERICCOLE/.gemini/antigravity/brain/4eb02bb6-94ad-422a-ad45-1f07ff945f85/uploaded_image_1763561111001.png';

        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            console.error('Test image not found:', imagePath);
            return;
        }

        const formData = new FormData();
        const fileBuffer = fs.readFileSync(imagePath);
        const blob = new Blob([fileBuffer], { type: 'image/png' });
        formData.append('image', blob, 'test_image.png');

        console.log('Sending request to API...');
        const response = await fetch('http://localhost:3000/api/building-surveyor/demo', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json();
        console.log('API Success! Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testApi();
