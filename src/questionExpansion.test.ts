import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { questionExpansion, type ExpandedQuestions } from './questionExpansion';

// Load environment variables
dotenv.config();

/**
 * Test the questionExpansion function independently
 */
async function testQuestionExpansion() {
    console.log('🧪 Starting Question Expansion Tests\n');

    // Initialize the model
    const model = new ChatGoogleGenerativeAI({
        temperature: 0,
        model: "gemini-2.0-flash",
    });

    // Test cases
    const testQuestions = [
        "What application for fedora are recommended?",
        "How do I optimize React performance?",
        "Best practices for database design?",
        "Docker vs Kubernetes differences",
        "Setup TypeScript project"
    ];

    for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        console.log(`\n--- Test ${i + 1}/${testQuestions.length} ---`);

        try {
            const result = await questionExpansion(question, model);

            console.log(`Original: ${result.original}`);
            console.log(`Precise:  ${result.precise}`);
            console.log(`Intent:   ${result.intent}`);

            // Verify that we got different variations (unless fallback was used)
            const allSame = result.original === result.precise && result.precise === result.intent;
            if (allSame) {
                console.log('⚠️  All questions are the same (likely fallback was used)');
            } else {
                console.log('✅ Successfully generated question variations');
            }

        } catch (error) {
            console.error(`❌ Test failed for question: "${question}"`, error);
        }

        // Add a small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🏁 Question Expansion Tests Completed');
}

// Run the tests if this file is executed directly
if (require.main === module) {
    testQuestionExpansion().catch(console.error);
}

export { testQuestionExpansion };
