let requestCount = 0;
const requestLimitPerMinute = 3;
const requestLimitPerDay = 200;
const resetTime = 60 * 1000; // 1 minute in milliseconds

async function generateResponse() {
    if (requestCount >= requestLimitPerMinute) {
        document.getElementById('response').innerText = 'You have exceeded the request limit per minute. Please wait before making more requests.';
        return;
    }

    requestCount++;
    setTimeout(() => {
        requestCount = Math.max(0, requestCount - 1);
    }, resetTime);

    const apiKey = 'YOUR API KEY'; // Replace with your actual API key
    const userPrompt = document.getElementById('prompt').value;
    const imageUrl = document.getElementById('imageUrl').value;

    try {
        if (userPrompt.toLowerCase().includes("generate image")) {
            const generatedImageUrl = await generateImageFromText(apiKey, userPrompt);
            document.getElementById('response').innerHTML = `<img src="${generatedImageUrl}" alt="Generated Image">`;
        } else if (imageUrl) {
            await processImageUrl(imageUrl, apiKey);
        } else {
            await handleTextAnalysis(apiKey, userPrompt, 'gpt-4');
        }
    } catch (error) {
        document.getElementById('response').innerText = `Error: ${error.message}`;
    }
}

async function processImageUrl(imageUrl, apiKey) {
    if (requestCount >= requestLimitPerMinute) {
        document.getElementById('response').innerText = 'You have exceeded the request limit per minute. Please wait before making more requests.';
        return;
    }

    requestCount++;
    setTimeout(() => {
        requestCount = Math.max(0, requestCount - 1);
    }, resetTime);

    try {
        //const imageBase64 = await convertImageUrlToBase64(imageUrl);
        const description = await describeImage(imageUrl, apiKey);
        document.getElementById('response').innerText = description;
    } catch (error) {
        document.getElementById('response').innerText = `Error: ${error.message}`;
    }
}

/*// Convert image URL to Base64
async function convertImageUrlToBase64(imageUrl) {
    try {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Use a CORS proxy
        const response = await fetch(proxyUrl + imageUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch image from URL');
        }
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        throw new Error(`Error converting image to Base64: ${error.message}`);
    }
}*/

// Describe image using Base64 data
async function describeImage(imageUrl, apiKey) {
    const endpoint = 'https://api.openai.com/v1/chat/completions'; // Replace with actual endpoint for GPT-4 with vision capabilities if different

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            prompt: `Describe the content of this image: ${imageUrl}`,
			model: 'gpt-4-turbo',
            n: 1,
            size: '512x512',
			messages: [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What’s in this image?"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": imageUrl
                            }
                        }
                    ]
                }
            ]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Handle text analysis with GPT-4
async function handleTextAnalysis(apiKey, inputText, model = 'gpt-4') {
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: inputText }
            ],
            max_tokens: 4096,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
            throw new Error("You have exceeded your API usage quota. Please check your plan and billing details.");
        } else {
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error.message}`);
        }
    }

    const data = await response.json();
    const gptResponse = data.choices[0].message.content;

    const analysisResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: `Analyze the following text:\n\n"${gptResponse}"\n\nProvide the sentiment, a summary, and bullet points of the key information.` }
            ],
            max_tokens: 4096,
            temperature: 0.7
        })
    });

    if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        if (analysisResponse.status === 429) {
            throw new Error("You have exceeded your API usage quota. Please check your plan and billing details.");
        } else {
            throw new Error(`HTTP error! status: ${analysisResponse.status}, message: ${errorData.error.message}`);
        }
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices[0].message.content;

    const [sentiment, summary, ...bulletPoints] = analysisText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const responseElement = document.getElementById('response');
    responseElement.innerHTML = `
        <p>${gptResponse}</p>
        <p>${sentiment}</p>
        <p>${summary}</p>
        <p><strong>Bullet Points:</strong></p>
        <ul>${bulletPoints.map(point => `<li>${point}</li>`).join('')}</ul>
    `;
}
async function convertImageUrlToBase64(imageUrl) {
    const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://cors.bridged.cc/'
    ];

    for (const proxy of proxies) {
        try {
            const response = await fetch(proxy + encodeURIComponent(imageUrl));
            if (!response.ok) {
                throw new Error('Failed to fetch image from URL');
            }

            const text = await response.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('Failed to parse JSON from proxy response');
            }

            if (!data.contents) {
                throw new Error('No image contents found in proxy response');
            }

            const imageResponse = await fetch(data.contents);
            if (!imageResponse.ok) {
                throw new Error('Failed to fetch image from contents URL');
            }

            const imageBlob = await imageResponse.blob();
            const reader = new FileReader();

            return new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imageBlob);
            });
        } catch (error) {
            console.error(`Error using proxy ${proxy}: ${error.message}`);
            // Try the next proxy
        }
    }

    throw new Error('Failed to convert image to Base64 after using all proxies');
}



async function generateImageFromText(apiKey, prompt) {
    const endpoint = 'https://api.openai.com/v1/images/generations';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            prompt: prompt,
            n: 1,
            size: '512x512',
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.data[0].url;
}
