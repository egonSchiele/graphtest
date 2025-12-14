import { Graph } from "graph";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

function add(a: number, b: number): number {
  return a + b;
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "add",
      description: "Add two numbers",
      parameters: {
        type: "object",
        properties: {
          a: {
            type: "number",
            description: "The first number",
          },
          b: {
            type: "number",
            description: "The second number",
          },
        },
        required: ["a", "b"],
      },
    },
  },
];

type State = {
  count: number;
  messages: any[];
  toolCalls?: any[];
};

const graph = new Graph<State>();

graph.node("llm", async (state) => {
  console.log("state", JSON.stringify(state, null, 2));
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    tools,
    messages: state.messages,
  });
  console.log(">>>", JSON.stringify(completion.choices, null, 2));
  const message = completion.choices[0].message;
  const toolCalls = completion.choices[0].message.tool_calls;
  const newState = { ...state };
  if (message && message.content)
    newState.messages.push({
      role: "assistant",
      content: message.content || "",
    });
  if (toolCalls) {
    newState.toolCalls = toolCalls.map((toolCall: any) => toolCall.function);
    console.log("FUCK another tool call");
  }
  console.log("new state", JSON.stringify(newState, null, 2));
  return newState;
});

graph.node("tools", async (state) => {
  if (state.toolCalls) {
    for (const toolCall of state.toolCalls) {
      if (toolCall.name === "add") {
        const args = JSON.parse(toolCall.arguments);
        const result = add(args.a, args.b);
        const newMessage = {
          role: "assistant",
          content: result.toString(),
        };
        const newState = { ...state };
        newState.messages.push(newMessage);
        newState.toolCalls = [];
        return newState;
      }
    }
  }
  return { ...state, toolCalls: [] };
});

graph.node("finish", async (state) => state);

graph.edge("llm", async (state) => {
  console.log("in conditional edge:", JSON.stringify(state, null, 2));
  if (state.toolCalls && state.toolCalls.length > 0) {
    return "tools";
  }
  return "finish";
});

graph.edge("tools", "llm");

const initialState: State = {
  count: 0,
  messages: [{ role: "user", content: "Add 1 + 1" }],
};
const finalState = graph.run("llm", initialState);

console.log(finalState);

graph.prettyPrint();
