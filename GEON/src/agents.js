import { createChatReply } from "./ai.js";

const specialists = [
  {
    id: "pesquisador",
    instruction: "Você é o Pesquisador do GEON. Estruture o problema, separe fatos conhecidos de lacunas e indique quais evidências seriam necessárias. Não invente consultas, fontes ou resultados de navegação."
  },
  {
    id: "analisador",
    instruction: "Você é o Analisador do GEON. Examine o pedido e o material anterior, identifique requisitos, riscos, contradições e critérios de sucesso."
  },
  {
    id: "programador",
    instruction: "Você é o Programador do GEON. Proponha uma solução técnica concreta, segura, modular e testável. Não afirme que executou código ou alterou sistemas."
  },
  {
    id: "verificador",
    instruction: "Você é o Verificador do GEON. Faça revisão crítica, procure erros, pressupostos sem evidência, falhas de segurança e pontos não resolvidos. Não aprove automaticamente."
  },
  {
    id: "gestor",
    instruction: "Você é o Gestor do GEON. Consolide os resultados anteriores em um plano priorizado, com etapas, dependências e critérios de conclusão. Diferencie recomendações de ações já realizadas."
  }
];

export async function runAgentWorkflow(task) {
  const outputs = [];
  for (const specialist of specialists) {
    const context = [
      `TAREFA ORIGINAL:\n${task}`,
      ...outputs.map((item) => `RESULTADO DE ${item.agent.toUpperCase()}:\n${item.output}`)
    ].join("\n\n");
    const output = await createChatReply(
      [{ role: "user", content: context.slice(0, 24000) }],
      "chat",
      specialist.instruction
    );
    outputs.push({ agent: specialist.id, output });
  }
  const synthesis = await createChatReply(
    [{ role: "user", content: [
      `TAREFA ORIGINAL:\n${task}`,
      ...outputs.map((item) => `RESULTADO DE ${item.agent.toUpperCase()}:\n${item.output}`)
    ].join("\n\n").slice(0, 30000) }],
    "chat",
    "Você é REI, o orquestrador central do GEON. Julgue criticamente os cinco especialistas, resolva conflitos explicitamente e entregue uma resposta final com conclusão, plano de ação, riscos e itens que ainda dependem de evidência. Nunca declare que uma ação externa foi executada sem confirmação."
  );
  return { coordinator: "REI", specialists: outputs, result: synthesis };
}
