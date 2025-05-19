import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
    START,
    END,
    StateGraph,
    MemorySaver,
    MessagesAnnotation,
    Annotation,
} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Load environment variables from .env file
dotenv.config();

// Example of accessing environment variables
console.log('Environment setup complete');

// Check if API key is available (don't log the actual key in production)
if (process.env.GOOGLE_API_KEY) {
    console.log('Google API key is configured');
} else {
    console.log('Warning: Google API key is not configured');
}

// https://ai.google.dev/gemini-api/docs/quickstart?lang=node
// https://ai.google.dev/gemini-api/docs/rate-limits
const model = new ChatGoogleGenerativeAI({
    temperature: 0.9,
    model: "gemini-2.0-flash",
});

// const result = await model.invoke(
//     "What would be a good company name for a company that makes colorful socks?"
// );

// const messages = [
//     new SystemMessage("Translate the following from English into Japanese"),
//     new HumanMessage("hi!"),
// ];

// (async () => {
//     const result = await model.invoke(messages);

//     console.log(result);
// })();

(async () => {
    // // Define the function that calls the model
    // const callModel = async (state: typeof MessagesAnnotation.State) => {
    //     const response = await model.invoke(state.messages);
    //     return { messages: response };
    // };

    // // Define a new graph
    // const workflow = new StateGraph(MessagesAnnotation)
    //     // Define the node and edge
    //     .addNode("model", callModel)
    //     .addEdge(START, "model")
    //     .addEdge("model", END);

    // // Add memory
    // const memory = new MemorySaver();
    // const app = workflow.compile({ checkpointer: memory });
    // const config = { configurable: { thread_id: uuidv4() } };

    // const input = [
    //     {
    //         role: "user",
    //         content: "Hi! I'm Bob.",
    //     },
    // ];
    // const output = await app.invoke({ messages: input }, config);
    // // The output contains all messages in the state.
    // console.log("Hi! I'm Bob.");
    // console.log("---");
    // console.log(output.messages[output.messages.length - 1]);

    // const input2 = [
    //     {
    //         role: "user",
    //         content: "What's my name?",
    //     },
    // ];

    // const output2 = await app.invoke({ messages: input2 }, config);
    // console.log("What's my name?");
    // console.log("---");
    // console.log(output2.messages[output2.messages.length - 1]);

    // const config2 = { configurable: { thread_id: uuidv4() } };
    // const input3 = [
    //     {
    //         role: "user",
    //         content: "What's my name?",
    //     },
    // ];

    // const output3 = await app.invoke({ messages: input3 }, config2);
    // console.log("What's my name?");
    // console.log("---");
    // console.log(output3.messages[output3.messages.length - 1]);

    // const output4 = await app.invoke({ messages: input2 }, config);
    // console.log("What's my name?");
    // console.log("---");
    // console.log(output4.messages[output4.messages.length - 1]);

    const promptTemplate2 = ChatPromptTemplate.fromMessages([
        [
            "system",
            "You are a helpful assistant. Answer all questions to the best of your ability in {language}.",
        ],
        ["placeholder", "{messages}"],
    ]);

    // Define the State
    const GraphAnnotation = Annotation.Root({
        ...MessagesAnnotation.spec,
        language: Annotation<string>(),
    });

    // Define the function that calls the model
    const callModel3 = async (state: typeof GraphAnnotation.State) => {
        const prompt = await promptTemplate2.invoke(state);
        const response = await model.invoke(prompt);
        return { messages: [response] };
    };

    const workflow3 = new StateGraph(GraphAnnotation)
        .addNode("model", callModel3)
        .addEdge(START, "model")
        .addEdge("model", END);

    const app3 = workflow3.compile({ checkpointer: new MemorySaver() });

    const config4 = { configurable: { thread_id: uuidv4() } };
    const input6 = {
        messages: [
            {
                role: "user",
                content: "Hi im bob",
            },
        ],
        // language: "Burmese",
        language: "Japanese",
    };
    const output7 = await app3.invoke(input6, config4);
    console.log(output7.messages[output7.messages.length - 1]);

    const input7 = {
        messages: [
            {
                role: "user",
                content: "What is my name?",
            },
        ],
    };
    const output8 = await app3.invoke(input7, config4);
    console.log(output8.messages[output8.messages.length - 1]);
})();

