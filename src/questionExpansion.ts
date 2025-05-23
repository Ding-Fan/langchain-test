import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export interface ExpandedQuestions {
    original: string;
    precise: string;
    intent: string;
}

/**
 * Expands a single question into multiple variations to improve retrieval quality
 * @param originalQuestion The original user question
 * @param model The ChatGoogleGenerativeAI model instance to use for expansion
 * @returns Promise<ExpandedQuestions> containing original, precise, and intent-based questions
 */
export async function questionExpansion(
    originalQuestion: string,
    model: ChatGoogleGenerativeAI
): Promise<ExpandedQuestions> {
    const expansionPrompt = `Given this user question: "${originalQuestion}"

Generate 2 additional questions to improve information retrieval:

1. A more precise, technical version of the question
2. A question that captures the underlying intent or broader perspective

Context: This is for searching through blog content about technology, programming, and technical topics.

Return your response in this exact JSON format:
{
  "precise_question": "your precise version here",
  "intent_question": "your intent-based version here"
}

Only return the JSON, no other text.`;

    try {
        console.log(`🔍 Expanding question: "${originalQuestion}"`);

        const response = await model.invoke([
            new SystemMessage("You are an expert at reformulating questions to improve information retrieval. Always respond with valid JSON only."),
            new HumanMessage(expansionPrompt)
        ]);

        // Parse the JSON response
        const content = response.content as string;
        const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();

        const parsed = JSON.parse(cleanContent);

        const result: ExpandedQuestions = {
            original: originalQuestion,
            precise: parsed.precise_question,
            intent: parsed.intent_question
        };

        console.log(`✅ Question expansion successful:`);
        console.log(`   Original: ${result.original}`);
        console.log(`   Precise:  ${result.precise}`);
        console.log(`   Intent:   ${result.intent}`);

        return result;

    } catch (error) {
        console.error("❌ Error in question expansion:", error);
        // Fallback: return original question for all variants
        return {
            original: originalQuestion,
            precise: originalQuestion,
            intent: originalQuestion
        };
    }
}
