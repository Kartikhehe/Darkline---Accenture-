// Dark-only theme check: asserts every route renders the dark shell, that no
// theme switcher is present, and that neither a stale stored preference nor a
// light OS setting can override it.
//
// Requires a running preview server on :4173 (npm run build && npm run preview)
// and puppeteer available (npx puppeteer, or npm i -D puppeteer).
import puppeteer from 'puppeteer'
const ROUTES=['/','/dark','/constraint','/drift','/containment','/ledger','/model','/methodology']
const b=await puppeteer.launch({headless:'new'})
let bad=0

// A) every route: no toggle button, dark applied
for(const r of ROUTES){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1440,height:900})
  const errs=[]; p.on('pageerror',e=>errs.push(e.message))
  await p.goto('http://localhost:4173/#'+r,{waitUntil:'networkidle0'})
  await new Promise(x=>setTimeout(x,800))
  const s=await p.evaluate(()=>({
    attr:document.documentElement.getAttribute('data-theme'),
    bg:getComputedStyle(document.body).backgroundColor,
    toggles:document.querySelectorAll('button[aria-label*="Switch to"]').length,
    lightWord:/\b(LIGHT|DARK)\b/.test((document.querySelector('header')||{innerText:''}).innerText),
    headerText:(document.querySelector('header')||{innerText:''}).innerText.replace(/\n/g,' | '),
  }))
  const ok = s.attr==='dark' && s.bg==='rgb(11, 12, 20)' && s.toggles===0 && !s.lightWord && errs.length===0
  if(!ok){bad++;console.log('FAIL',r,JSON.stringify(s),errs[0]||'')}
  else console.log(`PASS ${r.padEnd(13)} no toggle · ${s.bg}`)
  await ctx.close()
}

// B) stale localStorage 'light' must NOT strand the viewer
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.goto('http://localhost:4173/',{waitUntil:'domcontentloaded'})
  await p.evaluate(()=>localStorage.setItem('darkline.theme','light'))
  await p.reload({waitUntil:'networkidle0'}); await new Promise(x=>setTimeout(x,900))
  const s=await p.evaluate(()=>({attr:document.documentElement.getAttribute('data-theme'),
    bg:getComputedStyle(document.body).backgroundColor,ls:localStorage.getItem('darkline.theme')}))
  const ok=s.attr==='dark'&&s.bg==='rgb(11, 12, 20)'&&s.ls===null
  if(!ok){bad++;console.log('FAIL stale-localStorage',JSON.stringify(s))}
  else console.log('PASS stale localStorage=light -> forced dark, key cleared')
  await ctx.close()
}

// C) OS light preference must NOT produce light
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}])
  await p.goto('http://localhost:4173/#/',{waitUntil:'networkidle0'})
  await new Promise(x=>setTimeout(x,900))
  const s=await p.evaluate(()=>({attr:document.documentElement.getAttribute('data-theme'),
    bg:getComputedStyle(document.body).backgroundColor}))
  const ok=s.attr==='dark'&&s.bg==='rgb(11, 12, 20)'
  if(!ok){bad++;console.log('FAIL os-light',JSON.stringify(s))}
  else console.log('PASS OS prefers light -> still dark')
  await ctx.close()
}
await b.close()
console.log(bad===0?'\n*** DARK-ONLY VERIFIED ***':`\n*** ${bad} FAILURES ***`)
