import { Graph } from "graph";

type State = {
  count: number;
  log: string[];
};

const graph = new Graph<State>();

graph.node("start", (data) => {
  return {
    ...data,
    log: [...data.log, "Starting computation"],
  };
});

graph.node("increment", (data) => {
  return {
    ...data,
    count: data.count + 1,
    log: [...data.log, `Incremented count to ${data.count + 1}`],
  };
});

graph.node("finish", (data) => data);

graph.edge("start", "increment");
graph.edge("increment", (data) => {
  if (data.count < 5) {
    return "increment";
  } else {
    return "finish";
  }
});

const initialState: State = { count: 0, log: [] };
const finalState = graph.run("start", initialState);

console.log(finalState);

graph.prettyPrint();
