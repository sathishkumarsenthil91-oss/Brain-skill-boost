const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const harness = path.resolve('chat-layout-check.html');
fs.writeFileSync(harness, `<html><body style="margin:0"><div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js'; const {createRoot}=ReactDOM;
import '/src/index.css';
import {ConnectivitySubsection} from '/src/components/ConnectivitySubsection.tsx';
import {connectivityService as s, mapProfileToNetworkUser} from '/src/services/supabaseService.ts';
import {initialUserProfile} from '/src/data/mockData.ts';
const user={...initialUserProfile,id:'layout-owner',connectivitySetupCompleted:true};
const peers=Array.from({length:40},(_,i)=>({...mapProfileToNetworkUser(user),id:'peer-'+i,name:'Layout Peer '+i}));
for(const method of ['getUsers','fetchUsers'])s[method]=()=>peers;
for(const method of ['getPosts','fetchPosts','getConversations','fetchConversations','getAccessRequests','fetchAccessRequests'])s[method]=()=>[];
s.fetchCurrentFollowCounts=async()=>({followersCount:3,followingCount:9});s.getUserLibraries=()=>({});s.isSetupCompleted=()=>true;
s.subscribeToRealtimeChat=s.subscribeToNetworkEvents=()=>()=>{};
s.fetchMessagesForUser=async()=>[{id:'history-1',senderId:'peer-0',receiverId:user.id,content:'Saved history loaded',timestamp:'Now'}];
createRoot(document.getElementById('root')).render(React.createElement(ConnectivitySubsection,{user,onNavigate:()=>{}}));
</script></body></html>`);
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
for(const viewport of [{width:1920,height:880},{width:390,height:844}]){
const page=await b.newPage({viewport});page.on('pageerror',e=>console.error(e));await page.goto('http://localhost:3000/chat-layout-check.html');
await page.getByRole('button',{name:'person My Profile',exact:true}).click();
await page.getByRole('button',{name:'9 Following',exact:true}).waitFor();
await page.getByRole('button',{name:'3 Followers',exact:true}).waitFor();
await page.getByRole('button',{name:/Chat/}).first().click();
await page.getByRole('heading',{name:'Layout Peer 0',exact:true}).click();
await page.getByText('Saved history loaded',{exact:true}).last().waitFor();
const input=page.getByRole('textbox',{name:'Chat message'});await input.waitFor();
const box=await input.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=viewport.height,JSON.stringify(box));
await input.fill('Visible composer');assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).isEnabled(),true);
await page.screenshot({path:'../chat-layout-'+viewport.width+'.png'});console.log('PASS visible composer and saved history at '+viewport.width+'px');await page.close();
}}finally{await b.close();fs.unlinkSync(harness);}})().catch(e=>{console.error(e);fs.rmSync(harness,{force:true});process.exitCode=1;});



