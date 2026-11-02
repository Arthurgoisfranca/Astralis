export const SYSTEMS = [
  "Ordem Paranormal 2",
  "D&D 5.5E (2024)",
  "D&D 5E",
  "Call of Cthulhu",
  "Vampire: The Masquerade 5E / 6E",
  "Daggerheart",
  "Triangle Agency",
  "Sacramento",
  "Assimilação RPG",
  "Cairn 2e"
];

const dndFields = [
  ["strength", "Força"], ["dexterity", "Destreza"], ["constitution", "Constituição"],
  ["intelligence", "Inteligência"], ["wisdom", "Sabedoria"], ["charisma", "Carisma"],
  ["proficiencyBonus", "Bônus de proficiência"], ["level", "Nível"],
  ["hp", "Pontos de Vida"], ["ac", "Classe de Armadura"], ["initiative", "Iniciativa"],
  ["speed", "Deslocamento"], ["spellSlots", "Espaços de magia (1º–9º)"],
  ["originFeats", "Talentos de Origem"], ["classFeatures", "Características de Classe"],
  ["savingThrows", "Testes de resistência"], ["skillProficiencies", "Perícias treinadas"]
];

const profiles = {
  "Ordem Paranormal 2": {
    fields: [["physical", "Físico"], ["mind", "Mente"], ["emotion", "Emoção"], ["pv", "Pontos de Vida"], ["pd", "Pontos de Determinação (PD)"], ["role", "Origem / papel"], ["nivel", "Nível de Agente"], ["pericias", "Perícias e dados de treino"], ["relacoes", "Relações"], ["marcas", "Marcas de nível"], ["inventory", "Inventário e carga"], ["conditions", "Condições"]],
    shield: {
      source: "PLAYTEST BETA · MISSÃO 1",
      scope: "Ordem Paranormal RPG · referências limitadas ao playtest enviado.",
      notice: "Os valores desta tela seguem o playtest recebido; não misturam condições ou dificuldades de outros sistemas.",
      sections: [
        { title: "Testes", items: [
          ["Rolagem", "Role o dado do atributo e o da perícia (d4 a d20), some os resultados e compare com a DT."],
          ["DT padrão", "7 neste playtest, salvo quando o texto indicar outro valor."],
          ["Teste oposto", "Os dois lados rolam; vence o maior resultado."],
          ["RA e RB", "Rolagem Alta e Rolagem Baixa são os maiores e menores resultados individuais dos dados."]
        ]},
        { title: "Dado de Pavor", items: [
          ["Rolagem", "Role 1d6 junto com o teste; o resultado não é somado."],
          ["Cancelamento", "O Dado de Pavor anula resultados menores nos dados do teste. Se anular todos, ocorre falha crítica."],
          ["Reduzir", "Gaste 1 PD antes do teste para reduzir o Dado de Pavor em um passo."],
          ["Abraçar", "Gaste 5 PD antes do teste para converter o Dado de Pavor em um dado bônus."]
        ]},
        { title: "Investigação", items: [
          ["Ponto de interesse", "O Mestre descreve o ponto e informa quais perícias podem ser usadas."],
          ["Observar", "A perícia escolhida entrega, sem rolagem, as pistas cujas DTs não superem o valor do dado da perícia."],
          ["Aprofundar", "Depois de Investigar, escolha Observar ou Examinar; Interagir é uma alternativa separada."]
        ]},
        { title: "Ordem do combate", items: [
          ["Fases", "Ações gerais (exceto ataques) → ataques à distância → ataques corpo a corpo e manobras."],
          ["Rodada", "Resolva uma fase por vez antes de passar à próxima."],
          ["Manobras", "Substituem um ataque corpo a corpo por um teste oposto; não são ataques à distância."]
        ]},
        { title: "Cobertura e estados", items: [
          ["Caído", "Reduz um passo nos testes físicos; ataques corpo a corpo contra o alvo recebem aumento de passo; ataques à distância têm DT +3."],
          ["Cobertura leve", "Aumenta em +3 a DT para atingir o alvo; os valores indicados no texto são 10 a alcance curto e 13 a alcance longo."],
          ["Cobertura total", "Impede que o personagem seja atacado."],
          ["Ocultação", "Leve: reduz um passo nos testes de ataque contra o alvo. Total: reduz dois passos."]
        ]},
        { title: "Trauma", items: [
          ["Gatilho", "Ao chegar a 0 PD por efeito externo, ou receber dano emocional já em 0 PD, faça um teste de trauma."],
          ["Teste", "Emoção + Disciplina contra DT 7; some +3 à DT para cada teste de trauma anterior na cena."],
          ["Falha", "Role na tabela de traumas do playtest."]
        ]}
      ]
    }
  },
  "Daggerheart": {
    fields: [["agility", "Agility"], ["strength", "Strength"], ["finesse", "Finesse"], ["instinct", "Instinct"], ["presence", "Presence"], ["knowledge", "Knowledge"], ["evasion", "Evasão"], ["minor", "Limiar menor"], ["major", "Limiar maior"], ["severe", "Limiar grave"], ["hp", "Pontos de Vida"], ["stress", "Pontos de Fadiga (PF)"], ["hope", "Esperança"], ["armor", "Armadura"], ["damage", "Dano a comparar"], ["level", "Nível"], ["domains", "Domínios"], ["subclasses", "Subclasses e tags"]],
    shield: {
      source: "LIVRO BÁSICO · DAGGERHEART",
      scope: "Dados de Dualidade, Esperança, Medo, limiares de dano e ferramentas do Mestre.",
      sections: [
        { title: "Teste de ação", items: [
          ["Rolagem", "Role os dois d12 de Dualidade, some o atributo e os modificadores e compare com a Dificuldade."],
          ["Dado que prevalece", "O maior d12 define se o resultado vem com Esperança ou Medo."],
          ["Crítico", "Dados iguais formam um sucesso crítico, mesmo se o total não alcançar a Dificuldade."]
        ]},
        { title: "Cinco resultados", items: [
          ["Crítico", "Consegue o objetivo e algo a mais; recebe 1 Esperança e recupera 1 PF."],
          ["Sucesso + Esperança", "Consegue o que queria e recebe 1 Esperança."],
          ["Sucesso + Medo", "Consegue, mas há consequência; o Mestre recebe 1 Medo."],
          ["Falha + Esperança", "Não consegue e enfrenta consequência; recebe 1 Esperança."],
          ["Falha + Medo", "Não consegue e a situação piora; o Mestre recebe 1 Medo."]
        ]},
        { title: "Reserva de Medo", items: [
          ["Início", "Comece com um ponto de Medo por personagem."],
          ["Ganho", "Receba 1 Medo quando um personagem rolar com Medo; outras habilidades também podem concedê-lo."],
          ["Limite", "A reserva comporta até 12 pontos."],
          ["Uso", "Gaste Medo para declarar movimentos de Medo e elevar o risco da cena."]
        ]},
        { title: "Dano e proteção", items: [
          ["Limiar", "Some o nível do personagem aos limiares base da armadura."],
          ["Dano menor", "Marque 1 PV."],
          ["Dano maior", "Marque 2 PV."],
          ["Dano grave", "Marque 3 PV; compare o dano sofrido aos limiares finais."]
        ]},
        { title: "Adversários", items: [
          ["Ataque padrão", "Use o modificador, alcance e dano do bloco do adversário."],
          ["Ações únicas", "Confira ações especiais e reações no bloco antes de resolver a vez do adversário."],
          ["Medo", "Movimentos de Medo devem alterar a cena, aumentar riscos ou mudar o rumo do conflito."]
        ]}
      ]
    }
  },
  "Call of Cthulhu": {
    fields: [["str", "FOR"], ["dex", "DES"], ["con", "CON"], ["app", "APA"], ["edu", "EDU"], ["siz", "TAM"], ["int", "INT"], ["pow", "POD"], ["san", "Sanidade"], ["luck", "Sorte"], ["magicPoints", "Pontos de Magia"], ["hitPoints", "Pontos de Vida"], ["movement", "Movimento"], ["skills", "Perícias (%)"], ["history", "Histórico"], ["phobias", "Fobias e manias"], ["occupation", "Ocupação"], ["injuries", "Ferimentos"]],
    shield: {
      source: "LIVRO BÁSICO · 7ª EDIÇÃO",
      scope: "Referências para o Guardião: testes percentuais, Sanidade, combate e ferimentos.",
      sections: [
        { title: "Testes percentuais", items: [
          ["Regular", "Sucesso quando o D100 fica igual ou abaixo do valor da perícia."],
          ["Difícil", "Use metade do valor da perícia, arredondando para baixo."],
          ["Extremo", "Use um quinto do valor da perícia, arredondando para baixo."],
          ["Confronto", "Compare os níveis de sucesso; em empate, use as regras de confronto do livro."]
        ]},
        { title: "Testes forçados", items: [
          ["Quando permitir", "Só aceite quando a abordagem narrada justificar uma nova tentativa; testes de combate não podem ser forçados."],
          ["Antes da rolagem", "Deixe claro o risco e a consequência de uma nova falha."],
          ["Resultado", "Uma falha no teste forçado aciona a consequência estabelecida para aquela situação."]
        ]},
        { title: "Sanidade", items: [
          ["Teste", "D100 igual ou abaixo da Sanidade atual: sucesso."],
          ["Perda", "A fonte de horror define duas perdas: aplique a menor no sucesso e a maior na falha."],
          ["Insanidade temporária", "Uma perda de 5 ou mais pontos de SAN por uma única fonte exige verificar insanidade temporária."]
        ]},
        { title: "Combate e ferimentos", items: [
          ["Iniciativa", "A ordem padrão começa pela DES mais alta; o livro também apresenta uma opção por níveis de sucesso."],
          ["Ferimento grave", "Um único golpe que cause ao menos metade dos PV máximos exige teste de CON para permanecer consciente."],
          ["0 PV", "O investigador fica inconsciente."]
        ]}
      ]
    }
  },
  "Vampire: The Masquerade 5E / 6E": {
    fields: [["strength", "Força"], ["dexterity", "Destreza"], ["stamina", "Vigor"], ["charisma", "Carisma"], ["manipulation", "Manipulação"], ["composure", "Autocontrole"], ["intelligence", "Inteligência"], ["wits", "Raciocínio"], ["resolve", "Determinação"], ["hunger", "Fome (0–5)"], ["pool", "Conjunto de dados da cena"], ["humanity", "Humanidade"], ["bloodPotency", "Potência de Sangue"], ["health", "Vitalidade"], ["willpower", "Força de Vontade"], ["disciplines", "Disciplinas"], ["convictions", "Convicções"]],
    shield: {
      source: "MANUAL BÁSICO · V5",
      scope: "Escudo de Narrador baseado no manual V5 enviado.",
      notice: "O material recebido é da V5. Regras de outra edição ou variante da mesa ficam nas anotações privadas.",
      sections: [
        { title: "Parada e Fome", items: [
          ["Parada", "Monte a parada pela ação e separe dados comuns dos dados de Fome."],
          ["Substituição", "O número de dados de Fome acompanha a Fome atual, até o tamanho da parada."],
          ["Novas rolagens", "Dados de Fome não podem ser rerrolados com Força de Vontade."]
        ]},
        { title: "Checagem de Sangue", items: [
          ["Rolagem", "Checagem básica: 1d10; 6 ou mais mantém a Fome, 1–5 aumenta em 1. A Potência de Sangue pode alterar checagens específicas."],
          ["Aplicação", "Use para despertar e ativar poderes que exigem sangue; confira o custo específico."]
        ]},
        { title: "Resultados bestiais", items: [
          ["Falha bestial", "Se a rolagem falhar e algum dado de Fome mostrar 1, a Fera toma o controle do resultado."],
          ["Crítico bestial", "Um crítico que inclua 10 em dado de Fome tem sucesso com manifestação da Fera."],
          ["Força de Vontade", "Só os dados comuns podem ser rerrolados."]
        ]},
        { title: "Frenesi e ressonância", items: [
          ["Fúria", "Amigo morto ou humilhação pública: dificuldade 1; provocação ou ofensa por inferior: 2; Pilar ferido: 3; Pilar morto: 4."],
          ["Fome", "Falha em Checagem de Sangue com Fome 5 aciona teste; sangue visível ou odor dominante pode provocar frenesi com Fome 4 ou mais."],
          ["Terror", "Fogueira: dificuldade 2; construção em chamas ou luz solar obscurecida: 3; queimadura ou exposição total ao sol: 4."],
          ["Teste", "Resista com Autocontrole + Determinação; a dificuldade depende do gatilho."],
          ["Ressonâncias", "Registre o temperamento do sangue: Sanguínea, Colérica, Melancólica ou Fleumática."],
          ["Cena", "Vincule o resultado à Fome, à presa e à consequência da crônica."]
        ]}
      ]
    }
  },
  "Triangle Agency": {
    fields: [["attentiveness", "Atenção"], ["duplicity", "Duplicidade"], ["dynamism", "Dinamismo"], ["empathy", "Empatia"], ["initiative", "Iniciativa"], ["persistence", "Persistência"], ["presence", "Presença"], ["professionalism", "Profissionalismo"], ["subtlety", "Sutileza"], ["realityStatus", "Status da Realidade"], ["competency", "Competência"], ["anomalies", "Anomalias"], ["requisitions", "Requisições"], ["chaosPool", "Reserva de Caos"], ["missionHistory", "Relatórios de missão"]],
    shield: {
      source: "TRIANGLE AGENCY · V1.21",
      scope: "Referências do Gerente de Missão: 3s, Garantias de Qualidade, Burnout e Caos.",
      sections: [
        { title: "Teste de Agência", items: [
          ["Dados", "Role sempre seis d4."],
          ["Sucesso", "Cada resultado 3 conta; pelo menos um 3 significa sucesso."],
          ["Caos", "Cada dado que não mostrar 3 adiciona 1 à Reserva de Caos."],
          ["Efeitos", "3s adicionais podem liberar efeitos previstos pela habilidade ou situação."]
        ]},
        { title: "Triscendência", items: [
          ["Gatilho", "Exatamente três 3s antes de qualquer ajuste."],
          ["Efeito", "O teste é bem-sucedido, não gera Caos e libera um efeito adicional da tabela."],
          ["Exceção", "Três 3s sempre significam zero Caos, mesmo quando o resultado não conta como Triscendência."]
        ]},
        { title: "Garantias e Burnout", items: [
          ["Garantias de Qualidade", "Recurso limitado ligado às nove Qualidades; reserve ajustes para testes decisivos."],
          ["Burnout", "Ao usar uma Qualidade sem Garantias restantes, remova um 3 do teste e adicione 1 Caos."],
          ["Sem 3 disponível", "Burnout ainda adiciona Caos, mesmo quando não consegue remover um 3."]
        ]},
        { title: "Condução da missão", items: [
          ["Pistas", "Um incidente chama a Agência; a investigação inicial aponta pistas e caminhos diferentes."],
          ["Domínio", "As pistas levam ao Domínio da Anomalia; prepare o encontro e a captura."],
          ["Relatório", "Registre o destino da Anomalia, Pontas Soltas e análise para a próxima missão."]
        ]}
      ]
    }
  },
  "D&D 5.5E (2024)": {
    fields: dndFields,
    shield: {
      source: "LIVRO DO JOGADOR · 2024",
      scope: "Referência 5.5E: turno, CDs, condições, cobertura, iluminação, objetos e serviços.",
      sections: [
        { title: "Turno e ações", items: [
          ["Movimento", "Pode ser dividido antes e depois de uma ação, Ação Bônus ou Reação."],
          ["Ação Bônus", "Só fica disponível quando uma característica, magia ou regra permite; no máximo uma por turno."],
          ["Ações", "Atacar · Correr · Desengajar · Esconder-se · Esquivar · Ajudar · Influenciar · Preparar · Procurar · Estudar · Usar Magia · Usar Objeto."],
          ["Interação", "Uma interação simples com objeto é gratuita durante movimento ou ação; interações adicionais podem exigir Usar Objeto."]
        ]},
        { title: "Classes de dificuldade", items: [
          ["5", "Muito fácil"], ["10", "Fácil"], ["15", "Média"],
          ["20", "Difícil"], ["25", "Muito difícil"], ["30", "Quase impossível"]
        ]},
        { title: "Condições frequentes", items: [
          ["Amedrontado", "Desvantagem em testes e ataques enquanto a fonte estiver à vista; não pode se aproximar voluntariamente dela."],
          ["Atordoado", "Incapacitado, Deslocamento 0, falha em salvaguardas de Força e Destreza; ataques contra têm Vantagem."],
          ["Caído", "Rasteja ou gasta metade do Deslocamento para se levantar; ataques próprios têm Desvantagem."],
          ["Contido", "Deslocamento 0; ataques contra têm Vantagem; ataques próprios e salvaguardas de Destreza têm Desvantagem."],
          ["Envenenado", "Desvantagem em jogadas de ataque e testes de atributo."]
        ]},
        { title: "Cobertura e visão", items: [
          ["Parcial", "+2 na CA e em Salvaguardas de Destreza."],
          ["Três quartos", "+5 na CA e em Salvaguardas de Destreza."],
          ["Total", "Não pode ser alvejado diretamente."],
          ["Parcialmente obscurecida", "Desvantagem em Percepção baseada na visão."],
          ["Totalmente obscurecida", "Não é possível ver através; a criatura fica Cega ao tentar enxergar ali."],
          ["Luz", "Luz plena permite visão normal; meia-luz é parcialmente obscurecida; escuridão é totalmente obscurecida."]
        ]},
        { title: "Áreas e objetos", items: [
          ["Áreas de efeito", "Cone · Cilindro · Cubo · Emanação · Esfera · Linha."],
          ["CA 11", "Corda, papel ou tecido."], ["CA 13", "Cristal, gelo ou vidro."],
          ["CA 15 / 17", "Madeira / pedra."], ["CA 19 / 21 / 23", "Aço ou ferro / mitral / adamantina."]
        ]},
        { title: "Comida e hospedagem", items: [
          ["Alojamento por dia", "Desvalido 7 PC · Pobre 1 PP · Modesto 5 PP · Confortável 8 PP · Abastado 2 PO · Aristocrático 4 PP."],
          ["Refeições", "Desvalido 1 PC · Pobre 2 PC · Modesto 1 PP · Confortável 2 PP · Abastado 3 PP · Aristocrático 6 PO."],
          ["Bebidas e alimentos", "Cerveja 4 PC · pão 2 PC · queijo 1 PP · vinho comum 2 PP · vinho bom 10 PO."]
        ]}
      ]
    }
  },
  "D&D 5E": {
    fields: dndFields.map(([key, label]) => key === "originFeats" ? [key, "Talentos"] : [key, label]),
    shield: {
      source: "D&D 5E · EDIÇÃO 2014",
      scope: "Referência parcial; o livro enviado corresponde à revisão de 2024.",
      notice: "Esta tela não reutiliza tabelas de condições, CDs, cobertura ou custos exclusivos do livro de 2024. Adicione o manual de 2014 ou registre as regras da mesa abaixo.",
      sections: [
        { title: "Núcleo de resolução", items: [
          ["Teste", "Role d20, some os modificadores aplicáveis e compare com a Classe de Dificuldade definida pelo Mestre."],
          ["Ataque", "O resultado da jogada de ataque precisa igualar ou superar a CA do alvo."],
          ["Vantagem / Desvantagem", "Role dois d20 e use o maior com Vantagem ou o menor com Desvantagem."]
        ]},
        { title: "Turno", items: [
          ["Movimento", "Use até o Deslocamento permitido; movimento pode ser dividido durante o turno."],
          ["Ação", "Uma ação no seu turno."],
          ["Ação bônus", "Disponível apenas quando uma habilidade ou regra a concede."],
          ["Reação", "Resposta a um gatilho; confirme a recuperação e limites no manual da campanha."]
        ]}
      ]
    }
  },
  "Sacramento": {
    fields: [["physical", "Físico"], ["speed", "Velocidade"], ["intellect", "Intelecto"], ["courage", "Coragem"], ["lifeCircles", "Círculos de Vida (6)"], ["painCircles", "Círculos de Dor (6)"], ["combatActions", "Ações de combate e movimento"], ["backgrounds", "Antecedentes"], ["mountName", "Montaria"], ["mountPower", "Potência da montaria"], ["mountResistance", "Resistência da montaria"]],
    shield: {
      source: "SACRAMENTO · LIVRO BÁSICO",
      scope: "Referências do Juiz: combate, movimento, defesa, dor e NPCs.",
      sections: [
        { title: "Rodada e recursos", items: [
          ["Rodada", "Cerca de 10 segundos; cada personagem age na ordem de Iniciativa."],
          ["Ficha", "Personagens começam com 6 Círculos de Vida e 6 Círculos de Dor."],
          ["Fim do turno", "Encerre quando as Ações de Combate e os Movimentos disponíveis forem usados."]
        ]},
        { title: "Ações de combate", items: [
          ["Ataque", "Role 1d6 + o Antecedente Violência; acerta se igualar ou superar a Defesa."],
          ["Falha automática", "Resultado 1 no dado sempre falha, inclusive para NPCs."],
          ["Disparo", "Cada disparo consome uma Ação de Combate, salvo habilidade ou arma que diga o contrário."]
        ]},
        { title: "Movimento e cobertura", items: [
          ["Deslocamento", "Gaste 1 Movimento para percorrer 3 metros."],
          ["Tomar cobertura", "Gaste 1 Movimento; cobertura parcial soma +1 à Defesa e completa soma +2."],
          ["Efeito", "Use Defesa e custos de movimento do sistema, não CA ou quadrados de D&D."]
        ]},
        { title: "Círculos de Dor", items: [
          ["Rastreador", "Marque os seis círculos conforme o dano e consulte o efeito associado a cada marca."],
          ["Efeitos", "A tabela do livro inclui Atordoamento, Distração, Intimidação, Queda, Sangramento e Desorientação."]
        ]},
        { title: "NPCs", items: [
          ["Nível de Canalhice", "Um atributo único define o nível e deriva outras estatísticas."],
          ["Valores-base", "NPCs têm 6 Círculos de Dor e Defesa 5; PV e ações variam pelo nível."],
          ["Teste", "NPC rola 1d6 + Nível de Canalhice; 1 natural falha."]
        ]}
      ]
    }
  },
  "Cairn 2e": {
    fields: [["str","FOR"],["dex","DES"],["wil","VON"],["pg","Pontos de Guarda"],["armor","Armadura"],["fatigue","Fadiga"],["inventory","Inventário"]],
    shield: {source:"CAIRN 2E · GUIA DO JOGADOR PT-BR",scope:"Referências diretas às páginas 8–9 e 62–66",notice:"Salvaguardas: 1d20 ≤ atributo, com 1 sempre sucesso e 20 sempre falha. Ataques acertam automaticamente.",sections:[
      {title:"Salvaguardas",items:[["FOR, DES, VON","Use o atributo apropriado; resultado d20 igual ou inferior passa."],["Extremos","1 natural sempre sucesso e 20 natural sempre falha."]]},
      {title:"Inventário",items:[["Capacidade","10 espaços, 4 confortáveis; miudezas 0, volumosos 2."],["Fadiga","Ocupa espaço; Privação por mais de um dia acrescenta Fadiga a cada dia."]]},
      {title:"Combate",items:[["Ataques","Acertam automaticamente; role dano da arma e subtraia a Armadura (máximo 3)."],["Dano","PG → FOR; atingir exatamente 0 PG consulta Cicatrizes conforme quantidade perdida."]]}
    ]}
  },
  "Assimilação RPG": {
    fields: [["vigor", "Vigor"], ["integridade", "Integridade"], ["recurso", "Recurso"], ["arquetipo", "Arquétipo"], ["progresso", "Progresso"], ["condicoes", "Condições"]],
    shield: {
      source: "ASSIMILAÇÃO RPG · LIVRO DE REGRAS ENVIADO",
      scope: "Aptidões e testes verificados no livro enviado. Dados simbólicos exigem interpretação das faces oficiais.",
      notice: "Instinto: dados de seis faces; Conhecimento/Prática: dados simbólicos próprios; mantém-se por padrão um dado (Livro pp. 29–40).",
      sections: [
        { title: "Referência da campanha", items: [
          ["Edição", "Anote a edição, playtest ou versão usada pelo grupo."],
          ["Resolução", "Registre dados, atributos, perícias e como definir sucesso."],
          ["Recursos e estados", "Adicione limites, condições, dano e recuperação conforme o manual."]
        ]}
      ]
    }
  }
};

export function systemProfile(system) {
  return profiles[system] || {
    fields: [["hp", "Pontos de Vida"], ["ac", "Defesa"], ["resource", "Recurso"], ["class", "Classe / arquétipo"]],
    shield: {
      source: "SEM SISTEMA SELECIONADO",
      scope: "Escolha o sistema da campanha para abrir as referências correspondentes.",
      sections: []
    }
  };
}