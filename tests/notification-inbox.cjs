const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const harness = 'notification-inbox-check.html';
fs.writeFileSync(harness, `<html><body style="margin:0"><div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import '/src/index.css'; import {Header} from '/src/components/Header.tsx'; import {NotificationCenter} from '/src/components/NotificationCenter.tsx'; import {initialUserProfile} from '/src/data/mockData.ts'; import {supabase} from '/src/supabaseClient.js';
supabase.channel=()=>({on(_kind,_options,callback){window.insertNotification=callback;return this},subscribe(){return this}});supabase.removeChannel=async()=>{};
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Header,{user:initialUserProfile,currentView:'courses',onNavigate:(v)=>window.chosenView=v,isDarkMode:false,onToggleTheme:()=>{},onOpenAuth:()=>{},notificationControl:React.createElement(NotificationCenter,{userId:'test-user',onNavigate:(v)=>window.chosenView=v})}));
</script></body></html>`);
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  for (const width of [360,390,1440]) {
   const page = await browser.newPage({viewport:{width,height:844}});
   const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   let items = ['message','resource','ai','social','update'].map((kind,i)=>({id:'event-'+i,user_id:'test-user',kind,title:kind+' notification',body:'Saved '+kind+' activity',view:kind==='ai'?'nebula':'connectivity',peer_id:kind==='message'?'test-peer':null,created_at:new Date().toISOString(),read_at:null}));
   await page.route('**/rest/v1/notifications*',async route=>{
    if(route.request().method()==='PATCH'){const url=new URL(route.request().url());const id=url.searchParams.get('id')?.replace('eq.','');items=items.map(item=>!id||item.id===id?{...item,read_at:new Date().toISOString()}:item);return route.fulfill({status:204});}
    return route.fulfill({json:items});
   });
   await page.addInitScript(()=>{
    window.notificationPermission='denied';window.notificationTests=0;
    Object.defineProperty(window,'Notification',{configurable:true,value:class {static get permission(){return window.notificationPermission} static async requestPermission(){window.notificationPermission='granted';return 'granted'}}});
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register:async()=>({}),ready:Promise.resolve({showNotification:async()=>{window.notificationTests++}})}});
   });
   await page.goto('http://localhost:3000/'+harness);
   await page.getByRole('button',{name:'Notifications, 5 unread',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'header overflow at '+width);
   assert.equal(await page.evaluate(()=>{const groups=[...document.querySelector('header').firstElementChild.children].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect());return groups.some((rect,i)=>i>0&&rect.left<groups[i-1].right);}),false,'header groups overlap at '+width);
   await page.getByRole('button',{name:'Notifications, 5 unread',exact:true}).click();
   await page.getByRole('dialog',{name:'Notification inbox'}).waitFor();
   assert.equal(await page.getByRole('dialog',{name:'Notification inbox'}).evaluate(el=>el.getBoundingClientRect().height),844,'dialog occupies full visible height');
   await page.getByRole('button',{name:'Enable notifications',exact:true}).click();
   await page.getByText(/Notifications are blocked. Open your browser/).waitFor();
   await page.evaluate(()=>window.notificationPermission='default');
   await page.getByRole('button',{name:'Enable notifications',exact:true}).click();
   await page.getByRole('button',{name:'Send test notification',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>window.notificationTests),1);
   await page.getByRole('button',{name:'AI',exact:true}).click();
   await page.getByRole('button',{name:/ai notification/}).waitFor();
   assert.equal(await page.getByRole('button',{name:/message notification/}).count(),0);
   await page.getByRole('button',{name:'All',exact:true}).click();
   await page.getByRole('button',{name:/message notification/}).click();
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('brainboost_open_chat')),'test-peer');
   assert.equal(await page.evaluate(()=>window.chosenView),'connectivity');
   await page.getByRole('button',{name:'Notifications, 4 unread',exact:true}).waitFor();
   await page.getByRole('button',{name:'Notifications, 4 unread',exact:true}).click();
   await page.getByRole('button',{name:'Mark all as read'}).click();
   await page.getByRole('button',{name:'Close notifications'}).click();
   await page.getByRole('button',{name:'Notifications',exact:true}).waitFor();
   await page.reload();await page.getByRole('button',{name:'Notifications',exact:true}).waitFor();
   if(width===390){await page.getByRole('button',{name:'Notifications',exact:true}).click();await page.screenshot({path:'tests/notification-inbox-mobile.png'});}
   assert.deepEqual(errors,[]);
   console.log('PASS inbox filters, unread persistence, permission denial, test notification and navigation at '+width);
   await page.close();
  }
 } finally { await browser.close(); fs.rmSync(harness,{force:true}); }
})().catch(error=>{console.error(error);fs.rmSync(harness,{force:true});process.exitCode=1;});
