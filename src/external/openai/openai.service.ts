import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProductAnalysis {
  name: string;
  category: 'dish' | 'beverage' | 'dessert' | 'snack' | 'packaged';
  cuisine?: string;
  ingredients: string[];
  colors: string[];
  brand?: string;
  description?: string;
}

export interface TemplateField {
  field: string;
  label: string;
  value: string;
  type: 'text' | 'list';
  placeholder: string;
}

type EnhanceStyle = 'realistic' | 'anime' | 'illustration';

// ── System Prompts ────────────────────────────────────────────────

const REALISTIC_SYSTEM_PROMPT = `# Role
You are a Senior Visual Logic Analyst specializing in reverse-engineering imagery for next-generation, high-reasoning AI models.

# The Paradigm Shift (Crucial)
Unlike older models that rely on "vibe tags," next-gen models require logical, coherent, and physically accurate specifications.
Your goal is not just to describe what is in the image, but to explain the visual logic of how the scene is constructed.

# Analysis Protocol (The "Blueprint" Method)
1. Technical Precision over Feeling: Translate vibes into lighting/composition techniques. Use specific terms like "chiaroscuro," "atmospheric haze," "subsurface scattering."
2. Quantifiable & Spatial Logic: Define spatial relationships. Estimate technical parameters: "Shot on a 50mm prime lens at f/1.4."
3. Material & Sensory Physics: Not just "wet ground" but "asphalt slick with rain, reflecting distorted neon signs."
4. Cohesive Narrative Structure: The prompt must read like a coherent paragraph from a director's script.

# Output Structure
Part 1: The Narrative Specification (dense, coherent paragraph)
Part 2: Structured Technical Metadata:
- Visual Style: [Photorealistic, 3D Render, Oil Painting]
- Key Elements: [3-5 crucial objects/subjects]
- Lighting & Color: [Softbox, warm tungsten palette]
- Composition/Camera: [Low-angle, 35mm, high detail]

# Strict Output Protocol
1. Output ONLY the structured response.
2. Do NOT add any conversational filler text.
3. Start directly with the Narrative Specification paragraph.`;

const ANIME_SYSTEM_PROMPT = `# Role
You are a Lead Concept Artist & Niji 7 Prompt Director.

# The "Creative Expansion" Protocol (CRITICAL)
1. Micro-Details: Describe textures (frayed fabric, condensation on glass, subsurface scattering on skin).
2. Lighting Dynamics: Describe how light interacts with materials.
3. Atmosphere: Describe the mood (melancholic, ethereal, chaotic).

# Trigger Words (MANDATORY)
- Action/TV: anime screenshot, flat shading, dynamic angle, precise lineart
- Illustration: key visual, highly detailed, expressive eyes, cinematic lighting
- Default: anime screenshot, key visual, best quality, masterpiece

# Output Protocol
1. Output ONE continuous, rich paragraph.
2. MANDATORY: Append negative parameter block at the end.
3. FORBIDDEN: Do NOT output --ar or ratio parameters.

[Rich Narrative Description] + [Art Style Keywords] --no 3d, cgi, realistic, photorealistic, photography`;

const ILLUSTRATION_SYSTEM_PROMPT = `# Role
You are a Senior Illustration Prompt Engineer specializing in concept art and digital illustration.

# Protocol
Transform the user's simple prompt into a detailed, vivid description suitable for AI illustration models.
1. Subject & Action: Describe with rich detail - pose, expression, clothing, accessories.
2. Environment: Paint the scene with atmospheric details.
3. Art Style: Specify watercolor, digital painting, concept art, etc.
4. Lighting & Color: Color palette and lighting setup.
5. Composition: Framing, perspective, focal points.

# Output
Output a single detailed paragraph (~100-200 words). No filler text.`;

const VISION_SYSTEM_PROMPT = `# Role
You are a Senior Visual Logic Analyst specializing in reverse-engineering imagery for AI image generation.

# Analysis Protocol (The "Blueprint" Method)
1. Technical Precision: Use terms like "chiaroscuro," "atmospheric haze," "subsurface scattering."
2. Quantifiable & Spatial Logic: Define spatial relationships and estimate parameters.
3. Material & Sensory Physics: Describe materials precisely.
4. Cohesive Narrative: Reads like a director's script.

# Output
Output Part 1 (Narrative Specification) as one continuous paragraph (100-200 words).
Then output Part 2 (Technical Metadata):
- Visual Style: [type]
- Key Elements: [3-5 items]
- Lighting & Color: [details]
- Composition/Camera: [details]

Output ONLY the prompt. No conversational filler.`;

