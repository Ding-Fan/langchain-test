import dotenv from 'dotenv';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import * as path from 'path';
import * as os from 'os';

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { BaseMessage, isAIMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";


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
if (process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key is configured');
} else {
    console.log('Warning: OpenAI API key is not configured');
}


(async () => {
    // https://ai.google.dev/gemini-api/docs/quickstart?lang=node
    // https://ai.google.dev/gemini-api/docs/rate-limits
    // https://ai.google.dev/gemini-api/docs/models
    const model = new ChatGoogleGenerativeAI({
        temperature: 0,
        model: "gemini-2.0-flash",
        // model: "gemini-2.5-flash-preview-05-20", // this is not working with generate() , trigger error:
        // Cannot read properties of undefined (reading 'text')
    });

    // https://platform.openai.com/docs/pricing
    // Alternative model for tool usage
    const modelForTools = new ChatOpenAI({
        temperature: 0,
        model: "gpt-4o-mini-2024-07-18",
    });

    // Simple test of the model without tools
    try {
        console.log("Testing model with a simple query...");
        const simpleResponse = await model.invoke([
            new HumanMessage("Tell me a short joke")
        ]);
        console.log("Simple model test successful:", simpleResponse.content);
    } catch (error) {
        console.error("Error in simple model test:", error);
    }

    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-large"
    });

    // Define a collection name for our blog embeddings
    const COLLECTION_NAME = "blog_embeddings";

    // Since Chroma is running in Docker, we need to connect to it via URL
    const CHROMA_URL = "http://localhost:8000"; // Default Chroma server URL

    // Try to load an existing Chroma collection or create a new one
    let vectorStore: Chroma;

    try {
        // Try to load an existing collection
        console.log("Trying to load existing Chroma collection...");
        vectorStore = await Chroma.fromExistingCollection(
            embeddings,
            {
                collectionName: COLLECTION_NAME,
                url: CHROMA_URL,
                collectionMetadata: {
                    "description": "Blog content embeddings",
                    "source": "markdown files",
                    "created_at": new Date().toISOString()
                }
            }
        );
        console.log("Successfully loaded existing Chroma collection!");
    } catch (error) {
        console.log("No existing collection found or error loading it. Creating a new one...");
        // We'll create a new collection after loading and processing documents
        vectorStore = new Chroma(
            embeddings,
            {
                collectionName: COLLECTION_NAME,
                url: CHROMA_URL,
                collectionMetadata: {
                    "description": "Blog content embeddings",
                    "source": "markdown files",
                    "created_at": new Date().toISOString()
                }
            }
        );
    }

    // Define path to your blog markdown files
    // limit to 202505 for testing
    const BLOG_DIR = path.resolve(os.homedir(), "Github/blog-nextra/content/202505");
    console.log(`Loading documents from: ${BLOG_DIR}`);

    // Check if we need to load documents (only needed for a new collection)
    try {
        // Try to get documents count to determine if collection is empty
        const collectionSize = await vectorStore.collection?.count();
        if (collectionSize && collectionSize > 0) {
            console.log(`Collection already has ${collectionSize} documents. Skipping document loading.`);
        } else {
            await loadAndProcessDocuments();
        }
    } catch (error) {
        console.log("Error checking collection size, proceeding with document loading:", error);
        await loadAndProcessDocuments();
    }

    // Function to load and process documents
    async function loadAndProcessDocuments() {
        // Create a loader for markdown files (.md and .mdx) with recursive loading
        const loader = new DirectoryLoader(
            BLOG_DIR,
            {
                ".md": (path: string) => new TextLoader(path),
                ".mdx": (path: string) => new TextLoader(path)
            },
            true  // recursive: Set to true to load documents from subdirectories
        );

        // Load documents
        console.log("Loading documents...");
        const rawDocs = await loader.load();
        console.log(`Loaded ${rawDocs.length} documents`);

        // Process documents to ensure each has proper metadata for citation
        const processedDocs = rawDocs.map(doc => {
            // Extract relative path from the full path for cleaner citation
            const relativePath = doc.metadata.source.replace(BLOG_DIR, "");

            // Create a cleaner title from the filename
            const filename = relativePath.split("/").pop() || "";
            const title = filename.replace(/\.(md|mdx)$/, "").replace(/-/g, " ");

            // Update metadata
            return {
                ...doc,
                metadata: {
                    ...doc.metadata,
                    title,
                    relativePath,
                    source: relativePath, // More user-friendly source reference
                    url: `${relativePath.replace(/\.(md|mdx)$/, "")}` // Assuming your blog URL structure
                }
            };
        });

        // Split documents into chunks
        console.log("Splitting documents into chunks...");

        const textSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
            chunkSize: 1000,
            chunkOverlap: 100,
        });

        const splitDocs = await textSplitter.splitDocuments(processedDocs);
        console.log(`Split into ${splitDocs.length} chunks`);

        // Load these documents into the vector store
        console.log("Loading documents into vector store...");
        await vectorStore.addDocuments(splitDocs);
        console.log("Documents loaded into vector store");
    }


    const retrieveSchema = z.object({ query: z.string() });

    const retrieve = tool(
        async ({ query }) => {
            // Increase from 2 to 3 for better context
            const retrievedDocs = await vectorStore.similaritySearch(query, 3);
            const serialized = retrievedDocs
                .map(
                    (doc, index) => `Source[${index + 1}]: ${doc.metadata.source}\nContent: ${doc.pageContent}`
                )
                .join("\n\n");
            return [serialized, retrievedDocs];
        },
        {
            name: "retrieve",
            description: "Retrieve information related to a query.",
            schema: retrieveSchema,
            responseFormat: "content_and_artifact",
        }
    );


    // Step 1: Generate an AIMessage that may include a tool-call to be sent.
    async function queryOrRespond(state: typeof MessagesAnnotation.State) {
        try {

            // this won't work with gemini?
            // const llmWithTools = model.bindTools([retrieve]);
            // const llmWithTools = model.bind({ tools: [retrieve] });
            // Use OpenAI for tool calling since it has better support
            const llmWithTools = modelForTools.bindTools([retrieve]);
            const response = await llmWithTools.invoke(state.messages);
            console.log("Response from queryOrRespond:", response);

            // MessagesState appends messages to state instead of overwriting
            return { messages: [response] };
        } catch (error) {
            console.error("Error in queryOrRespond:", error);
            // Return a fallback response
            return {
                messages: [
                    new AIMessage("I'm sorry, I encountered an error processing your request. Please try again later.")
                ]
            };
        }
    }

    // Step 2: Execute the retrieval.
    const tools = new ToolNode([retrieve]);

    // Step 3: Generate a response using the retrieved content.
    async function generate(state: typeof MessagesAnnotation.State) {
        // Get generated ToolMessages
        let recentToolMessages = [];
        for (let i = state["messages"].length - 1; i >= 0; i--) {
            let message = state["messages"][i];
            if (message instanceof ToolMessage) {
                recentToolMessages.push(message);
            } else {
                break;
            }
        }
        let toolMessages = recentToolMessages.reverse();

        // Format into prompt
        const docsContent = toolMessages.map((doc) => doc.content).join("\n");
        const systemMessageContent =
            "You are an assistant for question-answering tasks. " +
            "Use the following pieces of retrieved context to answer " +
            "the question. If you don't know the answer, say that you " +
            "don't know. " +
            "When you use information from the context, cite the source using " +
            "markdown footnote format like this: [^1], [^2], etc. " +
            "Include the full source path in the footnotes section at the end of your response. " +
            "Make your answers comprehensive but concise." +
            "\n\n" +
            `${docsContent}`;

        const conversationMessages = state.messages.filter(
            (message) =>
                message instanceof HumanMessage ||
                message instanceof SystemMessage ||
                (message instanceof AIMessage && message.tool_calls?.length == 0)
        );
        const prompt = [
            new SystemMessage(systemMessageContent),
            ...conversationMessages,
        ];

        // Run
        try {
            const response = await model.invoke(prompt);
            return { messages: [response] };
        } catch (error) {
            console.error("Error in generate:", error);
            // Return a fallback response
            return {
                messages: [
                    new AIMessage("I'm sorry, I encountered an error generating a response based on the retrieved information. Please try again later.")
                ]
            };
        }
    }


    const graphBuilder = new StateGraph(MessagesAnnotation)
        .addNode("queryOrRespond", queryOrRespond)
        .addNode("tools", tools)
        .addNode("generate", generate)
        .addEdge("__start__", "queryOrRespond")
        .addConditionalEdges("queryOrRespond", toolsCondition, {
            __end__: "__end__",
            tools: "tools",
        })
        .addEdge("tools", "generate")
        .addEdge("generate", "__end__");

    const graph = graphBuilder.compile();

    const prettyPrint = (message: BaseMessage) => {
        let txt = `[${message._getType()}]: ${message.content}`;
        if ((isAIMessage(message) && message.tool_calls?.length) || 0 > 0) {
            const tool_calls = (message as AIMessage)?.tool_calls
                ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
                .join("\n");
            txt += ` \nTools: \n${tool_calls}`;
        }
        console.log(txt);
    };

    let inputs1 = { messages: [{ role: "user", content: "Tell me about the blog" }] };

    for await (const step of await graph.stream(inputs1, {
        streamMode: "values",
    })) {
        const lastMessage = step.messages[step.messages.length - 1];
        prettyPrint(lastMessage);
        console.log("-----\n");
    }

    const checkpointer = new MemorySaver();
    const graphWithMemory = graphBuilder.compile({ checkpointer });

    // Specify an ID for the thread
    const threadConfig = {
        configurable: { thread_id: "abc123" },
        streamMode: "values" as const,
    };

    let inputs3 = {
        messages: [{ role: "user", content: "What application for fedora are recommended?" }],
    };

    for await (const step of await graphWithMemory.stream(inputs3, threadConfig)) {
        const lastMessage = step.messages[step.messages.length - 1];
        prettyPrint(lastMessage);
        console.log("-----\n");
    }

})();

