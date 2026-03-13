
import OpenAI from "openai";
import { ClothingItem, LocationData, RecommendationResponse } from "./types";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

const weatherCodeMap: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers",
  82: "Violent rain showers", 85: "Slight snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch weather data");
  const data = await res.json();
  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
  };
}

/**
 * Service for generating outfit recommendations using GRS AI API.
 * Uses the OpenAI-compatible chat completions endpoint.
 */
export async function getOutfitRecommendation(
  location: LocationData,
  clothes: ClothingItem[],
  isKidMode: boolean
): Promise<RecommendationResponse> {

  // Fetch real weather data
  const weather = await fetchWeather(location.latitude, location.longitude);
  const weatherDesc = weatherCodeMap[weather.weatherCode] || "Unknown";

  const client = new OpenAI({
    apiKey: process.env.GRSAI_API_KEY,
    baseURL: "https://grsaiapi.com/v1",
    dangerouslyAllowBrowser: true,
  });

  const modelName = "gemini-3-pro";

  const systemPrompt = `
You are a professional fashion stylist.
Current weather data (real-time):
- Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
- Conditions: ${weatherDesc}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} km/h

Your task:
1. Analyze the user's clothes (provided as images with IDs).
2. Suggest 2 distinct outfit options from the provided clothing items.
3. If KID MODE is active, prioritize heavy layering, wind protection, and warmth.
4. ALWAYS RETURN A VALID JSON OBJECT matching the schema below. No text outside JSON.

JSON Schema:
{
  "weatherSummary": "One short sentence about the weather, max 15 words",
  "options": [
    {
      "optionTitle": "Short creative set name",
      "selectedItems": [{ "id": "ITEM_ID", "name": "Brief item description" }],
      "reasoning": "2-3 sentences explaining why this outfit fits the weather",
      "styleTips": ["Short tip 1", "Short tip 2"]
    }
  ]
}
`;

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `KID MODE: ${isKidMode ? "ACTIVE" : "OFF"}. Recommend outfits from the clothing items below.`,
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

    // Clean up the response: strip markdown fences and extract valid JSON
    let text = rawText.trim();
    // Remove markdown code fences if present
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    // Extract the JSON object between first { and its matching }
    const startIdx = text.indexOf("{");
    if (startIdx === -1) throw new Error("No JSON object found in response.");
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      if (depth === 0) { endIdx = i; break; }
    }
    if (endIdx === -1) throw new Error("Incomplete JSON object in response.");
    text = text.substring(startIdx, endIdx + 1);

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
