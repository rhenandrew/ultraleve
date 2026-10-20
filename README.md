# ULTRALEVE

Site da banda ULTRALEVE com cenário de cabine, músicas do YouTube, agenda e contatos. O monomotor na barra acompanha o progresso da faixa.

## Executar localmente

Requer Node.js 22 ou superior, sem dependências externas de servidor.

```sh
npm start
```

No Windows também é possível executar `Abrir site.cmd`. O endereço aparece no terminal. O servidor atende somente em 127.0.0.1.

## Painel da banda

Acesse `/painel` no servidor local. O acesso e a gravação exigem autenticação. A senha inicial é gerada fora deste repositório, na pasta privada do usuário.

Músicas e shows ficam em `content.json`. Shows realizados permanecem na agenda pública por um mês calendário, depois ficam apenas no histórico do painel. Atualize a página pública para refletir uma edição recente.

## Verificação

```sh
npm test
npm run build
```

A exportação em `dist/` inclui somente página pública, catálogo e imagens usadas. Credenciais, painel e servidor ficam fora dela.

## GitHub Pages

Selecione GitHub Actions como origem em Settings > Pages e execute o workflow **Publicar pagina**. O disparo é manual. Nenhum endereço de publicação é confirmado antes da implantação.

O Pages oferece a página pública em HTTPS, mas não executa o servidor Node nem salva edições pelo painel. Nesta modalidade, atualizar `content.json` no repositório e executar novamente a publicação atualiza o catálogo. Administração remota pela banda exige uma hospedagem com backend e autenticação apropriada.

## Imagens e áudio

A cabine é uma imagem original gerada para o protótipo. O prompt está em `assets/PROMPT-ultraleve.md`. O monomotor é um desenho vetorial original. Miniaturas e players usam os vídeos oficiais informados para a banda. Os arquivos de áudio não foram extraídos das plataformas.