const ANALYSIS_SYSTEM_PROMPT = `# Role
You are a Food & Product Visual Analyst.

# Task
Given an image, extract:
1. name: Dish/product/beverage name
2. category: "dish" | "beverage" | "dessert" | "snack" | "packaged"
3. cuisine: Origin or cuisine type
4. ingredients: Visible ingredients (3-8 items)
5. colors: Dominant colors (2-4)
6. brand: Brand name if visible (null if none)
7. description: Brief 1-sentence description

# Output
Output ONLY valid JSON. No markdown, no filler.
{"name":"Coca-Cola","category":"beverage","cuisine":"American","ingredients":["carbonated water","caramel color","sugar"],"colors":["red","white"],"brand":"Coca-Cola","description":"Classic Coca-Cola can"}`;

const REPLACE_SYSTEM_PROMPT = `# Role
You are a SURGICAL Prompt Editor. Perform precise find-and-replace edits on AI image generation prompts.

# Critical Principle
The template prompt is a MASTERPIECE. Perform MINIMAL, SURGICAL edits — change ONLY the product-specific words.

# MUST KEEP IDENTICAL (DO NOT CHANGE):
- Background color/style
- Lighting setup
- Camera settings
- Visual effects (splash, floating, levitating effects)
- Composition/layout
- Resolution, aspect ratio, quality settings
- ALL structural formatting (JSON keys, indentation)

# SHOULD CHANGE (surgical replacements only):
- Product/dish NAME
- Specific INGREDIENT names
- Product-specific COLORS
- Brand names
- Toppings/garnishes

# Output
Output ONLY the adapted prompt text. No explanation, no markdown.`;

const EXTRACT_SYSTEM_PROMPT = `# Role
You are a Prompt Analyst. Extract EDITABLE FIELDS from AI image generation prompts.

# Task
Identify 4-8 key editable fields. Focus on PRODUCT-SPECIFIC details, NOT style/lighting/camera.

# Fields to extract:
1. product_name — Main dish/drink/product name (ALWAYS include)
2. ingredients — Key ingredients or components
3. colors — Product-specific colors (NOT background)
4. brand — Brand name if mentioned
5. cuisine — Cuisine type or origin
6. garnish — Decorative elements
7. container — Plate, cup, bowl, packaging type
8. background_elements — Floating/surrounding elements

# Rules
- Extract CURRENT VALUE from template
- For list fields join with ", "
- DO NOT extract style/lighting/camera fields

# Output
Output ONLY valid JSON array. No markdown.
[{"field":"product_name","label":"Product Name","value":"Chicken Biryani","type":"text","placeholder":"e.g. Pho bo, Pizza"}]`;

// ── Model Lists ───────────────────────────────────────────────────

const DESCRIBE_MODELS = ['gpt-4o', 'gemini-3.1-flash-lite-preview', 'gemini-2.0-flash'];
const ANALYZE_MODELS = ['gpt-4o', 'gemini-2.0-flash'];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

// ── Service ───────────────────────────────────────────────────────

