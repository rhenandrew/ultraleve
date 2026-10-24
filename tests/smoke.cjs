const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const elements = {'playback-status':{}, 'flight-indicator':{dataset:{playing:'false'},setAttribute(){}}};
const buttons = Object.fromEntries(['negativo','recomecar','in-loop'].map(id => [id,{hidden:false,before(){}}]));
const instances = [];
const slots = [];
const context = vm.createContext({
  setInterval:()=>1, clearInterval:()=>{},
  location:{protocol:'http:',origin:'http://127.0.0.1:4178'},
  window:{addEventListener(){},YT:{Player: function(mount, options) {const p={options,destroyed:false,destroy(){this.destroyed=true;},playVideo(){},getDuration(){return 200;},getCurrentTime(){return 100;}}; instances.push(p);return p;}}},
  document:{
    getElementById:id=>elements[id],
    querySelector:s=>['.toolbar','.small-brand','.video-grid'].includes(s) ? null : buttons[s.match(/"([^"]+)"/)[1]],
    querySelectorAll:selector=>selector === '.track-player' ? slots.filter(slot=>!slot.removed) : [],
    createElement:()=>({append(){slots.push(this);},remove(){this.removed=true;}})
  }
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../script.js'),'utf8'),context);
vm.runInContext("chooseTrack('negativo')",context);
assert.equal(instances.length,1);
assert.equal(instances[0].options.playerVars.origin,'http://127.0.0.1:4178');
assert.equal(buttons.negativo.hidden,true);
instances[0].options.events.onStateChange({data:1});
assert.equal(elements['flight-indicator'].dataset.playing,'true');
assert.equal(vm.runInContext('flightProgress',context),0.5);
instances[0].options.events.onStateChange({data:2});
assert.equal(elements['flight-indicator'].dataset.playing,'false');
instances[0].options.events.onStateChange({data:0});
assert.equal(instances[0].destroyed,true);
assert.equal(buttons.negativo.hidden,false);
assert.equal(buttons.recomecar.hidden,true);
assert.equal(vm.runInContext('flightProgress',context),0);
instances[1].options.events.onError({data:153});
assert.equal(elements['flight-indicator'].dataset.playing,'false');
assert.match(elements['playback-status'].textContent,/identificação/);
instances[0].options.events.onStateChange({data:0});
instances[0].options.events.onStateChange({data:1});
instances[0].options.events.onError({data:153});
assert.equal(instances.length,2);
assert.equal(elements['flight-indicator'].dataset.playing,'false');
assert.equal(slots.filter(slot=>!slot.removed).length,1);
vm.runInContext("chooseTrack('in-loop'); chooseTrack('negativo')",context);
assert.equal(instances.length,4);
assert.equal(slots.filter(slot=>!slot.removed).length,1);
assert.equal(buttons.negativo.hidden,true);
assert.equal(buttons.recomecar.hidden,false);
assert.equal(buttons['in-loop'].hidden,false);
vm.runInContext("location.protocol='file:'; chooseTrack('in-loop')",context);
assert.equal(instances.length,4);
assert.match(elements['playback-status'].textContent,/Abrir site.cmd/);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.equal(vm.runInContext('flightHeight(0)',context),0.42);
assert.equal(vm.runInContext('flightHeight(.07)',context),0.23);
assert.equal(vm.runInContext('flightHeight(.24)',context),0.86);
assert.equal(vm.runInContext('flightHeight(.67)',context),0.18);
assert.equal(vm.runInContext('flightHeight(.89)',context),0.18);
assert.equal(vm.runInContext('flightHeight(1)',context),0.70);
assert.ok(!html.includes('radio-dock'));
assert.ok(!html.split('class="contact-section"')[1].split('</section>')[0].includes('audiomack'));
assert.match(html,/ultraleve-perfil.svg/);
console.log('PASS: rapid track changes, stale events ignored, one media slot, animation states, errors and contacts.');
