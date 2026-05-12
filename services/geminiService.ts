import { GoogleGenAI, Type } from "@google/genai";
import { MaintenanceRecord, Category, Status, Shift } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const parseMaintenanceNote = async (
  rawText: string,
  defaultBuilding: string
): Promise<Partial<MaintenanceRecord>> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing, returning mock data");
    return {
        description: rawText,
        category: Category.HVAC,
        reasonOfFailure: "Auto-detected failure",
        partsReplaced: "-",
        location: "Unknown",
        status: Status.DONE,
        building: defaultBuilding,
        shift: 'Day',
        executedBy: "UFM Technicians",
        note: "-"
    };
  }

  try {
    const modelId = "gemini-2.5-flash"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `You are an expert Facility Management Technical Writer.
      Task: Parse the following raw maintenance note into a structured JSON object for a formal report.
      
      Input Text: "${rawText}"
      Context: Building '${defaultBuilding}', Kuwait.
      
      Requirements:
      1. description: REWRITE the input text to be Formal, Technical, and Grammatically correct (Arabic or English based on input).
      2. category: Must be exactly one of: HVAC, ELECTRICAL & FIRE ALARM, PLUMBING & FIREFIGHTING, CIVIL & CARPENTRY, Fit-out.
      3. status: Choose closest match from: Done, Pending, In Progress, Waiting for Parts, Observation, Hold, Cancelled.
      4. shift: Day or Night.
      
      Output JSON Schema only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "The formalized, grammatically correct technical description" },
            reasonOfFailure: { type: Type.STRING, description: "Reason or Ticket No." },
            partsReplaced: { type: Type.STRING, description: "Materials used (or 'None')" },
            location: { type: Type.STRING, description: "Specific location (e.g., 3rd Floor)" },
            category: { type: Type.STRING, enum: Object.values(Category) },
            status: { type: Type.STRING, enum: Object.values(Status) },
            shift: { type: Type.STRING, enum: ["Day", "Night"] },
            executedBy: { type: Type.STRING, description: "Person or team who did the work" },
            building: { type: Type.STRING, description: "Building name" },
            note: { type: Type.STRING, description: "Any extra remarks" }
          },
          required: ["description", "reasonOfFailure", "partsReplaced", "location", "category", "status", "shift", "executedBy"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    // Ensure defaults if AI misses them
    return {
      ...result,
      building: result.building || defaultBuilding,
      executedBy: result.executedBy || "UFM Technicians",
      note: result.note || "-"
    };

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return {
      description: rawText, // Fallback to raw text
      category: Category.HVAC,
      reasonOfFailure: "Check details",
      partsReplaced: "-",
      location: "-",
      status: Status.DONE,
      building: defaultBuilding,
      shift: 'Day',
      executedBy: "UFM Technicians",
      note: "-"
    };
  }
};