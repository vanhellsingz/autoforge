// Frame layout calibration from explicitly reviewed header bytes. NOT a decrypter.
export function readUInt(buf,offset,size,endian) {
  if(!Buffer.isBuffer(buf)||!Number.isInteger(offset)||offset<0||offset+size>buf.length)return null;
  if(size===1)return buf.readUInt8(offset);
  if(size===2)return endian==='LE'?buf.readUInt16LE(offset):buf.readUInt16BE(offset);
  if(size===4)return endian==='LE'?buf.readUInt32LE(offset):buf.readUInt32BE(offset);
  throw Error('Unsupported integer size');
}
export function decodeFrame(buffer,layout) {
  const opcode=readUInt(buffer,layout.opcodeOffset,layout.opcodeBytes,layout.endian);
  const declaredLength=layout.lengthBytes?readUInt(buffer,layout.lengthOffset,layout.lengthBytes,layout.endian):null;
  const headerSize=layout.headerSize??Math.max(layout.opcodeOffset+layout.opcodeBytes,(layout.lengthOffset??0)+(layout.lengthBytes??0));
  return {opcode,declaredLength,totalBytes:buffer.length,headerSize,payloadBytes:Math.max(0,buffer.length-headerSize),
    lengthConsistent:declaredLength===null?null:[buffer.length,buffer.length-layout.lengthBytes,buffer.length-headerSize].includes(declaredLength)};
}
export function inferFrameLayout(frames,knownOpcodes,{minFrames=5,maxOffset=12,lengths}={}) {
  if(!Array.isArray(frames)||!frames.length||frames.length>50000||!(knownOpcodes instanceof Set))throw Error('Invalid calibration data');
  if([...knownOpcodes].some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Invalid known opcode');
  const kept=frames.map((f,i)=>Buffer.isBuffer(f)&&f.length>=2&&f.length<=4096?i:-1).filter(i=>i>=0);
  const samples=kept.map(i=>frames[i]),sizes=lengths?kept.map(i=>lengths[i]):null;
  if(samples.length<minFrames)return {status:'UNVERIFIED',best:null,reason:'Insufficient real frames'};
  const layouts=[];
  for(const endian of ['LE','BE'])for(const bytes of [1,2,4])for(let offset=0;offset<=maxOffset;offset++) {
    let hits=0,total=0;const distinct=new Set();
    for(const f of samples){
      const n=readUInt(f,offset,bytes,endian);
      if(n===null)continue;total++;
      if(knownOpcodes.has(n)){hits++;distinct.add(n);}
    }
    if(total<minFrames)continue;
    const chance=Math.min(1,knownOpcodes.size/2**(8*bytes));
    const score=(hits/total)*(distinct.size>=2?1:.5)*(1-chance*.5);
    layouts.push({opcodeOffset:offset,opcodeBytes:bytes,endian,score:Number(score.toFixed(5)),matchRatio:Number((hits/total).toFixed(5)),distinctOpcodes:distinct.size});
  }
  layouts.sort((a,b)=>b.score-a.score||a.opcodeOffset-b.opcodeOffset||a.opcodeBytes-b.opcodeBytes);
  const best=layouts[0],runner=layouts.find(c=>c.opcodeOffset!==best?.opcodeOffset||c.opcodeBytes!==best?.opcodeBytes||c.endian!==best?.endian);
  if(!best||best.matchRatio<.8)return {status:'UNVERIFIED',best:null,alternatives:layouts.slice(0,3),reason:'No layout matches 80 percent of reviewed samples'};
  if(runner&&runner.score>=best.score*.95)return {status:'UNVERIFIED',best:null,alternatives:layouts.slice(0,4),reason:'Ambiguous layouts'};
  return {status:'INFERRED_NOT_PROVEN',best,alternatives:layouts.slice(1,4),confidence:best.score,reason:'Inference only: compare against verified transport decoder. Encrypted frames are unsupported.'};
}
