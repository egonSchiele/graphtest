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
    type: "function",
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
  messages: string[];
};

const graph = new Graph<State>();

graph.node("llm", async (state) => {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    tools,
    messages: [{ role: "developer", content: "Add 1 + 1" }],
  });

  console.log(completion.choices[0].message.content);
  return state;
});

graph.node("tools", async (data) => {
  return data;
});

graph.node("finish", async (data) => data);

graph.edge("start", "tools");

const initialState: State = { count: 0, messages: [] };
const finalState = graph.run("start", initialState);

console.log(finalState);

graph.prettyPrint();
