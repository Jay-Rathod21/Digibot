
import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check API key
if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY is missing in .env");
  process.exit(1);
}

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// DigiBot personality
const SYSTEM_PROMPT = `
You are DigiBot, a professional Digital Marketing Assistant.

Help students, marketers, business owners, entrepreneurs,
and content creators.

Your expertise includes:
- SEO
- Social Media Marketing
- Content Marketing
- Email Marketing
- Google Ads
- Meta Ads
- Keyword Research
- Website Marketing
- Branding
- Marketing Analytics
- Affiliate Marketing
- Influencer Marketing
- Marketing Strategy

Explain everything in simple beginner-friendly English.

When useful, provide:
- Headings
- Bullet points
- Step-by-step instructions
- Examples
- Marketing strategies
- Captions and hashtags
- SEO titles and descriptions
- Content calendars
- Keyword suggestions

Never invent live analytics, keyword volumes, advertising prices,
or campaign results.

If the user asks for a marketing plan, consider:
business, target audience, goals, budget, platform, and timeline.

Stay focused on digital marketing.
`;

// Health-check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    model: MODEL
  });
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // Validate request
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please provide a valid message."
      });
    }

    // Validate and limit history
    const validMessages = messages
      .filter(message =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.trim()
      )
      .slice(-20)
      .map(message => ({
        role: message.role,
        content: message.content.trim().slice(0, 12000)
      }));

    if (
      validMessages.length === 0 ||
      validMessages.at(-1).role !== "user"
    ) {
      return res.status(400).json({
        error: "The last message must be a user message."
      });
    }

    // Send conversation to Groq
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        ...validMessages
      ],
      temperature: 0.7,
      max_tokens: 1800
    });

    const reply =
      completion.choices[0].message.content;

    res.json({
      reply,
      model: MODEL
    });

  } catch (error) {
    console.error("Groq API Error:", error);

    if (error.status === 401) {
      return res.status(401).json({
        error: "Invalid Groq API key. Check your .env file."
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: "Groq quota or rate limit exceeded. Please wait and try again."
      });
    }

    res.status(500).json({
      error: "Something went wrong while contacting Groq."
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`DigiBot is running at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
});
