export default async function handler(req, res) {
  // Only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    // Accept:
    // { message: "Hello" }
    // OR
    // { messages: [{ role: "user", content: "Hello" }] }

    let messages = [];

    if (Array.isArray(body.messages)) {
      messages = body.messages;
    }

    if (
      messages.length === 0 &&
      typeof body.message === "string" &&
      body.message.trim()
    ) {
      messages = [
        {
          role: "user",
          content: body.message.trim()
        }
      ];
    }

    // Validate messages
    messages = messages
      .filter(
        (msg) =>
          msg &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim()
      )
      .slice(-20)
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim()
      }));

    if (messages.length === 0) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error:
          "OPENAI_API_KEY is missing in Vercel Environment Variables."
      });
    }

    // OpenAI Responses API
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model: "gpt-5.6",

          instructions:
            "You are XenvitalTech AI by ShashwatBytes. " +
            "Be helpful, friendly, accurate and concise. " +
            "Help users with coding, study, projects, writing, " +
            "problem solving and general questions.",

          input: messages
        })
      }
    );

    const data = await response.json();

    // OpenAI returned an error
    if (!response.ok) {
      console.error("OpenAI Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI API request failed."
      });
    }

    // Successful response
    return res.status(200).json({
      reply:
        data?.output_text ||
        "Sorry, I could not generate a response."
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Internal server error."
    });
  }
}