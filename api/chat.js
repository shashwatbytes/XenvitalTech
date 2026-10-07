export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message, messages } = req.body || {};

    if (!message && !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is missing in Vercel"
      });
    }

    let chatMessages = Array.isArray(messages) && messages.length
      ? messages
      : [
          {
            role: "user",
            content: message
          }
        ];

    // Keep only recent conversation messages.
    // This prevents long chats from becoming unnecessarily slow.
    chatMessages = chatMessages.slice(-12);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://xenvitaltech.vercel.app",
          "X-Title": "XenvitalTech AI"
        },

        body: JSON.stringify({
          model: "openai/gpt-4o-mini",

          messages: [
            {
              role: "system",
              content:
                "You are XenvitalTech AI by ShashwatBytes. Give direct, helpful and concise answers. Avoid unnecessary repetition."
            },
            ...chatMessages
          ],

          temperature: 0.5,

          max_tokens: 1000,

          stream: true
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();

      console.error(
        "OpenRouter error:",
        errorData
      );

      return res.status(response.status).json({
        error: "AI service request failed"
      });
    }

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "text/event-stream; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.setHeader(
      "X-Accel-Buffering",
      "no"
    );

    if (!response.body) {
      return res.end();
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {

      const { value, done } =
        await reader.read();

      if (done) break;

      buffer += decoder.decode(
        value,
        {
          stream: true
        }
      );

      const lines =
        buffer.split("\n");

      buffer =
        lines.pop() || "";

      for (const line of lines) {

        const trimmed =
          line.trim();

        if (!trimmed) continue;

        if (
          !trimmed.startsWith("data:")
        ) {
          continue;
        }

        const data =
          trimmed.slice(5).trim();

        if (data === "[DONE]") {
          continue;
        }

        try {

          const parsed =
            JSON.parse(data);

          const token =
            parsed?.choices?.[0]?.delta?.content;

          if (token) {
            res.write(token);
          }

        } catch {
          // Ignore incomplete SSE chunks
        }
      }
    }

    res.end();

  } catch (error) {

    console.error(
      "Chat API error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error"
      });
    }

    res.end();
  }
}