export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const apiKey =
            process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is missing in Vercel."
            });
        }


        const body =
            req.body || {};


        let messages =
            Array.isArray(body.messages)
                ? body.messages
                : [];


        /*
         * Keep request small for faster response.
         */

        messages =
            messages
                .filter(message =>
                    message &&
                    (
                        message.role === "user" ||
                        message.role === "assistant"
                    ) &&
                    typeof message.content === "string" &&
                    message.content.trim()
                )
                .slice(-6)
                .map(message => ({
                    role: message.role,
                    content:
                        message.content
                            .trim()
                            .slice(0, 4000)
                }));


        if (!messages.length) {
            return res.status(400).json({
                error: "Message is required."
            });
        }


        /*
         * OpenRouter streaming request
         */

        const response =
            await fetch(
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

                        /*
                         * Fast lightweight model
                         */

                        model:
                            "openai/gpt-4o-mini",

                        stream:
                            true,

                        messages: [

                            {
                                role: "system",

                                content:
                                    "You are XenvitalTech AI by ShashwatBytes. Answer accurately, naturally and concisely. Give direct answers. For coding questions provide working code. Avoid unnecessary explanations."
                            },

                            ...messages
                        ],

                        /*
                         * Lower temperature
                         * helps fast consistent answers.
                         */

                        temperature:
                            0.3,

                        /*
                         * Smaller response =
                         * faster completion.
                         */

                        max_tokens:
                            700
                    })
                }
            );


        /*
         * OpenRouter error
         */

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "OpenRouter Error:",
                errorText
            );


            let errorMessage =
                "OpenRouter request failed.";

            try {

                const errorData =
                    JSON.parse(errorText);

                errorMessage =
                    errorData?.error?.message ||
                    errorData?.error?.code ||
                    errorMessage;

            } catch {}


            return res.status(
                response.status
            ).json({

                error:
                    `OpenRouter: ${errorMessage}`

            });

        }


        /*
         * STREAM HEADERS
         */

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


        /*
         * Forward OpenRouter stream
         */

        const reader =
            response.body.getReader();


        try {

            while (true) {

                const {
                    value,
                    done
                } = await reader.read();


                if (done) {
                    break;
                }


                res.write(
                    Buffer.from(value)
                );

            }

        } finally {

            reader.releaseLock();

        }


        /*
         * Tell frontend stream is finished.
         */

        res.write(
            "data: [DONE]\n\n"
        );

        res.end();


    } catch (error) {

        console.error(
            "XenvitalTech API Error:",
            error
        );


        if (!res.headersSent) {

            return res.status(500).json({

                error:
                    error?.message ||
                    "Internal server error."

            });

        }


        res.end();

    }
}