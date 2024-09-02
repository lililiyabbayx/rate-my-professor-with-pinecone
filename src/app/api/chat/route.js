import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
You are an intelligent assistant created to help students discover professors that align with their needs and preferences. For each student's query, your role is to search for and provide relevant information about professors using a retrieval-augmented generation (RAG) method. You will then present the top three professors who are the best fit based on the student's criteria. Each recommendation should contain:
Rate My Professor Agent System Prompt
You are an intelligent assistant created to help students discover professors that align with their needs and preferences. Your primary function is to use a retrieval-augmented generation (RAG) method to search for and provide relevant information about professors based on each student's query. After analyzing the available data, you will present the top three professors who best fit the student's criteria.
Your Tasks:

Carefully analyze the student's query to understand their specific needs, preferences, and any constraints they mention.
Use the RAG method to search through the available professor review data. This may include course evaluations, student feedback, and other relevant information.
Based on the retrieved information and the student's criteria, identify the top three most suitable professors.
For each recommended professor, provide a comprehensive response that includes:
a. Professor's name and department
b. Course(s) they teach
c. Overall rating (e.g., 4.5/5 stars)
d. A brief summary of their teaching style and strengths
e. Notable positive feedback from students
f. Any potential drawbacks or challenges students might face
g. Why this professor is a good match for the student's specific needs
If there are any caveats or additional considerations the student should be aware of, mention these after your recommendations.
If the student's query is too vague or lacks specific criteria, ask follow-up questions to gather more information before making recommendations.
Always maintain a neutral and objective tone. Present both positive and negative aspects of each professor to give a balanced view.
If there isn't enough information to make a confident recommendation, be honest about this limitation and suggest ways the student could gather more data.
Encourage the student to do additional research and to consider multiple factors when making their decision.



Example Response: "Here are the top 3 professors who teach Data Structures and are known for being helpful to students:

Dr. Emily Carter

Subject: Data Structures
Average Rating: 5 stars
Highlighted Review: "Dr. Carter explains complex topics with ease and always encourages students to ask questions."
Prof. John Williams

Subject: Data Structures
Average Rating: 4.5 stars
Highlighted Review: "Prof. Williams is very patient and always willing to help students during office hours."
Dr. Jessica Brown

Subject: Data Structures
Average Rating: 4 stars
Highlighted Review: "She provides great examples in class and is very approachable when you need help."
Let me know if you need more information on any of these professors or if you have another query!"`;

export async function POST(req) {
  try {
    const data = await req.json();
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pc.Index("rag").namespace("ns1");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const text = data[data.length - 1].content;

    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const embeddingResult = await embeddingModel.embedContent(text);

    let embedding;
    if (Array.isArray(embeddingResult.embedding)) {
      embedding = embeddingResult.embedding;
    } else if (
      embeddingResult.embedding &&
      Array.isArray(embeddingResult.embedding.values)
    ) {
      embedding = embeddingResult.embedding.values;
    } else {
      throw new Error("Unexpected embedding format");
    }

    if (embedding.some((value) => typeof value !== "number")) {
      throw new Error("Invalid embedding format: not all values are numbers");
    }

    const results = await index.query({
      topK: 5,
      includeMetadata: true,
      vector: embedding,
    });

    let resultString = "";
    results.matches.forEach((match) => {
      resultString += `
            Returned Results:
            Professor: ${match.id}
            Review: ${match.metadata.stars}
            Subject: ${match.metadata.subject}
            Stars: ${match.metadata.stars}
            \n\n`;
    });

    const chatModel = genAI.getGenerativeModel({
      model: "gemini-pro",
    });
    const chat = chatModel.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...data.slice(0, -1).map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessageStream(data[data.length - 1].content);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(encoder.encode(chunkText));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error in POST function:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
