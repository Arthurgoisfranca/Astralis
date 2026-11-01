export const SYSTEMS = [
  "Ordem Paranormal 2",
  "D&D 5.5E (2024)",
  "D&D 5E",
  "Call of Cthulhu",
  "Vampire: The Masquerade 5E / 6E",
  "Daggerheart",
  "Assimilação RPG",
  "Sacramento"
];

const profiles = {
  "Ordem Paranormal 2": {
    fields: [["pv", "PV"], ["san", "SAN"], ["nexo", "Nexo"], ["defesa", "Defesa"], ["classe", "Classe"], ["nex", "NEX"]],
    references: [["Atributos", "Força · Agilidade · Intelecto · Presença · Vigor"], ["Recursos", "PV · SAN · Nexo"], ["Mesa", "Confirme a versão e as regras da campanha com o Mestre."]]
  },
  "D&D 5.5E (2024)": {
    fields: [["hp", "Pontos de vida"], ["ac", "Classe de armadura"], ["velocidade", "Deslocamento"], ["iniciativa", "Iniciativa"], ["espacos", "Espaços de magia"], ["bonus", "Bônus de proficiência"]],
    references: [["Turno", "Movimento · ação · ação bônus · reação"], ["Testes", "d20 + modificador + proficiência quando aplicável"], ["Concentração", "Encerra quando a regra ou uma condição da mesa determinar."]]
  },
  "D&D 5E": {
    fields: [["hp", "Pontos de vida"], ["ac", "Classe de armadura"], ["velocidade", "Deslocamento"], ["iniciativa", "Iniciativa"], ["espacos", "Espaços de magia"], ["bonus", "Bônus de proficiência"]],
    references: [["Turno", "Movimento · ação · ação bônus · reação"], ["Testes", "d20 + modificador + proficiência quando aplicável"], ["Concentração", "Encerra quando a regra ou uma condição da mesa determinar."]]
  },
  "Call of Cthulhu": {
    fields: [["pv", "Pontos de vida"], ["san", "Sanidade"], ["sorte", "Sorte"], ["ocupacao", "Ocupação"], ["investigacao", "Perícias principais"], ["ferimentos", "Ferimentos"]],
    references: [["Investigação", "Registre pistas, contatos e hipóteses no diário."], ["Sanidade", "Anote perdas e consequências de cena."], ["Mesa", "Confirme dificuldade e gasto de Sorte com o Mestre."]]
  },
  "Vampire: The Masquerade 5E / 6E": {
    fields: [["vitalidade", "Vitalidade"], ["fome", "Fome"], ["geracao", "Geração"], ["cla", "Clã"], ["humanidade", "Humanidade"], ["forcaVontade", "Força de vontade"]],
    references: [["Cena", "Fome · Força de vontade · Humanidade"], ["Crônica", "Clã · geração · convicções"], ["Mesa", "Confirme a edição escolhida e as regras da crônica."]]
  },
  "Daggerheart": {
    fields: [["hp", "Pontos de vida"], ["estresse", "Estresse"], ["esperanca", "Esperança"], ["evasao", "Evasão"], ["armadura", "Armadura"], ["classe", "Classe"]],
    references: [["Recursos", "Esperança · Estresse · Armadura"], ["Testes", "Resolução e consequências conforme a cena e a mesa."], ["Mesa", "Registre condições e gatilhos da ficha."]]
  },
  "Assimilação RPG": {
    fields: [["vigor", "Vigor"], ["integridade", "Integridade"], ["recurso", "Recurso"], ["arquetipo", "Arquétipo"], ["progresso", "Progresso"], ["condicoes", "Condições"]],
    references: [["Ficha", "Use os campos escolhidos pelo grupo."], ["Regras", "Adicione aqui a referência da edição usada na campanha."]]
  },
  "Sacramento": {
    fields: [["vitalidade", "Vitalidade"], ["fe", "Fé"], ["ruina", "Ruína"], ["voto", "Voto"], ["progresso", "Progresso"], ["condicoes", "Condições"]],
    references: [["Ficha", "Use os campos escolhidos pelo grupo."], ["Regras", "Adicione aqui a referência da edição usada na campanha."]]
  }
};
export function systemProfile(system) {
  const profile = profiles[system];
  return profile || { fields: [["hp", "PV"], ["ac", "Defesa"], ["recurso", "Recurso"], ["classe", "Classe / arquétipo"]], references: [["Mesa", "Defina as referências da campanha com o Mestre."]] };
}
