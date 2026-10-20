const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
for(const width of [320,390,700,1024,1680]) {
  const mobile=width<=700;
  const bar={left:0,top:0,width,height:mobile?120:90};
  const logo={left:20,right:180,top:15,bottom:45,height:30};
  const labels=mobile ? [
    {left:20,right:75,top:70,bottom:94}, {left:width*.30,right:width*.30+45,top:70,bottom:94},
    {left:width*.55,right:width*.55+52,top:70,bottom:94}, {left:width-75,right:width-20,top:70,bottom:94},
    {left:width-70,right:width-15,top:20,bottom:42}
  ] : [{left:width*.4,right:width*.7,top:25,bottom:49},{left:width-100,right:width-20,top:25,bottom:49}];
  const css={};const indicator={dataset:{},offsetWidth:mobile?52:65,offsetHeight:26,style:{setProperty:(k,v)=>css[k]=parseFloat(v)},setAttribute(){}};
  const ctx=vm.createContext({window:{addEventListener(){}},setInterval(){return 1;},clearInterval(){},document:{getElementById:id=>id==='flight-indicator'?indicator:null,querySelector:s=>s==='.toolbar'?{getBoundingClientRect:()=>bar}:s==='.small-brand'?{getBoundingClientRect:()=>logo}:null,querySelectorAll:s=>s==='.toolbar nav button,.header-socials a'?labels.map(rect=>({getBoundingClientRect:()=>rect})):[]}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../script.js'),'utf8'),ctx);
  assert.equal(css['--flight-x'],192,'parked beside logo');
  assert.equal(css['--flight-y'],17,'parked at logo height');
  vm.runInContext('flightStarted=true; positionFlight(0)',ctx);
  assert.equal(css['--flight-x'],mobile?8:192);
  for(let step=0;step<=1000;step++) {
    vm.runInContext('positionFlight('+step/1000+')',ctx);
    const x=css['--flight-x'],y=css['--flight-y'];
    assert.ok(x>=0 && x+indicator.offsetWidth<=width);
    for(const rect of labels) assert.ok(!(x<rect.right && x+indicator.offsetWidth>rect.left && y<rect.bottom && y+indicator.offsetHeight>rect.top),'aircraft overlaps label at width '+width+' progress '+step);
  }
  const before=css['--flight-x'];vm.runInContext('setPlaying(false)',ctx);assert.equal(css['--flight-x'],before);
}
console.log('PASS: parked at logo, mobile launch at left, route avoids text/icons across five viewport sizes.');
