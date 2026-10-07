export default async function handler(req, res) {

    if(req.method !== "POST"){
        return res.status(405).json({
            error:"Method not allowed"
        });
    }


    try{

        const apiKey =
            process.env.OPENROUTER_API_KEY;


        if(!apiKey){

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


        messages =
            messages
                .filter(message => {

                    return (
                        message &&
                        (
                            message.role === "user" ||
                            message.role === "assistant"
                        ) &&
                        typeof message.content === "string" &&
                        message.content.trim()
                    );

                })
                .slice(-7)
                .map(message => ({

                    role:
                        message.role,

                    content:
                        message.content
                            .trim()
                            .slice(0,5000)

                }));


        if(!messages.length){

            return res.status(400).json({
                error:"Message is required."
            });

        }


        const openRouter =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method:"POST",

                    headers:{

                        "Authorization":
                            `Bearer ${apiKey}`,

                        "Content-Type":
                            "application/json",

                        "HTTP-Referer":
                            "https://xenvitaltech.vercel.app",

                        "X-Title":
                            "XenvitalTech AI"

                    },

                    body:JSON.stringify({

                        model:
                            "openai/gpt-4o-mini",

                        stream:true,

                        messages:[

                            {
                                role:"system",

                                content:
                                    "You are XenvitalTech AI by ShashwatBytes. Give accurate, helpful and concise answers. For coding questions provide working code. Avoid unnecessary repetition."
                            },

                            ...messages

                        ],

                        temperature:0.4,

                        max_tokens:900

                    })

                }
            );


        if(!openRouter.ok){

            const errorText =
                await openRouter.text();

            console.error(
                "OpenRouter Error:",
                errorText
            );

            let message =
                "OpenRouter request failed.";

            try{

                const parsed =
                    JSON.parse(errorText);

                message =
                    parsed?.error?.message ||
                    parsed?.error?.code ||
                    message;

            }catch{}

            return res.status(
                openRouter.status
            ).json({
                error:
                    `OpenRouter: ${message}`
            });

        }


        /*
         * STREAM RESPONSE
         */

        res.statusCode = 200;

        res.setHeader(
            "Content-Type",
            "text/event-stream"
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


        const reader =
            openRouter.body.getReader();


        try{

            while(true){

                const {
                    value,
                    done
                } = await reader.read();


                if(done){
                    break;
                }


                res.write(
                    Buffer.from(value)
                );

            }

        }finally{

            reader.releaseLock();

        }


        res.write(
            "data: [DONE]\n\n"
        );

        res.end();


    }catch(error){

        console.error(
            "Chat API Error:",
            error
        );


        if(!res.headersSent){

            return res.status(500).json({
                error:
                    error?.message ||
                    "Internal server error."
            });

        }


        res.end();

    }

}