
import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, LocationData, RecommendationResponse, GroundingSource } from "./types";

/**
 * Сервис для работы с Google Gemini API.
 * Использует инструмент googleSearch для получения актуальной погоды.
 */
export async function getOutfitRecommendation(
  location: LocationData,
  clothes: ClothingItem[],
  isKidMode: boolean
): Promise<RecommendationResponse> {
  
  // Initialization of the API client must use the named apiKey parameter from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-preview';

  const systemInstruction = `
You are a professional fashion stylist and weather expert.
1. Use the googleSearch tool to find the CURRENT weather at coordinates: Lat ${location.latitude}, Lon ${location.longitude}.
2. Based on the weather, analyze the user's clothes (provided as images with IDs).
3. Suggest 2 distinct outfit options.
4. If KID MODE is active, prioritize heavy layering, wind protection, and warmth (thermals, tights, etc.).
5. ALWAYS RETURN A JSON OBJECT.

JSON Schema:
{
  "weatherSummary": "Detailed description of current weather found via search",
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

  // Подготовка частей сообщения: текст + изображения
  const parts: any[] = [
    { text: `Current Location: ${location.latitude}, ${location.longitude}. Use search to find weather and recommend outfits from my clothes.` }
  ];

  clothes.forEach(item => {
    parts.push({ text: `CLOTHING_ITEM_ID: ${item.id}` });
    parts.push({
      inlineData: {
        data: item.base64.split(',')[1], // Удаляем префикс data:image/...;base64,
        mimeType: item.mimeType
      }
    });
  });

  try {
    const result = await ai.models.generateContent({
      model: modelName,
      // Simplified content generation call according to guidelines
      contents: { parts },
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    // Extract text output using the .text property directly.
    const text = result.text;
    if (!text) throw new Error("Модель вернула пустой ответ.");

    const parsedResponse = JSON.parse(text) as RecommendationResponse;

    // Извлечение источников из groundingMetadata
    const sources: GroundingSource[] = [];
    const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          sources.push({
            title: chunk.web.title || "Источник погоды",
            uri: chunk.web.uri
          });
        }
      });
    }

    return {
      ...parsedResponse,
      isKidModeActive: isKidMode,
      sources: sources.length > 0 ? sources : undefined
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Robust error handling for the API response.
    throw new Error(error.message || "Ошибка при связи с ИИ. Пожалуйста, попробуйте позже.");
  }
}
