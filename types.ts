
export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

export interface ClothingItem {
  id: string;
  base64: string;
  mimeType: string;
  description?: string;
}

export interface RecommendedItem {
  id: string;
  name: string;
}

export interface OutfitOption {
  optionTitle: string;
  selectedItems: RecommendedItem[];
  reasoning: string;
  styleTips: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface RecommendationResponse {
  weatherSummary: string;
  options: OutfitOption[];
  isKidModeActive?: boolean;
  sources?: GroundingSource[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  GETTING_LOCATION = 'GETTING_LOCATION',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR'
}
