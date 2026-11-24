# PRODUCT.md

## O que é

Plataforma de gestão e scouting de elenco para clubes de futebol, com foco em categorias de base.
O clube cadastra seus atletas (contrato, % de direitos econômicos, valor, posição, pé, altura),
compara o elenco com o mercado de transferências, acompanha a chance de profissionalização da
base (tela de Formação) e apresenta atletas a agências com a ficha em PDF.

Esta é a versão de demonstração que a Cardine leva às reuniões com clubes: roda local, sem banco,
com dados sintéticos e a conta do clube que assiste à demo (white-label).

## Quem usa e quando

- **Diretor de futebol / coordenador de base de clube pequeno ou médio brasileiro** (Série C, D,
  estaduais, clubes formadores). No escritório do CT, em desktop, entre treino e reunião.
- **Na venda**: numa call de 20 minutos, com o Naif compartilhando a tela. O diretor decide nos
  primeiros 2 minutos se aquilo parece produto sério.

## O que a pessoa veio fazer (verbo por tela)

| Tela | Verbo |
|---|---|
| Dashboard | ver a saúde do elenco num relance (valor, idade, contratos, direitos) |
| Jogadores | achar o atleta |
| Ficha do atleta | defender ou apresentar o atleta (agência, diretoria) |
| Comparar | decidir entre 2 ou 3 atletas |
| Formação | provar o valor da base com números honestos |
| Transferências | saber quanto o mercado pagou por perfis parecidos |
| Admin | manter o cadastro em dia sem atrito |

## Tom

Português do Brasil, linguagem de vestiário de diretoria: direto, sem anglicismo desnecessário,
números com escala e contexto. Nada de promessa que o produto não cumpre (o Scout AI é simulado
na demo; valor de mercado é campo cadastrado, não previsão).

## Restrições

- Regras da Formação no CLAUDE.md são invioláveis (chance condicional ao grupo, intervalo de
  Wilson, mínimo de casos, outros clubes anônimos, sem valor projetado).
- Dados 100% fictícios; nenhum atleta real no repositório público.
- i18n pt/en/es em todo texto de interface.
- Precisa funcionar bem compartilhado em call (1440px e 1280px) e no notebook do diretor.
