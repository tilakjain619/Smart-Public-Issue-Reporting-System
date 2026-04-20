/*
This function analyzes an image and classifies it into a civic category. It uses the OpenRouter API to process the image and return a structured JSON response containing the category and a concise title.
*/

const DEFAULT_ANALYSIS = { category: "Other", title: "Unknown Issue" };

async function analyzeImage(imageUrl) {
    if (!imageUrl) {
        return DEFAULT_ANALYSIS;
    }

    const prompt = `
Analyze the uploaded image and classify it into one of the following fixed civic categories:

1. Roads & Transport  
2. Street Lighting  
3. Garbage & Sanitation  
4. Water Supply & Drainage  
5. Electricity  
6. Public Safety  
7. Other

Return the result in structured JSON format:
{
  "category": "<one of the fixed categories above>",
  "title": "<a concise title, max 10 words>"
}
Only respond with the raw JSON object. Do not use Markdown formatting or triple backticks.
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "qwen/qwen3.5-9b",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
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

        const res = await response.json().catch(() => null);

        if (!response.ok) {
            console.error("OpenRouter request failed:", response.status, res);
            return DEFAULT_ANALYSIS;
        }

        const message = res?.choices?.[0]?.message?.content;
        if (!message || typeof message !== 'string') {
            console.error("Unexpected OpenRouter response format:", res);
            return DEFAULT_ANALYSIS;
        }

        const cleanedMessage = message
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();

        const result = JSON.parse(cleanedMessage);

        return {
            category: result?.category || DEFAULT_ANALYSIS.category,
            title: result?.title || DEFAULT_ANALYSIS.title
        };
    } catch (error) {
        console.error("Error analyzing image:", error);
        return DEFAULT_ANALYSIS;
    }
}

// (async () => {
//     const res = await analyzeImage("https://res.cloudinary.com/da3wjnlzg/image/upload/v1759671098/JagrukImageContainer/ihrc7ybnmwdbol8kl4dz.jpg");
//     const message = res.choices[0].message.content;

//     try {
//         const result = JSON.parse(message);
//         console.log(result);
//     } catch (error) {
//         console.error("Error parsing response:", error);
//     }
// })();
module.exports = analyzeImage;