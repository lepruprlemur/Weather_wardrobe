
import OpenAI from "openai";
import { ClothingItem, LocationData, RecommendationResponse } from "./types";

/**
 * Service for generating outfit recommendations using GRS AI API.
 * Uses the OpenAI-compatible chat completions endpoint.
 */
export async function getOutfitRecommendation(
  location: LocationData,
  clothes: ClothingItem[],
  isKidMode: boolean
): Promise<RecommendationResponse> {

  const client = new OpenAI({
    apiKey: process.env.GRSAI_API_KEY,
    baseURL: "https://grsaiapi.com/v1",
    dangerouslyAllowBrowser: true,
  });

  const modelName = "gemini-3-pro";

  const systemPrompt = `
You are a professional fashion stylist and weather expert.
1. Based on the user's coordinates (Lat ${location.latitude}, Lon ${location.longitude}), estimate the CURRENT weather conditions for that region, including approximate temperature, precipitation, wind, and general conditions.
2. Analyze the user's clothes (provided as images with IDs).
3. Suggest 2 distinct outfit options from the provided clothing items.
4. If KID MODE is active, prioritize heavy layering, wind protection, and warmth (thermals, tights, etc.).
5. ALWAYS RETURN A VALID JSON OBJECT matching the schema below exactly. Do not include any text outside the JSON.

JSON Schema:
{
  "weatherSummary": "Detailed description of estimated current weather for the location",
  "options": [
    {
      "optionTitle": "Set Name",
      "selectedItems": [{ "id": "ITEM_ID", "name": "Item Description" }],
      "reasoning": "Detailed explanation based on current temperature and conditions",
      "styleTips": ["Practical tip 1", "Style tip 2"]
    }
  ]
}
`;

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Current Location: ${location.latitude}, ${location.longitude}. KID MODE: ${isKidMode ? "ACTIVE" : "OFF"}. Please recommend outfits from the clothing items shown below.`,
    },
  ];

  clothes.forEach((item) => {
    userContent.push({
      type: "text",
      text: `CLOTHING_ITEM_ID: ${item.id}`,
    });
    userContent.push({
      type: "image_url",
      image_url: {
        url: item.base64.startsWith("data:")
          ? item.base64
          : `data:${item.mimeType};base64,${item.base64}`,
      },
    });
  });

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      // response_format not supported for all models via GRS AI
    });

    const rawText = response.choices[0]?.message?.content;
    if (!rawText) throw new Error("The model returned an empty response.");

    // Strip markdown code fences if present (e.g. ```json ... ```)
    let text = rawText.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const parsedResponse = JSON.parse(text) as RecommendationResponse;

    return {
      ...parsedResponse,
      isKidModeActive: isKidMode,
    };
  } catch (error: any) {
    console.error("GRS AI API Error:", error);
    throw new Error(
      error.message || "Error communicating with AI. Please try again later."
    );
  }
}
