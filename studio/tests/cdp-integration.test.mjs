// Real local HTTP/WebSocket fixture. Never attaches to an actual browser/game.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {recordCdp} from '../cdp-recorder.mjs';
import {readCapture} from '../flight-recorder.mjs';

function packet(value,opcode=1){
 const bytes=Buffer.isBuffer(value)?value:Buffer.from(value);let header;
 if(bytes.length<126)header=Buffer.from([0x80|opcode,bytes.length]);
 else{header=Buffer.alloc(4);header[0]=0x80|opcode;header[1]=126;header.writeUInt16BE(bytes.length,2);}
 return Buffer.concat([header,bytes]);
}
async function fixture(t,{disconnect=false}={}){
 const commands=[],sockets=new Set(),timers=[];let port,closeCount=0;
 const bytes=Buffer.from([0x00,0xff,0x80,0x01,0x5b,0x5d]);
 const pageUrl='http://127.0.0.1:5173/index.html';
 const server=createServer((request,response)=>{
  if(request.url!=='/json/list'){response.writeHead(404).end();return;}
  response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify([{type:'page',url:pageUrl,webSocketDebuggerUrl:`ws://127.0.0.1:${port}/devtools/page/fixture`}]))
 });
 server.on('upgrade',(request,socket)=>{
  sockets.add(socket);socket.on('close',()=>{sockets.delete(socket);closeCount++;});
  const accept=createHash('sha1').update(request.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  let buffered=Buffer.alloc(0);
  socket.on('data',chunk=>{
   buffered=Buffer.concat([buffered,chunk]);
   while(buffered.length>=2){
    const opcode=buffered[0]&15,masked=!!(buffered[1]&128);let length=buffered[1]&127,offset=2;
    if(length===126){if(buffered.length<4)return;length=buffered.readUInt16BE(2);offset=4;}
    if(length===127){socket.destroy();return;}
    const maskBytes=masked?4:0;if(buffered.length<offset+maskBytes+length)return;
    const mask=masked?buffered.subarray(offset,offset+4):null;offset+=maskBytes;
    const body=Buffer.from(buffered.subarray(offset,offset+length));buffered=buffered.subarray(offset+length);
    if(mask)for(let i=0;i<body.length;i++)body[i]^=mask[i%4];
    if(opcode===8){socket.end(packet(body,8));return;}
    if(opcode!==1)continue;
    const command=JSON.parse(body.toString('utf8'));commands.push(command.method);
    socket.write(packet(JSON.stringify({id:command.id,result:{}})));
    if(command.method==='Runtime.enable'){
     timers.push(setTimeout(()=>{
      if(socket.destroyed)return;
      if(disconnect){socket.end(packet(Buffer.from([0x03,0xe9]),8));return;}
      socket.write(packet(JSON.stringify({method:'Network.webSocketFrameSent',params:{requestId:'socket-1',response:{opcode:2,mask:true,payloadData:bytes.toString('base64')}}})));
      socket.write(packet(JSON.stringify({method:'Network.webSocketFrameReceived',params:{requestId:'socket-1',response:{opcode:1,mask:false,payloadData:'reply-fixture'}}})));
     },15));
    }
   }
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{port=server.address().port;resolve();});});
 t.after(async()=>{for(const timer of timers)clearTimeout(timer);for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));});
 const root=mkdtempSync(join(tmpdir(),'autoforge-cdp-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 return {endpoint:`http://127.0.0.1:${port}`,pageUrl,out:join(root,'capture'),bytes,commands,get closeCount(){return closeCount;}};
}
test('actual CDP observer captures real websocket traffic from an owned local fixture',async t=>{
 const f=await fixture(t);
 const result=await recordCdp({endpoint:f.endpoint,pageUrl:f.pageUrl,out:f.out,identity:{commit:'a'.repeat(40),environment:{name:'local-fake-cdp',kind:'TEST'}},durationMs:100,captureActions:false});
 const {manifest,events}=readCapture(f.out),frames=events.filter(e=>e.kind==='frame');
 assert.equal(result.transportInterrupted,false);assert.equal(result.gameplayVerified,false);
 assert.equal(frames.length,2);assert.equal(frames[0].direction,'C2S');assert.equal(frames[1].direction,'S2C');
 assert.equal(frames[0].sessionId,'transport-socket-1');assert.equal(frames[0].requestId,'socket-1');
 assert.equal(frames[0].data.bodyBytes,f.bytes.length);assert.equal(frames[0].data.bodySha256,createHash('sha256').update(f.bytes).digest('hex'));
 assert.equal(frames[0].data.rawPayloadStored,false);assert.equal(frames[0].opcode,undefined);assert.equal(frames[0].data.applicationOpcode,'UNDECODED');
 assert.equal(manifest.identity.commit,'a'.repeat(40));assert.equal(manifest.truncated,false);
 assert.deepEqual(f.commands,['Network.enable','Runtime.enable']);
 assert.equal(f.commands.some(m=>/Browser\.close|Page\.(close|reload|navigate)|Target\.close/.test(m)),false);
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(f.closeCount,1);
});
test('actual CDP observer records an early debug transport close as interruption',async t=>{
 const f=await fixture(t,{disconnect:true});
 const result=await recordCdp({endpoint:f.endpoint,pageUrl:f.pageUrl,out:f.out,identity:{commit:'b'.repeat(40),environment:{name:'local-fake-cdp',kind:'TEST'}},durationMs:500,captureActions:false});
 assert.equal(result.transportInterrupted,true);assert.equal(result.gameplayVerified,false);
 const {events}=readCapture(f.out);assert.ok(events.some(e=>e.kind==='error'&&e.data.message==='CDP connection closed during capture'));
 assert.ok(events.some(e=>e.data.event==='CDP_CAPTURE_ENDED'&&e.data.interrupted===true));
 assert.deepEqual(f.commands,['Network.enable','Runtime.enable']);
});