@Injectable()
export class OpenAiService {
  private readonly gptUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.gptUrl = this.configService.get<string>('chainhub.gptUrl')!;
    this.apiKey = this.configService.get<string>('chainhub.baseKey')!;
  }

  // ── Private helper ──

  private async callChat(
    model: string,
    systemPrompt: string,
    userContent: unknown,
    maxTokens = 800,
  ): Promise<string | null> {
    const payload = {
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    };

    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
      try {
        const res = await firstValueFrom(
          this.httpService.post(this.gptUrl, payload, {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60_000,
          }),
        );
        const content: string =
          res.data?.choices?.[0]?.message?.content?.trim() || '';
        return content || null;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status && !RETRYABLE.has(status)) return null;
        if (attempt === 2) return null;
      }
    }
    return null;
  }

  private stripMarkdownFences(text: string): string {
    return text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
  }

  // ── Public Methods ──

  async enhancePrompt(prompt: string, style: EnhanceStyle = 'realistic'): Promise<string> {
    const systemPrompts: Record<EnhanceStyle, string> = {
      realistic: REALISTIC_SYSTEM_PROMPT,
      anime: ANIME_SYSTEM_PROMPT,
      illustration: ILLUSTRATION_SYSTEM_PROMPT,
    };
    const result = await this.callChat(
      'gpt-4o',
      systemPrompts[style],
      `Enhance this prompt:\n"${prompt}"`,
    );
    return result || '';
  }

  async describeImage(imageUrl: string): Promise<string | null> {
    for (const model of DESCRIBE_MODELS) {
      const result = await this.callChat(
        model,
        VISION_SYSTEM_PROMPT,
        [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: 'Analyze this image and generate a detailed prompt using the Blueprint Method.' },
        ],
        600,
      );
      if (result) return result;
    }
    return null;
  }

  async analyzeProduct(imageUrl: string): Promise<ProductAnalysis | null> {
    let rawJson: string | null = null;
    for (const model of ANALYZE_MODELS) {
      rawJson = await this.callChat(
        model,
        ANALYSIS_SYSTEM_PROMPT,
        [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: 'Analyze this food/product image and return structured JSON.' },
        ],
      );
      if (rawJson) break;
    }
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(this.stripMarkdownFences(rawJson));
      return {
        name: parsed.name || 'Unknown',
        category: parsed.category || 'dish',
        cuisine: parsed.cuisine || undefined,
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        brand: parsed.brand || undefined,
        description: parsed.description || undefined,
      };
    } catch {
      return null;
    }
  }

  async replaceProductInTemplate(
    analysis: ProductAnalysis,
    templatePrompt: string,
  ): Promise<string | null> {
    const userContent = `Here is the TEMPLATE PROMPT (treat as sacred — change as FEW words as possible):

---TEMPLATE START---
${templatePrompt}
---TEMPLATE END---

Here is the NEW PRODUCT to replace the original product:
${JSON.stringify(analysis, null, 2)}

INSTRUCTIONS:
1. Go through the template line by line
2. Replace ONLY product name, ingredients, product-specific colors, brand
3. DO NOT change: background, lighting, camera, composition, effects, resolution
4. Keep the EXACT same prompt format and structure
5. Output the edited prompt — nothing else`;

    let result: string | null = null;
    for (const model of ANALYZE_MODELS) {
      result = await this.callChat(model, REPLACE_SYSTEM_PROMPT, userContent, 2000);
      if (result) break;
    }
    return result ? this.stripMarkdownFences(result) : null;
  }

  async replaceWithManualFields(
    manualFields: Record<string, string>,
    templatePrompt: string,
  ): Promise<string | null> {
    const userContent = `CRITICAL: Perform FIND-AND-REPLACE on the template below. Output must be 95%+ identical to original.

---TEMPLATE---
${templatePrompt}
---END TEMPLATE---

USER'S REPLACEMENT VALUES:
${Object.entries(manualFields).map(([k, v]) => `- ${k}: "${v}"`).join('\n')}

PRESERVATION RULES (DO NOT CHANGE):
- Background description → keep EXACTLY as-is
- Lighting/camera/composition → keep EXACTLY as-is
- Visual effects → keep the effect, change only what's involved
- Resolution, aspect ratio, style keywords → keep EXACTLY as-is

Output the edited prompt ONLY. No explanation.`;

    let result: string | null = null;
    for (const model of ANALYZE_MODELS) {
      result = await this.callChat(model, REPLACE_SYSTEM_PROMPT, userContent, 4000);
      if (result) break;
    }
    return result ? this.stripMarkdownFences(result) : null;
  }

  async extractFields(templatePrompt: string): Promise<TemplateField[]> {
    const result = await this.callChat(
      'gpt-4o',
      EXTRACT_SYSTEM_PROMPT,
      `Analyze this template prompt and extract editable fields:\n\n${templatePrompt}`,
      1000,
    );
    if (!result) return [];
    try {
      return JSON.parse(this.stripMarkdownFences(result)) as TemplateField[];
    } catch {
      return [];
    }
  }
}
