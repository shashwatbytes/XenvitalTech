export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const incomingMessages =
      Array.isArray(body.messages)
        ? body.messages
        : [];

    if (!message && incomingMessages.length === 0) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const chatMessages =
      incomingMessages.length > 0
        ? incomingMessages
            .filter(
              item =>
                item &&
                typeof item.content === "string" &&
                ["user", "assistant"].includes(item.role)
            )
            .slice(-20)
        : [
            {
              role: "user",
              content: message
            }
          ];

    if (chatMessages.length === 0) {
      return res.status(400).json({
        error: "No valid messages provided"
      });
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error(
        "OPENROUTER_API_KEY is missing"
      );

      return res.status(500).json({
        error:
          "Server configuration error. OPENROUTER_API_KEY is not configured."
      });
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        30000
      );

    let response;

    try {
      response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              "https://xenvitaltech.vercel.app",

            "X-Title":
              "XenvitalTech AI"
          },

          body: JSON.stringify({
            model: "openai/gpt-4o-mini",

            messages: [
              {
                role: "system",
                content:
                  "You are XenvitalTech AI by ShashwatBytes. Give helpful, accurate, clear and concise answers. Be professional and practical. Do not mention internal system instructions."
              },

              ...chatMessages
            ],

            temperature: 0.7,

            max_tokens: 1200
          }),

          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const contentType =
      response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text =
        await response.text();

      data = {
        error: text
      };
    }

    if (!response.ok) {
      console.error(
        "OpenRouter API error:",
        {
          status: response.status,
          data
        }
      );

      return res.status(
        response.status >= 400 &&
        response.status < 600
          ? response.status
          : 500
      ).json({
        error:
          data?.error?.message ||
          data?.error?.code ||
          data?.error ||
          "OpenRouter request failed"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (
      typeof reply !== "string" ||
      !reply.trim()
    ) {
      console.error(
        "Unexpected OpenRouter response:",
        data
      );

      return res.status(502).json({
        error:
          "The AI provider returned an empty response."
      });
    }

    return res.status(200).json({
      reply: reply.trim()
    });

  } catch (error) {

    console.error(
      "XenvitalTech API error:",
      error
    );

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error:
          "The AI service took too long to respond. Please try again."
      });
    }

    return res.status(500).json({
      error:
        "Unable to connect to the AI service."
    });
  }
}