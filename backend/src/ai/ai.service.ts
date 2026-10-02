import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';

// gemini-1.5-flash was retired by Google (404 on v1beta) — use the
// rolling alias so the pipeline does not break on future model sunsets.
const GEMINI_MODEL = 'gemini-flash-latest';
// llama-3.3-70b-versatile was decommissioned by Groq (404 model_not_found).
const GROQ_MODEL = 'openai/gpt-oss-120b';

export interface ImageAnalysisResult {
  rawText: string;
  success: boolean;
  error?: string;
}

export interface StructuredDiagnosis {
  analysisResult: string;
  confidenceScore: number;
  isolationRequired: boolean;
  recommendations: string[];
  symptoms: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiPrimary: GoogleGenerativeAI | null = null;
  private readonly geminiSecondary: GoogleGenerativeAI | null = null;
  private readonly groq: Groq | null = null;

  constructor() {
    const primaryKey = process.env.PRIMARY_GEMINI_API_KEY;
    const secondaryKey = process.env.SECONDARY_GEMINI_API_KEY;
    const groqKey = process.env.FINAL_GROQ_API_KEY;

    if (primaryKey) {
      this.geminiPrimary = new GoogleGenerativeAI(primaryKey);
      this.logger.log('Primary Gemini API configured');
    } else {
      this.logger.warn('PRIMARY_GEMINI_API_KEY not set');
    }

    if (secondaryKey) {
      this.geminiSecondary = new GoogleGenerativeAI(secondaryKey);
      this.logger.log('Secondary Gemini API configured (fallback)');
    } else {
      this.logger.warn('SECONDARY_GEMINI_API_KEY not set');
    }

    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
      this.logger.log('Groq API configured');
    } else {
      this.logger.warn('FINAL_GROQ_API_KEY not set');
    }
  }

  /**
   * Get the best available Gemini client.
   * Tries primary first, falls back to secondary.
   */
  private getGeminiClient(): GoogleGenerativeAI | null {
    if (this.geminiPrimary) return this.geminiPrimary;
    if (this.geminiSecondary) return this.geminiSecondary;
    return null;
  }

  /**
   * Try Gemini with primary key, fallback to secondary on failure.
   * Transient errors (429/5xx overload) are retried per key with backoff —
   * the flash endpoint frequently answers 503 under load and a single miss
   * used to drop the whole pipeline to the keyword fallback.
   */
  private async callGeminiWithFallback(
    imageParts: { inlineData: { data: string; mimeType: string } }[],
    prompt: string,
  ): Promise<ImageAnalysisResult> {
    const maxAttemptsPerKey = 3;
    const keys: { label: string; client: GoogleGenerativeAI | null }[] = [
      { label: 'Primary', client: this.geminiPrimary },
      { label: 'Secondary', client: this.geminiSecondary },
    ];

    let lastError: unknown = null;
    let configured = false;

    for (const { label, client } of keys) {
      if (!client) continue;
      configured = true;

      for (let attempt = 1; attempt <= maxAttemptsPerKey; attempt++) {
        try {
          return await this.callGemini(client, imageParts, prompt);
        } catch (err) {
          lastError = err;
          const retryable = this.isRetryableGeminiError(err);
          if (!retryable || attempt === maxAttemptsPerKey) break;
          const delayMs = 1500 * attempt;
          this.logger.warn(
            `${label} Gemini attempt ${attempt}/${maxAttemptsPerKey} failed (retryable), retrying in ${delayMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      this.logger.warn(`${label} Gemini failed, trying next key`, lastError);
    }

    if (!configured) {
      return {
        rawText: '',
        success: false,
        error: 'No Gemini API key configured',
      };
    }

    this.logger.error('All Gemini keys failed', lastError);
    return {
      rawText: '',
      success: false,
      error:
        lastError instanceof Error
          ? lastError.message
          : 'Both Gemini keys failed',
    };
  }

  private isRetryableGeminiError(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    if (typeof status === 'number') {
      return [429, 500, 502, 503, 504].includes(status);
    }
    const message = err instanceof Error ? err.message : '';
    return /\b(429|503|502|504|overloaded|Unavailable|deadline)/i.test(message);
  }

  /**
   * Call a specific Gemini client with images and prompt.
   */
  private async callGemini(
    client: GoogleGenerativeAI,
    imageParts: { inlineData: { data: string; mimeType: string } }[],
    prompt: string,
  ): Promise<ImageAnalysisResult> {
    const model = client.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();
    return { rawText: text, success: true };
  }

  /**
   * Prepare image parts from URLs.
   */
  private async prepareImageParts(
    imageUrls: string[],
  ): Promise<{ inlineData: { data: string; mimeType: string } }[]> {
    return Promise.all(
      imageUrls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(buffer).toString('base64'),
            mimeType: response.headers.get('content-type') || 'image/jpeg',
          },
        };
      }),
    );
  }

  /**
   * Analyze a single image using Gemini (with primary/secondary fallback).
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string,
  ): Promise<ImageAnalysisResult> {
    const client = this.getGeminiClient();
    if (!client) {
      return {
        rawText: '',
        success: false,
        error: 'No Gemini API key configured',
      };
    }

    try {
      const imageParts = await this.prepareImageParts([imageUrl]);
      return await this.callGeminiWithFallback(imageParts, prompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('Gemini image analysis failed', err);
      return { rawText: '', success: false, error: message };
    }
  }

  /**
   * Analyze multiple images using Gemini (with primary/secondary fallback).
   */
  async analyzeImages(
    imageUrls: string[],
    prompt: string,
  ): Promise<ImageAnalysisResult> {
    const client = this.getGeminiClient();
    if (!client) {
      return {
        rawText: '',
        success: false,
        error: 'No Gemini API key configured',
      };
    }

    try {
      const imageParts = await this.prepareImageParts(imageUrls);
      return await this.callGeminiWithFallback(imageParts, prompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('Gemini multi-image analysis failed', err);
      return { rawText: '', success: false, error: message };
    }
  }

  /**
   * Format raw text into structured JSON using Groq.
   */
  async formatDiagnosis(
    rawAnalysisText: string,
    doctorCandidates: {
      id: number;
      specialty: string;
      experience: string;
      rating: number;
    }[],
  ): Promise<StructuredDiagnosis | null> {
    if (!this.groq) {
      this.logger.warn('Groq not configured, returning null');
      return null;
    }

    try {
      const completion = await this.groq.chat.completions.create({
        model: GROQ_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are a livestock veterinary diagnostic assistant.',
              'Given a raw analysis report from an image analysis model,',
              'extract and structure the information into a clean JSON format.',
              '',
              'Respond with a strict JSON object with exactly these fields:',
              '- "analysisResult" (string): The condition/disease name',
              '- "confidenceScore" (number between 0 and 1): How confident the diagnosis is',
              '- "isolationRequired" (boolean): Whether the animal needs isolation',
              '- "recommendations" (array of strings): Short actionable care steps',
              '- "symptoms" (array of strings): Observed symptoms from the analysis',
              '',
              `Available doctors (choose only from these ids, at most 3):`,
              JSON.stringify(doctorCandidates),
            ].join('\n'),
          },
          {
            role: 'user',
            content: rawAnalysisText,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new Error('Groq response had no content');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed: Record<string, unknown> = JSON.parse(raw);

      if (
        typeof parsed.analysisResult !== 'string' ||
        typeof parsed.confidenceScore !== 'number' ||
        typeof parsed.isolationRequired !== 'boolean' ||
        !Array.isArray(parsed.recommendations)
      ) {
        throw new Error('Groq response failed shape validation');
      }

      return {
        analysisResult: parsed.analysisResult,
        confidenceScore: Math.min(1, Math.max(0, parsed.confidenceScore)),
        isolationRequired: parsed.isolationRequired,
        recommendations: (parsed.recommendations as unknown[]).filter(
          (r): r is string => typeof r === 'string',
        ),
        symptoms: Array.isArray(parsed.symptoms)
          ? (parsed.symptoms as unknown[]).filter(
              (s): s is string => typeof s === 'string',
            )
          : [],
      };
    } catch (err) {
      this.logger.error('Groq formatting failed', err);
      return null;
    }
  }

  /**
   * Full livestock diagnosis pipeline.
   * Step 1: Gemini (primary → secondary) analyzes images → raw text
   * Step 2: Groq formats raw text → structured JSON
   * Fallback: If Groq fails, parse Gemini output directly
   */
  async diagnoseLivestock(
    imageUrls: string[],
    symptoms: string[],
    doctorCandidates: {
      id: number;
      specialty: string;
      experience: string;
      rating: number;
    }[],
  ): Promise<StructuredDiagnosis> {
    const symptomText =
      symptoms.length > 0
        ? `Reported symptoms by owner: ${symptoms.join(', ')}`
        : 'No symptoms reported by owner.';

    const geminiPrompt = [
      'You are a livestock veterinary diagnostic assistant.',
      'Analyze the uploaded animal image(s) and identify:',
      '1. Visible symptoms (skin conditions, wounds, discharge, posture abnormalities, etc.)',
      '2. Possible diseases or conditions',
      '3. Severity assessment',
      '',
      symptomText,
      '',
      'Provide a detailed raw analysis of what you observe in the image(s).',
    ].join('\n');

    const geminiResult = await this.analyzeImages(imageUrls, geminiPrompt);

    if (!geminiResult.success || !geminiResult.rawText) {
      return this.fallbackDiagnosis(symptoms);
    }

    const formatted = await this.formatDiagnosis(
      geminiResult.rawText,
      doctorCandidates,
    );
    if (formatted) {
      return formatted;
    }

    return this.parseGeminiFallback(geminiResult.rawText, symptoms);
  }

  /**
   * Generic text generation with Groq.
   * Reusable for any text processing task.
   */
  async generateText(
    prompt: string,
    systemPrompt: string = 'You are a helpful assistant.',
  ): Promise<string | null> {
    if (!this.groq) {
      this.logger.warn('Groq not configured');
      return null;
    }

    try {
      const completion = await this.groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      });

      return completion.choices[0]?.message?.content || null;
    } catch (err) {
      this.logger.error('Groq text generation failed', err);
      return null;
    }
  }

  /**
   * Generic structured JSON generation with Groq.
   * Reusable for any task requiring structured output.
   */
  async generateStructuredJson<T>(
    prompt: string,
    systemPrompt: string,
  ): Promise<T | null> {
    if (!this.groq) {
      return null;
    }

    try {
      const completion = await this.groq.chat.completions.create({
        model: GROQ_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;

      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.error('Groq structured generation failed', err);
      return null;
    }
  }

  private fallbackDiagnosis(symptoms: string[]): StructuredDiagnosis {
    const lowercaseSymptoms = symptoms.map((s) => s.toLowerCase());

    let analysisResult = 'Undetermined - Manual examination recommended';
    let confidenceScore = 0.3;
    let isolationRequired = false;
    const recommendations = [
      'Isolate the animal temporarily as a precaution',
      'Consult a veterinarian for professional examination',
      'Monitor temperature and appetite',
      'Provide clean water and comfortable resting area',
    ];

    if (
      lowercaseSymptoms.some((s) =>
        ['skin lesions', 'lesions', 'nodules', 'lumps'].includes(s),
      )
    ) {
      analysisResult = 'Suspected Lumpy Skin Disease (LSD)';
      confidenceScore = 0.6;
      isolationRequired = true;
    } else if (
      lowercaseSymptoms.some((s) =>
        ['blisters', 'salivation', 'fever', 'lameness'].includes(s),
      )
    ) {
      analysisResult = 'Suspected Foot-and-Mouth Disease (FMD)';
      confidenceScore = 0.6;
      isolationRequired = true;
    } else if (
      lowercaseSymptoms.some((s) =>
        ['cough', 'weight loss', 'nasal discharge'].includes(s),
      )
    ) {
      analysisResult = 'Suspected Respiratory Infection';
      confidenceScore = 0.5;
    }

    return {
      analysisResult,
      confidenceScore,
      isolationRequired,
      recommendations,
      symptoms,
    };
  }

  private parseGeminiFallback(
    rawText: string,
    symptoms: string[],
  ): StructuredDiagnosis {
    const result = this.fallbackDiagnosis(symptoms);

    const conditionMatch = rawText.match(
      /(?:diagnosis|condition|disease|suspected)[:\s]+(.+?)(?:\n|$)/i,
    );
    if (conditionMatch) {
      result.analysisResult = conditionMatch[1].trim();
      result.confidenceScore = 0.55;
    }

    if (rawText.toLowerCase().includes('isolate')) {
      result.isolationRequired = true;
    }

    return result;
  }
}
