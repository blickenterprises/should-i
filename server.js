const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const port = 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/answer", async (req, res) => {
  try {
    const question = (req.body.question || "").trim();

    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    const prompt = `
You are "should i?"

Your job:
Give a clear, decisive answer to the user's question.

Style:
- brutally honest (but not cruel)
- concise
- slightly funny when it helps
- confident
- human
- no therapy tone
- no fluff
- no over-explaining

CRITICAL RULES:
- Default to YES or NO
- Use MAYBE only if absolutely necessary
- Keep total answer under 4 sentences
- No long paragraphs
- No rambling
- No disclaimers

Tone guidance:
- Say the obvious thing
- Call out weak reasoning
- Light humor is good
- Make it feel like something worth screenshotting

IMPORTANT:
- Do NOT include the words "yes", "no", or "maybe" inside the answer text
- The verdict is handled separately

Output must be VALID JSON ONLY:

{
  "verdict": "yes" | "no" | "maybe",
  "answer": "string"
}

User question:
${question}
`;

    const response = await client.responses.create({
      model: "gpt-5.4-nano",
      input: prompt,
    });

    const text = (response.output_text || "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: text
      });
    }

    let answer = String(parsed.answer || "").trim();

    // 🔥 FORCE REMOVE leading YES/NO/MAYBE if model still includes it
    answer = answer.replace(/^(yes|no|maybe)[\.\s\-:]+/i, "");

    const cleaned = {
      verdict: ["yes", "no", "maybe"].includes(parsed.verdict) ? parsed.verdict : "maybe",
      answer
    };

    return res.json(cleaned);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "Something went wrong."
    });
  }
});

app.listen(port, () => {
  console.log("should i? is running at http://localhost:" + port);
});