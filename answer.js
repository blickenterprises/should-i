const OpenAI = require("openai");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed." });
    }

    const question = (req.body && req.body.question ? String(req.body.question) : "").trim();

    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
      input: prompt
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

    const verdict =
      parsed && ["yes", "no", "maybe"].includes(parsed.verdict)
        ? parsed.verdict
        : "maybe";

    let answer =
      parsed && typeof parsed.answer === "string"
        ? parsed.answer.trim()
        : "";

    if (!answer) {
      answer = "That answer came back weird. Ask it again.";
    }

    answer = answer.replace(/^(yes|no|maybe)[.\s: -]+/i, "");

    return res.status(200).json({
      verdict,
      answer
    });
  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      error: error && error.message ? error.message : "Something went wrong in /api/answer."
    });
  }
};