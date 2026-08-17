export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required"
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is missing in Vercel"
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are XenvitalTech AI by ShashwatBytes. Be helpful, clear and accurate."
            },
            ...messages
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter API request failed"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    return res.status(200).json({
      reply: reply || "No response received."
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error.message ||
        "AI connection failed"
    });
  }
}