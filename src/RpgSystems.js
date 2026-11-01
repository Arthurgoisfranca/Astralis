export const SYSTEMS = [
  "Ordem Paranormal 2",
  "D&D 5.5E (2024)",
  "D&D 5E",
  "Call of Cthulhu",
  "Vampire: The Masquerade 5E / 6E",
  "Daggerheart",
  "Triangle Agency",
  "Sacramento",
  "Assimilação RPG"
];

const profiles = {
  "Ordem Paranormal 2": {
    fields: [["physical", "Físico"], ["mind", "Mente"], ["emotion", "Emoção"], ["pv", "Pontos de Vida"], ["pe", "Pontos de Esforço"], ["san", "Sanidade"], ["nexus", "Nexo"], ["pd", "Pontos de Desgaste"], ["classe", "Classe"], ["nivel", "Nível"], ["pericias", "Perícias e modificadores"], ["relacoes", "Relações"], ["marcas", "Marcas de nível"]],
    references: [["Atributos", "Físico · Mente · Emoção"], ["Recursos", "PV · PE · SAN · Nexo"], ["Testes", "Registre a perícia e o modificador conforme a versão usada na campanha."], ["Conflito", "Anote ameaças e resistências de acordo com os acordos da mesa."]]
  },
  "Daggerheart": {
    fields: [["agility", "Agility"], ["strength", "Strength"], ["finesse", "Finesse"], ["instinct", "Instinct"], ["presence", "Presence"], ["knowledge", "Knowledge"], ["evasion", "Evasão"], ["minor", "Limiar menor"], ["major", "Limiar maior"], ["severe", "Limiar severo"], ["hp", "Pontos de Vida"], ["stress", "Estresse"], ["hope", "Esperança"], ["armor", "Armadura"], ["damage", "Dano a comparar"], ["level", "Nível"], ["domains", "Domínios"], ["subclasses", "Subclasses e tags"]],
    references: [["Recursos", "PV · Estresse · Esperança · Armadura"], ["Dano", "Compare o dano aos limiares menor, maior e severo registrados na ficha."], ["Rolagens", "Registre o resultado dos Dados de Ação e se a resolução favoreceu Esperança ou Medo."], ["Medo", "Anote o conjunto de Medo da cena e as ações do Mestre."]]
  },
  "Call of Cthulhu": {
    fields: [["str", "FOR"], ["dex", "DES"], ["con", "CON"], ["app", "APA"], ["edu", "EDU"], ["siz", "TAM"], ["int", "INT"], ["pow", "POD"], ["san", "Sanidade"], ["luck", "Sorte"], ["magicPoints", "Pontos de Magia"], ["hitPoints", "Pontos de Vida"], ["movement", "Movimento"], ["skills", "Perícias (%)"], ["history", "Histórico"], ["phobias", "Fobias e manias"], ["occupation", "Ocupação"], ["injuries", "Ferimentos"]],
    references: [["Características", "FOR · DES · CON · APA · EDU · TAM · INT · POD"], ["Perícias", "Dificuldade regular: valor base; difícil: metade; extremo: um quinto."], ["Sanidade", "Acompanhe perdas e efeitos de insanidade conforme a edição."], ["Testes forçados", "Registre a justificativa e a consequência antes de uma nova tentativa."]]
  },
  "Vampire: The Masquerade 5E / 6E": {
    fields: [["strength", "Força"], ["dexterity", "Destreza"], ["stamina", "Vigor"], ["charisma", "Carisma"], ["manipulation", "Manipulação"], ["composure", "Autocontrole"], ["intelligence", "Inteligência"], ["wits", "Raciocínio"], ["resolve", "Determinação"], ["hunger", "Fome (0–5)"], ["pool", "Conjunto de dados da cena"], ["humanity", "Humanidade"], ["bloodPotency", "Potência de Sangue"], ["health", "Vitalidade"], ["willpower", "Força de Vontade"], ["disciplines", "Disciplinas"], ["convictions", "Convicções"]],
    references: [["Atributos", "Físicos · Sociais · Mentais; registre círculos da ficha."], ["Fome", "Separe os dados de Fome do conjunto de dados normais."], ["Testes", "Acompanhe testes de Rouse, ressonância e frenesi conforme a crônica."], ["Humanidade", "Registre convicções e consequências da crônica."]]
  },
  "Triangle Agency": {
    fields: [["attentiveness", "Attentiveness"], ["duplicity", "Duplicity"], ["dynamism", "Dynamism"], ["empathy", "Empathy"], ["initiative", "Initiative"], ["persistence", "Persistence"], ["presence", "Presence"], ["professionalism", "Professionalism"], ["subtlety", "Subtlety"], ["realityStatus", "Status da Realidade"], ["competency", "Competência"], ["anomalies", "Anomalias"], ["requisitions", "Requisitions"], ["chaosPool", "Chaos Pool"], ["missionHistory", "Relatórios de missão"]],
    references: [["Quality Assurances", "Attentiveness · Duplicity · Dynamism · Empathy · Initiative · Persistence · Presence · Professionalism · Subtlety."], ["Realidade", "Registre status e alterações percebidas pela agência."], ["Chaos Pool", "Acompanhe a reserva da cena e as consequências do uso."], ["Missões", "Mantenha relatórios e Requisitions vinculados à missão."]]
  },
  "D&D 5.5E (2024)": {
    fields: [["strength", "Força"], ["dexterity", "Destreza"], ["constitution", "Constituição"], ["intelligence", "Inteligência"], ["wisdom", "Sabedoria"], ["charisma", "Carisma"], ["proficiencyBonus", "Bônus de proficiência"], ["level", "Nível"], ["hp", "Pontos de Vida"], ["ac", "Classe de Armadura"], ["initiative", "Iniciativa"], ["speed", "Deslocamento"], ["spellSlots", "Espaços de magia (1º–9º)"], ["originFeats", "Talentos de Origem"], ["classFeatures", "Características de Classe"], ["savingThrows", "Testes de resistência"], ["skillProficiencies", "Perícias treinadas"]],
    references: [["Modificadores", "Modificador de atributo = floor((valor − 10) / 2)."], ["Turno", "Movimento · ação · ação bônus · reação."], ["Combate", "Acompanhe CA, iniciativa, deslocamento, PV e recursos de classe."], ["Magia", "Registre espaços usados por círculo."]]
  },
  "D&D 5E": {
    fields: [["strength", "Força"], ["dexterity", "Destreza"], ["constitution", "Constituição"], ["intelligence", "Inteligência"], ["wisdom", "Sabedoria"], ["charisma", "Carisma"], ["proficiencyBonus", "Bônus de proficiência"], ["level", "Nível"], ["hp", "Pontos de Vida"], ["ac", "Classe de Armadura"], ["initiative", "Iniciativa"], ["speed", "Deslocamento"], ["spellSlots", "Espaços de magia (1º–9º)"], ["originFeats", "Talentos"], ["classFeatures", "Características de Classe"], ["savingThrows", "Testes de resistência"], ["skillProficiencies", "Perícias treinadas"]],
    references: [["Modificadores", "Modificador de atributo = floor((valor − 10) / 2)."], ["Turno", "Movimento · ação · ação bônus · reação."], ["Combate", "Acompanhe CA, iniciativa, deslocamento, PV e recursos de classe."], ["Magia", "Registre espaços usados por círculo."]]
  },
  "Sacramento": {
    fields: [["physical", "Físico"], ["speed", "Velocidade"], ["intellect", "Intelecto"], ["courage", "Coragem"], ["lifeCircles", "Círculos de Vida (6)"], ["painCircles", "Círculos de Dor (6)"], ["combatActions", "Ações de combate e movimento"], ["backgrounds", "Antecedentes"], ["mountName", "Montaria"], ["mountPower", "Potência da montaria"], ["mountResistance", "Resistência da montaria"]],
    references: [["Vida", "A ficha reserva seis círculos de Vida."], ["Dor", "Registre condições e consequências conforme a versão da mesa."], ["Conflito", "Consulte os acordos da mesa para resolução e penalidades."], ["Montaria", "Acompanhe Potência e Resistência separadamente."]]
  },
  "Assimilação RPG": {
    fields: [["vigor", "Vigor"], ["integridade", "Integridade"], ["recurso", "Recurso"], ["arquetipo", "Arquétipo"], ["progresso", "Progresso"], ["condicoes", "Condições"]],
    references: [["Ficha", "Use os campos definidos pelo grupo."], ["Regras", "Registre a edição e as referências escolhidas para a campanha."]]
  }
};

export function systemProfile(system) {
  return profiles[system] || {
    fields: [["hp", "Pontos de Vida"], ["ac", "Defesa"], ["resource", "Recurso"], ["class", "Classe / arquétipo"]],
    references: [["Mesa", "Defina as referências da campanha com o Mestre."]]
  };
}