const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const out = path.join(root,'dist');
const files = ['index.html','styles.css','script.js','content-model.js','content-loader.js','content.json','assets/ultraleve.png','assets/ultraleve-perfil.svg'];
require('./content-model.js').validate(JSON.parse(fs.readFileSync(path.join(root,'content.json'),'utf8')));
// Refuse an old output with extra files rather than accidentally publishing them.
if(fs.existsSync(out)) {
  const scan = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? scan(path.join(dir,entry.name)) : [path.relative(out,path.join(dir,entry.name)).replaceAll(path.sep,'/')]);
  const unexpected=scan(out).filter(file=>!files.includes(file) && file!=='.nojekyll');
  if(unexpected.length) throw Error('Arquivos inesperados em dist: '+unexpected.join(', '));
}
for(const file of files){const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Exportação estática pronta em dist. Painel, servidor e credenciais não incluídos.');
