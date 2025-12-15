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
};

const nodes = ["llm", "tools", "finish"] as const;
type Node = typeof nodes[number];
const graph = new Graph<State, Node>(nodes, {
  debug: true,
  logData: true,
});

graph.node("llm", async (state) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    tools,
    messages: state.messages,
  });
  const message = completion.choices[0].message;
  const newMessage: any = {
    role: "assistant",
    content: message.content || "",
  };
  if (message.tool_calls && message.tool_calls.length > 0) {
    newMessage.tool_calls = message.tool_calls;
  }
  return { ...state, messages: [...state.messages, newMessage] };
});

graph.node("tools", async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls) {
    const newState = { ...state };
    for (const toolCall of lastMessage.tool_calls) {
      if (toolCall.function.name === "add") {
        const args = JSON.parse(toolCall.function.arguments);
        const result = add(args.a, args.b);
        const newMessage = {
          role: "tool",
          content: result.toString(),
          tool_call_id: toolCall.id,
        };
        newState.messages.push(newMessage);
      }
    }
    return newState;
  }
  return state;
});

graph.node("finish", async (state) => state);

graph.conditionalEdge("llm", ["tools", "finish"], async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "finish";
});

graph.edge("tools", "llm");

async function main() {
  const input = "What is 1 + 10 + 100?";
  const initialState: State = {
    count: 0,
    messages: [{ role: "user", content: input }],
  };
  const finalState = await graph.run("llm", initialState);

  console.log(finalState);
}
main();
graph.prettyPrint();